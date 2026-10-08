import type { SkillBand, SkillLadder } from './skillLadder'

/**
 * A tournament's level label on the ladder in force — contract §4 (rally-api
 * docs/superpowers/plans/2026-09-26-skill-scale-contract.md): one span, TM-style letters,
 * `"<lo> - <hi> (<L> - <H>)"`, one letter when they coincide. `<H>` is the band ending at `hi`;
 * `<L>` is the band ending at `lo`, else the band starting there (the floor 1.0 → D2). This is
 * what the CRM writes on a tournament, so a pair picking its category reads the same text.
 */
export function tournamentLevelLabel(lo: number, hi: number, ladder: SkillLadder): string {
  const { bands } = ladder
  const containing = (level: number): SkillBand =>
    bands.find((band) => level < band.max) ?? bands[bands.length - 1]
  const high = bands.find((band) => band.max === hi) ?? containing(hi)
  const low = bands.find((band) => band.max === lo) ?? bands.find((band) => band.min === lo) ?? containing(lo)
  const codes = low.code === high.code ? high.code : `${low.code} - ${high.code}`
  return `${lo.toFixed(1)} - ${hi.toFixed(1)} (${codes})`
}

/** What an event says about the level categories a pair picks from (see `CorporateTournamentEvent`). */
export interface CompeteLevelSource {
  competeLevels?: readonly string[]
  competeLevelsAreBands?: boolean
}

/**
 * The options of an event's level-category dropdown, on the ladder in force.
 *
 * - Categories the event wrote itself are shown as written, on any ladder.
 * - Categories that ARE the tournament bands (`competeLevelsAreBands`, the Israel Open):
 *   on the 1–7 ladder, exactly the event's own list — registrations run on it, so it must not
 *   move by a character; on any other ladder (1–5 after the switch), one option per served
 *   band, labelled the way tournaments are (`tournamentLevelLabel`).
 *
 * Deliberately not reachable from `constants/corporateEvents.ts`: `api/join-og.ts` loads that
 * module as native ESM, and it must stay free of the ladder and its bundled JSON.
 */
export function competeLevelOptions(event: CompeteLevelSource, ladder: SkillLadder): string[] {
  const listed = [...(event.competeLevels ?? [])]
  if (!event.competeLevelsAreBands || listed.length === 0 || ladder.level_scale === 7) return listed
  return ladder.bands.map((band) => tournamentLevelLabel(band.min, band.max, ladder))
}
