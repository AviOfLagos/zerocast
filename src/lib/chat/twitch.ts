import * as tmi from "tmi.js"
import { publishChat, publishEvent } from "@/lib/redis"
import type { ChatMessage } from "./types"
import type { RoomEvent } from "@/lib/redis"
import { randomUUID } from "crypto"

const activeClients = new Map<string, tmi.Client>()

function publishConnectorStatus(roomCode: string, status: string, error?: string) {
  publishEvent(roomCode, {
    type: "CHAT_CONNECTOR_STATUS",
    data: { platform: "twitch", status, ...(error ? { error } : {}) },
  } as unknown as RoomEvent).catch(() => {})
}

function resolveBadges(tags: tmi.ChatUserstate): string[] {
  const badges: string[] = []
  if (tags.badges?.broadcaster) badges.push("broadcaster")
  if (tags.badges?.moderator || tags.mod) badges.push("moderator")
  if (tags.badges?.subscriber || tags.subscriber) badges.push("subscriber")
  if (tags.badges?.vip) badges.push("vip")
  if (tags.badges?.partner) badges.push("partner")
  return badges
}

export async function startTwitchConnector(roomCode: string, channelName: string) {
  if (activeClients.has(roomCode)) return

  const client = new tmi.Client({
    channels: [channelName.toLowerCase().replace(/^#/, "")],
    connection: { reconnect: true, secure: true },
  })

  // Regular chat messages
  client.on("message", async (_channel, tags, message, self) => {
    if (self) return

    const isReply = !!tags["reply-parent-msg-id"]

    const msg: ChatMessage = {
      id: tags.id ?? randomUUID(),
      platform: "twitch",
      author: {
        name: tags["display-name"] ?? tags.username ?? "Unknown",
        color: tags.color ?? undefined,
        badges: resolveBadges(tags),
      },
      message,
      timestamp: new Date().toISOString(),
      eventType: "text",
      replyTo: isReply ? {
        messageId: tags["reply-parent-msg-id"]!,
        authorName: tags["reply-parent-display-name"] ?? tags["reply-parent-user-login"] ?? "Unknown",
      } : undefined,
    }
    await publishChat(roomCode, msg).catch(console.error)
  })

  // Subscription events
  client.on("subscription", async (_channel, username, _methods, _message, tags) => {
    const msg: ChatMessage = {
      id: randomUUID(),
      platform: "twitch",
      author: { name: tags["display-name"] ?? username ?? "Unknown" },
      message: `${tags["display-name"] ?? username} subscribed!`,
      timestamp: new Date().toISOString(),
      eventType: "subscription",
      subscription: {
        tier: tags["msg-param-sub-plan"] === "Prime" ? "Prime" :
              tags["msg-param-sub-plan"] === "2000" ? "Tier 2" :
              tags["msg-param-sub-plan"] === "3000" ? "Tier 3" : "Tier 1",
        isGift: false,
      },
    }
    await publishChat(roomCode, msg).catch(console.error)
  })

  // Resub events
  client.on("resub", async (_channel, username, months, message, tags) => {
    const msg: ChatMessage = {
      id: randomUUID(),
      platform: "twitch",
      author: { name: tags["display-name"] ?? username ?? "Unknown" },
      message: message || `${tags["display-name"] ?? username} resubscribed for ${months} months!`,
      timestamp: new Date().toISOString(),
      eventType: "subscription",
      subscription: {
        tier: tags["msg-param-sub-plan"] === "Prime" ? "Prime" :
              tags["msg-param-sub-plan"] === "2000" ? "Tier 2" :
              tags["msg-param-sub-plan"] === "3000" ? "Tier 3" : "Tier 1",
        months: typeof months === "number" ? months : parseInt(String(months), 10) || undefined,
        isGift: false,
      },
    }
    await publishChat(roomCode, msg).catch(console.error)
  })

  // Gift sub events
  client.on("subgift", async (_channel, username, _streakMonths, recipient, _methods, tags) => {
    const msg: ChatMessage = {
      id: randomUUID(),
      platform: "twitch",
      author: { name: tags["display-name"] ?? username ?? "Unknown" },
      message: `${tags["display-name"] ?? username} gifted a sub to ${recipient}!`,
      timestamp: new Date().toISOString(),
      eventType: "subscription",
      subscription: {
        tier: tags["msg-param-sub-plan"] === "2000" ? "Tier 2" :
              tags["msg-param-sub-plan"] === "3000" ? "Tier 3" : "Tier 1",
        isGift: true,
        gifterName: tags["display-name"] ?? username,
      },
    }
    await publishChat(roomCode, msg).catch(console.error)
  })

  // Cheer/Bits events
  client.on("cheer", async (_channel, tags, message) => {
    const bits = parseInt(String(tags.bits), 10) || 0
    const msg: ChatMessage = {
      id: randomUUID(),
      platform: "twitch",
      author: {
        name: tags["display-name"] ?? tags.username ?? "Unknown",
        color: tags.color ?? undefined,
        badges: resolveBadges(tags),
      },
      message: message ?? `Cheered ${bits} bits!`,
      timestamp: new Date().toISOString(),
      eventType: "donation",
      donation: {
        amount: bits,
        currency: "bits",
        formattedAmount: `${bits} Bits`,
      },
    }
    await publishChat(roomCode, msg).catch(console.error)
  })

  // Raid events
  client.on("raided", async (_channel, username, viewers) => {
    const viewerCount = typeof viewers === "number" ? viewers : parseInt(String(viewers), 10) || 0
    const msg: ChatMessage = {
      id: randomUUID(),
      platform: "twitch",
      author: { name: username ?? "Unknown" },
      message: `${username} is raiding with ${viewerCount} viewers!`,
      timestamp: new Date().toISOString(),
      eventType: "raid",
      raid: {
        viewerCount,
        raiderName: username ?? "Unknown",
      },
    }
    await publishChat(roomCode, msg).catch(console.error)
  })

  // F-22: viewer JOIN events. tmi.js fires `join(channel, username, self)`
  // when an IRC user joins the channel. We translate it into a join-flavored
  // ChatMessage so PlatformJoinPulse / useJoinDeltas can render "+N on Twitch"
  // pills in the studio header. `self` is true when our own bot joins —
  // skip those so the host doesn't see "+1 zerocast" right after stream start.
  client.on("join", async (_channel, username, self) => {
    if (self) return
    const msg: ChatMessage = {
      id: randomUUID(),
      platform: "twitch",
      author: { name: username ?? "Unknown" },
      message: `${username ?? "Someone"} joined`,
      timestamp: new Date().toISOString(),
      eventType: "join",
    }
    await publishChat(roomCode, msg).catch(console.error)
  })

  // Connection events
  client.on("connected", () => {
    publishConnectorStatus(roomCode, "connected")
  })

  client.on("disconnected", (reason: string) => {
    console.warn(`[Twitch] Disconnected for room ${roomCode}:`, reason)
    publishConnectorStatus(roomCode, "reconnecting", reason)
  })

  client.on("reconnect", () => {
    publishConnectorStatus(roomCode, "reconnecting")
  })

  await client.connect()
  activeClients.set(roomCode, client)
}

export async function stopTwitchConnector(roomCode: string) {
  const client = activeClients.get(roomCode)
  if (!client) return
  try { await client.disconnect() } catch {}
  activeClients.delete(roomCode)
}

/** Send a message to Twitch chat via tmi.js. */
export async function sendTwitchMessage(
  roomCode: string,
  message: string,
): Promise<boolean> {
  const client = activeClients.get(roomCode)
  if (!client) return false
  try {
    const channels = client.getChannels()
    if (channels.length === 0) return false
    await client.say(channels[0], message)
    return true
  } catch {
    return false
  }
}
