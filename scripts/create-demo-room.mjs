/**
 * Creates a demo room bypassing web auth.
 * Provisions: LiveKit room + Neon DB row + Redis keys
 * Usage: node scripts/create-demo-room.mjs
 */

import { Redis } from '@upstash/redis'
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'
import pg from 'pg'
import { config } from 'dotenv'

config({ path: '.env.local' })

// ── Credentials (read from .env.local) ──────────────────────────────────────
const LIVEKIT_API_KEY    = process.env.LIVEKIT_API_KEY
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET
const LIVEKIT_URL        = process.env.NEXT_PUBLIC_LIVEKIT_URL
const DB_URL             = process.env.DATABASE_URL
const REDIS_URL          = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN        = process.env.UPSTASH_REDIS_REST_TOKEN
const BASE_URL           = process.env.DEMO_BASE_URL ?? 'https://zerocast.vercel.app'

// ── Validate env ─────────────────────────────────────────────────────────────
const required = {
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
  NEXT_PUBLIC_LIVEKIT_URL: LIVEKIT_URL,
  DATABASE_URL: DB_URL,
  UPSTASH_REDIS_REST_URL: REDIS_URL,
  UPSTASH_REDIS_REST_TOKEN: REDIS_TOKEN,
}
const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k)
if (missing.length > 0) {
  console.error('❌ Missing required env vars in .env.local:')
  for (const name of missing) console.error(`   - ${name}`)
  process.exit(1)
}

// ── Room code ────────────────────────────────────────────────────────────────
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const roomCode = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
const DEMO_HOST_ID = 'demo-host-001'

// ── LiveKit ──────────────────────────────────────────────────────────────────
const roomSvc = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
await roomSvc.createRoom({ name: roomCode, maxParticipants: 6, emptyTimeout: 300 })

const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
  identity: DEMO_HOST_ID,
  name: 'Host',
  ttl: '4h',
})
at.addGrant({ room: roomCode, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true, roomAdmin: true })
const hostToken = await at.toJwt()

// ── Neon DB ──────────────────────────────────────────────────────────────────
const db = new pg.Client({ connectionString: DB_URL })
await db.connect()

// Upsert demo user
await db.query(`
  INSERT INTO "User" (id, name, email, "emailVerified", image, "createdAt", "updatedAt")
  VALUES ($1, $2, $3, NOW(), NULL, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING
`, [DEMO_HOST_ID, 'Demo Host', 'demo@zerocast.vercel.app'])

// Insert room
const roomId = `demo-room-${Date.now()}`
await db.query(`
  INSERT INTO "Room" (id, code, "hostId", status, "createdAt")
  VALUES ($1, $2, $3, 'active', NOW())
  ON CONFLICT (code) DO UPDATE SET status = 'active'
`, [roomId, roomCode, DEMO_HOST_ID])

await db.end()

// ── Redis ────────────────────────────────────────────────────────────────────
const redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN })
const TTL = 60 * 60 * 4 // 4 hours
await redis.set(`room:${roomCode}:info`, JSON.stringify({ code: roomCode, hostId: DEMO_HOST_ID }), { ex: TTL })

// ── Output ───────────────────────────────────────────────────────────────────
const studioUrl = `${BASE_URL}/demo/${roomCode}?token=${hostToken}`
const joinUrl   = `${BASE_URL}/join/${roomCode}`

console.log('\n✅ Demo room created!\n')
console.log(`  Room code : ${roomCode}`)
console.log(`\n  🎙  Host studio (open in your browser):`)
console.log(`  ${studioUrl}\n`)
console.log(`  🔗 Guest join link (share this):`)
console.log(`  ${joinUrl}\n`)
