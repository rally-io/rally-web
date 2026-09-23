import { useTranslation } from 'react-i18next'

export interface ClubLike {
  club_id: string
  name: string
  logo_url?: string | null
  matches_played: number
}

/**
 * The clubs this player actually plays at — the "favourite clubs" block, shared by the
 * globe card's Stats tab and the full player page. See `TopPartnersList` for why the
 * prop type is structural and why an empty list renders nothing at all.
 *
 * A club with no logo keeps its slot as an empty tile rather than collapsing, so the
 * names in the list stay on one vertical line.
 */
export function TopClubsList({ clubs }: { clubs: ClubLike[] }) {
  const { t } = useTranslation()
  if (clubs.length === 0) return null

  return (
    <section className="flex flex-col gap-2" data-testid="top-clubs" aria-label={t('network.stats.topClubs')}>
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-rally-text-muted">{t('network.stats.topClubs')}</h3>
      <ul className="flex flex-col gap-2">
        {clubs.map((c) => (
          <li key={c.club_id} className="flex min-h-[44px] items-center gap-2.5 rounded-2xl border border-rally-border bg-rally-surface-2 px-2.5 py-2">
            {c.logo_url ? (
              <img src={c.logo_url} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
            ) : (
              <span aria-hidden className="h-8 w-8 shrink-0 rounded-lg bg-rally-surface" />
            )}
            <span className="min-w-0 flex-1 truncate text-sm text-rally-text">{c.name}</span>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-rally-text-2">
              {t('network.games', { count: c.matches_played })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
