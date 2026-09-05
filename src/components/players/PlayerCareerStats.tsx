import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/** The public career block: matches, wins, losses, win rate, streaks, tournaments. */
export interface PlayerCareerStatsData {
  matches_played: number
  matches_won: number
  matches_lost: number
  win_rate: number
  current_streak: number
  best_streak: number
  tournaments_played: number
  tournaments_won: number
}

/**
 * Career aggregates — the web read of the mobile Player Statistics screen: KPI tiles over a
 * win/loss bar. Shared by the league player page and the network card so the two can never
 * disagree about a number.
 */
export function PlayerCareerStats({ stats }: { stats: PlayerCareerStatsData }): ReactElement {
  const { t } = useTranslation()
  const winShare = stats.matches_played > 0 ? (stats.matches_won / stats.matches_played) * 100 : 0

  return (
    <section data-testid="player-season-stats">
      <h2 className="font-display text-lg font-bold">{t('league.stats.title')}</h2>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label={t('league.stats.matches')} value={String(stats.matches_played)} />
        <StatTile label={t('league.stats.winRate')} value={`${stats.win_rate}%`} accent />
        <StatTile
          label={t('league.stats.streak')}
          value={String(stats.current_streak)}
          sub={t('league.stats.bestStreak', { best: stats.best_streak })}
        />
        <StatTile
          label={t('league.stats.tournamentsWon')}
          value={String(stats.tournaments_won)}
          sub={t('league.stats.ofPlayed', { played: stats.tournaments_played })}
        />
      </dl>

      {stats.matches_played > 0 ? (
        <div className="mt-3 rounded-xl border border-rally-border bg-rally-surface p-3">
          <div className="flex h-2 overflow-hidden rounded-full bg-rally-surface-2">
            {/* Genuinely dynamic width — the one inline style this design allows. */}
            <span data-testid="career-win-bar" className="bg-rally-accent" style={{ width: `${winShare}%` }} />
            <span className="flex-1 bg-rally-error/50" />
          </div>
          <div className="mt-2 flex justify-between text-xs font-bold text-rally-text-2">
            <span>{t('league.stats.wins', { wins: stats.matches_won })}</span>
            <span>{t('league.stats.losses', { losses: stats.matches_lost })}</span>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function StatTile({
  label, value, sub, accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}): ReactElement {
  return (
    <div className="rounded-xl border border-rally-border bg-rally-surface p-3">
      <dt className="text-[11px] font-bold uppercase tracking-widest text-rally-text-muted">{label}</dt>
      <dd className="mt-1 flex items-baseline gap-1.5">
        <span className={cn('font-display text-2xl font-black leading-none tracking-tight tabular-nums', accent && 'text-rally-accent')}>
          {value}
        </span>
        {sub ? <span className="text-[11px] text-rally-text-muted">{sub}</span> : null}
      </dd>
    </div>
  )
}
