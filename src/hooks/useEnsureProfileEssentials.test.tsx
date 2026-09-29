import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { SkillLadderContext } from '@/contexts/SkillLadderContext'
import { FALLBACK_LADDERS, type SkillLadder } from '@/lib/skillLadder'
import { LevelWriteRefusedError } from '@/lib/levelWrite'

vi.mock('@/hooks/useAppSession', () => ({ useAppSession: vi.fn() }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn(() => ({ user: { email: 'dana@acme.co.il' } })) }))
vi.mock('@/services/api/auth', () => ({ createPlayerProfile: vi.fn() }))
vi.mock('@/services/api/profile', () => ({ updateProfile: vi.fn() }))

import { useEnsureProfileEssentials } from './useEnsureProfileEssentials'
import { useAppSession } from '@/hooks/useAppSession'
import { createPlayerProfile } from '@/services/api/auth'
import { updateProfile } from '@/services/api/profile'

const mockSession = vi.mocked(useAppSession)
const mockCreate = vi.mocked(createPlayerProfile)
const mockUpdate = vi.mocked(updateProfile)
const refetch = vi.fn(async () => {})

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient()
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
/** The hook on a given ladder; `refresh` is the ladder refetch it may call. */
function wrapperOn(ladder: SkillLadder, refresh: () => void = () => {}) {
  return function LadderWrapper({ children }: { children: ReactNode }) {
    const qc = new QueryClient()
    return (
      <QueryClientProvider client={qc}>
        <SkillLadderContext.Provider value={{ ladder, refresh }}>{children}</SkillLadderContext.Provider>
      </QueryClientProvider>
    )
  }
}
function session(status: string, playerProfile: Record<string, unknown> | null) {
  mockSession.mockReturnValue({ status, playerProfile, onboardingStatus: null, needsDetails: false, refetchOnboarding: refetch, clearSession: vi.fn() } as any)
}
const INPUT = { firstName: 'Dana', lastName: 'Cohen', phone: '501234567', skillLevel: 3.25 }

beforeEach(() => { vi.clearAllMocks(); mockCreate.mockResolvedValue({ success: true } as any); mockUpdate.mockResolvedValue({ success: true } as any) })

describe('useEnsureProfileEssentials', () => {
  it('profile_incomplete → creates the player row with the auth email and +972', async () => {
    session('profile_incomplete', null)
    const { result } = renderHook(() => useEnsureProfileEssentials(), { wrapper })
    await act(() => result.current.ensure(INPUT))
    expect(mockCreate).toHaveBeenCalledWith({
      first_name: 'Dana', last_name: 'Cohen', email: 'dana@acme.co.il',
      contact_number: '501234567', country_code: '+972', skill_level: 3.25, level_scale: 7,
    })
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(refetch).toHaveBeenCalled()
  })

  it('ready with empty phone/level → patches only what is missing (and names when changed)', async () => {
    session('ready', { first_name: 'Dana', last_name: null, contact_number: null, skill_level: null })
    const { result } = renderHook(() => useEnsureProfileEssentials(), { wrapper })
    await act(() => result.current.ensure(INPUT))
    expect(mockUpdate).toHaveBeenCalledWith({
      last_name: 'Cohen', contact_number: '501234567', country_code: '+972',
      skill_level: 3.25, level_scale: 7, skill_level_base: null,
    })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('ready with a stored phone and level → never sends them, even if the input differs', async () => {
    session('ready', { first_name: 'Dana', last_name: 'Cohen', contact_number: '509999999', skill_level: 4.6 })
    const { result } = renderHook(() => useEnsureProfileEssentials(), { wrapper })
    expect(result.current.phoneLocked).toBe(true)
    expect(result.current.levelLocked).toBe(true)
    await act(() => result.current.ensure({ ...INPUT, phone: '501111111', skillLevel: 2.0 }))
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(refetch).toHaveBeenCalled()
  })

  it('ready with a stored level → replaces it only when the player edited it', async () => {
    session('ready', { first_name: 'Dana', last_name: 'Cohen', contact_number: '509999999', skill_level: 4.6 })
    const { result } = renderHook(() => useEnsureProfileEssentials(), { wrapper })
    // Editor opened, slider untouched: the same number is not a change.
    await act(() => result.current.ensure({ ...INPUT, skillLevel: 4.6, overwriteStoredLevel: true }))
    expect(mockUpdate).not.toHaveBeenCalled()
    // Moved: the profile follows.
    await act(() => result.current.ensure({ ...INPUT, skillLevel: 5.5, overwriteStoredLevel: true }))
    // Contract §7: the level it replaces rides along, or the API ignores the change.
    expect(mockUpdate).toHaveBeenCalledWith({ skill_level: 5.5, level_scale: 7, skill_level_base: 4.6 })
  })

  it('ready with skill_level 0 (mobile complete-profile default) → not locked, still patches', async () => {
    session('ready', { first_name: 'Dana', last_name: 'Cohen', contact_number: '509999999', skill_level: 0 })
    const { result } = renderHook(() => useEnsureProfileEssentials(), { wrapper })
    expect(result.current.levelLocked).toBe(false)
    await act(() => result.current.ensure({ ...INPUT, skillLevel: 3.25 }))
    expect(mockUpdate).toHaveBeenCalledWith({ skill_level: 3.25, level_scale: 7, skill_level_base: null })
  })

  it('a failed write throws so the page can show it', async () => {
    session('ready', { first_name: null, last_name: null, contact_number: null, skill_level: null })
    mockUpdate.mockResolvedValue({ success: false, error: { message: 'nope' } } as any)
    const { result } = renderHook(() => useEnsureProfileEssentials(), { wrapper })
    await expect(act(() => result.current.ensure(INPUT))).rejects.toThrow('nope')
  })

  it('ready but the profile query has not resolved → throws PROFILE_NOT_LOADED, writes nothing', async () => {
    // `status` comes from the onboarding query; `playerProfile` is a second query.
    // A null profile here means ABSENT, not "these fields are empty" — patching
    // would overwrite the stored phone/level.
    session('ready', null)
    const { result } = renderHook(() => useEnsureProfileEssentials(), { wrapper })
    expect(result.current.phoneLocked).toBe(false)
    expect(result.current.levelLocked).toBe(false)
    await expect(act(() => result.current.ensure(INPUT))).rejects.toThrow('PROFILE_NOT_LOADED')
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('tags every level write with the scale of the ladder in force', async () => {
    session('profile_incomplete', null)
    const onFive = renderHook(() => useEnsureProfileEssentials(), { wrapper: wrapperOn(FALLBACK_LADDERS[5]) })
    await act(() => onFive.result.current.ensure({ ...INPUT, skillLevel: 4.25 }))
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ skill_level: 4.25, level_scale: 5 }))
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('skill_level_base')
  })

  it('a save that writes no level sends no level fields', async () => {
    session('ready', { first_name: 'Dana', last_name: null, contact_number: '509999999', skill_level: 4.6 })
    const { result } = renderHook(() => useEnsureProfileEssentials(), { wrapper })
    await act(() => result.current.ensure({ ...INPUT, skillLevel: 4.6 }))
    expect(mockUpdate).toHaveBeenCalledWith({ last_name: 'Cohen' })
  })

  it('a refused level (stale copy) refetches the profile and the ladder, then throws the refusal', async () => {
    session('ready', { first_name: 'Dana', last_name: 'Cohen', contact_number: '509999999', skill_level: 4.6 })
    // The players routes answer HTTP 200 with a plain, translated `error` string.
    mockUpdate.mockResolvedValue({ success: false, error: 'Your level changed since you loaded it. Reload and try again.' } as any)
    const refresh = vi.fn()
    const { result } = renderHook(() => useEnsureProfileEssentials(), { wrapper: wrapperOn(FALLBACK_LADDERS[7], refresh) })
    let error: unknown = null
    await act(async () => {
      try {
        await result.current.ensure({ ...INPUT, skillLevel: 5.5, overwriteStoredLevel: true })
      } catch (e) {
        error = e
      }
    })
    expect(error).toBeInstanceOf(LevelWriteRefusedError)
    expect((error as LevelWriteRefusedError).refusal).toBe('stale')
    expect(refetch).toHaveBeenCalled()
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('signed out / loading throws SESSION_NOT_READY', async () => {
    session('signed_out', null)
    const { result } = renderHook(() => useEnsureProfileEssentials(), { wrapper })
    await expect(act(() => result.current.ensure(INPUT))).rejects.toThrow('SESSION_NOT_READY')
  })
})
