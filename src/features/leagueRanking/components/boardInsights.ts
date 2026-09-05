import type { StandingsRow } from '../types';

/**
 * Pure derivations the game layer draws from rows already on screen.
 * No fetching, no ranking — ranks stay server-authoritative; these only
 * SELECT rows the server already ranked.
 */

/**
 * The player the viewer is chasing: the row directly above their rank.
 *
 * Competition ranking makes "directly above" subtle: ranks repeat, so the
 * target is the row with the LARGEST rank strictly below mine — and when
 * several rows share that rank, the last of them in server order, because the
 * server sorts by points descending and the last one is the closest catch.
 *
 * Null when there is nobody above (the viewer leads), when the viewer is
 * unranked, or when the page of rows on screen doesn't reach that high — a
 * missing target hides the module rather than inventing one.
 */
export function findChaseTarget(
  rows: StandingsRow[],
  myRank: number | null | undefined,
): StandingsRow | null {
  if (myRank == null || myRank <= 1) return null;

  // The page is the TOP slice of the frame, contiguous from rank 1 — so the
  // true predecessor is provably on it only when the page reaches at least
  // rank (mine - 1). A page that stops short might be hiding the real
  // neighbour, and pointing the chase at whoever happens to be on screen
  // would tell a 47th they are chasing the leader. Hide instead.
  let maxRank = 0;
  for (const row of rows) {
    if (row.rank > maxRank) maxRank = row.rank;
  }
  if (maxRank < myRank - 1) return null;

  let target: StandingsRow | null = null;
  for (const row of rows) {
    if (row.rank >= myRank) continue;
    if (target === null || row.rank > target.rank || row.rank === target.rank) {
      // `===` keeps advancing through a tied group to its last (closest) row.
      target = row;
    }
  }
  return target;
}

/**
 * The week's biggest climb on this board, or null when nothing qualifies.
 *
 * A ▲1 wearing a crown looks like a participation prize, so the chip only
 * exists from ▲2 up. Ties are real here like everywhere else: every row that
 * climbed by the returned amount wears the chip.
 */
export function biggestClimb(rows: StandingsRow[]): number | null {
  let best = 0;
  for (const row of rows) {
    if (row.rank_change != null && row.rank_change > best) {
      best = row.rank_change;
    }
  }
  return best >= 2 ? best : null;
}
