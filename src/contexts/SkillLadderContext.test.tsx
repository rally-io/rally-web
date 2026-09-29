import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppSessionContext, type AppSessionContextValue } from './AppSessionContext'
import { SkillLadderProvider } from './SkillLadderContext'
import { useSkillLadder } from '@/hooks/useSkillLadder'
import { FALLBACK_LADDERS } from '@/lib/skillLadder'
import * as skillBandsApi from '@/services/api/skillBands'
import type { PlayerMe } from '@/types/api'

const L7_CODES = '7|D2,D1,C2,C1,B2,B1,A2,A1'
const L5_CODES = '5|D2,D1,C2,C1,B2,B1,A'

function Probe() {
  const ladder = useSkillLadder()
  return <output data-testid="ladder">{`${ladder.level_scale}|${ladder.bands.map((b) => b.code).join(',')}`}</output>
}

/** A session whose own profile carries `levelScale`; null = signed out. */
function session(levelScale: number | null): AppSessionContextValue {
  const playerProfile: PlayerMe | null =
    levelScale == null
      ? null
      : { player_id: 'p1', first_name: 'Dana', last_name: 'Levi', contact_number: null, skill_level: 4.2, level_scale: levelScale }
  return {
    status: playerProfile ? 'ready' : 'signed_out',
    onboardingStatus: null,
    playerProfile,
    needsDetails: false,
    refetchOnboarding: async () => {},
    clearSession: () => {},
  }
}

function tree(qc: QueryClient, value: AppSessionContextValue | null) {
  return (
    <QueryClientProvider client={qc}>
      <AppSessionContext.Provider value={value}>
        <SkillLadderProvider>
          <Probe />
        </SkillLadderProvider>
      </AppSessionContext.Provider>
    </QueryClientProvider>
  )
}

const newClient = () => new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
const shown = () => screen.getByTestId('ladder').textContent

beforeEach(() => vi.restoreAllMocks())

describe('SkillLadderProvider', () => {
  it('renders the bundled 1–7 ladder at once, then the served ladder', async () => {
    vi.spyOn(skillBandsApi, 'fetchSkillBands').mockResolvedValue(FALLBACK_LADDERS[5])
    render(tree(newClient(), session(null)))
    expect(shown()).toBe(L7_CODES)
    await waitFor(() => expect(shown()).toBe(L5_CODES))
  })

  it('falls back to the 1–7 ladder when the endpoint 404s and nobody is signed in', async () => {
    const fetch = vi.spyOn(skillBandsApi, 'fetchSkillBands').mockRejectedValue({ isNotFound: true, status: 404 })
    render(tree(newClient(), session(null)))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2)) // retry: 1
    expect(shown()).toBe(L7_CODES)
  })

  it('falls back to the ladder matching the viewer\'s own level_scale', async () => {
    const fetch = vi.spyOn(skillBandsApi, 'fetchSkillBands').mockRejectedValue({ status: 503 })
    render(tree(newClient(), session(5)))
    expect(shown()).toBe(L5_CODES)
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    expect(shown()).toBe(L5_CODES)
  })

  it('keeps the most recent level_scale it saw after the viewer signs out', async () => {
    vi.spyOn(skillBandsApi, 'fetchSkillBands').mockRejectedValue({ status: 503 })
    const qc = newClient()
    const { rerender } = render(tree(qc, session(5)))
    expect(shown()).toBe(L5_CODES)
    rerender(tree(qc, session(null)))
    expect(shown()).toBe(L5_CODES)
  })

  it('works with no AppSession at all', async () => {
    vi.spyOn(skillBandsApi, 'fetchSkillBands').mockResolvedValue(FALLBACK_LADDERS[7])
    render(tree(newClient(), null))
    await waitFor(() => expect(shown()).toBe(L7_CODES))
  })

  it('refetches once, past the browser cache, when the served ladder disagrees with the viewer\'s scale', async () => {
    // A tab opened before the flip: the session's cached ladder is 1–7, the fresh profile says 5.
    const fetch = vi
      .spyOn(skillBandsApi, 'fetchSkillBands')
      .mockResolvedValueOnce(FALLBACK_LADDERS[7])
      .mockResolvedValueOnce(FALLBACK_LADDERS[5])
    render(tree(newClient(), session(5)))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    expect(fetch.mock.calls[0][0]).toBeNull()
    expect(fetch.mock.calls[1][0]).toEqual(expect.any(Number))
    await waitFor(() => expect(shown()).toBe(L5_CODES))
  })

  it('does not loop when the API keeps disagreeing', async () => {
    const fetch = vi.spyOn(skillBandsApi, 'fetchSkillBands').mockResolvedValue(FALLBACK_LADDERS[7])
    render(tree(newClient(), session(5)))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(shown()).toBe(L7_CODES) // rule 1: the served ladder still wins
  })
})
