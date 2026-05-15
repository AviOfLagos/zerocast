import { RoomStatus } from "@prisma/client"
import { redirect } from "next/navigation"
import StudioClient from "@/app/studio/[code]/StudioClient"
import DemoOverlay from "@/components/demo/DemoOverlay"
import { getCachedRoom } from "@/lib/room-cache"

interface Props {
  params: Promise<{ code: string }>
  searchParams: Promise<{ token?: string }>
}

/**
 * Token-bypass demo route — no auth required.
 * Used for quick testing: /demo/[code]?token=<livekit-token>
 */
export default async function DemoStudioPage({ params, searchParams }: Props) {
  const { code } = await params
  const { token } = await searchParams

  if (!token) redirect("/login")

  // G23 — Room doesn't exist in DB
  const room = await getCachedRoom(code)
  if (!room) {
    return (
      <div className="flex items-center justify-center h-dvh bg-[#0d0d0d]">
        <div className="text-center px-6 max-w-sm">
          <p className="text-white font-semibold text-lg mb-2">Room not found</p>
          <p className="text-gray-400 text-sm mb-6">
            This demo room does not exist or has been deleted. Room code:{" "}
            <code className="font-mono text-gray-300">{code}</code>
          </p>
          <a
            href="/login"
            className="text-indigo-400 hover:text-indigo-300 text-sm underline underline-offset-4"
          >
            Back to login
          </a>
        </div>
      </div>
    )
  }
  if (room.status === RoomStatus.ENDED) {
    return (
      <div className="flex items-center justify-center h-dvh bg-[#0d0d0d]">
        <div className="text-center px-6 max-w-sm">
          <p className="text-white font-semibold text-lg mb-2">Session ended</p>
          <p className="text-gray-400 text-sm mb-6">This demo session has already ended.</p>
          <a
            href="/login"
            className="text-indigo-400 hover:text-indigo-300 text-sm underline underline-offset-4"
          >
            Back to login
          </a>
        </div>
      </div>
    )
  }

  // G22/G24 — Basic JWT structure and room claim validation
  let tokenError: string | null = null
  let tokenExp: number | null = null
  try {
    const parts = token.split(".")
    if (parts.length !== 3) throw new Error("Malformed token")
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"))
    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      tokenError = "This demo link has expired. Please generate a new one."
    }
    if (typeof payload.exp === "number") {
      tokenExp = payload.exp
    }
    // Check room claim matches the URL code
    const tokenRoom = payload.video?.room
    if (tokenRoom && tokenRoom !== code) {
      tokenError = "Token does not match this room."
    }
  } catch {
    tokenError = "Invalid token format. Please check your demo URL."
  }

  if (tokenError) {
    return (
      <div className="flex items-center justify-center h-dvh bg-[#0d0d0d]">
        <div className="text-center px-6 max-w-sm">
          <p className="text-white font-semibold text-lg mb-2">Invalid demo link</p>
          <p className="text-gray-400 text-sm mb-6">{tokenError}</p>
          <a
            href="/login"
            className="text-indigo-400 hover:text-indigo-300 text-sm underline underline-offset-4"
          >
            Back to login
          </a>
        </div>
      </div>
    )
  }

  return (
    <>
      <StudioClient
        roomCode={code}
        hostToken={token}
        livekitUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL!}
        title={room.title ?? undefined}
      />
      {tokenExp !== null && <DemoOverlay expiresAt={tokenExp} />}
    </>
  )
}
