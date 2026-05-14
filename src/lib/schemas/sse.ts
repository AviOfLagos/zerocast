import { z } from "zod"

import { ChatMessageSchema } from "./chat"

// ── SSE event discriminated union ────────────────────────────────────────────

export const SSEChatMessageEventSchema = z.object({
  type: z.literal("CHAT_MESSAGE"),
  data: ChatMessageSchema,
})

export const SSEGuestRequestEventSchema = z.object({
  type: z.literal("GUEST_REQUEST"),
  data: z.object({
    guestId: z.string(),
    name: z.string(),
  }),
})

export const SSEGuestAdmittedEventSchema = z.object({
  type: z.literal("GUEST_ADMITTED"),
  data: z.object({
    guestId: z.string(),
    token: z.string(),
    identity: z.string().optional(),
    name: z.string().optional(),
  }),
})

export const SSEGuestDeniedEventSchema = z.object({
  type: z.literal("GUEST_DENIED"),
  data: z.object({
    guestId: z.string(),
  }),
})

export const SSEGuestLeftEventSchema = z.object({
  type: z.literal("GUEST_LEFT"),
  data: z.object({
    participantId: z.string(),
    name: z.string().optional(),
    reason: z.enum(["kicked", "left"]).optional(),
  }),
})

export const SSEStudioEndedEventSchema = z.object({
  type: z.literal("STUDIO_ENDED"),
})

export const SSEStudioPausedEventSchema = z.object({
  type: z.literal("STUDIO_PAUSED"),
})

export const SSEPingEventSchema = z.object({
  type: z.literal("PING"),
})

export const SSEConnectionErrorEventSchema = z.object({
  type: z.literal("CONNECTION_ERROR"),
})

export const SSEPlatformTokenExpiredEventSchema = z.object({
  type: z.literal("PLATFORM_TOKEN_EXPIRED"),
  data: z.object({
    platform: z.string(),
    error: z.string(),
  }),
})

export const SSEChatConnectorStatusEventSchema = z.object({
  type: z.literal("CHAT_CONNECTOR_STATUS"),
  data: z.object({
    platform: z.string(),
    status: z.enum(["connecting", "connected", "reconnecting", "failed"]),
    error: z.string().optional(),
  }),
})

export const SSEStreamStartedEventSchema = z.object({
  type: z.literal("STREAM_STARTED"),
  data: z.object({
    platforms: z.array(z.string()),
    egressId: z.string(),
  }),
})

export const SSEStreamStoppedEventSchema = z.object({
  type: z.literal("STREAM_STOPPED"),
})

export const SSEStreamDestinationChangedEventSchema = z.object({
  type: z.literal("STREAM_DESTINATION_CHANGED"),
  data: z.object({
    action: z.enum(["add", "remove"]),
    platform: z.string(),
  }),
})

export const SSEStreamErrorEventSchema = z.object({
  type: z.literal("STREAM_ERROR"),
  data: z.object({
    platform: z.string().optional(),
    error: z.string(),
  }),
})

export const SSEPlatformStreamDroppedEventSchema = z.object({
  type: z.literal("PLATFORM_STREAM_DROPPED"),
  data: z.object({
    platform: z.string(),
    reason: z.string().optional(),
  }),
})

export const SSEEventDataSchema = z.discriminatedUnion("type", [
  SSEChatMessageEventSchema,
  SSEGuestRequestEventSchema,
  SSEGuestAdmittedEventSchema,
  SSEGuestDeniedEventSchema,
  SSEGuestLeftEventSchema,
  SSEStudioEndedEventSchema,
  SSEStudioPausedEventSchema,
  SSEPingEventSchema,
  SSEConnectionErrorEventSchema,
  SSEPlatformTokenExpiredEventSchema,
  SSEChatConnectorStatusEventSchema,
  SSEStreamStartedEventSchema,
  SSEStreamStoppedEventSchema,
  SSEStreamDestinationChangedEventSchema,
  SSEStreamErrorEventSchema,
  SSEPlatformStreamDroppedEventSchema,
])
export type SSEEventData = z.infer<typeof SSEEventDataSchema>
