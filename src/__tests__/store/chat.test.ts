import { describe, it, expect, beforeEach } from "vitest"
import { useChatStore } from "@/store/chat"
import type { ChatMessage } from "@/lib/chat/types"

function makeMsg(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: `msg-${Math.random().toString(36).slice(2)}`,
    platform: "youtube",
    author: { name: "Viewer" },
    message: "Hello!",
    timestamp: new Date().toISOString(),
    ...overrides,
  } as ChatMessage
}

describe("ChatStore", () => {
  beforeEach(() => {
    useChatStore.setState({
      _messageMap: new Map(),
      messages: [],
      filters: {
        youtube: true,
        twitch: true,
        kick: true,
        tiktok: true,
        twitter: true,
        host: true,
        guest: true,
        ai: true,
      },
    })
  })

  // ── addMessage ─────────────────────────────────────────────────────────

  describe("addMessage", () => {
    it("adds a message and updates the array", () => {
      const msg = makeMsg()
      useChatStore.getState().addMessage(msg)
      expect(useChatStore.getState().messages).toHaveLength(1)
      expect(useChatStore.getState().messages[0].id).toBe(msg.id)
    })

    it("deduplicates by message id", () => {
      const msg = makeMsg({ id: "dup-1" })
      useChatStore.getState().addMessage(msg)
      useChatStore.getState().addMessage(msg)
      expect(useChatStore.getState().messages).toHaveLength(1)
    })

    it("caps at 500 messages", () => {
      for (let i = 0; i < 510; i++) {
        useChatStore.getState().addMessage(makeMsg({ id: `msg-${i}` }))
      }
      expect(useChatStore.getState().messages.length).toBeLessThanOrEqual(500)
    })

    it("handles host platform messages", () => {
      const msg = makeMsg({ platform: "host" as unknown as ChatMessage["platform"], author: { name: "You" } as unknown as ChatMessage["author"] })
      useChatStore.getState().addMessage(msg)
      expect(useChatStore.getState().messages[0].platform).toBe("host")
    })

    it("handles guest platform messages", () => {
      const msg = makeMsg({ platform: "guest" as unknown as ChatMessage["platform"], author: { name: "Guest1" } as unknown as ChatMessage["author"] })
      useChatStore.getState().addMessage(msg)
      expect(useChatStore.getState().messages[0].platform).toBe("guest")
    })

    it("handles ai platform messages", () => {
      const msg = makeMsg({ platform: "ai" as unknown as ChatMessage["platform"], author: { name: "AI Assistant" } as unknown as ChatMessage["author"] })
      useChatStore.getState().addMessage(msg)
      expect(useChatStore.getState().messages[0].platform).toBe("ai")
    })
  })

  // ── Filters ────────────────────────────────────────────────────────────

  describe("toggleFilter", () => {
    it("toggles a platform filter", () => {
      useChatStore.getState().toggleFilter("youtube")
      expect(useChatStore.getState().filters.youtube).toBe(false)
      useChatStore.getState().toggleFilter("youtube")
      expect(useChatStore.getState().filters.youtube).toBe(true)
    })

    it("does not affect other filters", () => {
      useChatStore.getState().toggleFilter("twitch")
      expect(useChatStore.getState().filters.youtube).toBe(true)
      expect(useChatStore.getState().filters.twitch).toBe(false)
    })
  })

  describe("default filters", () => {
    it("has all platforms enabled by default", () => {
      const filters = useChatStore.getState().filters
      expect(filters.youtube).toBe(true)
      expect(filters.twitch).toBe(true)
      expect(filters.kick).toBe(true)
      expect(filters.tiktok).toBe(true)
      expect(filters.host).toBe(true)
      expect(filters.guest).toBe(true)
      expect(filters.ai).toBe(true)
    })
  })

  // ── clearMessages ──────────────────────────────────────────────────────

  describe("clearMessages", () => {
    it("clears all messages", () => {
      useChatStore.getState().addMessage(makeMsg())
      useChatStore.getState().addMessage(makeMsg())
      useChatStore.getState().clearMessages()
      expect(useChatStore.getState().messages).toEqual([])
    })
  })

  // ── hydrateFilters ─────────────────────────────────────────────────────

  describe("hydrateFilters", () => {
    it("hydrates partial filters", () => {
      useChatStore.getState().hydrateFilters({ youtube: false })
      const filters = useChatStore.getState().filters
      expect(filters.youtube).toBe(false)
      expect(filters.twitch).toBe(true) // preserved
    })

    it("hydrates multiple filters", () => {
      useChatStore.getState().hydrateFilters({ youtube: false, twitch: false, ai: false })
      const filters = useChatStore.getState().filters
      expect(filters.youtube).toBe(false)
      expect(filters.twitch).toBe(false)
      expect(filters.ai).toBe(false)
      expect(filters.kick).toBe(true) // preserved
    })
  })
})
