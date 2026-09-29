export interface TournamentLevelBand {
  /** The band code the label ends in: D2 … A1, or 'A' — the owner's new band (see below). */
  code: string
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
 * ONE exception, marked where it sits: the 4.5–5.0 band "A" is the owner's, added
 * ahead of the CRM so a pair between 4.5 and 5.0 has a category to choose.
 *
 * NOT the player ladder (`skillLadder.ts`, served by rally-api), and the two disagree on
 * purpose-less points: here B1 ends at 4.5 and there is no band between 4.5 and 5.0 (nor
 * 1.5–2.0, 5.5–6.0); the 1–7 player ladder has B1 run to 5.0 with no gaps. That split
 * predates this list and is the level-scale project's to resolve — on the CRM side, when it
 * writes contract-§4 labels from the served ladder. Kept here verbatim rather than derived,
 * because derivation would print "(D2 - D1)" and "4.0 - 5.0" — strings no tournament
 * carries today.
 *
 * Its own module, with no imports: `api/join-og.ts` reaches this file through
 * `constants/corporateEvents.ts`, and a Vercel function runs as native ESM — the player
 * ladder's bundled JSON fallbacks must never land in that graph.
 */
export const TOURNAMENT_LEVEL_BANDS: readonly TournamentLevelBand[] = [
  { code: 'D2', label: '1.0 - 1.5 (D2)', min: 1.0, max: 1.5 },
  { code: 'D1', label: '2.0 - 2.5 (D1)', min: 2.0, max: 2.5 },
  { code: 'C2', label: '2.5 - 3.0 (D1 - C2)', min: 2.5, max: 3.0 },
  { code: 'C1', label: '3.0 - 3.5 (C2 - C1)', min: 3.0, max: 3.5 },
  { code: 'B2', label: '3.5 - 4.0 (C1 - B2)', min: 3.5, max: 4.0 },
  { code: 'B1', label: '4.0 - 4.5 (B2 - B1)', min: 4.0, max: 4.5 },
  // AHEAD of the CRM table, deliberately. The tournament table has no band 4.5–5.0,
  // so a pair at 4.7 had nothing to choose. This is the band the owner's level ladder
  // defines there — A2 and A1 merged into one band "A" at 4.5–5.0 — with the label the
  // same spec gives it (rally-api docs/superpowers/specs/2026-09-13-skill-scale-1-to-5-
  // design.md, rewritten 2026-09-26). The CRM gains it when that rescale ships; until
  // then this is the one place it exists, and no tournament can be CREATED in it yet.
  { code: 'A', label: '4.5 - 5.0 (B1 - A)', min: 4.5, max: 5.0 },
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
