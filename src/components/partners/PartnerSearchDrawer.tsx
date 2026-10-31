import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar } from '@/components/tournaments/Avatar'
import { trackPartner } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import { SEARCH_MAX_CHARS, SEARCH_MIN_CHARS, searchPlayers, unwrap } from '@/services/api/partnerPools'
import type { PartnerDecision, PartnerSearchResult, SwipeOutcome } from '@/types/partnerPool'
import { DeckSpinner } from './DeckMessage'
import { PadelBall } from './PadelBall'
import { PartnerDrawer } from './PartnerDrawer'

export const SEARCH_DEBOUNCE_MS = 300

interface PartnerSearchDrawerProps {
  open: boolean
  poolId: string | null
  tournamentId: string
  onClose: () => void
  /** The deck hook's swipe (source 'search'), so a match from here celebrates like any other. */
  onSwipe: (card: PartnerSearchResult, decision: PartnerDecision) => Promise<SwipeOutcome>
}

/** Find a player in this pool by name: a pass by mistake, or someone not dealt yet. Ported
    from rally-mobile's PartnerSearchSheet. */
export function PartnerSearchDrawer({ open, poolId, tournamentId, onClose, onSwipe }: PartnerSearchDrawerProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PartnerSearchResult[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  /** Bumped on every query change: an answer for an older query is dropped on arrival. */
  const requestId = useRef(0)

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  useEffect(() => {
    const trimmed = query.trim()
    const id = ++requestId.current
    setResults(null)
    setFailed(false)
    if (!open || !poolId || trimmed.length < SEARCH_MIN_CHARS) return
    const timer = setTimeout(() => {
      searchPlayers(poolId, trimmed)
        .then((response) => {
          if (id !== requestId.current) return
          const rows = unwrap(response)
          setResults(rows)
          trackPartner('partner_search', { tournament_id: tournamentId, query_length: trimmed.length, results: rows.length })
        })
        .catch(() => {
          if (id === requestId.current) setFailed(true)
        })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, open, poolId, tournamentId])

  const like = async (row: PartnerSearchResult) => {
    setPendingId(row.player_id)
    try {
      const outcome = await onSwipe(row, 'like')
      if (!outcome.ok) return
      setResults((prev) =>
        prev ? prev.map((r) => (r.player_id === row.player_id ? { ...r, my_decision: 'like', matched: outcome.matched } : r)) : prev,
      )
    } finally {
      setPendingId(null)
    }
  }

  const tooShort = query.trim().length < SEARCH_MIN_CHARS

  return (
    <PartnerDrawer open={open} title={t('partners.search')} onClose={onClose} testId="partner-search">
      <div className="px-4 pt-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('partners.searchPlaceholder')}
          aria-label={t('partners.search')}
          maxLength={SEARCH_MAX_CHARS}
          autoComplete="off"
          dir="auto"
          data-testid="partner-search-input"
          className="h-12 w-full rounded-full border border-rally-border bg-rally-surface-2 px-4 text-base text-rally-text placeholder:text-rally-text-muted focus:border-rally-accent focus:outline-none"
        />
      </div>
      {tooShort ? (
        <p data-testid="partner-search-hint" className="mt-6 px-6 text-[15px] text-rally-text-2">
          {t('partners.searchMinChars', { min: SEARCH_MIN_CHARS })}
        </p>
      ) : failed ? (
        <p data-testid="partner-search-error" className="mt-6 px-6 text-[15px] text-rally-text-2">
          {t('partners.error.generic')}
        </p>
      ) : results === null ? (
        <DeckSpinner testId="partner-search-loading" />
      ) : results.length === 0 ? (
        <p data-testid="partner-search-empty" className="mt-6 px-6 text-[15px] text-rally-text-2">
          {t('partners.searchEmpty')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5 p-4">
          {results.map((row) => {
            const status = row.matched ? 'matched' : row.my_decision === 'like' ? 'liked' : row.my_decision === 'pass' ? 'passed' : null
            const canLike = !row.matched && row.my_decision !== 'like'
            return (
              <li
                key={row.player_id}
                data-testid={`partner-search-row-${row.player_id}`}
                className="flex items-center gap-3 rounded-2xl bg-rally-surface-2 p-3"
              >
                <Avatar name={row.name} src={row.avatar_url} size={40} />
                <div className="min-w-0 flex-1">
                  <p dir="auto" className="truncate text-base font-extrabold text-rally-text">
                    {row.name}
                  </p>
                  {status && (
                    <p
                      data-testid={`partner-search-status-${row.player_id}`}
                      className={cn('text-[13px]', status === 'matched' ? 'font-extrabold text-rally-accent' : 'text-rally-text-2')}
                    >
                      {t(`partners.status.${status}`)}
                    </p>
                  )}
                </div>
                {canLike && (
                  <button
                    type="button"
                    onClick={() => void like(row)}
                    disabled={pendingId === row.player_id}
                    aria-label={t('partners.like')}
                    data-testid={`partner-search-like-${row.player_id}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rally-accent text-rally-accent-text transition disabled:opacity-40"
                  >
                    <PadelBall className="h-5 w-5" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </PartnerDrawer>
  )
}
