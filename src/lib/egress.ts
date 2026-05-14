import { PlatformType } from "@prisma/client"
import { EgressClient } from "livekit-server-sdk"
import { EncodedFileOutput, EncodedFileType, EncodingOptionsPreset, S3Upload, StreamOutput, StreamProtocol } from "@livekit/protocol"
import type { EgressInfo } from "@livekit/protocol"

// ── LiveKit env vars (same as livekit.ts) ──────────────────────────────────

const apiKey = process.env.LIVEKIT_API_KEY!
const apiSecret = process.env.LIVEKIT_API_SECRET!
const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL!

// ── EgressClient singleton ─────────────────────────────────────────────────

let _egressClient: EgressClient | null = null

export function getEgressClient(): EgressClient {
  if (!_egressClient) {
    // EgressClient requires https:// URL, not wss://
    const httpUrl = livekitUrl.replace("wss://", "https://").replace("ws://", "http://")
    _egressClient = new EgressClient(httpUrl, apiKey, apiSecret)
  }
  return _egressClient
}

// ── RTMP URL builders ──────────────────────────────────────────────────────

const RTMP_INGEST_URLS: Record<string, string> = {
  YOUTUBE: "rtmp://a.rtmp.youtube.com/live2",
  TWITCH: "rtmp://live.twitch.tv/app",
  KICK: "rtmp://live.kick.com/app",
}

// YouTube's well-known backup ingest server — used when no custom backup URL is configured.
export const YOUTUBE_BACKUP_INGEST_URL = "rtmp://b.rtmp.youtube.com/live2?backup=1"

/**
 * Reverse-lookup: given an RTMP destination URL (e.g. from EgressInfo
 * streamResults), return the lower-cased platform key, or null when the
 * URL doesn't belong to one of the known platforms (e.g. custom RTMP).
 */
export function inferPlatformFromUrl(url: string): string | null {
  const u = url.toLowerCase()
  if (u.includes("youtube.com")) return "youtube"
  if (u.includes("twitch.tv")) return "twitch"
  if (u.includes("kick.com")) return "kick"
  if (u.includes("tiktok") || u.includes("tiktokcdn")) return "tiktok"
  return null
}

/**
 * Build the full RTMP URL for a given platform and stream key.
 * TikTok requires a user-provided ingest URL.
 */
export function buildRtmpUrl(
  platform: PlatformType,
  streamKey: string,
  ingestUrl?: string | null,
): string {
  if (platform === PlatformType.TIKTOK) {
    if (!ingestUrl) {
      throw new Error("TikTok requires a custom ingest URL")
    }
    return `${ingestUrl}/${streamKey}`
  }

  const baseUrl = RTMP_INGEST_URLS[platform]
  if (!baseUrl) {
    throw new Error(`Unsupported platform for RTMP: ${platform}`)
  }
  return `${baseUrl}/${streamKey}`
}

/**
 * Build the backup RTMP URL for YouTube.
 * Uses the user-configured backup URL if provided, otherwise falls back to the
 * well-known YouTube backup ingest server.
 */
export function buildYouTubeBackupUrl(
  streamKey: string,
  backupIngestUrl?: string | null,
): string {
  const base = backupIngestUrl ?? YOUTUBE_BACKUP_INGEST_URL
  // If the backup URL already ends with the stream key (user pasted full URL) use it as-is.
  if (base.includes(streamKey)) return base
  // Strip trailing slash before appending key.
  return `${base.replace(/\/$/, "")}/${streamKey}`
}

// ── Egress operations ──────────────────────────────────────────────────────

export interface StreamDestination {
  platform: PlatformType
  streamKey: string
  ingestUrl?: string | null
  /** YouTube-only: backup ingest URL to prevent "duplicate ingestion" warnings on reconnect */
  backupIngestUrl?: string | null
}

/**
 * Start a room composite egress to one or more RTMP destinations.
 * For YouTube destinations, the backup ingest URL is automatically included so that
 * LiveKit egress reconnects use the backup server instead of re-hitting the primary,
 * which would cause YouTube's "duplicate ingestion" warning.
 * Returns the LiveKit egress ID and status string.
 */
export async function startStream(
  roomCode: string,
  destinations: StreamDestination[],
): Promise<{ egressId: string; status: string }> {
  if (destinations.length === 0) {
    throw new Error("At least one destination is required")
  }

  const urls: string[] = []
  for (const d of destinations) {
    urls.push(buildRtmpUrl(d.platform, d.streamKey, d.ingestUrl))
    // YouTube: always include the backup server URL so egress reconnects go to b.rtmp
    // instead of re-sending to a.rtmp, which triggers the duplicate ingestion warning.
    if (d.platform === PlatformType.YOUTUBE) {
      urls.push(buildYouTubeBackupUrl(d.streamKey, d.backupIngestUrl))
    }
  }

  const output = new StreamOutput({
    protocol: StreamProtocol.RTMP,
    urls,
  })

  const client = getEgressClient()
  const customBaseUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://zerocast.vercel.app"}/composite/${roomCode}`
  const info: EgressInfo = await client.startRoomCompositeEgress(roomCode, output, {
    customBaseUrl,
    encodingOptions: EncodingOptionsPreset.H264_720P_30,
  })

  return {
    egressId: info.egressId,
    status: String(info.status),
  }
}

/**
 * Stop an active egress by ID.
 */
export async function stopStream(egressId: string): Promise<void> {
  const client = getEgressClient()
  await client.stopEgress(egressId)
}

/**
 * Add an RTMP destination to a running egress.
 */
export async function addDestination(
  egressId: string,
  platform: PlatformType,
  streamKey: string,
  ingestUrl?: string | null,
): Promise<void> {
  const url = buildRtmpUrl(platform, streamKey, ingestUrl)
  const client = getEgressClient()
  await client.updateStream(egressId, [url])
}

/**
 * Remove an RTMP destination from a running egress.
 */
export async function removeDestination(
  egressId: string,
  platform: PlatformType,
  streamKey: string,
  ingestUrl?: string | null,
): Promise<void> {
  const url = buildRtmpUrl(platform, streamKey, ingestUrl)
  const client = getEgressClient()
  await client.updateStream(egressId, undefined, [url])
}

/**
 * List active egress sessions for a room.
 */
export async function listActiveEgress(roomName: string): Promise<EgressInfo[]> {
  const client = getEgressClient()
  return client.listEgress({ roomName })
}

// ── Recording operations ────────────────────────────────────────────────────

/**
 * Start a room composite egress that writes an MP4 file.
 * The file is saved to the path configured on the LiveKit server (S3 bucket
 * for LiveKit Cloud, or a local path for self-hosted).
 */
export async function startRecording(
  roomCode: string,
): Promise<{ egressId: string; path: string }> {
  if (!process.env.R2_BUCKET) {
    throw new Error("R2_BUCKET not configured — recording requires Cloudflare R2 storage")
  }
  if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 credentials missing — set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT")
  }

  const timestamp = Date.now()
  const filepath = `recordings/${roomCode}-${timestamp}.mp4`

  const output = new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath,
    output: {
      case: "s3",
      value: new S3Upload({
        accessKey: process.env.R2_ACCESS_KEY_ID,
        secret: process.env.R2_SECRET_ACCESS_KEY,
        bucket: process.env.R2_BUCKET,
        endpoint: process.env.R2_ENDPOINT,
        forcePathStyle: true,
      }),
    },
  })

  const client = getEgressClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zerocast.vercel.app"
  const customBaseUrl = `${siteUrl}/composite/${roomCode}`

  const info: EgressInfo = await client.startRoomCompositeEgress(roomCode, output, {
    customBaseUrl,
    encodingOptions: EncodingOptionsPreset.H264_1080P_30,
  })

  return { egressId: info.egressId, path: filepath }
}

/**
 * Stop a recording egress by ID.
 * Returns the file location if available in the egress info.
 */
export async function stopRecording(
  egressId: string,
): Promise<{ downloadUrl?: string }> {
  const client = getEgressClient()
  const info: EgressInfo = await client.stopEgress(egressId)

  // If the egress info carries a file location, surface it
  // FileInfo uses `.location` (a signed URL or file path set by the LiveKit server)
  const fileResults = info.fileResults
  const downloadUrl =
    fileResults && fileResults.length > 0 ? fileResults[0].location : undefined

  return { downloadUrl: downloadUrl || undefined }
}
