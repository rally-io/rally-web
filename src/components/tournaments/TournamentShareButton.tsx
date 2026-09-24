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
 * The link is prefetched with the page, not on tap: iOS Safari only allows
 * `navigator.share` inside the tap's user activation, and awaiting a network call first
 * can spend it, so the tap would silently do nothing on the phone most shares come from.
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
    resolvedRef.current = null
    const pending = fetchShareUrl(tournamentId)
    pendingRef.current = pending
    void pending.then((url) => {
      if (pendingRef.current === pending) resolvedRef.current = url
    })
  }, [tournamentId])

  async function handleShare(): Promise<void> {
    const url =
      resolvedRef.current ?? (await pendingRef.current) ?? window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: tournamentName,
          text: t('tournament.tournamentShareText', { name: tournamentName }),
          url,
        })
      } catch {
        // user dismissed the native share sheet — not an error
      }
      return
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
