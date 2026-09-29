import { describe, expect, it } from 'vitest'
import { FALLBACK_LADDERS } from './skillLadder'
import {
  LevelWriteRefusedError,
  apiFailureMessage,
  levelBase,
  levelWriteFields,
  levelWriteRefusal,
  refusalMessage,
} from './levelWrite'

const L7 = FALLBACK_LADDERS[7]
const L5 = FALLBACK_LADDERS[5]

describe('levelWriteFields (contract §7)', () => {
  it('tags the level with the scale of the ladder it was chosen on', () => {
    expect(levelWriteFields(5.5, L7)).toEqual({ skill_level: 5.5, level_scale: 7 })
    expect(levelWriteFields(4.35, L5)).toEqual({ skill_level: 4.35, level_scale: 5 })
  })
})

describe('levelBase', () => {
  it('is the level the page loaded, or null when the player had none', () => {
    expect(levelBase(4.2, L7)).toBe(4.2)
    expect(levelBase(1, L5)).toBe(1)
    // Mobile writes 0 at complete-profile to mean "not chosen".
    expect(levelBase(0, L7)).toBeNull()
    expect(levelBase(0.5, L7)).toBeNull()
    expect(levelBase(null, L7)).toBeNull()
    expect(levelBase(undefined, L7)).toBeNull()
  })
})

describe('apiFailureMessage', () => {
  it('reads every shape a failure reaches the web in', () => {
    // rally-api's players routes: HTTP 200, `error` a plain translated string.
    expect(apiFailureMessage({ success: false, error: 'x' })).toBe('x')
    // The documented StandardResponse error object.
    expect(apiFailureMessage({ success: false, error: { code: 'C', message: 'y', details: null } })).toBe('y')
    // The API client's rejection object, and a thrown Error.
    expect(apiFailureMessage({ status: 409, code: 'C', message: 'z' })).toBe('z')
    expect(apiFailureMessage(new Error('w'))).toBe('w')
    // FastAPI's own HTTPException body.
    expect(apiFailureMessage({ detail: 'd' })).toBe('d')
    expect(apiFailureMessage(null)).toBeNull()
    expect(apiFailureMessage({ success: true, data: {} })).toBeNull()
  })
})

describe('levelWriteRefusal', () => {
  it.each([
    ['Your level changed since you loaded it. Reload and try again.', 'stale'],
    ['הרמה שלך השתנתה מאז שנטענה. רענן ונסה שוב.', 'stale'],
    ['The level scale changed. Reload and try again.', 'scaleMismatch'],
    ['סולם הרמות השתנה. רענן ונסה שוב.', 'scaleMismatch'],
    ['Skill level is out of range', 'outOfRange'],
    ['רמת המשחק מחוץ לטווח המותר', 'outOfRange'],
  ])('recognises "%s" in the 200 success:false body the players routes send', (message, refusal) => {
    expect(levelWriteRefusal({ success: false, error: message })).toBe(refusal)
  })

  it('also recognises the error codes, for a route that answers through the exception handler', () => {
    expect(levelWriteRefusal({ status: 409, code: 'SKILL_LEVEL_STALE', message: 'x' })).toBe('stale')
    expect(levelWriteRefusal({ status: 409, code: 'SKILL_LEVEL_SCALE_MISMATCH', message: 'x' })).toBe('scaleMismatch')
    expect(levelWriteRefusal({ status: 400, code: 'SKILL_LEVEL_OUT_OF_RANGE', message: 'x' })).toBe('outOfRange')
  })

  it('reads its own error back', () => {
    expect(levelWriteRefusal(new LevelWriteRefusedError('stale', 'Your level changed…'))).toBe('stale')
  })

  it('is null for every other failure', () => {
    expect(levelWriteRefusal({ success: false, error: 'Failed to update profile' })).toBeNull()
    expect(levelWriteRefusal({ status: 409, code: 'MOBILE_ALREADY_EXISTS', message: 'x' })).toBeNull()
    expect(levelWriteRefusal(new Error('boom'))).toBeNull()
    expect(levelWriteRefusal(null)).toBeNull()
  })
})

describe('refusalMessage', () => {
  it('says each refusal in the page\'s own language', () => {
    const t = (key: string) => `<${key}>`
    expect(refusalMessage('stale', t)).toBe('<level.writeRefused.stale>')
    expect(refusalMessage('scaleMismatch', t)).toBe('<level.writeRefused.scaleMismatch>')
    expect(refusalMessage('outOfRange', t)).toBe('<level.writeRefused.outOfRange>')
  })
})
