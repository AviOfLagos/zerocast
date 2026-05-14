"use client"

import { SessionProvider } from "next-auth/react"
import type { ReactNode } from "react"

import { PostHogIdentify } from "@/components/PostHogIdentify"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <PostHogIdentify />
      {children}
    </SessionProvider>
  )
}
