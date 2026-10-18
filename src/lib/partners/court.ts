import { COURT_SIDES } from './reasons'

/* Ported from rally-mobile src/lib/partners/court.ts; logic unchanged. */

export type CourtHalf = 'left' | 'right'

export interface CourtPlacement {
  /** Where the card's player stands: a half, or the middle when we cannot say. */
  them: CourtHalf | 'centre'
  /** Where the viewer's marker goes; null draws no marker. */
  you: CourtHalf | null
}

const HALF: Record<string, CourtHalf> = { left_side: 'left', right_side: 'right' }
const other = (half: CourtHalf): CourtHalf => (half === 'left' ? 'right' : 'left')

/** A court side the copy knows, or null. */
function known(side: string | null | undefined): string | null {
  return side && COURT_SIDES.has(side) ? side : null
}

/**
 * Where the two of you stand on the deck card's court. The court is physical, so nothing here
 * mirrors in Hebrew.
 *
 * - Your side unknown, or theirs unknown: no marker (and they stand in the middle when theirs
 *   is unknown), since the card cannot say whether you fit.
 * - Both flexible: they stand in the middle, no marker; any split would be made up.
 * - One of you flexible: the flexible one takes the other half, the way the pair would line up.
 * - Same side: both in one half, which is the point: the card shows the clash.
 */
export function courtPlacement(theirSide: string | null | undefined, yourSide: string | null | undefined): CourtPlacement {
  const theirs = known(theirSide)
  const yours = known(yourSide)

  if (!theirs) return { them: 'centre', you: null }
  const theirHalf = HALF[theirs] ?? null
  const yourHalf = yours ? (HALF[yours] ?? null) : null

  if (!yours) return { them: theirHalf ?? 'centre', you: null }
  if (theirHalf && yourHalf) return { them: theirHalf, you: yourHalf }
  if (theirHalf) return { them: theirHalf, you: other(theirHalf) }
  if (yourHalf) return { them: other(yourHalf), you: yourHalf }
  return { them: 'centre', you: null }
}
