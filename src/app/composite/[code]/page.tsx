import CompositeClient from "./CompositeClient"

interface Props {
  params: Promise<{ code: string }>
  searchParams: Promise<{ url?: string; token?: string }>
}

// Public route — LiveKit egress workers are unauthenticated, so this page must
// not require a session. Also disable static optimization since the URL is only
// ever loaded by headless Chrome with per-egress query params.
// NOTE: localhost dev cannot be reached by LiveKit Cloud egress workers — this
// route is only useful when deployed (preview/prod). See NEXT_PUBLIC_SITE_URL
// in src/lib/egress.ts.
export const dynamic = "force-dynamic"

export default async function CompositePage({ params, searchParams }: Props) {
  const { code } = await params
  const { url, token } = await searchParams

  if (!url || !token) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <p className="px-6 text-center text-sm">
          Composite template requires <code>url</code> + <code>token</code> query params
          (LiveKit egress should provide them).
        </p>
      </div>
    )
  }

  return <CompositeClient roomCode={code} livekitUrl={url} token={token} />
}
