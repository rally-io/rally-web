import { useTranslation } from 'react-i18next'
import { Avatar } from '@/components/tournaments/Avatar'

export interface PartnerLike {
  player_id: string
  display_name: string
  avatar_url?: string | null
  matches_played: number
}

/**
 * The people this player wins with — one shared list for every surface that shows it
 * (the globe card's Stats tab and the full player page), so the same data never grows
 * a second visual language. Structural prop type, like `SkillPointLike` next door: the
 * payload this renders is owned by `features/playerGlobe/api/playerStats`, and a shared
 * component importing a feature's zod type back would invert the dependency.
 *
 * Renders NOTHING for an empty list — a heading over no rows is a worse answer than
 * silence, and on the public player page an empty section would also be a visible hint
 * about a payload the visitor is not entitled to.
 */
export function TopPartnersList({ partners }: { partners: PartnerLike[] }) {
  const { t } = useTranslation()
  if (partners.length === 0) return null

  return (
    <section className="flex flex-col gap-2" data-testid="top-partners" aria-label={t('network.stats.topPartners')}>
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-rally-text-muted">{t('network.stats.topPartners')}</h3>
      <ul className="flex flex-col gap-2">
        {partners.map((p) => (
          <li key={p.player_id} className="flex min-h-[44px] items-center gap-2.5 rounded-2xl border border-rally-border bg-rally-surface-2 px-2.5 py-2">
            <Avatar name={p.display_name} src={p.avatar_url ?? null} size={32} />
            <span className="min-w-0 flex-1 truncate text-sm text-rally-text" dir="auto">{p.display_name}</span>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-rally-accent">
              {t('network.games', { count: p.matches_played })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
