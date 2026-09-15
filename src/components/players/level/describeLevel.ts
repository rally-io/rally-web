export type LevelState = 'none' | 'unknown' | 'unverified' | 'verified'

export interface LevelDescriptor {
  state: LevelState
  /** `skill_level.toFixed(2)`, or null in `none`. Never locale-formatted. */
  value: string | null
  /** 0–100, or null when the backend sent none — or sent nothing at all (`unknown`) */
  reliability: number | null
}

/** The one place that decides how a level renders (spec §5.1, §12). Positional so snake_case
    API types and camelCase mappers call it alike:
    `describeLevel(p.skill_level, p.level_verified, p.level_reliability)`.

    `verified === undefined` means the payload predates the field (an older backend behind a
    newer build). `verified === null` is the *live* case: the backend has the field and is
    explicitly declining to make a claim — this is what a guest looks like, since a guest has no
    player row and can never earn a rating. Both are `unknown` — a plain number — and never
    `unverified`: a dashed pill would claim something the server did not say. Tier is never
    derived here; it comes from the server. */
export function describeLevel(
  level: number | null | undefined,
  verified: boolean | null | undefined,
  reliability: number | null | undefined,
): LevelDescriptor {
  if (level == null) return { state: 'none', value: null, reliability: null }
  const value = level.toFixed(2)
  if (verified == null) return { state: 'unknown', value, reliability: null }
  return { state: verified ? 'verified' : 'unverified', value, reliability: reliability ?? null }
}
