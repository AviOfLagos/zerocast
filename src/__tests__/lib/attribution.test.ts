import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  captureAttribution,
  clearAttribution,
  getAttribution,
} from "@/lib/attribution"

const STORAGE_KEY = "zerocast:attribution:v1"

interface WindowLike {
  localStorage: Storage
  location: { search: string; pathname: string; origin: string }
}

function makeFakeStorage(): Storage {
  const map = new Map<string, string>()
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => {
      map.set(k, v)
    },
    removeItem: (k) => {
      map.delete(k)
    },
    clear: () => map.clear(),
    key: (i) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size
    },
  }
}

function installWindow(opts: {
  search?: string
  pathname?: string
  referrer?: string
  origin?: string
}): { win: WindowLike; restore: () => void } {
  const origin = opts.origin ?? "https://zerocast.live"
  const win: WindowLike = {
    localStorage: makeFakeStorage(),
    location: {
      search: opts.search ?? "",
      pathname: opts.pathname ?? "/",
      origin,
    },
  }
  // @ts-expect-error — node env: attach window + document
  globalThis.window = win
  // @ts-expect-error — minimal document stub
  globalThis.document = { referrer: opts.referrer ?? "" }
  return {
    win,
    restore: () => {
      // @ts-expect-error — strip stubs
      delete globalThis.window
      // @ts-expect-error — strip stubs
      delete globalThis.document
    },
  }
}

describe("attribution — SSR safety", () => {
  it("getAttribution returns an all-nulls payload when window is undefined", () => {
    expect(typeof globalThis.window).toBe("undefined")
    const p = getAttribution()
    expect(p.firstReferrer).toBeNull()
    expect(p.referrer).toBeNull()
    expect(p.firstSeenAt).toBeNull()
    expect(p.lastSeenAt).toBeNull()
  })

  it("captureAttribution + clearAttribution no-op on the server", () => {
    expect(() => captureAttribution()).not.toThrow()
    expect(() => clearAttribution()).not.toThrow()
  })
})

describe("attribution — browser flows", () => {
  let env: ReturnType<typeof installWindow>

  afterEach(() => {
    env?.restore()
    vi.useRealTimers()
  })

  it("captureAttribution stores both first-touch and last-touch on first UTM visit", () => {
    env = installWindow({
      search: "?utm_source=twitter&utm_campaign=launch",
      pathname: "/pricing",
      referrer: "https://twitter.com/somepost",
    })

    captureAttribution()
    const p = getAttribution()

    expect(p.firstUtmSource).toBe("twitter")
    expect(p.firstUtmCampaign).toBe("launch")
    expect(p.firstReferrer).toBe("https://twitter.com/somepost")
    expect(p.firstLandingPage).toBe("/pricing")
    expect(p.firstSeenAt).not.toBeNull()

    expect(p.utmSource).toBe("twitter")
    expect(p.utmCampaign).toBe("launch")
    expect(p.referrer).toBe("https://twitter.com/somepost")
    expect(p.landingPage).toBe("/pricing")
    expect(p.lastSeenAt).not.toBeNull()
  })

  it("first-touch is sticky across calls; last-touch updates on new signal", () => {
    env = installWindow({
      search: "?utm_source=hn",
      pathname: "/",
      referrer: "https://news.ycombinator.com/",
    })
    captureAttribution()
    const first = getAttribution()

    // Second visit, different source
    env.win.location.search = "?utm_source=reddit"
    env.win.location.pathname = "/changelog"
    // @ts-expect-error — mutate stub
    globalThis.document.referrer = "https://reddit.com/r/x"

    captureAttribution()
    const after = getAttribution()

    // First-touch unchanged
    expect(after.firstUtmSource).toBe("hn")
    expect(after.firstLandingPage).toBe("/")
    expect(after.firstSeenAt).toBe(first.firstSeenAt)
    // Last-touch overwritten
    expect(after.utmSource).toBe("reddit")
    expect(after.landingPage).toBe("/changelog")
  })

  it("clearAttribution wipes everything", () => {
    env = installWindow({ search: "?utm_source=x", pathname: "/" })
    captureAttribution()
    expect(env.win.localStorage.getItem(STORAGE_KEY)).not.toBeNull()

    clearAttribution()
    expect(env.win.localStorage.getItem(STORAGE_KEY)).toBeNull()
    const p = getAttribution()
    expect(p.firstSeenAt).toBeNull()
    expect(p.lastSeenAt).toBeNull()
  })

  it("last-touch expires after 30 days and is then refreshed from current signal", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))

    env = installWindow({
      search: "?utm_source=launch",
      pathname: "/",
      referrer: "https://reddit.com/r/x",
    })
    captureAttribution()

    const beforeJump = getAttribution()
    expect(beforeJump.utmSource).toBe("launch")

    // Jump 31 days forward, visit with no signal
    vi.setSystemTime(new Date("2026-02-01T00:00:00Z"))
    env.win.location.search = ""
    // @ts-expect-error — mutate stub
    globalThis.document.referrer = ""

    captureAttribution()
    const expired = getAttribution()
    // Last-touch was expired & no new signal → fields cleared
    expect(expired.utmSource).toBeNull()
    expect(expired.referrer).toBeNull()
    // First-touch still present
    expect(expired.firstUtmSource).toBe("launch")

    // Now a new signal arrives → last-touch refreshes
    vi.setSystemTime(new Date("2026-02-02T00:00:00Z"))
    env.win.location.search = "?utm_source=newsletter"
    captureAttribution()
    const refreshed = getAttribution()
    expect(refreshed.utmSource).toBe("newsletter")
    expect(refreshed.firstUtmSource).toBe("launch")
  })

  it("internal-origin referrer is ignored (treated as null)", () => {
    env = installWindow({
      search: "",
      pathname: "/feature",
      referrer: "https://zerocast.live/home",
      origin: "https://zerocast.live",
    })
    captureAttribution()
    const p = getAttribution()
    // No UTMs and no external referrer → first-touch seeded with landing only
    expect(p.firstReferrer).toBeNull()
    expect(p.referrer).toBeNull()
    expect(p.firstLandingPage).toBe("/feature")
  })
})
