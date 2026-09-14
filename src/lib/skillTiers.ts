export type SkillTierCode = 'D2' | 'D1' | 'C2' | 'C1' | 'B2' | 'B1' | 'A2' | 'A1'

export interface SkillTier {
  code: SkillTierCode
  /** inclusive */
  min: number
  /** exclusive for display (see `tierForLevel`) */
  max: number
}

/**
 * The letter scale tournaments are defined in — "3.5 - 4.5 (B2 - B1)" on a
 * tournament, "4.0 (B1)" on a player. Mirror of rally-api's
 * `SKILL_LEVEL_RANGES` (`app/models/enums.py`), which the CRM and the mobile
 * app read too; keep the two tables identical.
 */
export const SKILL_TIERS: readonly SkillTier[] = [
  { code: 'D2', min: 1.0, max: 2.0 },
  { code: 'D1', min: 2.0, max: 2.5 },
  { code: 'C2', min: 2.5, max: 3.0 },
  { code: 'C1', min: 3.0, max: 3.5 },
  { code: 'B2', min: 3.5, max: 4.0 },
  { code: 'B1', min: 4.0, max: 5.0 },
  { code: 'A2', min: 5.0, max: 6.0 },
  { code: 'A1', min: 6.0, max: 7.0 },
]

/**
 * Which tier a rating is *displayed* in. Resolves half-open (`level < max`)
 * exactly like rally-api's `level_algorithm._resolve_skill_level`, so a rating
 * lands in one tier: 4.0 is B1, not B2. 7.0 (and anything above) is A1;
 * anything below 1.0 is D2.
 */
export function tierForLevel(level: number): SkillTierCode {
  for (const tier of SKILL_TIERS) {
    if (level < tier.max) return tier.code
  }
  return SKILL_TIERS[SKILL_TIERS.length - 1].code
}

/**
 * "4.0 (B1)" — the number the rating engine stores plus the tier it falls in.
 *
 * Truncates rather than rounds, because rounding can cross a boundary the tier
 * did not: `4.95.toFixed(1)` is "5.0", which this table calls A2, so a rounded
 * label would read "5.0 (B1)" and contradict itself. Truncation can only ever
 * move a number away from the next tier, never into it. Reachable in the
 * read-only branch, where the value is the rating engine's own two-decimal
 * figure rather than a slider step.
 *
 * The cost: a stored 4.68 reads "4.6" here while the profile editor rounds it to
 * "4.7". That 0.1 is the cheaper error — the tier is the load-bearing half,
 * because it is what a tournament's entry range is written in.
 */
export function formatLevelWithTier(level: number): string {
  const shown = Math.floor(level * 10) / 10
  return `${shown.toFixed(1)} (${tierForLevel(level)})`
}
