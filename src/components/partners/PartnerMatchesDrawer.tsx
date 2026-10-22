import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar } from '@/components/tournaments/Avatar'
import { getMatches, unwrap } from '@/services/api/partnerPools'
import type { PartnerMatch } from '@/types/partnerPool'
import { DeckSpinner, MessageButton } from './DeckMessage'
import { PartnerDrawer } from './PartnerDrawer'
import { PartnerMatchActions } from './PartnerMatchActions'

interface PartnerMatchesDrawerProps {
  open: boolean
  /** fetches only with an id; the page opens this only when it has one */
  poolId: string | null
  onClose: () => void
  onRegisterTogether: (match: PartnerMatch) => void
  onWhatsApp: (match: PartnerMatch) => void
  /** the fresh count, so the header pill follows the list */
  onLoaded?: (count: number) => void
}

/** Every match in this pool; still answers after the pool closes. Ported from rally-mobile's
    PartnerMatchesSheet. */
export function PartnerMatchesDrawer({ open, poolId, onClose, onRegisterTogether, onWhatsApp, onLoaded }: PartnerMatchesDrawerProps) {
  const { t } = useTranslation()
  const [matches, setMatches] = useState<PartnerMatch[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const onLoadedRef = useRef(onLoaded)
  onLoadedRef.current = onLoaded

  useEffect(() => {
    if (!open || !poolId) return
    let current = true
    setMatches(null)
    setFailed(false)
    getMatches(poolId)
      .then((response) => {
        if (!current) return
        const list = unwrap(response)
        setMatches(list)
        onLoadedRef.current?.(list.length)
      })
      .catch(() => {
        if (current) setFailed(true)
      })
    return () => {
      current = false
    }
  }, [open, poolId, attempt])

  return (
    <PartnerDrawer open={open} title={t('partners.matches.title')} onClose={onClose} testId="partner-matches">
      {failed ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-[15px] text-rally-text-2">{t('partners.matches.error')}</p>
          <MessageButton primary onClick={() => setAttempt((n) => n + 1)} testId="partner-matches-retry">
            {t('partners.error.retry')}
          </MessageButton>
        </div>
      ) : matches === null ? (
        <DeckSpinner testId="partner-matches-loading" />
      ) : matches.length === 0 ? (
        <p data-testid="partner-matches-empty" className="mt-12 px-6 text-center text-[15px] text-rally-text-2">
          {t('partners.matches.empty')}
        </p>
      ) : (
        <ul className="flex flex-col gap-3 p-4">
          {matches.map((m) => (
            <li
              key={m.player.player_id}
              data-testid={`partner-match-row-${m.player.player_id}`}
              className="flex flex-col gap-3 rounded-[18px] border border-rally-border bg-rally-surface-2 p-4"
            >
              <div className="flex items-center gap-3">
                <Avatar name={m.player.name} src={m.player.avatar_url} size={44} />
                <span dir="auto" className="min-w-0 flex-1 truncate text-[17px] font-extrabold text-rally-text">
                  {m.player.name}
                </span>
              </div>
              <PartnerMatchActions match={m} onRegisterTogether={() => onRegisterTogether(m)} onWhatsApp={() => onWhatsApp(m)} />
            </li>
          ))}
        </ul>
      )}
    </PartnerDrawer>
  )
}
