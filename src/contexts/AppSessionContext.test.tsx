import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppSessionProvider } from './AppSessionContext'
import { useAppSession } from '@/hooks/useAppSession'
import * as profileApi from '@/services/api/profile'

const auth = { session: null as null | { user: { id: string } }, isLoading: false, signOut: vi.fn() }
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }))

function Probe() {
  const { pathname, search } = useLocation()
  const { status, needsDetails } = useAppSession()
  return <div data-testid="probe">{`${pathname}${search}|${status}|${needsDetails}`}</div>
}

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <AppSessionProvider>
          <Routes>
            <Route path="*" element={<Probe />} />
          </Routes>
        </AppSessionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const onboarding = (over: Partial<{ has_player_profile: boolean; missing_steps: string[] }>) => ({
  success: true,
  data: { is_authenticated: true, completion_percent: 50, completed_steps: [], has_player_profile: true, missing_steps: [], ...over },
})

beforeEach(() => {
  vi.clearAllMocks()
  auth.session = { user: { id: 'u1' } }
  auth.isLoading = false
  vi.spyOn(profileApi, 'getMyPlayerProfile').mockResolvedValue({ success: true, data: { id: 'p1', first_name: 'Dana', last_name: 'Levi', contact_number: '501234567', skill_level: 3 } } as any)
})

describe('AppSessionProvider onboarding gate', () => {
  it('redirects a new account on a tournament page to the tournament-purpose step with returnTo', async () => {
    vi.spyOn(profileApi, 'getOnboardingStatus').mockResolvedValue(onboarding({ has_player_profile: false }) as any)
    renderAt('/tournaments/t-1?x=1')
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toMatch(/^\/profile\/edit\?purpose=tournament&returnTo=%2Ftournaments%2Ft-1%3Fx%3D1\|/))
  })

  it('redirects a new account elsewhere to the onboarding-purpose step', async () => {
    vi.spyOn(profileApi, 'getOnboardingStatus').mockResolvedValue(onboarding({ has_player_profile: false }) as any)
    renderAt('/clubs/c-1')
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toMatch(/^\/profile\/edit\?purpose=onboarding&returnTo=%2Fclubs%2Fc-1\|/))
  })

  it('redirects a ready session that is missing a required step (legacy account)', async () => {
    vi.spyOn(profileApi, 'getOnboardingStatus').mockResolvedValue(onboarding({ missing_steps: ['skill_level'] }) as any)
    renderAt('/')
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toMatch(/^\/profile\/edit\?purpose=onboarding&returnTo=%2F\|ready\|true/))
  })

  it('does not redirect a complete profile', async () => {
    vi.spyOn(profileApi, 'getOnboardingStatus').mockResolvedValue(onboarding({}) as any)
    renderAt('/tournaments')
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toMatch(/^\/tournaments\|ready\|false/))
  })

  it.each(['/join/acme-e2e', '/profile/edit?purpose=onboarding', '/auth/callback', '/payment-method'])('does not redirect on the exempt route %s', async (path) => {
    vi.spyOn(profileApi, 'getOnboardingStatus').mockResolvedValue(onboarding({ has_player_profile: false }) as any)
    renderAt(path)
    // Exact equality (not a suffix/prefix match): a fired gate appends `&returnTo=…` to
    // the URL, which would still match a loose "starts with path, ends with the status"
    // check but never equals the untouched path exactly.
    const expected = `${path}|profile_incomplete|true`
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe(expected))
    // `waitFor` resolves the FIRST instant the assertion holds, which is the render commit
    // right before the gate's passive effect would run — so a wrongly-firing gate can still
    // slip through the check above. Flush any pending effect (and the navigation it would
    // cause) and re-assert with a plain (non-polling) expect so a later redirect is caught.
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)) })
    expect(screen.getByTestId('probe').textContent).toBe(expected)
  })

  it('keeps the hash in returnTo', async () => {
    vi.spyOn(profileApi, 'getOnboardingStatus').mockResolvedValue(onboarding({ has_player_profile: false }) as any)
    renderAt('/tournaments/t-1#partner-section')
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toContain('%23partner-section'))
  })

  it('does not redirect while signed out', async () => {
    auth.session = null
    const spy = vi.spyOn(profileApi, 'getOnboardingStatus')
    renderAt('/tournaments')
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toMatch(/^\/tournaments\|signed_out\|false/))
    expect(spy).not.toHaveBeenCalled()
  })

  it('does not redirect when the status load fails', async () => {
    vi.spyOn(profileApi, 'getOnboardingStatus').mockRejectedValue(new Error('boom'))
    renderAt('/tournaments')
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toMatch(/^\/tournaments\|profile_error\|false/))
  })
})
