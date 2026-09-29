import type { SkillLadder } from './skillLadder'

/**
 * Writing a player's level — contract §7, the level-write guard (rally-api
 * docs/superpowers/plans/2026-09-26-skill-scale-contract.md).
 *
 * Every request that writes a level tags the scale its number is on (`level_scale`, the ladder
 * the player chose it on), sends `skill_level` only when the player changed it, and — on the
 * general profile update — says which level it replaces (`skill_level_base`). Without the base,
 * the API ignores a change to an already-chosen level (that is how it tells an old app's echo
 * from a decision); with a stale base it refuses the whole save.
 */

export type LevelWriteRefusal = 'stale' | 'scaleMismatch' | 'outOfRange'

/** `skill_level` plus the scale it is on. Spread into any payload that writes a level. */
export function levelWriteFields(level: number, ladder: SkillLadder): { skill_level: number; level_scale: number } {
  return { skill_level: level, level_scale: ladder.level_scale }
}

/**
 * The level a page loaded, as `skill_level_base`: the stored number, or null when the player had
 * none (null, or mobile's 0 "not chosen" — anything below the scale).
 */
export function levelBase(loaded: number | null | undefined, ladder: SkillLadder): number | null {
  return loaded != null && Number.isFinite(loaded) && loaded >= ladder.scale_min ? loaded : null
}

/**
 * The refusals, as rally-api's players routes send them: HTTP 200, `success: false`, and `error` a
 * plain string translated by the request's Accept-Language (routers/consumer/players.py catches the
 * RallyException), so there is no code to read — only these exact texts, in the API's two languages
 * (app/utils/error_translations.py). The codes are here too, for a route that answers through the
 * exception handler instead.
 */
const REFUSALS: ReadonlyArray<{ refusal: LevelWriteRefusal; code: string; messages: readonly string[] }> = [
  {
    refusal: 'stale',
    code: 'SKILL_LEVEL_STALE',
    messages: ['Your level changed since you loaded it. Reload and try again.', 'הרמה שלך השתנתה מאז שנטענה. רענן ונסה שוב.'],
  },
  {
    refusal: 'scaleMismatch',
    code: 'SKILL_LEVEL_SCALE_MISMATCH',
    messages: ['The level scale changed. Reload and try again.', 'סולם הרמות השתנה. רענן ונסה שוב.'],
  },
  {
    refusal: 'outOfRange',
    code: 'SKILL_LEVEL_OUT_OF_RANGE',
    messages: ['Skill level is out of range', 'רמת המשחק מחוץ לטווח המותר'],
  },
]

/** A level write the API refused. Thrown by the write paths after they have reloaded. */
export class LevelWriteRefusedError extends Error {
  readonly refusal: LevelWriteRefusal

  constructor(refusal: LevelWriteRefusal, message: string) {
    super(message)
    this.name = 'LevelWriteRefusedError'
    this.refusal = refusal
  }
}

/** A failure's message, whichever shape it reached the web in; null for anything else. */
export function apiFailureMessage(source: unknown): string | null {
  if (source instanceof Error) return source.message
  if (source === null || typeof source !== 'object') return null
  const body = source as { success?: unknown; error?: unknown; message?: unknown; detail?: unknown }
  if (body.success === false) {
    if (typeof body.error === 'string') return body.error
    const nested = (body.error as { message?: unknown } | null | undefined)?.message
    return typeof nested === 'string' ? nested : null
  }
  if (typeof body.message === 'string') return body.message
  if (typeof body.detail === 'string') return body.detail
  return null
}

/** Which §7 refusal a failure is, or null when it is some other failure. */
export function levelWriteRefusal(source: unknown): LevelWriteRefusal | null {
  if (source instanceof LevelWriteRefusedError) return source.refusal
  const code = (source as { code?: unknown } | null | undefined)?.code
  const message = apiFailureMessage(source)
  const match = REFUSALS.find((r) => r.code === code || (message != null && r.messages.includes(message)))
  return match?.refusal ?? null
}

/**
 * The refusal in the page's own language. The API's text follows the browser's Accept-Language,
 * not the site's language switch, so the web says it itself — one literal `t()` per key, so the
 * key scan sees them.
 */
export function refusalMessage(refusal: LevelWriteRefusal, t: (key: string) => string): string {
  switch (refusal) {
    case 'stale': return t('level.writeRefused.stale')
    case 'scaleMismatch': return t('level.writeRefused.scaleMismatch')
    case 'outOfRange': return t('level.writeRefused.outOfRange')
  }
}
