import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { PlayerCareerStats } from '@/components/players/PlayerCareerStats'
import { SkillHistoryChart } from '@/components/players/SkillHistoryChart'
import { TopClubsList } from '@/components/players/TopClubsList'
import { TopPartnersList } from '@/components/players/TopPartnersList'
import { VerificationMark } from '@/components/players/level'
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
          {/* The strongest case for the mark on this whole feature: it prints the actual
              level number, and the mark is a claim about exactly that number.
              `VerificationMark` owns the true/false/null split itself: seal for
              confirmed, ghost for an explicit "not yet", nothing when the server
              never said (an absent pair decodes to `null`, not `false` — see
              network.ts). */}
          <span className="inline-flex items-center gap-1 rounded-full border border-rally-accent/40 bg-rally-accent-dim px-3 py-1 text-xs font-semibold text-rally-text">
            {t('network.levelChip', { level: node.skillLevel.toFixed(1) })}
            <VerificationMark verified={node.levelVerified} className="shrink-0" />
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
          <TopPartnersList partners={full.stats.top_partners} />
          <TopClubsList clubs={full.stats.top_clubs} />
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
