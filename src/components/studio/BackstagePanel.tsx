"use client"

import { useParticipants } from "@livekit/components-react"
import { Users } from "lucide-react"

import ParticipantRow from "@/components/studio/ParticipantRow"
import { useStudioStore } from "@/store/studio"

interface BackstagePanelProps {
  isHost?: boolean
  roomCode: string
  hostToken?: string
}

export default function BackstagePanel({ isHost, roomCode, hostToken }: BackstagePanelProps) {
  const participants = useParticipants()
  const onScreenParticipantIds = useStudioStore((s) => s.onScreenParticipantIds)

  if (!isHost) return null

  const stageIsOpen = onScreenParticipantIds.length === 0

  // Split participants into on-stage / backstage groups
  const onStage = stageIsOpen
    ? participants
    : participants.filter((p) => onScreenParticipantIds.includes(p.identity))

  const backstage = stageIsOpen
    ? []
    : participants.filter((p) => !onScreenParticipantIds.includes(p.identity))

  // Only show host when alone — always show the panel for host visibility
  const hasOverflow = participants.length > 4

  return (
    <div className="relative min-h-[5.5rem] bg-[#080808] border-t border-white/6">
      <div
        className="flex items-center gap-2 px-3 py-2 overflow-x-auto min-h-[5.5rem] scroll-smooth"
        role="group"
        aria-label="Participants"
      >
        {participants.length <= 1 ? (
          <div className="flex items-center gap-2 text-gray-400 text-xs mx-auto">
            <Users className="w-3.5 h-3.5" />
            <span>No guests yet — share the invite link</span>
          </div>
        ) : (
          <>
            {backstage.map((p) => (
              <ParticipantRow
                key={p.identity}
                participant={p}
                isOnStage={false}
                roomCode={roomCode}
                hostToken={hostToken}
              />
            ))}
            {onStage.map((p) => (
              <ParticipantRow
                key={p.identity}
                participant={p}
                isOnStage={true}
                roomCode={roomCode}
                hostToken={hostToken}
              />
            ))}
          </>
        )}
      </div>
      {/* Right-edge scroll affordance — only when participants overflow */}
      {hasOverflow && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-[#080808] to-transparent"
        />
      )}
    </div>
  )
}
