import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Avatar } from '@/components/tournaments/Avatar'
import { PlayerCareerStats } from '@/components/players/PlayerCareerStats'
import { SkillHistoryChart } from '@/components/players/SkillHistoryChart'
import { usePlayerFullStats, usePublicPlayerStats } from '../hooks/usePlayerStats'
import type { GlobeNode } from '../types'

export interface PlayerStatsTabProps {
  node: GlobeNode
  /** the signed-in viewer's id, only once their own player profile is ready; the full
      stats are only requested for a viewer in that state (see usePlayerFullStats) */
  viewerId: string | null
}

/** The card's Stats tab: chips, the public career block, then — for players in the viewer's
    network — the level chart, top partners and top clubs; the full-page link last. */
export function PlayerStatsTab({ node, viewerId }: PlayerStatsTabProps) {
  const { t } = useTranslation()
  const career = usePublicPlayerStats(node.id)
  const full = usePlayerFullStats(node.id, viewerId)

  return (
    <div className="flex flex-col gap-4">
      {node.skillLevel != null && (
        <div>
          <span className="inline-flex items-center rounded-full border border-rally-accent/40 bg-rally-accent-dim px-3 py-1 text-xs font-semibold text-rally-text">
            {t('network.levelChip', { level: node.skillLevel.toFixed(1) })}
          </span>
        </div>
      )}

      {career.isPending && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-rally-border bg-rally-surface" />
          ))}
        </div>
      )}
      {career.isError && (
        <p className="flex items-center justify-between gap-3 rounded-xl border border-rally-border bg-rally-surface px-3 py-2 text-xs text-rally-text-2">
          {t('network.stats.error')}
          <button type="button" onClick={() => void career.refetch()} className="font-bold text-rally-accent">
            {t('network.retry')}
          </button>
        </p>
      )}
      {career.data && <PlayerCareerStats stats={career.data} />}

      {full.stats && (
        <>
          <SkillHistoryChart points={full.stats.skill_history} />
          {full.stats.top_partners.length > 0 && (
            <section className="flex flex-col gap-2" aria-label={t('network.stats.topPartners')}>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-rally-text-muted">{t('network.stats.topPartners')}</h3>
              <ul className="flex flex-col gap-2">
                {full.stats.top_partners.map((p) => (
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
          )}
          {full.stats.top_clubs.length > 0 && (
            <section className="flex flex-col gap-2" aria-label={t('network.stats.topClubs')}>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-rally-text-muted">{t('network.stats.topClubs')}</h3>
              <ul className="flex flex-col gap-2">
                {full.stats.top_clubs.map((c) => (
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
          )}
        </>
      )}

      <Link
        to={`/ranking/player/${node.id}`}
        className="inline-flex items-center gap-1.5 self-start text-sm font-bold text-rally-accent hover:text-rally-accent-hover"
      >
        {t('network.stats.openFullProfile')}
        <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
      </Link>
    </div>
  )
}
