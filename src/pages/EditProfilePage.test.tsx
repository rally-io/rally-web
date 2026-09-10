import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useSearchParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/i18n'
import EditProfilePage from './EditProfilePage'
import * as profileApi from '@/services/api/profile'
import * as authApi from '@/services/api/auth'
import * as playersApi from '@/services/api/players'
import type { PlayerMe } from '@/types/api'

// Drives a freshly-typed phone number through the OTP verification gate so a
// test can reach an enabled Save button — mirrors the real user flow instead
// of bypassing it, since Save is now blocked until the phone is verified.
async function verifyPhoneInUi(user: ReturnType<typeof import('@testing-library/user-event').default.setup>) {
  vi.spyOn(playersApi, 'checkPhoneAvailable').mockResolvedValue({
    success: true, data: { available: true }, meta: null, error: null,
  } as any)
  vi.spyOn(playersApi, 'requestPhoneVerificationOtp').mockResolvedValue({
    success: true, data: { message: 'sent' }, meta: null, error: null,
  } as any)
  vi.spyOn(playersApi, 'verifyPhoneVerificationOtp').mockResolvedValue({
    success: true, data: { verified: true }, meta: null, error: null,
  } as any)

  await user.click(screen.getByRole('button', { name: /verify phone number/i }))
  const otpInput = await screen.findByPlaceholderText(/6-digit code/i)
  await user.type(otpInput, '123456')
  await user.click(screen.getByRole('button', { name: /verify code/i }))
  await screen.findByText(/phone verified/i)
}

const requireSignIn = vi.fn()
const signOut = vi.fn()
const trackFunnelMock = vi.fn()
const sessionState: {
  status: 'loading' | 'signed_out' | 'profile_error' | 'profile_incomplete' | 'ready'
  playerProfile: PlayerMe | null
} = {
  status: 'signed_out',
  playerProfile: null,
}

vi.mock('@/hooks/useAppSession', () => ({
  useAppSession: () => ({
    status: sessionState.status,
    playerProfile: sessionState.playerProfile,
    onboardingStatus: null,
    needsDetails: false,
    refetchOnboarding: vi.fn(),
    clearSession: vi.fn(),
  }),
}))

const authState: { user: { email: string; user_metadata?: Record<string, unknown> } } = {
  user: { email: 'dana@example.com' },
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: authState.user, signOut }),
}))

vi.mock('@/hooks/useAuthGate', () => ({
  useAuthGate: () => ({ requireSignIn }),
}))

// Partial mock: only trackFunnel is swapped so the rest of the analytics module
// (imported transitively by other components) keeps its real implementation.
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  trackFunnel: (...args: unknown[]) => trackFunnelMock(...args),
}))

function TournamentProbe() {
  const [params] = useSearchParams()
  return <div data-testid="tournament-probe">{params.toString()}</div>
}

function renderPage(initialPath = '/profile/edit') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/profile/edit" element={<EditProfilePage />} />
          <Route path="/tournaments/:id" element={<TournamentProbe />} />
          <Route path="/" element={<div data-testid="home-probe" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.spyOn(profileApi, 'getOnboardingStatus').mockResolvedValue({ success: true, data: { is_authenticated: true, has_player_profile: true, missing_steps: [] } } as any)
  vi.spyOn(profileApi, 'getMyPlayerProfile').mockResolvedValue({ success: true, data: { id: 'p1', contact_number: '501234567', skill_level: 3 } } as any)
  requireSignIn.mockReset()
  requireSignIn.mockResolvedValue(undefined)
  signOut.mockReset()
  signOut.mockResolvedValue(undefined)
  trackFunnelMock.mockReset()
  sessionState.status = 'signed_out'
  sessionState.playerProfile = null
  authState.user = { email: 'dana@example.com' }
})

describe('EditProfilePage — signed-out branch', () => {
  it('renders SignInRequiredPanel and triggers requireSignIn on click', () => {
    sessionState.status = 'signed_out'
    renderPage()
    const cta = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(cta)
    expect(requireSignIn).toHaveBeenCalledTimes(1)
  })
})

describe('EditProfilePage — profile_incomplete branch', () => {
  it('renders the form with empty defaults and creates the players row on submit', async () => {
    const user = userEvent.setup()
    sessionState.status = 'profile_incomplete'
    sessionState.playerProfile = null
    const createSpy = vi.spyOn(authApi, 'createPlayerProfile').mockResolvedValue({
      success: true,
      data: { id: 'new' },
      meta: null,
      error: null,
    } as any)
    renderPage()

    const firstName = screen.getByLabelText(/first name/i) as HTMLInputElement
    const lastName = screen.getByLabelText(/last name/i) as HTMLInputElement
    const phone = screen.getByLabelText(/phone number/i) as HTMLInputElement
    expect(firstName.value).toBe('')
    expect(lastName.value).toBe('')
    expect(phone.value).toBe('')

    await user.type(firstName, 'Dana')
    await user.type(lastName, 'Levi')
    await user.type(phone, '501234567')
    await verifyPhoneInUi(user)

    const save = screen.getByRole('button', { name: /save changes/i })
    await waitFor(() => expect(save).not.toBeDisabled())
    await user.click(save)

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1)
    })
    expect(createSpy.mock.calls[0][0]).toMatchObject({
      first_name: 'Dana',
      last_name: 'Levi',
      email: 'dana@example.com',
      contact_number: '501234567',
      gender: 'choose_not_to_answer',
    })

    createSpy.mockRestore()
  })
})

const READY_PROFILE: PlayerMe = {
  id: 'p1',
  first_name: 'Dana',
  last_name: 'Levi',
  contact_number: '501234567',
  email: 'dana@example.com',
  skill_level: 4.2,
  skill_tier: 'silver',
  avatar_url: null,
}

describe('EditProfilePage — ready branch', () => {
  it('pre-fills first/last name, phone, and email read-only', () => {
    sessionState.status = 'ready'
    sessionState.playerProfile = READY_PROFILE
    renderPage()
    expect((screen.getByLabelText(/first name/i) as HTMLInputElement).value).toBe('Dana')
    expect((screen.getByLabelText(/last name/i) as HTMLInputElement).value).toBe('Levi')
    expect((screen.getByLabelText(/phone number/i) as HTMLInputElement).value).toBe('501234567')
    expect(screen.getByText('dana@example.com')).toBeInTheDocument()
  })

  it('Save button is hidden until the form is dirty', () => {
    sessionState.status = 'ready'
    sessionState.playerProfile = READY_PROFILE
    renderPage()
    expect(screen.queryByRole('button', { name: /save changes/i })).toBeNull()
  })
})

describe('EditProfilePage — validation', () => {
  it('shows error and disables Save when first name is cleared', async () => {
    sessionState.status = 'ready'
    sessionState.playerProfile = READY_PROFILE
    renderPage()
    const firstName = screen.getByLabelText(/first name/i) as HTMLInputElement
    fireEvent.change(firstName, { target: { value: '' } })
    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
  })

  it('rejects phone with non-digit characters', async () => {
    sessionState.status = 'ready'
    sessionState.playerProfile = READY_PROFILE
    renderPage()
    const phone = screen.getByLabelText(/phone number/i) as HTMLInputElement
    fireEvent.change(phone, { target: { value: 'abc' } })
    await waitFor(() => {
      expect(screen.getByText(/digits only/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
  })
})

describe('EditProfilePage — submit', () => {
  it('submits ONLY the dirty field and shows success', async () => {
    const user = userEvent.setup()
    sessionState.status = 'ready'
    sessionState.playerProfile = READY_PROFILE
    const updateSpy = vi.spyOn(profileApi, 'updateProfile').mockResolvedValue({
      success: true,
      data: {},
      meta: null,
      error: null,
    } as any)
    renderPage()
    const lastName = screen.getByLabelText(/last name/i) as HTMLInputElement
    await user.clear(lastName)
    await user.type(lastName, 'Cohen')
    const save = screen.getByRole('button', { name: /save changes/i })
    await waitFor(() => expect(save).not.toBeDisabled())
    await user.click(save)
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledTimes(1)
    })
    expect(updateSpy).toHaveBeenCalledWith({ last_name: 'Cohen' })
    await waitFor(() => {
      expect(screen.getByText(/profile updated/i)).toBeInTheDocument()
    })
    updateSpy.mockRestore()
  })

  it('navigates back to returnTo after a successful save (resuming e.g. tournament registration)', async () => {
    const user = userEvent.setup()
    sessionState.status = 'ready'
    sessionState.playerProfile = READY_PROFILE
    const updateSpy = vi.spyOn(profileApi, 'updateProfile').mockResolvedValue({
      success: true,
      data: {},
      meta: null,
      error: null,
    } as any)
    renderPage(`/profile/edit?returnTo=${encodeURIComponent('/tournaments/t-1')}`)
    const lastName = screen.getByLabelText(/last name/i) as HTMLInputElement
    await user.clear(lastName)
    await user.type(lastName, 'Cohen')
    const save = screen.getByRole('button', { name: /save changes/i })
    await waitFor(() => expect(save).not.toBeDisabled())
    await user.click(save)
    expect(await screen.findByTestId('tournament-probe')).toBeInTheDocument()
    updateSpy.mockRestore()
  })

  it('shows the API error message when the call fails', async () => {
    const user = userEvent.setup()
    sessionState.status = 'ready'
    sessionState.playerProfile = READY_PROFILE
    const updateSpy = vi.spyOn(profileApi, 'updateProfile').mockResolvedValue({
      success: false,
      error: { code: 'X', message: 'Server hated it', details: null },
    } as any)
    renderPage()
    const lastName = screen.getByLabelText(/last name/i) as HTMLInputElement
    await user.clear(lastName)
    await user.type(lastName, 'Cohen')
    const save = screen.getByRole('button', { name: /save changes/i })
    await waitFor(() => expect(save).not.toBeDisabled())
    await user.click(save)
    await waitFor(() => {
      expect(screen.getByText(/server hated it/i)).toBeInTheDocument()
    })
    updateSpy.mockRestore()
  })
})

// Regression tests: the user explicitly wants "edit even 1 field and click save".
// These cover existing profiles with various empty / invalid fields where ONLY one
// field is touched. Touching one valid field must always enable save.
describe('EditProfilePage — partial edits on ready profile with gaps', () => {
  it('saves only skill_level when first_name and last_name are empty in the profile', async () => {
    const user = userEvent.setup()
    sessionState.status = 'ready'
    sessionState.playerProfile = {
      ...READY_PROFILE,
      first_name: null,
      last_name: null,
      contact_number: null,
    }
    const updateSpy = vi.spyOn(profileApi, 'updateProfile').mockResolvedValue({
      success: true,
      data: {},
      meta: null,
      error: null,
    } as any)
    renderPage()
    const slider = screen.getByLabelText(/skill level slider/i) as HTMLInputElement
    fireEvent.change(slider, { target: { value: '5.5' } })
    const save = await screen.findByRole('button', { name: /save changes/i })
    await waitFor(() => expect(save).not.toBeDisabled())
    await user.click(save)
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledTimes(1)
    })
    expect(updateSpy).toHaveBeenCalledWith({ skill_level: 5.5 })
    updateSpy.mockRestore()
  })

  it('saves only contact_number even when first/last name are empty', async () => {
    const user = userEvent.setup()
    sessionState.status = 'ready'
    sessionState.playerProfile = {
      ...READY_PROFILE,
      first_name: null,
      last_name: null,
      contact_number: null,
    }
    const updateSpy = vi.spyOn(profileApi, 'updateProfile').mockResolvedValue({
      success: true,
      data: {},
      meta: null,
      error: null,
    } as any)
    renderPage()
    const phone = screen.getByLabelText(/phone number/i) as HTMLInputElement
    await user.type(phone, '501234567')
    await verifyPhoneInUi(user)
    const save = await screen.findByRole('button', { name: /save changes/i })
    await waitFor(() => expect(save).not.toBeDisabled())
    await user.click(save)
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledTimes(1)
    })
    // country_code is sent alongside contact_number so the backend stores a dial prefix.
    expect(updateSpy.mock.calls[0][0]).toMatchObject({ contact_number: '501234567', country_code: '+972' })
    updateSpy.mockRestore()
  })

  it('saves only first_name when other fields are empty in the profile', async () => {
    const user = userEvent.setup()
    sessionState.status = 'ready'
    sessionState.playerProfile = {
      ...READY_PROFILE,
      first_name: null,
      last_name: null,
      contact_number: null,
    }
    const updateSpy = vi.spyOn(profileApi, 'updateProfile').mockResolvedValue({
      success: true,
      data: {},
      meta: null,
      error: null,
    } as any)
    renderPage()
    const firstName = screen.getByLabelText(/first name/i) as HTMLInputElement
    await user.clear(firstName)
    await user.type(firstName, 'Dana')
    const save = await screen.findByRole('button', { name: /save changes/i })
    await waitFor(() => expect(save).not.toBeDisabled())
    await user.click(save)
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledTimes(1)
    })
    expect(updateSpy).toHaveBeenCalledWith({ first_name: 'Dana' })
    updateSpy.mockRestore()
  })
})

describe('EditProfilePage — profile_incomplete partial save', () => {
  it('requires real names before creating a player profile', async () => {
    const user = userEvent.setup()
    sessionState.status = 'profile_incomplete'
    sessionState.playerProfile = null
    const createSpy = vi.spyOn(authApi, 'createPlayerProfile').mockResolvedValue({
      success: true,
      data: { id: 'new' },
      meta: null,
      error: null,
    } as any)
    renderPage()
    const slider = screen.getByLabelText(/skill level slider/i) as HTMLInputElement
    fireEvent.change(slider, { target: { value: '4.5' } })
    const save = screen.getByRole('button', { name: /save changes/i })
    expect(save).toBeDisabled()
    await user.type(screen.getByLabelText(/first name/i), 'Dana')
    await user.type(screen.getByLabelText(/last name/i), 'Levi')
    await waitFor(() => expect(save).not.toBeDisabled())
    await user.click(save)
    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1)
    })
    // A new public player profile uses the name the player actually supplied.
    expect(createSpy.mock.calls[0][0]).toMatchObject({
      email: 'dana@example.com',
      skill_level: 4.5,
      first_name: 'Dana',
      last_name: 'Levi',
    })
    createSpy.mockRestore()
  })
})

describe('tournament profile completion', () => {
  it('retries refresh without creating the account twice after a successful save', async () => {
    sessionState.status = 'profile_incomplete'
    const create = vi.spyOn(authApi, 'createPlayerProfile').mockResolvedValue({ success: true, data: { id: 'p1' } } as any)
    vi.mocked(profileApi.getMyPlayerProfile).mockRejectedValueOnce(new Error('offline'))
    renderPage('/profile/edit?purpose=tournament&returnTo=%2Ftournaments%2Ft-1')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/first name/i), 'Dana')
    await user.type(screen.getByLabelText(/last name/i), 'Levi')
    await user.type(screen.getByLabelText(/phone number/i), '501234567')
    await verifyPhoneInUi(user)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '3.5' } })
    await user.click(screen.getByRole('button', { name: /continue to tournament/i }))
    expect(await screen.findByText(/details are saved/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/first name/i)).toBeDisabled()
    expect(screen.queryByTestId('tournament-probe')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByTestId('tournament-probe')).toBeInTheDocument()
    expect(create).toHaveBeenCalledTimes(1)
    create.mockRestore()
  })
  /** The checklist rows still outstanding, by their label. */
  function outstanding(): string[] {
    const list = screen.getByRole('status')
    return [...list.querySelectorAll('li')]
      .filter((li) => /missing/i.test(li.textContent ?? ''))
      .map((li) => (li.textContent ?? '').replace(/missing/i, '').trim())
  }

  it('details mode: continue stays disabled until names, a verified phone and a chosen level exist', async () => {
    sessionState.status = 'profile_incomplete'
    renderPage('/profile/edit?purpose=onboarding&returnTo=%2Ftournaments%2Ft-1')
    const user = userEvent.setup()
    expect(screen.getByRole('heading', { name: /almost in/i })).toBeInTheDocument()
    expect(screen.getByText(/before you start/i)).toBeInTheDocument()
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('') // no default level
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    const cont = () => screen.getByRole('button', { name: /^continue$/i })
    await user.type(screen.getByLabelText(/first name/i), 'Dana')
    await user.type(screen.getByLabelText(/last name/i), 'Levi')
    expect(cont()).toBeDisabled()
    await user.type(screen.getByLabelText(/phone number/i), '501234567')
    await verifyPhoneInUi(user)
    expect(cont()).toBeDisabled()
    fireEvent.change(screen.getByRole('slider'), { target: { value: '3.5' } })
    expect(cont()).toBeEnabled()
    expect(trackFunnelMock).toHaveBeenCalledWith('onboarding_details_shown', { step: 'onboarding' })
  })

  it('details mode: a legacy player missing only the level chooses it and is sent back', async () => {
    sessionState.status = 'ready'
    sessionState.playerProfile = { ...READY_PROFILE, skill_level: null }
    vi.spyOn(profileApi, 'getOnboardingStatus').mockResolvedValue({ success: true, data: { is_authenticated: true, has_player_profile: true, missing_steps: [] } } as any)
    const update = vi.spyOn(profileApi, 'updateProfile').mockResolvedValue({ success: true, data: READY_PROFILE } as any)
    renderPage('/profile/edit?purpose=onboarding&returnTo=%2Ftournaments%2Ft-1')
    const user = userEvent.setup()
    expect(screen.getByRole('button', { name: /^continue$/i })).toBeDisabled()
    // 4.0 is where the empty slider parks, so a `change` to "4" fires no event
    // at all; 4.5 is the nearest position that is real movement. A player can
    // still choose 4.0 — releasing the thumb there commits it (see the slider's
    // own pointer-up test).
    fireEvent.change(screen.getByRole('slider'), { target: { value: '4.5' } })
    await user.click(screen.getByRole('button', { name: /^continue$/i }))
    expect(await screen.findByTestId('tournament-probe')).toBeInTheDocument()
    expect(update).toHaveBeenCalledWith({ skill_level: 4.5 })
    expect(trackFunnelMock).toHaveBeenCalledWith('onboarding_details_completed', { step: 'onboarding' })
    update.mockRestore()
  })

  it('details mode: the sign-out link exists and the tournament purpose keeps its own copy', () => {
    sessionState.status = 'profile_incomplete'
    renderPage('/profile/edit?purpose=tournament&returnTo=%2Ftournaments%2Ft-1')
    expect(screen.getByRole('heading', { name: /your details for this tournament/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /not your account\? sign out/i })).toBeInTheDocument()
  })

  it('details mode: the sign-out link signs out and goes home', async () => {
    sessionState.status = 'profile_incomplete'
    renderPage('/profile/edit?purpose=onboarding&returnTo=%2Ftournaments%2Ft-1')
    await userEvent.click(screen.getByRole('button', { name: /not your account\? sign out/i }))
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
    expect(await screen.findByTestId('home-probe')).toBeInTheDocument()
  })

  it('details mode: a failing sign-out still lets the player leave', async () => {
    sessionState.status = 'profile_incomplete'
    signOut.mockRejectedValue(new Error('offline'))
    renderPage('/profile/edit?purpose=onboarding&returnTo=%2Ftournaments%2Ft-1')
    await userEvent.click(screen.getByRole('button', { name: /not your account\? sign out/i }))
    expect(await screen.findByTestId('home-probe')).toBeInTheDocument()
  })

  it('details mode: a save that leaves a required step missing names it and stays usable', async () => {
    sessionState.status = 'ready'
    sessionState.playerProfile = { ...READY_PROFILE, skill_level: null }
    // The write succeeded, but the server still reports skill_level missing —
    // the one case the "still missing" guard exists for.
    vi.spyOn(profileApi, 'getOnboardingStatus').mockResolvedValue({ success: true, data: { is_authenticated: true, has_player_profile: true, missing_steps: ['skill_level'] } } as any)
    const update = vi.spyOn(profileApi, 'updateProfile').mockResolvedValue({ success: true, data: READY_PROFILE } as any)
    renderPage('/profile/edit?purpose=onboarding&returnTo=%2Ftournaments%2Ft-1')
    const user = userEvent.setup()
    fireEvent.change(screen.getByRole('slider'), { target: { value: '4.5' } })
    await user.click(screen.getByRole('button', { name: /^continue$/i }))
    // Names what is actually missing instead of claiming a reload failed.
    expect(await screen.findByRole('alert')).toHaveTextContent(/we still need: your skill level/i)
    expect(screen.queryByText(/couldn't reload them/i)).not.toBeInTheDocument()
    expect(screen.queryByTestId('tournament-probe')).not.toBeInTheDocument()
    expect(trackFunnelMock).not.toHaveBeenCalledWith('onboarding_details_completed', expect.anything())
    // Not a dead end: the form stays editable and the CTA is still Continue…
    expect(screen.getByLabelText(/first name/i)).toBeEnabled()
    expect(screen.getByRole('slider')).toBeEnabled()
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
    expect(update).toHaveBeenCalledTimes(1)
    // …and pressing it really re-submits rather than replaying the same state.
    await user.click(screen.getByRole('button', { name: /^continue$/i }))
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2))
    expect(update).toHaveBeenLastCalledWith({ skill_level: 4.5 })
    update.mockRestore()
  })

  it('details mode: names prefilled from OAuth metadata are sent even though nothing was typed', async () => {
    sessionState.status = 'ready'
    // rally_users has no names; Google's metadata does. The boxes look full and
    // react-hook-form calls them pristine, so without the stored-value disjunct
    // the patch would be empty and onboarding-status would never change.
    sessionState.playerProfile = { ...READY_PROFILE, first_name: null, last_name: null }
    authState.user = { email: 'dana@example.com', user_metadata: { given_name: 'Dana', family_name: 'Levi' } }
    const update = vi.spyOn(profileApi, 'updateProfile').mockResolvedValue({ success: true, data: READY_PROFILE } as any)
    renderPage('/profile/edit?purpose=onboarding&returnTo=%2Ftournaments%2Ft-1')
    expect((screen.getByLabelText(/first name/i) as HTMLInputElement).value).toBe('Dana')
    await userEvent.click(screen.getByRole('button', { name: /^continue$/i }))
    expect(await screen.findByTestId('tournament-probe')).toBeInTheDocument()
    expect(update).toHaveBeenCalledWith({ first_name: 'Dana', last_name: 'Levi' })
    update.mockRestore()
  })

  it('details mode: a retry after a landed create patches instead of re-creating', async () => {
    sessionState.status = 'profile_incomplete'
    // The POST succeeds but the server still reports the phone missing (e.g.
    // normalisation dropped it). A second Continue must NOT re-POST: the row
    // exists now and rally-api's create has no "already exists" guard, so a
    // replay hits the primary key and returns an opaque failure.
    vi.spyOn(profileApi, 'getOnboardingStatus').mockResolvedValue({ success: true, data: { is_authenticated: true, has_player_profile: true, missing_steps: ['contact_number'] } } as any)
    const create = vi.spyOn(authApi, 'createPlayerProfile').mockResolvedValue({ success: true, data: { id: 'p1' } } as any)
    const update = vi.spyOn(profileApi, 'updateProfile').mockResolvedValue({ success: true, data: {} } as any)
    renderPage('/profile/edit?purpose=onboarding&returnTo=%2Ftournaments%2Ft-1')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/first name/i), 'Dana')
    await user.type(screen.getByLabelText(/last name/i), 'Levi')
    await user.type(screen.getByLabelText(/phone number/i), '501234567')
    await verifyPhoneInUi(user)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '3.5' } })
    await user.click(screen.getByRole('button', { name: /^continue$/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/we still need: a verified phone/i)
    expect(create).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: /^continue$/i }))
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1))
    expect(create).toHaveBeenCalledTimes(1)
    // `profile` is still null, so the stored-value disjuncts send every
    // required field — the right payload against a row we know exists.
    expect(update.mock.calls[0][0]).toMatchObject({
      first_name: 'Dana', last_name: 'Levi', contact_number: '501234567', skill_level: 3.5,
    })
    create.mockRestore()
    update.mockRestore()
  })

  it('details mode: a brand-new profile sends the OAuth names on create', async () => {
    sessionState.status = 'profile_incomplete'
    authState.user = { email: 'dana@example.com', user_metadata: { given_name: 'Dana', family_name: 'Levi' } }
    const create = vi.spyOn(authApi, 'createPlayerProfile').mockResolvedValue({ success: true, data: { id: 'p1' } } as any)
    renderPage('/profile/edit?purpose=onboarding&returnTo=%2Ftournaments%2Ft-1')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/phone number/i), '501234567')
    await verifyPhoneInUi(user)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '3.5' } })
    await user.click(screen.getByRole('button', { name: /^continue$/i }))
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    expect(create.mock.calls[0][0]).toMatchObject({ first_name: 'Dana', last_name: 'Levi', skill_level: 3.5 })
    create.mockRestore()
  })

  it('details mode: a mobile-created player with skill_level 0 sees the empty slider and must choose', async () => {
    sessionState.status = 'ready'
    sessionState.playerProfile = { ...READY_PROFILE, skill_level: 0 }
    vi.spyOn(profileApi, 'getOnboardingStatus').mockResolvedValue({ success: true, data: { is_authenticated: true, has_player_profile: true, missing_steps: [] } } as any)
    const update = vi.spyOn(profileApi, 'updateProfile').mockResolvedValue({ success: true, data: READY_PROFILE } as any)
    renderPage('/profile/edit?purpose=onboarding&returnTo=%2F')
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('')
    expect(screen.getByRole('button', { name: /^continue$/i })).toBeDisabled()
    fireEvent.change(screen.getByRole('slider'), { target: { value: '2.5' } })
    await userEvent.click(screen.getByRole('button', { name: /^continue$/i }))
    await waitFor(() => expect(update).toHaveBeenCalledWith({ skill_level: 2.5 }))
    update.mockRestore()
  })

  it('details mode: a complete player with no returnTo lands home instead of parking on the step', async () => {
    sessionState.status = 'ready'
    sessionState.playerProfile = READY_PROFILE
    renderPage('/profile/edit?purpose=onboarding')
    await userEvent.click(screen.getByRole('button', { name: /^continue$/i }))
    expect(await screen.findByTestId('home-probe')).toBeInTheDocument()
  })

  it('details mode: the inputs the checklist names carry the warning border and aria-invalid', async () => {
    sessionState.status = 'profile_incomplete'
    renderPage('/profile/edit?purpose=onboarding&returnTo=%2Ftournaments%2Ft-1')
    const user = userEvent.setup()
    const firstName = () => screen.getByLabelText(/first name/i)
    expect(firstName()).toHaveAttribute('aria-invalid', 'true')
    // Amber, not accent: it is the same colour the checklist marks that row
    // with, and the accent is spent on the button. See MISSING_BORDER.
    expect(firstName().className).toContain('border-rally-warning/50')
    expect(screen.getByLabelText(/phone number/i)).toHaveAttribute('aria-invalid', 'true')
    await user.type(firstName(), 'Dana')
    await user.type(screen.getByLabelText(/last name/i), 'Levi')
    expect(firstName()).not.toHaveAttribute('aria-invalid')
    expect(screen.getByLabelText(/last name/i)).not.toHaveAttribute('aria-invalid')
    // The phone is still missing, so its border stays.
    expect(screen.getByLabelText(/phone number/i)).toHaveAttribute('aria-invalid', 'true')
  })

  it('permissive mode: a junk ?purpose never reaches analytics', async () => {
    sessionState.status = 'ready'
    sessionState.playerProfile = READY_PROFILE
    const update = vi.spyOn(profileApi, 'updateProfile').mockResolvedValue({ success: true, data: {} } as any)
    renderPage('/profile/edit?purpose=%3Cscript%3E')
    const user = userEvent.setup()
    expect(screen.queryByLabelText(/first name/i)).not.toHaveAttribute('aria-invalid')
    await user.clear(screen.getByLabelText(/last name/i))
    await user.type(screen.getByLabelText(/last name/i), 'Cohen')
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => expect(trackFunnelMock).toHaveBeenCalledWith('profile_completed', { step: 'profile' }))
    update.mockRestore()
  })

  it('details mode: the checklist names exactly what is left, and empties as it is filled', async () => {
    sessionState.status = 'profile_incomplete'
    renderPage('/profile/edit?purpose=onboarding&returnTo=%2Ftournaments%2Ft-1')
    const user = userEvent.setup()
    expect(outstanding()).toEqual(['full name', 'a verified phone', 'your skill level'])
    await user.type(screen.getByLabelText(/first name/i), 'Dana')
    await user.type(screen.getByLabelText(/last name/i), 'Levi')
    expect(outstanding()).toEqual(['a verified phone', 'your skill level'])
    await user.type(screen.getByLabelText(/phone number/i), '501234567')
    await verifyPhoneInUi(user)
    expect(outstanding()).toEqual(['your skill level'])
    fireEvent.change(screen.getByRole('slider'), { target: { value: '3.5' } })
    expect(outstanding()).toEqual([])
  })

  it('permissive mode: no note about required fields, no notice, Save label, level may stay unset', () => {
    sessionState.status = 'ready'
    sessionState.playerProfile = { ...READY_PROFILE, skill_level: null }
    renderPage('/profile/edit')
    // The checklist belongs to the required step, not to ordinary profile editing.
    expect(screen.queryByText(/before you start/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /not your account\? sign out/i })).not.toBeInTheDocument()
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('')
    expect(screen.queryByRole('button', { name: /^continue$/i })).not.toBeInTheDocument()
  })

  it('lets a complete player continue without making a meaningless edit', async () => {
    sessionState.status = 'ready'
    sessionState.playerProfile = READY_PROFILE
    renderPage('/profile/edit?purpose=tournament&returnTo=%2Ftournaments%2Ft-1')
    expect(screen.queryByText(/before you continue we still need/i)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /continue to tournament/i }))
    expect(await screen.findByTestId('tournament-probe')).toBeInTheDocument()
  })
})
