import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Share2 } from 'lucide-react'
import { useTournamentShare } from '@/hooks/useTournamentShare'

const COPIED_FEEDBACK_MS = 2000

/**
 * Shares the same link the manager copies from the CRM (src/hooks/useTournamentShare.ts holds
 * the fetch-on-intent and fallback rules). When the link is copied instead of shared, the
 * button says so for two seconds.
 */
export function TournamentShareButton({
  tournamentId,
  tournamentName,
}: {
  tournamentId: string
  tournamentName: string
}) {
  const { t } = useTranslation()
  const { prefetch, share } = useTournamentShare(tournamentId)
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  async function handleShare(): Promise<void> {
    const result = await share({
      title: tournamentName,
      text: t('tournament.tournamentShareText', { name: tournamentName }),
    })
    if (result !== 'copied') return
    setCopied(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
  }

  const label = copied ? t('tournament.tournamentLinkCopied') : t('tournament.tournamentDetailShare')
  const text = copied ? t('tournament.tournamentLinkCopied') : t('tournament.tournamentShareShort')

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
      className="shrink-0 inline-flex items-center gap-2 h-10 px-4 rounded-full border border-rally-border bg-rally-surface text-rally-text text-sm font-semibold transition-colors hover:border-rally-accent/60 hover:text-rally-accent"
    >
      {copied ? <Check className="w-4 h-4 text-rally-accent" /> : <Share2 className="w-4 h-4" />}
      <span>{text}</span>
    </button>
  )
}
