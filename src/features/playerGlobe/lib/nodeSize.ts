import {
  NODE_BASE, NODE_PER_PARTNER, NODE_PORTRAIT_FRACTION, NODE_REFERENCE_COUNT, NODE_SIZE_FACTOR_MAX,
  NODE_SIZE_FACTOR_MIN,
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
