import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ltrIsolate } from '@/lib/bidi';
import { PlayerCareerStats } from '@/components/players/PlayerCareerStats';
import { SkillHistoryChart } from '@/components/players/SkillHistoryChart';
import { TopClubsList } from '@/components/players/TopClubsList';
import { TopPartnersList } from '@/components/players/TopPartnersList';
import { VerificationMark } from '@/components/players/level';
import { useReadyViewerId } from '@/hooks/useReadyViewerId';
import { usePlayerFullStats } from '@/features/playerGlobe/hooks/usePlayerStats';
import { playerFullName } from './playerName';
import { PlayerShield } from './PlayerShield';
import { RankCell } from './RankCell';
import { ResultMatchList } from './ResultMatchList';
import { Reveal } from './Reveal';
import { usePlayerSeason } from '../hooks/usePlayerSeason';
import { resultDayLabel } from '../utils/quarterDates';
import type { LeagueResult, PublicPlayerSeason } from '../types';

type PlayerSeasonContentProps = {
  playerId: string | undefined;
  variant?: 'page' | 'modal';
};

/** Shared ranking, career statistics, and tournament history for page and modal. */
export function PlayerSeasonContent({
  playerId,
  variant = 'page',
}: PlayerSeasonContentProps): ReactElement {
  const { t } = useTranslation();
  const { player, results, resultsInWindow, isLoading, error, isNotFound } =
    usePlayerSeason(playerId);
  /**
   * The IN-NETWORK extras, on a page that is otherwise entirely public.
   *
   * This page's primary visitor is logged out, and everything above comes through
   * `publicLeagueClient` — no token, no interceptors — precisely to keep it that way.
   * The chart, partners and clubs do NOT exist publicly: they come from the mobile
   * app's viewer-scoped endpoint (`/rally/v1/players/:id/stats`, spec B6.1), which
   * answers only for a signed-in viewer who is in this player's network. So they are
   * an ADDITION for a viewer who happens to qualify, never a requirement:
   *
   *   - no viewer id (signed out, or signed in without a player row) → the query is
   *     disabled and NOT ONE REQUEST is issued; the page is byte-for-byte the page it
   *     has always been;
   *   - 404 (not in this player's network) → `stats` stays null, silently, with no
   *     error card — `usePlayerFullStats` maps that status to "not visible", not failure;
   *   - entitled → the blocks appear when their data lands.
   *
   * Called ABOVE the early returns below (hooks rule) and never gated on `player`, so
   * the two requests run in parallel rather than in series.
   */
  const viewerId = useReadyViewerId();
  const full = usePlayerFullStats(playerId ?? null, viewerId);

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
            {/* `VerificationMark` draws THIS player's level state — seal for
                confirmed, ghost for an explicit "not yet", nothing when the
                server never said — off `player.level_verified` (reaches this
                schema via the shared `PlayerContextFields` spread — see
                types.ts). */}
            <h1 className="flex flex-wrap items-center gap-2 font-display text-3xl font-black tracking-tight sm:text-4xl">
              {/* `min-w-0` overrides a flex item's default `min-width: auto` (min-content):
                  without it, `break-words` (overflow-wrap) never gets a chance to apply —
                  per CSS Text 3, overflow-wrap contributes no soft-wrap opportunity to
                  min-content sizing — so a long single-token name would overflow instead
                  of wrapping, and the header clips it (`overflow-hidden`). */}
              <span className="min-w-0 break-words">{name || '—'}</span>
              <VerificationMark verified={player.level_verified} className="shrink-0" />
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

        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 border-t border-rally-border pt-5">
          <div>
            <dt className="text-xs font-bold uppercase tracking-widest text-rally-text-muted">
              {t('league.player.rankLabel')}
            </dt>
            {/* The LEVEL rank leads, not the overall one — one player card across web
                and mobile, and a player's standing is against their own level. Its
                movement is `level_rank_change`, the level board's re-rank; pairing the
                numeral with the global `rank_change` would caption a different board. */}
            <dd className="mt-1.5">
              <RankCell
                rank={player.level_rank}
                rankChange={player.level_rank_change}
                size="hero"
              />
              <LevelLine player={player} />
              <GapAboveLine player={player} />
              <LevelContext player={player} />
              <ReliabilityLine player={player} />
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

      <OverallRankLine player={player} />

      {/* Scroll reveals on the page only: the modal opens with its own zoom,
          and stacking a second entrance on top of it reads as jank. */}
      {player.stats ? (
        <MaybeReveal animate={variant === 'page'}>
          <div className="mb-6">
            <PlayerCareerStats stats={player.stats} />
          </div>
        </MaybeReveal>
      ) : null}

      {full.stats ? (
        <MaybeReveal animate={variant === 'page'}>
          <div className="mb-6 flex flex-col gap-6">
            <SkillHistoryChart points={full.stats.skill_history} />
            <TopPartnersList partners={full.stats.top_partners} />
            <TopClubsList clubs={full.stats.top_clubs} />
          </div>
        </MaybeReveal>
      ) : null}

      <MaybeReveal animate={variant === 'page'}>
        <section className="mb-6 last:mb-0" data-testid="player-season-results">
          <h2 className="font-display text-lg font-bold">{t('league.player.results')}</h2>
          <p className="mt-1 text-sm text-rally-text-2">{t('league.player.resultsScope')}</p>
          {results.length === 0 ? (
            <p className="mt-3 text-sm text-rally-text-2">{t('league.player.noResults')}</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {results.map(result => (
                <ResultRow key={`${player.player_id}:${result.tournament_id}`} result={result} player={player} />
              ))}
            </ul>
          )}
        </section>
      </MaybeReveal>
    </div>
  );
}

/**
 * The level under the level rank — "Level B · of 42 players".
 *
 * Three states, and the middle one is the reason this is a component rather than a
 * ternary: a player can have a level with no board size behind it (an older API, or
 * a level whose board has not been counted), and "of null players" is worse than
 * saying only what is known. With no level at all there is nothing to say — the
 * rank numeral is already a dash, so a second "no level" line would only repeat it.
 */
function LevelLine({ player }: { player: PublicPlayerSeason }): ReactElement | null {
  const { t } = useTranslation();
  if (!player.band_code) return null;

  return (
    <p data-testid="player-season-level" className="mt-1.5 text-xs font-semibold text-rally-text-2">
      {player.level_players == null
        ? t('league.player.levelOnly', { band: player.band_code })
        : // `count` is the board size AND i18next's plural selector. Neither bundle
          // defines a `_one` variant, so the resolver falls back to the base key and
          // simply interpolates — one leaf, deliberately, for a count that is only
          // ever a board of many.
          t('league.player.levelLine', {
            band: player.band_code,
            count: player.level_players,
          })}
    </p>
  );
}

/**
 * The chase, under the rank it belongs to — "25 points from the spot above".
 *
 * ON THE LEVEL BOARD, which is why it sits inside the level rank's cell and not beside
 * the overall one: rally-api computes it over `level_board` (the band's re-ranked
 * table), against the next STRICTLY higher total, never a tied neighbour
 * (`routers/public/league.py`). So the smallest value the API can send is 1, and a
 * player at the top of their level gets `null` — not 0.
 *
 * `== null`, never `!gap`. The three states are "a gap of N" / "nobody above them" /
 * "the server did not say", and the last two are the same render: NOTHING. A dash or a
 * zero would both assert a gap that does not exist, and a truthiness guard would
 * additionally swallow a real 0 the day the API switches to dense ranking.
 *
 * `ltrIsolate` on the number, before interpolation, exactly as `ReliabilityLine` does:
 * the Hebrew string opens with the numeral, and an isolate keeps it one left-to-right
 * run instead of letting it reorder against the sentence around it.
 */
function GapAboveLine({ player }: { player: PublicPlayerSeason }): ReactElement | null {
  const { t } = useTranslation();
  if (player.gap_to_above == null) return null;

  return (
    <p
      data-testid="player-season-gap"
      className="mt-1.5 text-xs font-bold text-rally-accent"
    >
      {/* `count` selects the plural, `points` is the isolated token that prints. */}
      {t('league.player.gapAbove', {
        count: player.gap_to_above,
        points: ltrIsolate(String(player.gap_to_above)),
      })}
    </p>
  );
}

/**
 * The rank across EVERY band — the one thing the page could not tell a player before.
 *
 * Deliberately OUTSIDE the header card. The hero numeral is the level rank, because a
 * player's standing is against their own level, and `playerSeasonPage.test.tsx` guards
 * that the header prints no global rank at all. This is a quieter, separately labelled
 * pill below the card: the fact is available without competing with the number the page
 * leads on.
 *
 * `league.personal.overallRank` is reused verbatim rather than duplicated. It is
 * impersonal ("#47 overall" / "מקום 47 בכללי"), which is the same test that let this
 * page share `league.reason.quarterEnded` while needing its own `reasonPlayed`. No
 * `ltrIsolate`: the string interpolates a bare integer with no `%`, `#` or sign in the
 * Hebrew form, and a lone European numeral between Hebrew words does not mirror —
 * matching how `PersonalCard` renders this same key.
 *
 * `flex w-fit`, not `inline-flex`: an inline-level box sits on a text baseline, so the
 * line box adds leading above and below it and the negative margin lands half where it
 * was aimed — measured at 24.5px under the card instead of the intended 12px.
 */
function OverallRankLine({ player }: { player: PublicPlayerSeason }): ReactElement | null {
  const { t } = useTranslation();
  if (player.global_rank == null) return null;

  return (
    <p
      data-testid="player-season-overall"
      className="-mt-3 mb-6 flex w-fit items-center rounded-full border border-rally-border bg-rally-surface px-3 py-1 text-xs font-bold text-rally-text-2"
    >
      {t('league.personal.overallRank', { rank: player.global_rank })}
    </p>
  );
}

/**
 * Literal keys, never a template literal — see the note in RankCell.tsx.
 *
 * Two of the three are the player page's own, because `league.reason.played` and
 * `league.reason.levelChanged` address the reader in the first person ("your level
 * changed") and this page is about SOMEBODY ELSE. `quarter_ended` is already
 * impersonal, so it is shared verbatim rather than duplicated into a second key
 * holding the same sentence.
 */
const PLAYER_REASON_KEYS = {
  played: 'league.player.reasonPlayed',
  level_changed: 'league.player.reasonLevelChanged',
  quarter_ended: 'league.reason.quarterEnded',
} as const;

/**
 * Why the level rank moved, and whether the RANK itself is still provisional —
 * the same two facts mobile's profile card carries, so the one player card reads
 * the same on both clients.
 *
 * The reason is tied to an ACTUAL MOVE: it explains an arrow, and with no arrow on
 * screen "since their last tournament" is a caption for nothing. Zero counts as no
 * move — `RankCell` already draws the neutral glyph for it, and mobile shipped
 * "— 0 · an old quarter left the count" on a real player, which reads as noise. So
 * null and 0 are both silent here, and only a non-zero change earns a reason. The
 * provisional badge is independent — it qualifies the RANK (`is_provisional`: not
 * enough rated matches to hold a settled place on the level board), never the level
 * itself, and is stated whether or not the player has moved.
 */
function LevelContext({ player }: { player: PublicPlayerSeason }): ReactElement | null {
  const { t } = useTranslation();
  const hasMoved = player.level_rank_change != null && player.level_rank_change !== 0;
  const reasonKey =
    hasMoved && player.movement_reason ? PLAYER_REASON_KEYS[player.movement_reason] : null;

  if (!reasonKey && !player.is_provisional) return null;

  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-rally-text-muted">
      {reasonKey ? <span data-testid="player-season-reason">{t(reasonKey)}</span> : null}
      {player.is_provisional ? (
        <span
          data-testid="player-season-provisional"
          className="rounded-md border border-rally-border px-1.5 py-0.5 text-[10px] font-bold text-rally-text-2"
        >
          {t('league.provisional')}
        </span>
      ) : null}
    </p>
  );
}

/**
 * The level's reliability — PUBLIC on every league surface (spec: shown about any
 * player, not only the signed-in viewer), so unlike `PersonalCard` it belongs here
 * unconditionally. What it deliberately omits is the TARGET clause ("verified at
 * N%"): that is self-only — telling a visitor what someone else has left to earn
 * is noise, and this page is always about somebody else, never the viewer.
 *
 * Reuses the existing flat `level.reliability` i18next key verbatim (never nested
 * under it — `level.reliability` is a plain string consumed as-is by
 * `LevelStatusLine.tsx`, and nesting anything under it breaks that consumer) and
 * the same `ltrIsolate` handling as `LevelStatusLine.tsx` / `PersonalCard.tsx`: the
 * template carries no `%`, only the interpolated value does, so the percent stays
 * one left-to-right run inside a Hebrew sentence instead of mirroring.
 */
function ReliabilityLine({ player }: { player: PublicPlayerSeason }): ReactElement | null {
  const { t } = useTranslation();
  if (player.level_reliability == null) return null;

  return (
    <p
      data-testid="player-season-reliability"
      className="mt-1.5 text-xs text-rally-text-muted"
    >
      {t('level.reliability', { pct: ltrIsolate(`${player.level_reliability}%`) })}
    </p>
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
  // A pair that never reached the knockout (2026-09-17; the wire used to say `top16`).
  group: 'league.bucket.group',
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
  const awardedDay = result.awarded_at ? resultDayLabel(result.awarded_at) : '';

  return (
    <li
      data-testid={`player-season-result-${result.tournament_id}`}
      className="rounded-xl border border-rally-border bg-rally-surface"
    >
      <button
        type="button"
        onClick={() => setExpanded(open => !open)}
        aria-expanded={expanded}
        className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl p-4 text-start focus-visible:outline-2 focus-visible:outline-rally-accent"
      >
        <span className="min-w-0 flex-1">
          <span className="block break-words font-semibold text-rally-text">
            {result.tournament_name ?? t('league.player.untitledTournament')}
          </span>
          {/* The day the tournament was awarded, in Israel time. Absent on an older
              row — and unreadable on a malformed one, which `resultDayLabel` answers
              with the empty string. Either way the row simply carries no date; an
              invented "—" would read as a date that failed to load. */}
          {awardedDay ? (
            <span
              data-testid="league-result-date"
              className="mt-1 block text-xs tabular-nums text-rally-text-muted"
            >
              {awardedDay}
            </span>
          ) : null}
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-rally-text-2">
            {result.band_code ? (
              <span className="rounded-full bg-rally-accent-dim px-2 py-0.5 text-[10px] font-black text-rally-accent">
                {t('league.player.levelOnly', { band: result.band_code })}
              </span>
            ) : null}
            {bucketKey ? <span className="font-bold">{t(bucketKey)}</span> : null}
            {/* The record behind the points — under per-win scoring the points ARE
                the wins. Absent on a row settled before 2026-09-17. */}
            {result.matches_played != null ? (
              <span data-testid="league-result-record" className="tabular-nums" dir="ltr">
                {result.matches_won ?? 0}–{result.matches_played - (result.matches_won ?? 0)}
              </span>
            ) : null}
            <span className="text-rally-text-muted">
              {t('league.player.drawSize', { pairs: result.draw_size })}
            </span>
          </span>
        </span>
        <span className="w-24 shrink-0 text-end">
          <span className="block font-display text-2xl font-black tabular-nums text-rally-accent">{result.points}</span>
          <span className="block text-xs text-rally-text-2">{t('league.player.pointsLabel')}</span>
        </span>
        <span className="sr-only">{t(expanded ? 'league.match.hideMatches' : 'league.match.showMatches')}</span>
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
