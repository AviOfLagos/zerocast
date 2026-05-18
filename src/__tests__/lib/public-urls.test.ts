import { beforeEach, describe, expect, it, vi } from "vitest"

import { prisma } from "@/lib/prisma"
import { resolvePublicUrls } from "@/lib/public-urls"
import { getBroadcastWatchUrl } from "@/lib/youtube-api"

vi.mock("@/lib/youtube-api", () => ({
  getBroadcastWatchUrl: vi.fn(async () => null),
}))

describe("resolvePublicUrls", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns empty object when no platforms are passed (no Prisma hit)", async () => {
    const out = await resolvePublicUrls("u1", [])
    expect(out).toEqual({})
    expect(prisma.platformConnection.findMany).not.toHaveBeenCalled()
  })

  it("queries connections with upper-cased platform filter", async () => {
    vi.mocked(prisma.platformConnection.findMany).mockResolvedValueOnce([])

    await resolvePublicUrls("u1", ["youtube", "twitch"])

    expect(prisma.platformConnection.findMany).toHaveBeenCalledWith({
      where: {
        userId: "u1",
        platform: { in: ["YOUTUBE", "TWITCH"] },
      },
      select: { platform: true, channelName: true, accessToken: true },
    })
  })

  it("prefers YouTube OAuth watch URL when available", async () => {
    vi.mocked(prisma.platformConnection.findMany).mockResolvedValueOnce([
      // @ts-expect-error — partial Prisma row shape, only the selected cols matter
      { platform: "YOUTUBE", channelName: "myhandle", accessToken: "tok" },
    ])
    vi.mocked(getBroadcastWatchUrl).mockResolvedValueOnce(
      "https://youtube.com/watch?v=abc",
    )

    const out = await resolvePublicUrls("u1", ["youtube"])
    expect(out).toEqual({ youtube: "https://youtube.com/watch?v=abc" })
    expect(getBroadcastWatchUrl).toHaveBeenCalledWith("tok")
  })

  it("falls back to channel /live for YouTube when OAuth lookup returns null", async () => {
    vi.mocked(prisma.platformConnection.findMany).mockResolvedValueOnce([
      // @ts-expect-error — partial row
      { platform: "YOUTUBE", channelName: "myhandle", accessToken: null },
    ])
    vi.mocked(getBroadcastWatchUrl).mockResolvedValueOnce(null)

    const out = await resolvePublicUrls("u1", ["youtube"])
    expect(out).toEqual({ youtube: "https://youtube.com/@myhandle/live" })
  })

  it("falls back to channel /live for YouTube when OAuth lookup throws", async () => {
    vi.mocked(prisma.platformConnection.findMany).mockResolvedValueOnce([
      // @ts-expect-error — partial row
      { platform: "YOUTUBE", channelName: "myhandle", accessToken: "bad" },
    ])
    vi.mocked(getBroadcastWatchUrl).mockRejectedValueOnce(new Error("api down"))

    const out = await resolvePublicUrls("u1", ["youtube"])
    expect(out).toEqual({ youtube: "https://youtube.com/@myhandle/live" })
  })

  it("derives Twitch URL from channel name", async () => {
    vi.mocked(prisma.platformConnection.findMany).mockResolvedValueOnce([
      // @ts-expect-error — partial row
      { platform: "TWITCH", channelName: "streamer1", accessToken: null },
    ])
    const out = await resolvePublicUrls("u1", ["twitch"])
    expect(out).toEqual({ twitch: "https://twitch.tv/streamer1" })
  })

  it("derives Kick URL and strips leading @", async () => {
    vi.mocked(prisma.platformConnection.findMany).mockResolvedValueOnce([
      // @ts-expect-error — partial row
      { platform: "KICK", channelName: "@kickname", accessToken: null },
    ])
    const out = await resolvePublicUrls("u1", ["kick"])
    expect(out).toEqual({ kick: "https://kick.com/kickname" })
  })

  it("derives TikTok URL with /live suffix", async () => {
    vi.mocked(prisma.platformConnection.findMany).mockResolvedValueOnce([
      // @ts-expect-error — partial row
      { platform: "TIKTOK", channelName: "@tk", accessToken: null },
    ])
    const out = await resolvePublicUrls("u1", ["tiktok"])
    expect(out).toEqual({ tiktok: "https://tiktok.com/@tk/live" })
  })

  it("derives Twitter URL as x.com/<slug>", async () => {
    vi.mocked(prisma.platformConnection.findMany).mockResolvedValueOnce([
      // @ts-expect-error — partial row
      { platform: "TWITTER", channelName: "@elon", accessToken: null },
    ])
    const out = await resolvePublicUrls("u1", ["twitter"])
    expect(out).toEqual({ twitter: "https://x.com/elon" })
  })

  it("omits a platform whose channelName is missing", async () => {
    vi.mocked(prisma.platformConnection.findMany).mockResolvedValueOnce([
      // @ts-expect-error — partial row
      { platform: "TWITCH", channelName: null, accessToken: null },
    ])
    const out = await resolvePublicUrls("u1", ["twitch"])
    expect(out).toEqual({})
  })

  it("returns empty when channelName is only an @ with no slug", async () => {
    vi.mocked(prisma.platformConnection.findMany).mockResolvedValueOnce([
      // @ts-expect-error — partial row
      { platform: "TWITCH", channelName: "@", accessToken: null },
    ])
    const out = await resolvePublicUrls("u1", ["twitch"])
    expect(out).toEqual({})
  })

  it("returns multiple platforms in one call", async () => {
    vi.mocked(prisma.platformConnection.findMany).mockResolvedValueOnce([
      // @ts-expect-error — partial row
      { platform: "TWITCH", channelName: "tw", accessToken: null },
      // @ts-expect-error — partial row
      { platform: "KICK", channelName: "kk", accessToken: null },
    ])
    const out = await resolvePublicUrls("u1", ["twitch", "kick"])
    expect(out).toEqual({
      twitch: "https://twitch.tv/tw",
      kick: "https://kick.com/kk",
    })
  })
})
