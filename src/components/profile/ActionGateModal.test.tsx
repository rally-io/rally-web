import { describe, it, expect, vi, beforeEach } from 'vitest'
import { type ReactNode } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/i18n'
import { AuthContext, type AuthContextValue } from '@/contexts/AuthContext'
import { AppSessionContext, type AppSessionContextValue } from '@/contexts/AppSessionContext'
import { ActionGateModal } from './ActionGateModal'

// ---------- mocks ----------
vi.mock('@/services/api/auth', () => ({
  createPlayerProfile: vi.fn(),
}))
vi.mock('@/services/api/profile', () => ({
  updateProfile: vi.fn(),
}))
import { createPlayerProfile } from '@/services/api/auth'
import { updateProfile } from '@/services/api/profile'

// ---------- harness ----------
function makeAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    session: null,
    user: { email: 'a@b.co', user_metadata: {} } as any,
    isLoading: false,
    checkEmailExists: vi.fn().mockResolvedValue(false),
    signInWithEmail: vi.fn().mockResolvedValue(undefined),
    signUpWithEmail: vi.fn().mockResolvedValue({ hasSession: false }),
    signInWithOAuth: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    requestPasswordReset: vi.fn().mockResolvedValue(undefined),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    resendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function makeSession(overrides: Partial<AppSessionContextValue> = {}): AppSessionContextValue {
  return {
    status: 'ready',
    onboardingStatus: {
      is_authenticated: true,
      has_player_profile: true,
      completion_percent: 100,
      completed_steps: [],
      missing_steps: [],
    },
    playerProfile: {
      id: 'p1',
      first_name: 'A',
      last_name: 'B',
      contact_number: '0500000000',
      email: 'a@b.co',
      skill_level: 3,
    },
    refetchOnboarding: vi.fn().mockResolvedValue(undefined),
    ensurePlayerProfile: vi.fn().mockResolvedValue(undefined),
    __setBlockingHandlers: vi.fn(),
    clearSession: vi.fn(),
    ...overrides,
  }
}

function wrap(
  ui: ReactNode,
  opts: { auth?: Partial<AuthContextValue>; session?: Partial<AppSessionContextValue> } = {},
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={makeAuth(opts.auth)}>
        <AppSessionContext.Provider value={makeSession(opts.session)}>
          {ui}
        </AppSessionContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.mocked(createPlayerProfile).mockReset()
  vi.mocked(updateProfile).mockReset()
})

describe('ActionGateModal — visibility', () => {
  it('renders only the skill slider when only skill is missing (tournament)', () => {
    render(
      wrap(
        <ActionGateModal
          open
          action="register_tournament"
          onOpenChange={vi.fn()}
          onConfirmed={vi.fn()}
        />,
        {
          session: {
            playerProfile: {
              id: 'p1',
              first_name: 'A',
              last_name: 'B',
              contact_number: '0500000000',
              email: 'a@b.co',
              skill_level: null,
            },
          },
        },
      ),
    )
    expect(screen.getByRole('slider')).toBeInTheDocument()
    expect(screen.queryByLabelText('Phone number')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('First name')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument()
  })

  it('renders only phone when only phone is missing (court)', () => {
    render(
      wrap(
        <ActionGateModal
          open
          action="book_court"
          onOpenChange={vi.fn()}
          onConfirmed={vi.fn()}
        />,
        {
          session: {
            playerProfile: {
              id: 'p1',
              first_name: 'A',
              last_name: 'B',
              contact_number: null,
              email: 'a@b.co',
              skill_level: 3,
            },
          },
        },
      ),
    )
    expect(screen.getByLabelText('Phone number')).toBeInTheDocument()
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument()
  })

  it('renders phone + skill for tournament when both missing (existing player row)', () => {
    render(
      wrap(
        <ActionGateModal
          open
          action="register_tournament"
          onOpenChange={vi.fn()}
          onConfirmed={vi.fn()}
        />,
        {
          session: {
            playerProfile: {
              id: 'p1',
              first_name: 'A',
              last_name: 'B',
              contact_number: null,
              email: 'a@b.co',
              skill_level: null,
            },
          },
        },
      ),
    )
    expect(screen.getByLabelText('Phone number')).toBeInTheDocument()
    expect(screen.getByRole('slider')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument()
  })

  it('renders first/last name only when no player row AND no OAuth metadata', () => {
    render(
      wrap(
        <ActionGateModal
          open
          action="register_tournament"
          onOpenChange={vi.fn()}
          onConfirmed={vi.fn()}
        />,
        {
          auth: { user: { email: 'a@b.co', user_metadata: {} } as any },
          session: {
            onboardingStatus: {
              is_authenticated: true,
              has_player_profile: false,
              completion_percent: 0,
              completed_steps: [],
              missing_steps: [],
            },
            playerProfile: null,
          },
        },
      ),
    )
    expect(screen.getByLabelText('First name')).toBeInTheDocument()
    expect(screen.getByLabelText('Last name')).toBeInTheDocument()
    expect(screen.getByLabelText('Phone number')).toBeInTheDocument()
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })

  it('hides first/last name when user_metadata supplies them', () => {
    render(
      wrap(
        <ActionGateModal
          open
          action="register_tournament"
          onOpenChange={vi.fn()}
          onConfirmed={vi.fn()}
        />,
        {
          auth: {
            user: {
              email: 'a@b.co',
              user_metadata: { first_name: 'Bar', last_name: 'Pariente' },
            } as any,
          },
          session: {
            onboardingStatus: {
              is_authenticated: true,
              has_player_profile: false,
              completion_percent: 0,
              completed_steps: [],
              missing_steps: [],
            },
            playerProfile: null,
          },
        },
      ),
    )
    expect(screen.queryByLabelText('First name')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Last name')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Phone number')).toBeInTheDocument()
  })
})

describe('ActionGateModal — submit (existing player row)', () => {
  it('PATCHes contact_number + skill_level then calls onConfirmed', async () => {
    const user = userEvent.setup()
    vi.mocked(updateProfile).mockResolvedValue({ success: true, data: null } as any)
    const onConfirmed = vi.fn()
    const onOpenChange = vi.fn()
    render(
      wrap(
        <ActionGateModal
          open
          action="register_tournament"
          onOpenChange={onOpenChange}
          onConfirmed={onConfirmed}
        />,
        {
          session: {
            playerProfile: {
              id: 'p1',
              first_name: 'A',
              last_name: 'B',
              contact_number: null,
              email: 'a@b.co',
              skill_level: null,
            },
          },
        },
      ),
    )
    await user.type(screen.getByLabelText('Phone number'), '0506386504')
    // slider stays at SKILL_DEFAULT = 3.0
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        contact_number: '0506386504',
        skill_level: 3.0,
      }),
    )
    await waitFor(() => expect(onConfirmed).toHaveBeenCalledTimes(1))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('Skip → confirm sub-dialog → "Skip anyway" PATCHes only phone, no skill_level', async () => {
    const user = userEvent.setup()
    vi.mocked(updateProfile).mockResolvedValue({ success: true, data: null } as any)
    const onConfirmed = vi.fn()
    render(
      wrap(
        <ActionGateModal
          open
          action="register_tournament"
          onOpenChange={vi.fn()}
          onConfirmed={onConfirmed}
        />,
        {
          session: {
            playerProfile: {
              id: 'p1',
              first_name: 'A',
              last_name: 'B',
              contact_number: null,
              email: 'a@b.co',
              skill_level: null,
            },
          },
        },
      ),
    )
    await user.type(screen.getByLabelText('Phone number'), '0506386504')
    await user.click(screen.getByRole('button', { name: 'Skip' }))
    await user.click(screen.getByRole('button', { name: 'Skip anyway' }))

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({ contact_number: '0506386504' }),
    )
    await waitFor(() => expect(onConfirmed).toHaveBeenCalledTimes(1))
  })

  it('Skip → "Set my level" closes sub-dialog and keeps main modal open without saving', async () => {
    const user = userEvent.setup()
    const onConfirmed = vi.fn()
    render(
      wrap(
        <ActionGateModal
          open
          action="register_tournament"
          onOpenChange={vi.fn()}
          onConfirmed={vi.fn()}
        />,
        {
          session: {
            playerProfile: {
              id: 'p1',
              first_name: 'A',
              last_name: 'B',
              contact_number: '0500000000',
              email: 'a@b.co',
              skill_level: null,
            },
          },
        },
      ),
    )
    await user.click(screen.getByRole('button', { name: 'Skip' }))
    await user.click(screen.getByRole('button', { name: 'Set my level' }))
    expect(updateProfile).not.toHaveBeenCalled()
    expect(onConfirmed).not.toHaveBeenCalled()
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })
})

describe('ActionGateModal — submit (no player row yet)', () => {
  it('POSTs createPlayerProfile with metadata-derived name, phone, default gender', async () => {
    const user = userEvent.setup()
    vi.mocked(createPlayerProfile).mockResolvedValue({
      success: true,
      data: { id: 'p1' } as any,
    } as any)
    const onConfirmed = vi.fn()
    render(
      wrap(
        <ActionGateModal
          open
          action="book_court"
          onOpenChange={vi.fn()}
          onConfirmed={onConfirmed}
        />,
        {
          auth: {
            user: {
              email: 'bar@example.com',
              user_metadata: { first_name: 'Bar', last_name: 'Pariente' },
            } as any,
          },
          session: {
            onboardingStatus: {
              is_authenticated: true,
              has_player_profile: false,
              completion_percent: 0,
              completed_steps: [],
              missing_steps: [],
            },
            playerProfile: null,
          },
        },
      ),
    )
    await user.type(screen.getByLabelText('Phone number'), '0506386504')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(createPlayerProfile).toHaveBeenCalledTimes(1))
    expect(createPlayerProfile).toHaveBeenCalledWith({
      first_name: 'Bar',
      last_name: 'Pariente',
      email: 'bar@example.com',
      contact_number: '0506386504',
      country_code: '+972',
      gender: 'choose_not_to_answer',
    })
    await waitFor(() => expect(onConfirmed).toHaveBeenCalledTimes(1))
  })

  it('POSTs createPlayerProfile with skill_level for tournament action', async () => {
    const user = userEvent.setup()
    vi.mocked(createPlayerProfile).mockResolvedValue({
      success: true,
      data: { id: 'p1' } as any,
    } as any)
    render(
      wrap(
        <ActionGateModal
          open
          action="register_tournament"
          onOpenChange={vi.fn()}
          onConfirmed={vi.fn()}
        />,
        {
          auth: {
            user: {
              email: 'bar@example.com',
              user_metadata: { first_name: 'Bar', last_name: 'Pariente' },
            } as any,
          },
          session: {
            onboardingStatus: {
              is_authenticated: true,
              has_player_profile: false,
              completion_percent: 0,
              completed_steps: [],
              missing_steps: [],
            },
            playerProfile: null,
          },
        },
      ),
    )
    await user.type(screen.getByLabelText('Phone number'), '0506386504')
    const slider = screen.getByRole('slider') as HTMLInputElement
    fireEvent.change(slider, { target: { value: '4.5' } })
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(createPlayerProfile).toHaveBeenCalledTimes(1))
    expect(createPlayerProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        contact_number: '0506386504',
        skill_level: 4.5,
        gender: 'choose_not_to_answer',
        country_code: '+972',
      }),
    )
  })
})

describe('ActionGateModal — error and submit states', () => {
  it('Continue is disabled when phone is empty and phone is required', () => {
    render(
      wrap(
        <ActionGateModal
          open
          action="book_court"
          onOpenChange={vi.fn()}
          onConfirmed={vi.fn()}
        />,
        {
          session: {
            playerProfile: {
              id: 'p1',
              first_name: 'A',
              last_name: 'B',
              contact_number: null,
              email: 'a@b.co',
              skill_level: 3,
            },
          },
        },
      ),
    )
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })

  it('shows an error message and does not call onConfirmed when save fails', async () => {
    const user = userEvent.setup()
    vi.mocked(updateProfile).mockResolvedValue({
      success: false,
      error: { code: 'X', message: 'Server says no' },
    } as any)
    const onConfirmed = vi.fn()
    render(
      wrap(
        <ActionGateModal
          open
          action="book_court"
          onOpenChange={vi.fn()}
          onConfirmed={onConfirmed}
        />,
        {
          session: {
            playerProfile: {
              id: 'p1',
              first_name: 'A',
              last_name: 'B',
              contact_number: null,
              email: 'a@b.co',
              skill_level: 3,
            },
          },
        },
      ),
    )
    await user.type(screen.getByLabelText('Phone number'), '0506386504')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Server says no'))
    expect(onConfirmed).not.toHaveBeenCalled()
  })
})