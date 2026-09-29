import { bandForLevel, type SkillLadder } from './skillLadder'

/**
 * The band code a rating is displayed in — "B1", "A" — on the ladder in force. Half-open like
 * rally-api's `level_algorithm._resolve_skill_level` (see `bandForLevel`): 4.0 is B1, not B2.
 * The table itself is served by `GET /public/skill-bands`; nothing here restates it.
 */
export function tierForLevel(level: number, ladder: SkillLadder): string {
  return bandForLevel(level, ladder).code
}

/**
 * "4.0 (B1)" — the number the rating engine stores plus the band it falls in.
 *
 * Truncates rather than rounds, because rounding can cross a boundary the band did not: on the
 * 1–7 ladder `4.95.toFixed(1)` is "5.0", A2's floor, so a rounded label would read "5.0 (B1)"
 * and contradict itself; on the 1–5 ladder 4.49 would read "4.5 (B1)" beside A's floor. Every
 * band edge on both ladders is a whole tenth, so truncation can only move a number away from the
 * next band, never into it. Reachable in the read-only branch, where the value is the rating
 * engine's own two-decimal figure rather than a slider step.
 *
 * The cost: a stored 4.68 reads "4.6" here while the profile editor shows "4.68". That 0.1 is
 * the cheaper error — the band is the load-bearing half, because it is what a tournament's entry
 * range is written in.
 */
export function formatLevelWithTier(level: number, ladder: SkillLadder): string {
  const shown = Math.floor(level * 10) / 10
  return `${shown.toFixed(1)} (${tierForLevel(level, ladder)})`
}
