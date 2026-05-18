import type { Room } from "@prisma/client"
import type { Session } from "next-auth"
import { SignJWT } from "jose"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { auth } from "@/auth"
import { authenticateHost } from "@/lib/host-auth"
import { getCachedRoom } from "@/lib/room-cache"

const SECRET_STRING = process.env.LIVEKIT_API_SECRET!
const SECRET = new TextEncoder().encode(SECRET_STRING)

const FAKE_ROOM = {
  id: "room-pk-1",
  code: "ABC123",
  hostId: "host-user-1",
  status: "LOBBY",
} as unknown as Room

const mockedAuth = auth as unknown as ReturnType<
  typeof vi.fn<() => Promise<Session | null>>
>

async function mintHostToken(opts: {
  sub: string
  room: string
  roomAdmin?: boolean
  expSecondsFromNow?: number
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + (opts.expSecondsFromNow ?? 600)
  return new SignJWT({
    video: { room: opts.room, roomAdmin: opts.roomAdmin ?? true },
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setSubject(opts.sub)
    .sign(SECRET)
}

function reqWithAuth(header?: string): Request {
  const headers = new Headers()
  if (header) headers.set("authorization", header)
  return new Request("https://example.test/api/rooms/ABC123/state", { headers })
}

describe("authenticateHost", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAuth.mockResolvedValue(null)
    vi.mocked(getCachedRoom).mockResolvedValue(FAKE_ROOM)
  })

  it("authorizes a valid Bearer host token for the matching room+host", async () => {
    const token = await mintHostToken({ sub: "host-user-1", room: "ABC123" })
    const result = await authenticateHost(reqWithAuth(`Bearer ${token}`), "ABC123")

    expect(result.authorized).toBe(true)
    if (result.authorized) {
      expect(result.userId).toBe("host-user-1")
      expect(result.room.code).toBe("ABC123")
    }
    expect(mockedAuth).not.toHaveBeenCalled()
  })

  it("rejects a Bearer token whose sub does not match room.hostId", async () => {
    const token = await mintHostToken({ sub: "someone-else", room: "ABC123" })
    const result = await authenticateHost(reqWithAuth(`Bearer ${token}`), "ABC123")

    expect(result.authorized).toBe(false)
    expect(result.userId).toBeNull()
    expect(result.room).toEqual(FAKE_ROOM)
  })

  it("rejects an expired Bearer token", async () => {
    const token = await mintHostToken({
      sub: "host-user-1",
      room: "ABC123",
      expSecondsFromNow: -10,
    })
    const result = await authenticateHost(reqWithAuth(`Bearer ${token}`), "ABC123")

    expect(result.authorized).toBe(false)
  })

  it("rejects a Bearer token signed with the wrong secret", async () => {
    const wrong = new TextEncoder().encode("not-the-real-secret-32-chars-long")
    const token = await new SignJWT({
      video: { room: "ABC123", roomAdmin: true },
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("10m")
      .setSubject("host-user-1")
      .sign(wrong)

    const result = await authenticateHost(reqWithAuth(`Bearer ${token}`), "ABC123")
    expect(result.authorized).toBe(false)
  })

  it("rejects a Bearer token without roomAdmin", async () => {
    const token = await mintHostToken({
      sub: "host-user-1",
      room: "ABC123",
      roomAdmin: false,
    })
    const result = await authenticateHost(reqWithAuth(`Bearer ${token}`), "ABC123")
    expect(result.authorized).toBe(false)
  })

  it("falls back to NextAuth session when no Bearer header is present", async () => {
    mockedAuth.mockResolvedValueOnce({
      user: { id: "host-user-1" },
      expires: "2099-01-01",
    } as Session)

    const result = await authenticateHost(reqWithAuth(undefined), "ABC123")
    expect(result.authorized).toBe(true)
    if (result.authorized) {
      expect(result.userId).toBe("host-user-1")
    }
  })

  it("falls back to session when the Bearer token is invalid", async () => {
    mockedAuth.mockResolvedValueOnce({
      user: { id: "host-user-1" },
      expires: "2099-01-01",
    } as Session)

    const result = await authenticateHost(
      reqWithAuth("Bearer not.a.real.jwt"),
      "ABC123",
    )
    expect(result.authorized).toBe(true)
  })

  it("rejects when session user.id is not the room host", async () => {
    mockedAuth.mockResolvedValueOnce({
      user: { id: "someone-else" },
      expires: "2099-01-01",
    } as Session)

    const result = await authenticateHost(reqWithAuth(undefined), "ABC123")
    expect(result.authorized).toBe(false)
  })

  it("rejects when neither Bearer nor session is present", async () => {
    const result = await authenticateHost(reqWithAuth(undefined), "ABC123")
    expect(result.authorized).toBe(false)
    expect(result.userId).toBeNull()
  })

  it("returns unauthorized when the room does not exist", async () => {
    vi.mocked(getCachedRoom).mockResolvedValueOnce(null)
    const token = await mintHostToken({ sub: "host-user-1", room: "ABC123" })

    const result = await authenticateHost(reqWithAuth(`Bearer ${token}`), "ABC123")
    expect(result.authorized).toBe(false)
    expect(result.room).toBeNull()
  })
})
