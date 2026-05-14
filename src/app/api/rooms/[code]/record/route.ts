import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { startRecording, stopRecording } from "@/lib/egress"
import { prisma } from "@/lib/prisma"
import { getRecordingDownloadUrl } from "@/lib/r2"
import { getCachedRoom } from "@/lib/room-cache"
import { checkRateLimit } from "@/lib/rate-limit"
import { publishEvent } from "@/lib/redis"

// ── POST — Start recording ─────────────────────────────────────────────────

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { code } = await params

  // Rate limit: 5 per minute (shared with stream actions)
  const rl = await checkRateLimit(session.user.id, "rooms:record")
  if (!rl.success) {
    const retryAfter = Math.ceil((rl.reset - Date.now()) / 1000)
    return NextResponse.json(
      { error: "Too many requests", retryAfter },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": String(rl.remaining),
        },
      },
    )
  }

  const room = await getCachedRoom(code)
  if (!room || room.hostId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { egressId, path } = await startRecording(code)

    // Persist StreamSession row tracking this recording.
    // NOTE: egress already started before this DB write — if persistence
    // fails we log + continue so the caller still gets the egressId and
    // can stop the recording. We'd rather orphan a row than orphan an egress.
    try {
      await prisma.streamSession.create({
        data: {
          roomId: room.id,
          egressId,
          platforms: [],
          status: "LIVE",
          recordingPath: path,
        },
      })
    } catch (dbErr) {
      console.error("[record] Failed to persist StreamSession:", dbErr)
    }

    await publishEvent(code, {
      type: "RECORDING_STARTED",
      data: { egressId },
    })

    return NextResponse.json({ egressId, status: "recording" })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown egress error"
    console.error("[record] Failed to start recording:", err)
    return NextResponse.json(
      { error: "Failed to start recording", details: errorMessage },
      { status: 502 },
    )
  }
}

// ── DELETE — Stop recording ────────────────────────────────────────────────

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { code } = await params

  const room = await getCachedRoom(code)
  if (!room || room.hostId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // egressId is required in the request body
  let egressId: string | undefined
  try {
    const body = await req.json()
    egressId = typeof body?.egressId === "string" ? body.egressId : undefined
  } catch {
    // no body
  }

  if (!egressId) {
    return NextResponse.json({ error: "egressId is required" }, { status: 400 })
  }

  try {
    const { downloadUrl: liveKitDownloadUrl } = await stopRecording(egressId)

    // Look up the StreamSession row created at start; may be missing if the
    // start-time DB write failed — that's fine, we still report stopped.
    const streamSession = await prisma.streamSession.findUnique({
      where: { egressId },
      select: { id: true, recordingPath: true },
    })

    let recordingUrl: string | null = null
    if (streamSession?.recordingPath) {
      try {
        recordingUrl = await getRecordingDownloadUrl(streamSession.recordingPath)
      } catch (urlErr) {
        // Download URL is best-effort — recording itself is stopped successfully.
        console.error("[record] Failed to mint download URL:", urlErr)
      }
    }

    // Fallback to whatever LiveKit returned if R2 helper produced nothing.
    if (!recordingUrl && liveKitDownloadUrl) recordingUrl = liveKitDownloadUrl

    if (streamSession) {
      try {
        await prisma.streamSession.update({
          where: { id: streamSession.id },
          data: {
            status: "ENDED",
            endedAt: new Date(),
            recordingUrl,
            recordingUrlMintedAt: recordingUrl ? new Date() : null,
          },
        })
      } catch (dbErr) {
        console.error("[record] Failed to update StreamSession:", dbErr)
      }
    }

    await publishEvent(code, {
      type: "RECORDING_STOPPED",
      data: { egressId, downloadUrl: recordingUrl },
    })

    return NextResponse.json({ status: "stopped", downloadUrl: recordingUrl })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error"
    console.error("[record] Failed to stop recording:", err)
    return NextResponse.json(
      { error: "Failed to stop recording", details: errorMessage },
      { status: 502 },
    )
  }
}
