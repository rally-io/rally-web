import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { usePlayerMatches } from '../hooks/usePlayerMatches';
import { playerFullName } from './playerName';
import type { PublicMatchPlayer, PublicPlayerMatch } from '../types';

type ResultMatchListProps = {
  /** The profiled player — every match arrives oriented to them. */
  playerId: string;
  /** Their display name/avatar, for the "my pair" line the API doesn't repeat. */
  playerName: string;
  playerAvatarUrl?: string | null;
  tournamentId: string;
};

/**
 * The matches behind one expanded tournament row.
 *
 * Mounted only while the row is expanded — mounting IS the fetch trigger, so a
 * collapsed row costs nothing (and the query cache makes re-expanding free).
 * Every state here is inline and row-scoped: a failed match fetch says so
 * inside the row and leaves the rest of the season page standing.
 */
export function ResultMatchList({
  playerId,
  playerName,
  playerAvatarUrl,
  tournamentId,
}: ResultMatchListProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { matches, isLoading, error } = usePlayerMatches(playerId, tournamentId, true);

  if (isLoading) {
    return (
      <div data-testid="result-matches-loading" className="mt-3 space-y-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-rally-surface-2/60" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p data-testid="result-matches-error" className="mt-3 text-sm text-rally-text-2">
        {t('league.match.error')}
      </p>
    );
  }

  if (matches.length === 0) {
    return (
      <p data-testid="result-matches-empty" className="mt-3 text-sm text-rally-text-muted">
        {t('league.match.empty')}
      </p>
    );
  }

  const dateFormat = new Intl.DateTimeFormat(i18n.language === 'he' ? 'he-IL' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <ul data-testid="result-matches" className="mt-3 space-y-2">
      {matches.map(match => (
        <MatchCard
          key={match.match_id}
          match={match}
          playerName={playerName}
          playerAvatarUrl={playerAvatarUrl}
          dateFormat={dateFormat}
        />
      ))}
    </ul>
  );
}

function personName(person: PublicMatchPlayer): string {
  return playerFullName(person) || '—';
}

/**
 * One match, matchpointer-style: a meta line, then my pair's line over the
 * opponents' line. The winning line carries the lime tint and lit score
 * badges; the losing line a quiet red tint — both soft, so the badges carry
 * the contrast. A match with no recorded winner renders as a technical
 * result with no tints at all.
 */
function MatchCard({
  match,
  playerName,
  playerAvatarUrl,
  dateFormat,
}: {
  match: PublicPlayerMatch;
  playerName: string;
  playerAvatarUrl?: string | null;
  dateFormat: Intl.DateTimeFormat;
}): ReactElement {
  const { t } = useTranslation();

  const myNames = [playerName, ...(match.partner ? [personName(match.partner)] : [])].join(' / ');
  const opponentNames = match.opponents.map(personName).join(' / ') || '—';
  const myAvatars = [
    playerAvatarUrl ?? null,
    ...(match.partner ? [match.partner.avatar_clean_url || match.partner.avatar_url || null] : []),
  ];
  const opponentAvatars = match.opponents.map(o => o.avatar_clean_url || o.avatar_url || null);

  return (
    <li
      data-testid={`result-match-${match.match_id}`}
      data-won={match.won == null ? 'unknown' : String(match.won)}
      className="overflow-hidden rounded-lg border border-rally-border-subtle bg-rally-bg"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-3 pt-2 text-[11px] text-rally-text-muted">
        <span className="font-bold">{match.round_name ?? ''}</span>
        <span className="flex items-center gap-2">
          {match.won == null ? (
            <span className="rounded-full bg-rally-surface-2 px-2 py-0.5 font-bold text-rally-text-2">
              {t('league.match.walkover')}
            </span>
          ) : null}
          {match.completed_at ? dateFormat.format(new Date(match.completed_at)) : null}
        </span>
      </div>

      <div className="space-y-1 p-2">
        <TeamLine
          names={myNames}
          avatars={myAvatars}
          scores={match.sets.map(s => s.my_score)}
          tone={match.won == null ? 'neutral' : match.won ? 'winner' : 'loser'}
        />
        <TeamLine
          names={opponentNames}
          avatars={opponentAvatars}
          scores={match.sets.map(s => s.opponent_score)}
          tone={match.won == null ? 'neutral' : match.won ? 'loser' : 'winner'}
        />
      </div>
    </li>
  );
}

const LINE_TONE = {
  winner: 'bg-rally-accent/10',
  loser: 'bg-rally-error/10',
  neutral: 'bg-rally-surface',
} as const;

const BADGE_TONE = {
  winner: 'bg-rally-accent text-rally-accent-text',
  loser: 'bg-rally-surface-2 text-rally-text-2',
  neutral: 'bg-rally-surface-2 text-rally-text-2',
} as const;

function TeamLine({
  names,
  avatars,
  scores,
  tone,
}: {
  names: string;
  avatars: Array<string | null>;
  scores: number[];
  tone: keyof typeof LINE_TONE;
}): ReactElement {
  return (
    <div className={cn('flex items-center gap-2 rounded-md px-2.5 py-1.5', LINE_TONE[tone])}>
      <span className="flex shrink-0 -space-x-1.5">
        {avatars.map((src, i) =>
          src ? (
            <img
              key={i}
              src={src}
              alt=""
              loading="lazy"
              className="h-5 w-5 rounded-full bg-rally-surface-2 object-cover ring-1 ring-rally-bg"
            />
          ) : (
            <span
              key={i}
              aria-hidden
              className="h-5 w-5 rounded-full bg-rally-surface-2 ring-1 ring-rally-bg"
            />
          ),
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-rally-text">
        {names}
      </span>
      <span className="flex shrink-0 gap-1">
        {scores.map((score, i) => (
          <span
            key={i}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-md text-xs font-black tabular-nums',
              BADGE_TONE[tone],
            )}
          >
            {score}
          </span>
        ))}
      </span>
    </div>
  );
}
