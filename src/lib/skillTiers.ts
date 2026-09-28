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

export interface TournamentLevelBand {
  code: SkillTierCode
  /** Exactly the string a tournament carries as its level, e.g. "2.5 - 3.0 (D1 - C2)". */
  label: string
  min: number
  max: number
}

/**
 * The level bands TOURNAMENTS are created in, written the way a tournament shows
 * its level — with the letter range: "2.5 - 3.0 (D1 - C2)". Mirror of rally-crm's
 * `SKILL_LEVEL_OPTIONS` (`src/utils/skillLevels.ts`, the `value` of each option),
 * which is where managers create tournaments; production tournaments carry exactly
 * these strings (checked 2026-09-28: the top five are these, 4–15 tournaments each).
 *
 * NOT the same table as `SKILL_TIERS` above, and the two disagree on purpose-less
 * points: here B1 ends at 4.5 and there is no band between 4.5 and 5.0 (nor 1.5–2.0,
 * 5.5–6.0); `SKILL_TIERS` has B1 run to 5.0 with no gaps. That split predates this
 * list and is the level-scale project's to resolve. Kept here verbatim rather than
 * derived from `SKILL_TIERS`, because derivation would print "(D2 - D1)" and
 * "4.0 - 5.0" — strings no tournament carries.
 */
export const TOURNAMENT_LEVEL_BANDS: readonly TournamentLevelBand[] = [
  { code: 'D2', label: '1.0 - 1.5 (D2)', min: 1.0, max: 1.5 },
  { code: 'D1', label: '2.0 - 2.5 (D1)', min: 2.0, max: 2.5 },
  { code: 'C2', label: '2.5 - 3.0 (D1 - C2)', min: 2.5, max: 3.0 },
  { code: 'C1', label: '3.0 - 3.5 (C2 - C1)', min: 3.0, max: 3.5 },
  { code: 'B2', label: '3.5 - 4.0 (C1 - B2)', min: 3.5, max: 4.0 },
  { code: 'B1', label: '4.0 - 4.5 (B2 - B1)', min: 4.0, max: 4.5 },
  { code: 'A2', label: '5.0 - 5.5 (A2)', min: 5.0, max: 5.5 },
  { code: 'A1', label: '6.0 - 7.0 (A1)', min: 6.0, max: 7.0 },
]

/**
 * Every tournament band wholly inside [min, max], lowest first, as the labels a
 * tournament shows — the list an event offers a pair to choose its category from.
 */
export function tournamentLevelsBetween(min: number, max: number): string[] {
  return TOURNAMENT_LEVEL_BANDS
    .filter((band) => band.min >= min && band.max <= max)
    .map((band) => band.label)
}
