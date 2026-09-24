import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Share2 } from 'lucide-react'
import { getTournamentShareLink } from '@/services/api/tournaments'

const COPIED_FEEDBACK_MS = 2000

async function fetchShareUrl(tournamentId: string): Promise<string | null> {
  try {
    const result = await getTournamentShareLink(tournamentId)
    return result.success && result.data?.share_url ? result.data.share_url : null
  } catch {
    return null
  }
}

/**
 * Shares the same link the manager copies from the CRM. A failed fetch never blocks the
 * share: it falls back to this page's own URL.
 *
 * The link is fetched on intent (hover, touch start, focus) rather than on click: iOS
 * Safari only allows `navigator.share` inside the tap's user activation, and awaiting a
 * network call first can spend it. Fetching on intent keeps the click synchronous in the
 * common case without a Short.io call on every page view. If the activation is lost
 * anyway, the share falls back to copying the link.
 */
export function TournamentShareButton({
  tournamentId,
  tournamentName,
}: {
  tournamentId: string
  tournamentName: string
}) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  // The in-flight prefetch is kept so a tap that beats it reuses the request instead of
  // starting a second one; `resolved` lets a later tap share without awaiting at all.
  const pendingRef = useRef<Promise<string | null> | null>(null)
  const resolvedRef = useRef<string | null>(null)

  useEffect(() => {
    pendingRef.current = null
    resolvedRef.current = null
  }, [tournamentId])

  function prefetch(): Promise<string | null> {
    if (!pendingRef.current) {
      const pending = fetchShareUrl(tournamentId)
      pendingRef.current = pending
      void pending.then((url) => {
        if (pendingRef.current === pending) resolvedRef.current = url
      })
    }
    return pendingRef.current
  }

  async function handleShare(): Promise<void> {
    const url = resolvedRef.current ?? (await prefetch()) ?? window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: tournamentName,
          text: t('tournament.tournamentShareText', { name: tournamentName }),
          url,
        })
        return
      } catch (err) {
        // Dismissing the sheet is not an error. Anything else (Safari's NotAllowedError
        // after a lost activation) would otherwise be a silent no-op, so copy instead.
        if ((err as { name?: string } | null)?.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      return
    }
    setCopied(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
  }

  const label = copied ? t('tournament.tournamentLinkCopied') : t('tournament.tournamentDetailShare')

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      onPointerEnter={() => void prefetch()}
      onTouchStart={() => void prefetch()}
      onFocus={() => void prefetch()}
      aria-label={label}
      title={label}
      data-testid="tournament-share-button"
      className="fixed top-24 end-4 z-20 h-[42px] rounded-full bg-black/50 backdrop-blur flex items-center justify-center gap-2 px-3 text-white"
    >
      {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
      {copied && <span className="text-sm font-semibold">{label}</span>}
    </button>
  )
}
