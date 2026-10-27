// The rail follows the scroll position, so a scroll that stops between two rows would
// leave two cards half-open. When scrolling stops, the rail settles on the nearer club
// instead. It stays there while the next scroll heads towards that club, and follows the
// scroll again once the scroll passes it or heads back the other way, so starting to
// scroll again never pulls the open card back first.
// Positions are the rail's: club index plus the fraction of the way to the next one.

export interface Settle {
  /** the club the rail settled on */
  to: number
  /** the scroll position it settled from */
  from: number
}

/** The settle for a scroll that stopped at `pos`, or null when a club is already open. */
export function settleAt(pos: number): Settle | null {
  const to = Math.round(pos)
  return to === pos ? null : { to, from: pos }
}

/** Whether the rail stays settled with the scroll now at `pos`. */
export function keepsSettle(s: Settle, pos: number): boolean {
  const d = pos - s.to
  const d0 = s.from - s.to
  // the 0.05 lets a few px of drift (Safari's toolbar resizing the page) pass
  return Math.sign(d) === Math.sign(d0) && Math.abs(d) <= Math.abs(d0) + 0.05
}
