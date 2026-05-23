import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/i18n'
import EditProfilePage from './EditProfilePage'
import * as profileApi from '@/services/api/profile'
import * as authApi from '@/services/api/auth'
import type { PlayerMe } from '@/types/api'

const requireSignIn = vi.fn()
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
    refetchOnboarding: vi.fn(),
    clearSession: vi.fn(),
  }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { email: 'dana@example.com' } }),
}))

vi.mock('@/hooks/useAuthGate', () => ({
  useAuthGate: () => ({ requireSignIn }),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/profile/edit']}>
        <EditProfilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  requireSignIn.mockReset()
  requireSignIn.mockResolvedValue(undefined)
  sessionState.status = 'signed_out'
  sessionState.playerProfile = null
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
  it('creates a profile from skill_level alone, defaulting to Player for names', async () => {
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
    await waitFor(() => expect(save).not.toBeDisabled())
    await user.click(save)
    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1)
    })
    // Names default to 'Player' (not email prefix) so social-signup users
    // don't get leaderboard entries like "12345 12345".
    expect(createSpy.mock.calls[0][0]).toMatchObject({
      email: 'dana@example.com',
      skill_level: 4.5,
      first_name: 'Player',
      last_name: 'Player',
    })
    createSpy.mockRestore()
  })
})
