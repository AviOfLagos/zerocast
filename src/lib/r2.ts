import { S3Client } from "@aws-sdk/client-s3"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const RECORDING_URL_TTL_SECONDS = 60 * 60 * 24 // 24 h

let cachedClient: S3Client | null = null

function getR2Client(): S3Client {
  if (cachedClient) return cachedClient
  const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT } = process.env
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT) {
    throw new Error("R2 env vars missing: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT")
  }
  cachedClient = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    forcePathStyle: true,
  })
  return cachedClient
}

/**
 * If R2_PUBLIC_URL is configured (custom bucket domain), returns
 * `${R2_PUBLIC_URL}/${path}` — a stable public link.
 * Otherwise generates a short-lived presigned URL (24 h TTL).
 */
export async function getRecordingDownloadUrl(path: string): Promise<string> {
  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "")
  if (publicBase) return `${publicBase}/${path}`

  const bucket = process.env.R2_BUCKET
  if (!bucket) throw new Error("R2_BUCKET env var missing")

  const client = getR2Client()
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: path })
  return getSignedUrl(client, cmd, { expiresIn: RECORDING_URL_TTL_SECONDS })
}

/** True iff all required R2 env vars are populated. */
export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.R2_ENDPOINT,
  )
}
