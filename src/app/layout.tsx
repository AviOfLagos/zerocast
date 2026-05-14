import type { Metadata } from "next"
import { Inter } from "next/font/google"
import BetaModal from "@/components/BetaModal"
import { ErrorBeacon } from "@/components/ErrorBeacon"
import { Providers } from "@/components/Providers"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], display: "swap" })

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zerocast.vercel.app"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Zerocast — AI-Powered Live Streaming Studio | Multistream Everywhere",
    template: "%s | Zerocast",
  },
  description:
    "Browser-based live streaming studio with a built-in AI Co-Host. Multistream to YouTube, Twitch, Kick, TikTok, and custom RTMP destinations — no downloads, no hardware, no second monitor.",
  applicationName: "Zerocast",
  keywords: [
    "live streaming studio",
    "multistreaming",
    "browser streaming",
    "AI co-host",
    "streamyard alternative",
    "restream alternative",
    "stream to youtube and twitch",
    "RTMP",
    "WebRTC streaming",
    "live chat AI",
  ],
  authors: [{ name: "NexProve", url: "https://nexprove.com" }],
  creator: "NexProve",
  publisher: "NexProve",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Zerocast",
    title: "Zerocast — AI-Powered Live Streaming Studio",
    description:
      "Browser-based studio that multistreams everywhere while your AI Co-Host manages chat, production, and engagement in your voice.",
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zerocast — AI-Powered Live Streaming Studio",
    description:
      "Multistream to YouTube, Twitch, Kick, and TikTok with an AI Co-Host that replies in your voice.",
    creator: "@nexprove",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
}

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Zerocast",
  url: SITE_URL,
  logo: `${SITE_URL}/images/logo.png`,
  sameAs: [
    "https://github.com/AviOfLagos/zerocast",
    "https://nexprove.com",
  ],
  parentOrganization: { "@type": "Organization", name: "NexProve", url: "https://nexprove.com" },
}

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Zerocast",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description:
    "Browser-based live streaming studio with built-in AI Co-Host. Multistream to YouTube, Twitch, Kick, TikTok, and custom RTMP destinations.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/PreOrder" },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
        />
      </head>
      <body className={`${inter.className} bg-[#080808] text-white antialiased`}>
        <Providers>
          {children}
          <BetaModal />
          <ErrorBeacon />
        </Providers>
      </body>
    </html>
  )
}
