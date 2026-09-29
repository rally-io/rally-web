import { z } from 'zod'
import fallback7Body from './skillBands.fallback7.json'
import fallback5Body from './skillBands.fallback5.json'

/**
 * The skill ladder: rally-api's `SKILL_LEVEL_RANGES`, served by `GET /public/skill-bands`.
 * Contract: rally-api docs/superpowers/plans/2026-09-26-skill-scale-contract.md.
 *
 * The web never restates the ladder. Every number→band mapping, bucket, slider bound and
 * "1.0 – 7.0" line reads a `SkillLadder` — the served one, or one of the two bundled
 * fallbacks, which are byte-identical copies of the contract's two bodies: 1–7 before the
 * scale flip (eight codes), 1–5 after it (seven codes, A2 + A1 merged into A). Nothing here
 * may assume a band count, a code list or a top of 7.0.
 */

export interface SkillBand {
  code: string
  /** Always `code[0]`: A/B/C/D. The league and the buckets key on it. */
  letter: string
  /** Inclusive. */
  min: number
  /** Exclusive for display, except on the last band (see `bandForLevel`). */
  max: number
  /** The single-band player label, e.g. "4.0 - 4.5 (B1)". */
  label: string
}

export interface SkillLadder {
  /** 7 before the flip, 5 after. Describes the numbers; never selects a code path. */
  level_scale: number
  scale_min: number
  scale_max: number
  /** The highest level rally-api accepts as typed input ("Skill level is out of range" above). */
  typed_max: number
  /** Ascending and contiguous: `bands[i].max === bands[i + 1].min`. */
  bands: readonly SkillBand[]
}

const bandSchema = z.object({
  code: z.string().min(1),
  letter: z.string().length(1),
  min: z.number(),
  max: z.number(),
  label: z.string(),
})

const ladderSchema = z
  .object({
    level_scale: z.number().int(),
    scale_min: z.number(),
    scale_max: z.number(),
    typed_max: z.number(),
    bands: z.array(bandSchema).min(1),
  })
  .superRefine((ladder, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message })
    const { bands } = ladder
    if (bands[0].min !== ladder.scale_min) fail('the first band does not start at scale_min')
    if (bands[bands.length - 1].max !== ladder.scale_max) fail('the last band does not end at scale_max')
    if (ladder.typed_max < ladder.scale_min || ladder.typed_max > ladder.scale_max) {
      fail('typed_max lies outside the scale')
    }
    bands.forEach((band, i) => {
      if (!(band.min < band.max)) fail(`band ${band.code} is empty`)
      if (band.letter !== band.code[0]) fail(`band ${band.code} carries letter ${band.letter}`)
      if (i > 0 && bands[i - 1].max !== band.min) fail(`band ${band.code} does not start where ${bands[i - 1].code} ends`)
    })
  })

const envelopeSchema = z.object({ success: z.literal(true), data: ladderSchema })

/**
 * Reads a `GET /public/skill-bands` body. Throws on anything the contract does not allow, so a
 * malformed or partial response lands on a bundled fallback instead of on a slider.
 */
export function parseSkillBands(body: unknown): SkillLadder {
  return envelopeSchema.parse(body).data
}

/** Both contract bodies, parsed by the same rules as the network response. */
export const FALLBACK_LADDERS: Readonly<Record<5 | 7, SkillLadder>> = {
  7: parseSkillBands(fallback7Body),
  5: parseSkillBands(fallback5Body),
}

/**
 * Contract §3: the ladder fetched from the API this session; failing that, the bundled ladder
 * whose `level_scale` matches the viewer's most recent profile payload; failing that, the 1–7
 * ladder. (Rule 2 — a ladder cached across sessions — does not apply: the web keeps nothing.)
 */
export function selectLadder(
  served: SkillLadder | null | undefined,
  viewerLevelScale: number | null | undefined,
): SkillLadder {
  if (served) return served
  if (viewerLevelScale === 5 || viewerLevelScale === 7) return FALLBACK_LADDERS[viewerLevelScale]
  return FALLBACK_LADDERS[7]
}

/**
 * The band a level is displayed in: half-open (`min <= level < max`), with the last band also
 * taking `level === scale_max` — the same rule as rally-api's `_resolve_skill_level`. A level
 * below the scale reads as the first band and one above it as the last, instead of throwing.
 */
export function bandForLevel(level: number, ladder: SkillLadder): SkillBand {
  for (const band of ladder.bands) {
    if (level < band.max) return band
  }
  return ladder.bands[ladder.bands.length - 1]
}
