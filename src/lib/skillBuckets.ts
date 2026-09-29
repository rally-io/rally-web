import { bandForLevel, type SkillBand, type SkillLadder } from './skillLadder'

export type SkillBucket = 'beginner' | 'intermediate' | 'advanced' | 'pro'

/**
 * The four words a player filters and reads tournaments by, defined by BAND, never by number
 * (skill-scale spec §5.1): Beginner = the D bands, Intermediate = the C bands + B2, Advanced =
 * B1, Pro = the A bands. The numbers a bucket spans come from whichever ladder is in force —
 * Pro is 5.0–7.0 (A2 + A1) on the 1–7 ladder and 4.5–5.0 (A) on the 1–5 ladder.
 *
 * One definition for the filter chips (tournamentFilters.ts) and a tournament's own label
 * (getSkillLevelName in tournamentHelpers.ts), so the two can never disagree. The label keys are
 * literal here on purpose: they are rendered through `t(b.labelKey)`, which no key scan sees.
 */
export const SKILL_BUCKETS: readonly { id: SkillBucket; labelKey: string }[] = [
  { id: 'beginner', labelKey: 'tournament.skillLevelBeginner' },
  { id: 'intermediate', labelKey: 'tournament.skillLevelIntermediate' },
  { id: 'advanced', labelKey: 'tournament.skillLevelAdvanced' },
  { id: 'pro', labelKey: 'tournament.skillLevelPro' },
]

export function bucketOfBand(band: SkillBand): SkillBucket {
  if (band.letter === 'D') return 'beginner'
  if (band.letter === 'C' || band.code === 'B2') return 'intermediate'
  if (band.letter === 'A') return 'pro'
  return 'advanced'
}

export function bucketForLevel(level: number, ladder: SkillLadder): SkillBucket {
  return bucketOfBand(bandForLevel(level, ladder))
}

export function skillBucketLabelKey(bucket: SkillBucket): string {
  return SKILL_BUCKETS.find((b) => b.id === bucket)!.labelKey
}

/** From the bucket's lowest band floor to its highest band ceiling; null if the ladder has none. */
export function bucketRange(bucket: SkillBucket, ladder: SkillLadder): { min: number; max: number } | null {
  const bands = ladder.bands.filter((band) => bucketOfBand(band) === bucket)
  if (bands.length === 0) return null
  return { min: bands[0].min, max: bands[bands.length - 1].max }
}
