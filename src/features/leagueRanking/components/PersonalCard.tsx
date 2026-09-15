import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ltrIsolate } from '@/lib/bidi';
import { VERIFIED_RELIABILITY_THRESHOLD, VerificationMark } from '@/components/players/level';
import { playerFullName } from './playerName';
import { QuarterTiles } from './QuarterTiles';
import type { BandCode, MyLeagueCard, StandingsRow } from '../types';
import { RankCell } from './RankCell';

type PersonalCardProps = {
  card: MyLeagueCard;
  /** The viewer's display name. The league API does not carry one — see below. */
  name?: string | null;
  frameLabel: string;
  /** The frame currently on screen — decides which board "leading" refers to. */
  frame: 'global' | 'band' | 'circle';
  /** The band the picker shows; null until one is picked. */
  band: BandCode | null;
  /**
   * The player directly above the viewer in the CURRENT frame, when the rows
   * on screen contain one — the chase target. Null hides the module (leader,
   * unranked, or the row sits beyond the fetched page).
   */
  chaseTarget?: StandingsRow | null;
  className?: string;
};

/** Literal keys, never a template literal — see the note in RankCell.tsx. */
const REASON_KEYS = {
  played: 'league.reason.played',
  level_changed: 'league.reason.levelChanged',
  quarter_ended: 'league.reason.quarterEnded',
} as const;

/**
 * The signed-in visitor's own standing, now the game layer's home: the rank,
 * the chase (who is next, by name, and the exact gap), and the four quarters
 * of the rolling window that make the season's shape visible.
 *
 * `name` is a prop rather than something read off `card`, because
 * `/rally/v1/league/me` carries no name and no avatar — verified against the API
 * source. Identity comes from the auth context, the only place that has it.
 *
 * A null `global_rank` is a real state, not a bug: a player with no counted results
 * has zero points and no position yet. `RankCell` already renders that honestly, so
 * the null is handed straight to it rather than branched on here.
 */
export function PersonalCard({
  card,
  name,
  frameLabel,
  frame,
  band,
  chaseTarget,
  className,
}: PersonalCardProps) {
  const { t } = useTranslation();
  const resultsInWindow = card.results.length;
  const gap = chaseTarget ? chaseTarget.points - card.points : 0;
  // Leading is claimed only for the board on screen, and on the band frame
  // only when that board is the player's own level — a C player looking at
  // the B board is not leading it.
  const isLeader =
    frame === 'global' ? card.global_rank === 1
    : frame === 'band' ? band !== null && band === card.band_code && card.level_rank === 1
    : false;

  // THE HERO IS THE RANK OF THE BOARD ON SCREEN. When the band picker is showing
  // the viewer's own level, that board ranks them by `level_rank`, so printing
  // `global_rank` there names a position on a table nobody is looking at — and
  // the sub-line then repeated the very same number. On every other frame (and on
  // another level's board, which does not rank the viewer at all) the global rank
  // is the honest hero and the level rank is the companion.
  const showsOwnLevelBoard =
    frame === 'band' && band !== null && band === card.band_code && card.level_rank != null;
  const heroRank = showsOwnLevelBoard ? card.level_rank : (card.global_rank ?? null);

  // NO RATING AT ALL vs UNVERIFIED — not the same claim. `level_verified === false`
  // with a real `level_reliability` number means the server ran `reliability_snapshot`
  // on an actual σ and it read low; `level_verified === false` with `level_reliability
  // === null` means the server never ran that snapshot at all (rally-api's
  // `get_my_season`: `my_level_verified`/`my_level_reliability` stay at their `False`/
  // `None` initialisers whenever the caller has no σ AND no declared skill_level —
  // they are only ever routed through `reliability_snapshot`, which always returns an
  // int, on every other path). `reliability_snapshot(sigma=None, ...)` itself answers
  // `(False, 0)` — an int zero — so `0` on the wire always means a snapshot WAS taken;
  // only `null` means none was. Showing the ghost + "still firming up" here would
  // claim a check that has not started, so this state gets its own sentence and no
  // mark of any kind (spec: task 7). Gated on `=== false`, not `!card.level_verified`,
  // so a `null` card (server said nothing — an older API build) is untouched.
  //
  // UNREACHABLE TODAY, deliberately kept. `mine is None` also forces `global_rank: null`
  // and empty `results`, which the early return above intercepts first — verified by
  // tracing `window_start` and `quarters[0].starts_at` to the same
  // `window_quarters(now, count)[0].starts_at` expression. So this branch cannot currently
  // fire. It stays because `MyLeagueCardSchema` permits the combination independently of
  // rank, and because the sibling `level_verified === null` guard a few lines down exists
  // for the same reason. Do not spend an hour re-deriving the unreachability — it is
  // recorded here and in personalCard.reliability.test.tsx.
  const hasNoRatingYet = card.level_verified === false && card.level_reliability == null;

  // A player with nothing yet gets one slim line, not a hero card full of
  // empty slots — the season owes them an invitation, not a monument to zero.
  if (resultsInWindow === 0 && card.global_rank == null) {
    return (
      <section
        data-testid="league-personal-card"
        aria-label={t('league.personal.aria')}
        className={cn(
          'flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl border border-rally-border bg-rally-surface px-5 py-3.5',
          className,
        )}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-rally-accent">
          {name
            ? t('league.personal.headingNamed', { name, frame: frameLabel })
            : t('league.personal.heading', { frame: frameLabel })}
        </p>
        <p className="text-sm text-rally-text-2">{t('league.personal.empty')}</p>
      </section>
    );
  }

  return (
    <section
      data-testid="league-personal-card"
      aria-label={t('league.personal.aria')}
      className={cn(
        'rounded-2xl border border-rally-accent/40 bg-gradient-to-b from-rally-accent/10 to-rally-surface p-5',
        className,
      )}
    >
      <p className="text-xs font-bold uppercase tracking-widest text-rally-accent">
        {name
          ? t('league.personal.headingNamed', { name, frame: frameLabel })
          : t('league.personal.heading', { frame: frameLabel })}
      </p>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <RankCell rank={heroRank} rankChange={card.rank_change ?? null} size="hero" />
        <span className="text-sm text-rally-text-2">
          {t('league.personal.points', { points: card.points, count: resultsInWindow })}
        </span>
      </div>

      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs text-rally-text-2">
        {showsOwnLevelBoard && card.global_rank != null ? (
          <span data-testid="league-personal-other-rank">{t('league.personal.overallRank', { rank: card.global_rank })}</span>
        ) : !showsOwnLevelBoard && card.level_rank != null && card.band_code ? (
          <span data-testid="league-personal-other-rank">{t('league.personal.levelRank', { rank: card.level_rank, band: card.band_code })}</span>
        ) : null}
        {card.movement_reason ? (
          <span data-testid="league-personal-reason" className="text-rally-text-muted">{t(REASON_KEYS[card.movement_reason])}</span>
        ) : null}
        <span data-testid="league-personal-career" className="ms-auto font-bold text-rally-text">
          {t('league.personal.career', { points: card.career_points })}
        </span>
      </div>

      {/* TWO INDEPENDENT TRUST SIGNALS — the one place they meet. `level_verified` is
          a claim about the LEVEL (the number/band that put them here); `is_provisional`
          is a claim about the RANK (fewer than 4 rated matches to hold a settled place
          on the board). Neither implies the other, so they never share a string and
          both can render at once.

          No `ReliabilityRing` here on purpose: its `value` prop is the level itself,
          two decimals, and `MyLeagueCardSchema` carries no `skill_level` — the ring
          would draw "no level yet" for a player who has one. The seal plus this line
          carry the same fact in words, the way mobile's own-card does.

          THREE STATES on `level_verified` (`boolean | null`, spec §4), not two: an
          older API build that omits the field entirely (see `feat/league-ranking` on
          rally-api, which has no `level_verified` in `LeagueMeOut`) decodes to `null`
          via the schema's `.nullable().catch(null)`, never to a silent `false`. `true`
          and `false` are both real claims the server made, in either direction; `null`
          means it made no claim at all, so this whole line — colour, seal, and
          sentence together — is hidden rather than telling the viewer their OWN level
          is "still firming up" on a fact nobody actually stated. */}
      <div className="mt-1.5 flex flex-col gap-0.5 text-xs">
        {hasNoRatingYet ? (
          // No σ, no mark: a ghost would claim a verification check that has
          // never run. This sentence is the only signal — see `hasNoRatingYet` above.
          <p data-testid="league-level-note" className="font-semibold text-rally-text-2">
            {t('level.rating.first')}
          </p>
        ) : card.level_verified != null ? (
          <p
            data-testid="league-level-note"
            className={cn(
              'inline-flex items-center gap-1.5 font-semibold',
              card.level_verified ? 'text-rally-accent' : 'text-rally-text-2',
            )}
          >
            {/* showLabel={false}: this sentence already states the fact in its own
                first-person words — VerificationMark's own "Verified" / "Not
                verified" word would just repeat it in the same <p>. Safe to
                suppress in both branches reached here (true and false) because the
                guard above only renders this element when the server actually said
                something; the one case where the label would otherwise be the only
                signal (null) skips this whole block instead of half-rendering it. */}
            <VerificationMark verified={card.level_verified} showLabel={false} className="shrink-0" />
            {t(card.level_verified ? 'league.levelNote.verified' : 'league.levelNote.unverified')}
          </p>
        ) : null}
        {/* Reliability is PUBLIC on every league surface (spec: shown about any player,
            not only the viewer) — this line stays even once verified. The TARGET clause
            is self-only: telling a visitor what someone else has left to earn is noise,
            but on the viewer's own card it's the thing they act on. Gated on `=== false`,
            never `!card.level_verified` — a `null` card (server said nothing) must not be
            told it has a threshold to reach. The threshold itself always comes from
            `VERIFIED_RELIABILITY_THRESHOLD`, never a literal — it is pinned API-side by
            `tests/rating/test_verification_thresholds.py` and drifts if that test's number
            changes. */}
        {card.level_reliability != null ? (
          <p data-testid="league-level-reliability" className="text-rally-text-muted">
            {t('level.reliability', { pct: ltrIsolate(`${card.level_reliability}%`) })}
            {card.level_verified === false
              ? ` · ${t('level.reliabilityTarget', { pct: ltrIsolate(`${VERIFIED_RELIABILITY_THRESHOLD}%`) })}`
              : null}
          </p>
        ) : null}
        {card.is_provisional ? (
          <p data-testid="league-provisional-note" className="text-rally-text-muted">
            {t('league.provisionalNote')}
          </p>
        ) : null}
      </div>

      {/* THE CHASE — the next player up, by name, with the exact gap. Only
          rendered when the rows on screen actually contain them; a target the
          page cannot verify is not shown. */}
      {isLeader ? (
        <p
          data-testid="league-chase-leading"
          className="mt-4 rounded-xl border border-rally-accent/40 bg-rally-accent-dim px-3.5 py-2.5 text-sm font-bold text-rally-accent"
        >
          {t('league.chase.leading')}
        </p>
      ) : chaseTarget && gap > 0 ? (
        <div
          data-testid="league-chase"
          className="mt-4 flex items-center gap-3 rounded-xl border border-rally-accent/40 bg-rally-accent-dim px-3.5 py-2.5"
        >
          {chaseTarget.avatar_clean_url || chaseTarget.avatar_url ? (
            <img
              src={chaseTarget.avatar_clean_url || chaseTarget.avatar_url || undefined}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full bg-rally-surface-2 object-cover"
            />
          ) : (
            <span aria-hidden className="h-8 w-8 shrink-0 rounded-full bg-rally-surface-2" />
          )}
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-bold text-rally-text">
              {playerFullName(chaseTarget) || '—'}
            </span>
            <span className="block text-xs text-rally-text-2">
              {t('league.chase.next', { rank: chaseTarget.rank })}
            </span>
          </span>
          <span className="shrink-0 font-display text-lg font-black tabular-nums text-rally-accent">
            {t('league.chase.gap', { points: gap })}
          </span>
        </div>
      ) : null}

      <QuarterTiles quarters={card.quarters} />
    </section>
  );
}
