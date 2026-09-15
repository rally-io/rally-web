import {
  BALL_RADIUS, NODE_BASE, NODE_COLLIDE_RATIO, NODE_PER_PARTNER, NODE_PORTRAIT_FRACTION,
  NODE_REFERENCE_COUNT, NODE_SIZE_FACTOR_MAX, NODE_SIZE_FACTOR_MIN, NODE_SPACING_FILL,
} from '../constants'

/* Nodes are small on purpose: the sprite shrank ~30% more than the collide radius did,
   otherwise the clusters just pack tighter and read just as dense. */

interface Sized {
  connections: number
}

/** How much every node grows or shrinks for a ball with `playerCount` players: 1 at the
    reference population, larger below it, smaller above it (area-preserving, clamped). */
export function nodeSizeFactor(playerCount: number): number {
  const raw = Math.sqrt(NODE_REFERENCE_COUNT / Math.max(1, playerCount))
  return Math.min(NODE_SIZE_FACTOR_MAX, Math.max(NODE_SIZE_FACTOR_MIN, raw))
}

/** portrait diameter in world units */
export const nodeScale = (n: Sized, factor = 1): number => (NODE_BASE + n.connections * NODE_PER_PARTNER) * factor

export const nodeRadius = (n: Sized, factor = 1): number => nodeScale(n, factor) / 2

/** sprite side in world units — the portrait fills only part of its texture */
export const spriteScale = (n: Sized, factor = 1): number => nodeScale(n, factor) / NODE_PORTRAIT_FRACTION

/** Half the room each player keeps to themselves if the whole shell is shared evenly between
    `playerCount` of them. Falls as 1/sqrt(count), so the ball spaces itself. */
export const evenSpacingRadius = (playerCount: number): number =>
  ((2 * BALL_RADIUS) / Math.sqrt(Math.max(1, playerCount))) * NODE_SPACING_FILL

/** What the layout actually keeps clear around a player: an even share of the ball, but never
    less than the player's own portrait needs. */
export const collideRadius = (n: Sized, factor: number, playerCount: number): number =>
  Math.max(nodeRadius(n, factor) * NODE_COLLIDE_RATIO, evenSpacingRadius(playerCount))
