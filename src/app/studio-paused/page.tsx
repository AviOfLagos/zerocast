import { Pause } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function StudioPausedPage() {
  return (
    <div className="min-h-screen bg-studio-bg flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-indigo-500/15 border border-indigo-500/25 rounded-xl flex items-center justify-center mx-auto mb-6">
          <Pause className="w-8 h-8 text-indigo-300" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Host is taking a break</h1>
        <p className="text-gray-400 mb-6 leading-relaxed">
          The stream has stopped and guests have been dismissed. The room is still
          alive — refresh later or rejoin from your invite link once the host returns.
        </p>
        <Link href="/">
          <Button className="bg-indigo-500 hover:bg-indigo-400 text-white">Back to home</Button>
        </Link>
      </div>
    </div>
  )
}
