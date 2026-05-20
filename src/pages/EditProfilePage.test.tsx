import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/i18n'
import EditProfilePage from './EditProfilePage'
import * as profileApi from '@/services/api/profile'
import type { PlayerMe } from '@/types/api'

const ensurePlayerProfile = vi.fn()
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
    ensurePlayerProfile,
    onboardingStatus: null,
    refetchOnboarding: vi.fn(),
    __setBlockingHandlers: vi.fn(),
    clearSession: vi.fn(),
  }),
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
  ensurePlayerProfile.mockReset()
  ensurePlayerProfile.mockResolvedValue(undefined)
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
  it('calls ensurePlayerProfile on mount', async () => {
    sessionState.status = 'profile_incomplete'
    renderPage()
    await waitFor(() => {
      expect(ensurePlayerProfile).toHaveBeenCalledTimes(1)
    })
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
