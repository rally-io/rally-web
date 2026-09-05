import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playerFullName } from './playerName';
import { PlayerShield } from './PlayerShield';
import { RankCell } from './RankCell';
import { ResultMatchList } from './ResultMatchList';
import { Reveal } from './Reveal';
import { usePlayerSeason } from '../hooks/usePlayerSeason';
import { dropDayLabel, lastCountingDayLabel, quarterParts } from '../utils/quarterDates';
import type { LeagueQuarterBlock, LeagueResult, PublicPlayerSeason, PublicPlayerStats } from '../types';

type PlayerSeasonContentProps = {
  playerId: string | undefined;
  /**
   * `page` adds the career-stats section between the header and the results.
   * The modal stays lean — it opens over the board for a quick look, and the
   * footer link hands off to the full page for the rest.
   */
  variant?: 'page' | 'modal';
};

/**
 * One player's season — the header card, career stats (page variant), and the
 * results with their collapsible match lists. Shared verbatim by the shareable
 * page (`PlayerSeasonPage`) and the board's modal (`PlayerSeasonModal`), so
 * the two can never drift apart. All state test-ids live here for the same
 * reason.
 *
 * Every result in the window counts — there is no drop any more. Results are grouped
 * by quarter instead, newest first, so a player can see each result's expiry: which
 * quarter it belongs to and the last day that quarter still counts.
 */
export function PlayerSeasonContent({
  playerId,
  variant = 'page',
}: PlayerSeasonContentProps): ReactElement {
  const { t } = useTranslation();
  const { player, quarters, resultsInWindow, isLoading, error, isNotFound } =
    usePlayerSeason(playerId);

  if (isLoading) {
    return (
      <p data-testid="player-season-loading" className="py-8 text-center text-rally-text-2">
        {t('league.player.loading')}
      </p>
    );
  }

  if (isNotFound) {
    return <StateCard testId="player-season-not-found" message={t('league.player.notFound')} />;
  }

  if (error || !player) {
    return <StateCard testId="player-season-error" message={t('league.player.error')} />;
  }

  const name = playerFullName(player);

  return (
    <div>
      {/* The player's own card — the product's shield, tier-coloured, with
          their cut-out (or the generic portrait) in the crown. A soft lime
          bloom behind it is the one glow this page allows itself. */}
      <header
        className="relative mb-6 overflow-hidden rounded-2xl border border-rally-accent/30 bg-gradient-to-b from-rally-accent/10 to-rally-surface p-6"
        data-testid="player-season-header"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute top-[-40%] start-[-10%] h-64 w-64 rounded-full bg-rally-accent/15 blur-3xl"
        />
        <div className="relative flex items-center gap-5">
          <PlayerShield player={player} className="w-24 shrink-0 sm:w-28" />
          <div className="min-w-0">
            <h1 className="truncate font-display text-3xl font-black tracking-tight sm:text-4xl">
              {name || '—'}
            </h1>
            <p className="mt-2 text-sm font-bold uppercase tracking-widest text-rally-text-muted">
              {player.season.name}
            </p>
            {/* The streak flame: only when a streak is actually alive — a
                "streak of 1" is just a win, and a dead streak is nothing. */}
            {player.stats && player.stats.current_streak >= 2 ? (
              <p
                data-testid="league-streak"
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-rally-accent/40 bg-rally-accent-dim px-3 py-1.5 text-xs font-black text-rally-accent"
              >
                <Flame aria-hidden className="h-3.5 w-3.5" />
                {t('league.streak.current', { n: player.stats.current_streak })}
                <span className="font-medium text-rally-text-2">
                  · {t('league.streak.best', { best: player.stats.best_streak })}
                </span>
              </p>
            ) : null}
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-rally-border pt-5">
          <div>
            <dt className="text-xs font-bold uppercase tracking-widest text-rally-text-muted">
              {t('league.player.rankLabel')}
            </dt>
            <dd className="mt-1.5">
              <RankCell
                rank={player.global_rank ?? null}
                rankChange={player.rank_change ?? null}
                size="hero"
              />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-widest text-rally-text-muted">
              {t('league.player.pointsLabel')}
            </dt>
            <dd className="mt-1.5 font-display text-4xl font-black leading-none tracking-tight tabular-nums text-rally-accent">
              {player.points}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-widest text-rally-text-muted">
              {t('league.player.countedLabel')}
            </dt>
            <dd className="mt-1.5 font-display text-4xl font-black leading-none tracking-tight tabular-nums">
              {resultsInWindow}
            </dd>
          </div>
        </dl>
        <p data-testid="player-season-career" className="mt-3 text-sm text-rally-text-2">
          {t('league.player.career', { points: player.career_points })}
        </p>
      </header>

      {/* Scroll reveals on the page only: the modal opens with its own zoom,
          and stacking a second entrance on top of it reads as jank. */}
      {variant === 'page' && player.stats ? (
        <Reveal>
          <StatsSection stats={player.stats} />
        </Reveal>
      ) : null}

      <MaybeReveal animate={variant === 'page'}>
        <section className="mb-6 last:mb-0" data-testid="player-season-results">
          <h2 className="font-display text-lg font-bold">{t('league.player.results')}</h2>
          {quarters.length === 0 ? (
            <p className="mt-3 text-sm text-rally-text-2">{t('league.player.noResults')}</p>
          ) : (
            <div className="mt-3 space-y-5">
              {quarters.map((quarter, index) => (
                <QuarterSection
                  key={quarter.key}
                  quarter={quarter}
                  isOldest={index === quarters.length - 1}
                  player={player}
                />
              ))}
            </div>
          )}
        </section>
      </MaybeReveal>
    </div>
  );
}

function QuarterSection({
  quarter,
  isOldest,
  player,
}: {
  quarter: LeagueQuarterBlock;
  isOldest: boolean;
  player: PublicPlayerSeason;
}): ReactElement {
  const { t } = useTranslation();
  const parts = quarterParts(quarter.key);
  const title = parts ? t('league.quarters.label', { n: parts.n, year: parts.year }) : quarter.key;
  const when = isOldest
    ? t('league.quarters.dropsOn', { date: dropDayLabel(quarter.drops_at) })
    : t('league.quarters.until', { date: lastCountingDayLabel(quarter.drops_at) });

  return (
    <div data-testid={`player-season-quarter-${quarter.key}`} data-quarter={quarter.key}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-display text-base font-bold">{title}</h3>
        <span className="font-display text-base font-black tabular-nums text-rally-accent">
          {t('league.player.resultPoints', { points: quarter.points })}
        </span>
        <span className="text-xs text-rally-text-muted">{when}</span>
        {quarter.results.length > 0 ? (
          <span className="ms-auto text-xs text-rally-text-muted">
            {t('league.quarters.onOffer', { available: quarter.available })}
          </span>
        ) : null}
      </div>
      {quarter.results.length === 0 ? (
        <p className="mt-2 text-sm text-rally-text-2">{t('league.quarters.empty')}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {quarter.results.map(result => (
            <ResultRow key={result.tournament_id} result={result} player={player} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MaybeReveal({
  animate,
  delay,
  children,
}: {
  animate: boolean;
  delay?: number;
  children: ReactElement;
}): ReactElement {
  return animate ? <Reveal delay={delay}>{children}</Reveal> : children;
}

function StateCard({ testId, message }: { testId: string; message: string }): ReactElement {
  return (
    <p
      data-testid={testId}
      className="rounded-2xl border border-rally-border bg-rally-surface px-4 py-12 text-center text-sm font-semibold text-rally-text-2"
    >
      {message}
    </p>
  );
}

/**
 * Career aggregates, page variant only — the web read of the mobile Player
 * Statistics screen: KPI tiles over a win/loss bar. Only ever rendered when
 * the API sent the block; an older API simply has no stats section.
 */
function StatsSection({ stats }: { stats: PublicPlayerStats }): ReactElement {
  const { t } = useTranslation();
  const winShare = stats.matches_played > 0 ? (stats.matches_won / stats.matches_played) * 100 : 0;

  return (
    <section data-testid="player-season-stats" className="mb-6">
      <h2 className="font-display text-lg font-bold">{t('league.stats.title')}</h2>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label={t('league.stats.matches')} value={String(stats.matches_played)} />
        <StatTile
          label={t('league.stats.winRate')}
          value={`${stats.win_rate}%`}
          accent
        />
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
            <span className="bg-rally-accent" style={{ width: `${winShare}%` }} />
            <span className="flex-1 bg-rally-error/50" />
          </div>
          <div className="mt-2 flex justify-between text-xs font-bold text-rally-text-2">
            <span>{t('league.stats.wins', { wins: stats.matches_won })}</span>
            <span>{t('league.stats.losses', { losses: stats.matches_lost })}</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}): ReactElement {
  return (
    <div className="rounded-xl border border-rally-border bg-rally-surface p-3">
      <dt className="text-[11px] font-bold uppercase tracking-widest text-rally-text-muted">
        {label}
      </dt>
      <dd className="mt-1 flex items-baseline gap-1.5">
        <span
          className={cn(
            'font-display text-2xl font-black leading-none tracking-tight tabular-nums',
            accent && 'text-rally-accent',
          )}
        >
          {value}
        </span>
        {sub ? <span className="text-[11px] text-rally-text-muted">{sub}</span> : null}
      </dd>
    </div>
  );
}

/**
 * Literal keys in a map, never a template literal — see the note in RankCell.tsx.
 * An unknown bucket value renders no stage label rather than a raw key: the row
 * still carries the tournament, the band and the points, which are the facts.
 */
const BUCKET_KEYS: Record<string, string> = {
  first: 'league.bucket.first',
  second: 'league.bucket.second',
  top4: 'league.bucket.top4',
  top8: 'league.bucket.top8',
  top16: 'league.bucket.top16',
  top32: 'league.bucket.top32',
};

/**
 * One tournament row, expandable to the player's matches in it.
 *
 * COLLAPSED BY DEFAULT, and the match list mounts only while expanded —
 * mounting is what triggers the fetch, so ten collapsed rows cost zero match
 * requests. The summary row is a real button (`aria-expanded`), and the
 * points figure stays on it in both states.
 */
function ResultRow({
  result,
  player,
}: {
  result: LeagueResult;
  player: PublicPlayerSeason;
}): ReactElement {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const bucketKey = BUCKET_KEYS[result.placement_bucket];

  return (
    <li
      data-testid={`player-season-result-${result.tournament_id}`}
      className="rounded-xl border border-rally-border bg-rally-surface"
    >
      <button
        type="button"
        onClick={() => setExpanded(open => !open)}
        aria-expanded={expanded}
        aria-label={expanded ? t('league.match.hideMatches') : t('league.match.showMatches')}
        className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl p-4 text-start focus-visible:outline-2 focus-visible:outline-rally-accent"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-rally-text">
            {result.tournament_name ?? t('league.player.untitledTournament')}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-rally-text-2">
            {result.band_code ? (
              <span className="rounded-full bg-rally-accent-dim px-2 py-0.5 text-[10px] font-black text-rally-accent">
                {result.band_code}
              </span>
            ) : null}
            {bucketKey ? <span className="font-bold">{t(bucketKey)}</span> : null}
            <span className="text-rally-text-muted">
              {t('league.player.drawSize', { pairs: result.draw_size })}
            </span>
          </span>
        </span>
        <span className="font-display text-lg font-black tabular-nums text-rally-accent">
          {t('league.player.resultPoints', { points: result.points })}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            'h-4 w-4 shrink-0 text-rally-text-muted transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {expanded ? (
        <div className="border-t border-rally-border-subtle px-4 pb-4">
          <ResultMatchList
            playerId={player.player_id}
            playerName={playerFullName(player) || '—'}
            playerAvatarUrl={player.avatar_clean_url || player.avatar_url || null}
            tournamentId={result.tournament_id}
          />
        </div>
      ) : null}
    </li>
  );
}
