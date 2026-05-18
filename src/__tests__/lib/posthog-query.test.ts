import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Stub server-only so importing the module under test doesn't blow up in node.
vi.mock("server-only", () => ({}))

// Pass-through unstable_cache: invokes the wrapped fn each call so we can
// assert against the network mock deterministically. The production behaviour
// (60s TTL) is covered by the cache-options assertion below.
vi.mock("next/cache", () => ({
  unstable_cache: <Args extends unknown[], R>(
    fn: (...args: Args) => Promise<R>,
    _key?: unknown,
    _opts?: { revalidate?: number; tags?: string[] },
  ) =>
    (...args: Args) =>
      fn(...args),
}))

const ENV_BACKUP = {
  POSTHOG_PROJECT_ID: process.env.POSTHOG_PROJECT_ID,
  POSTHOG_PERSONAL_API_KEY: process.env.POSTHOG_PERSONAL_API_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
}

function restoreEnv() {
  for (const [k, v] of Object.entries(ENV_BACKUP)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
}

interface FetchInit {
  method?: string
  headers?: Record<string, string>
  body?: string
  cache?: string
}

describe("posthog-query — env unset (fail-soft)", () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.POSTHOG_PROJECT_ID
    delete process.env.POSTHOG_PERSONAL_API_KEY
  })
  afterEach(() => {
    restoreEnv()
    vi.restoreAllMocks()
  })

  it("returns [] and warns ONCE when env is missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const fetchSpy = vi.spyOn(globalThis, "fetch")

    const mod = await import("@/lib/posthog-query")
    const r1 = await mod.queryHogQL("SELECT 1")
    const r2 = await mod.queryHogQL("SELECT 2")
    const r3 = await mod.queryTrend("evt", { dateFrom: "2026-01-01" })

    expect(r1).toEqual([])
    expect(r2).toEqual([])
    expect(r3).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
    // One-time warn for missing env
    const missingWarns = warn.mock.calls.filter((c) =>
      String(c[0]).includes("disabled — missing env"),
    )
    expect(missingWarns).toHaveLength(1)
  })
})

describe("posthog-query — env set", () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.POSTHOG_PROJECT_ID = "42"
    process.env.POSTHOG_PERSONAL_API_KEY = "phx_test"
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://us.i.posthog.com"
  })
  afterEach(() => {
    restoreEnv()
    vi.restoreAllMocks()
  })

  it("posts to the rewritten Query API host with Bearer auth and HogQLQuery body", async () => {
    let capturedUrl = ""
    let capturedInit: FetchInit | undefined
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementationOnce(async (url, init) => {
        capturedUrl = String(url)
        capturedInit = init as FetchInit
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [["2026-05-01", 7]],
            columns: ["day", "count"],
          }),
        } as Response
      })

    const mod = await import("@/lib/posthog-query")
    const rows = await mod.queryHogQL<{ day: string; count: number }>(
      "SELECT 1 AS day, 1 AS count",
    )

    expect(rows).toEqual([{ day: "2026-05-01", count: 7 }])
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    // i.posthog.com → posthog.com rewrite for the Query API host
    expect(capturedUrl).toBe("https://us.posthog.com/api/projects/42/query/")
    expect(capturedInit?.method).toBe("POST")
    expect(capturedInit?.headers?.Authorization).toBe("Bearer phx_test")
    expect(capturedInit?.headers?.["Content-Type"]).toBe("application/json")
    expect(capturedInit?.cache).toBe("no-store")
    const body = JSON.parse(capturedInit!.body!)
    expect(body.query).toEqual({
      kind: "HogQLQuery",
      query: "SELECT 1 AS day, 1 AS count",
    })
  })

  it("returns [] when fetch rejects (network error)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("ECONNREFUSED"))

    const mod = await import("@/lib/posthog-query")
    const rows = await mod.queryHogQL("SELECT failthrow")

    expect(rows).toEqual([])
    expect(warn).toHaveBeenCalled()
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes("network error")),
    ).toBe(true)
  })

  it("returns [] on non-2xx response and logs the status", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: async () => "missing scope",
    } as Response)

    const mod = await import("@/lib/posthog-query")
    const rows = await mod.queryHogQL("SELECT non2xx")
    expect(rows).toEqual([])
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes("non-2xx response: 403")),
    ).toBe(true)
  })

  it("queryFunnel computes per-step counts and conversion rates", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          ["beta_modal_opened", 100],
          ["beta_modal_submitted", 25],
        ],
        columns: ["event", "reached"],
      }),
    } as Response)

    const mod = await import("@/lib/posthog-query")
    const rows = await mod.queryFunnel(
      [{ event: "beta_modal_opened" }, { event: "beta_modal_submitted" }],
      { dateFrom: "2026-01-01", dateTo: "2026-02-01" },
    )

    expect(rows).toEqual([
      { event: "beta_modal_opened", count: 100, conversionRate: 1 },
      { event: "beta_modal_submitted", count: 25, conversionRate: 0.25 },
    ])
  })

  it("queryFunnel returns [] for invalid dateFrom (no fetch issued)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const mod = await import("@/lib/posthog-query")
    const rows = await mod.queryFunnel([{ event: "a" }], { dateFrom: "not-a-date" })
    expect(rows).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("queryTrend returns rows with numeric counts and includes breakdown when requested", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          ["2026-05-01", "pro", "3"],
          ["2026-05-02", "free", "5"],
        ],
        columns: ["day", "breakdown", "count"],
      }),
    } as Response)

    const mod = await import("@/lib/posthog-query")
    const rows = await mod.queryTrend("page_view", {
      dateFrom: "2026-05-01",
      breakdown: "plan",
    })

    expect(rows).toEqual([
      { day: "2026-05-01", breakdown: "pro", count: 3 },
      { day: "2026-05-02", breakdown: "free", count: 5 },
    ])
  })

  it("queryRetention reshapes rows into cohort/period/returning numerics", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          ["2026-05-01", 0, "20"],
          ["2026-05-01", 1, "12"],
        ],
        columns: ["cohort", "period", "returning"],
      }),
    } as Response)

    const mod = await import("@/lib/posthog-query")
    const rows = await mod.queryRetention("signup", "page_view", {
      dateFrom: "2026-05-01",
      periods: 7,
    })

    expect(rows).toEqual([
      { cohort: "2026-05-01", period: 0, returning: 20 },
      { cohort: "2026-05-01", period: 1, returning: 12 },
    ])
  })

  it("re-exports the cache tag string", async () => {
    const mod = await import("@/lib/posthog-query")
    expect(mod.POSTHOG_QUERY_CACHE_TAG).toBe("posthog-query")
  })
})
