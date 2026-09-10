/**
 * Shared harness for the CorporateRegistrationPage test files.
 *
 * Deliberately NOT a `.test.tsx`: importing a test module from another test
 * module re-registers its suites, so every state test would run twice (once per
 * importer). This file is excluded from vitest's `**\/*.{test,spec}.*` glob and
 * only ever imported.
 *
 * The `vi.mock` calls below are hoisted within THIS module, and this module
 * imports the page — so any test file that imports the harness gets the page
 * built against these mocks. A test file must therefore reach the page only
 * through `renderPage()`, never by importing it directly.
 */
import { vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useSearchParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/hooks/useTournament', () => ({ useTournament: vi.fn() }))
vi.mock('@/hooks/useAppSession', () => ({ useAppSession: vi.fn() }))
vi.mock('@/hooks/useAuthGate', () => ({ useAuthGate: vi.fn() }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ session: null, user: null }) }))
vi.mock('@/hooks/usePlayerSearch', () => ({
  usePlayerSearch: vi.fn(() => ({ results: [], isLoading: false, isActive: false })),
}))
vi.mock('@/features/screenMessages/hooks/useScreenMessages', () => ({ useScreenMessages: vi.fn(() => ({ data: [], isLoading: false })) }))
vi.mock('@/features/screenMessages/hooks/useMessageActions', () => ({
  useAcknowledgeMessage: () => ({ mutate: vi.fn(), isPending: false }),
  useDismissMessage: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/features/screenMessages/hooks/useRegistrationGate', () => ({ useRegistrationGate: vi.fn() }))
vi.mock('@/hooks/useTournamentRegistration', () => ({ useTournamentRegistration: vi.fn() }))
vi.mock('@/services/api/registrationEvidence', () => ({
  uploadRegistrationEvidence: vi.fn(),
  listRegistrationEvidence: vi.fn(),
}))
vi.mock('@/hooks/useEnsureProfileEssentials', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useEnsureProfileEssentials')>('@/hooks/useEnsureProfileEssentials')
  return { ...actual, useEnsureProfileEssentials: vi.fn() }
})

import CorporateRegistrationPage from './CorporateRegistrationPage'
import { useTournament } from '@/hooks/useTournament'
import { useAppSession } from '@/hooks/useAppSession'
import { useAuthGate } from '@/hooks/useAuthGate'
import { useRegistrationGate } from '@/features/screenMessages/hooks/useRegistrationGate'
import { useTournamentRegistration } from '@/hooks/useTournamentRegistration'
import { useEnsureProfileEssentials } from '@/hooks/useEnsureProfileEssentials'
import { uploadRegistrationEvidence } from '@/services/api/registrationEvidence'
import type { CorporateTournamentEvent } from '@/constants/corporateEvents'

export const EVENT: CorporateTournamentEvent = {
  mode: 'tournament', slug: 'acme', tournamentId: 't-1', company: 'Acme Ltd',
  tournamentName: 'Acme Padel Cup', clubName: 'Kash Padel', clubAddress: '1 Padel St',
  heroImage: '/padel-court-home.jpg', dateLabel: 'Thursday, 20 August 2026', timeLabel: '17:00–21:00',
}

export const mockUseTournament = vi.mocked(useTournament)
export const mockUseAppSession = vi.mocked(useAppSession)
export const mockUseAuthGate = vi.mocked(useAuthGate)
export const mockUseGate = vi.mocked(useRegistrationGate)
export const mockUseRegistration = vi.mocked(useTournamentRegistration)
export const mockUseEnsure = vi.mocked(useEnsureProfileEssentials)
export const mockUploadEvidence = vi.mocked(uploadRegistrationEvidence)
export const requireSignIn = vi.fn()
export const register = vi.fn(async () => {})
export const ensure = vi.fn(async () => {})
export const refetchOnboarding = vi.fn(async () => {})
/** `useTournament().refetch` — the page re-reads the tournament after a fee
 *  waiver's evidence upload, so the registered card sees the stored counts. */
export const refetchTournament = vi.fn(async () => {})

/** The signed-in profile the page's own readiness guard waits for. */
export const PROFILE = { first_name: 'Dana', last_name: 'Cohen', contact_number: null, skill_level: null }
/**
 * A profile with every essential already on it. This is the default world now:
 * the details live in their own modal and the summary card reads what was
 * SAVED, so a test about the waiver, the partner or the price should not have
 * to walk through the modal first. Tests about the details themselves override
 * both hooks with `PROFILE` (or null) to get the fresh-account shape back.
 */
export const COMPLETE_PROFILE = {
  first_name: 'Dana', last_name: 'Cohen', contact_number: '0501234567', skill_level: 4.5,
}

/**
 * The details modal opens itself whenever the profile is incomplete — the
 * registration page never asks. Nothing on that page opens it for a profile
 * that is already complete, so a test that wants it up hands over an
 * incomplete profile.
 */
export function expectDetailsModal() {
  const dialog = document.querySelector('[role="dialog"]')
  if (!dialog) throw new Error('details modal is not open — is the fixture profile complete?')
  return dialog
}

/**
 * Fill what the details modal is missing and save. `ensure` is mocked, so the
 * write resolves immediately and the form's just-saved snapshot lands without
 * waiting for a profile refetch.
 */
export async function completeDetails(
  user: { click: (el: Element) => Promise<void>; type: (el: Element, text: string) => Promise<void> },
  { first = 'Dana', last = 'Cohen', phone = '0501234567', level = '4.5' } = {},
) {
  expectDetailsModal()
  const firstInput = screen.getByLabelText('First name') as HTMLInputElement
  if (first && !firstInput.value) await user.type(firstInput, first)
  const lastInput = screen.getByLabelText('Last name') as HTMLInputElement
  if (last && !lastInput.value) await user.type(lastInput, last)
  const phoneInput = screen.getByLabelText('Your mobile number') as HTMLInputElement
  if (phone && !phoneInput.readOnly && !phoneInput.value) await user.type(phoneInput, phone)
  const slider = screen.queryByLabelText(/skill level slider/i)
  if (slider && level) fireEvent.change(slider, { target: { value: level } })
  await user.click(screen.getByRole('button', { name: 'Save details' }))
}

export function gate(over: Record<string, unknown> = {}) {
  return {
    blocking: [], selectedIds: new Set<string>(), toggle: vi.fn(), isSatisfied: true,
    payload: [], outstanding: [], handleGateError: vi.fn(() => false), reset: vi.fn(), ...over,
  } as any
}
export function session(status: string, playerProfile: Record<string, unknown> | null = null) {
  return { status, playerProfile, onboardingStatus: null, needsDetails: false, refetchOnboarding, clearSession: vi.fn() } as any
}
export function tr(over: Record<string, unknown> = {}) {
  return {
    data: {
      id: 't-1', name: 'Acme Padel Cup', format: 'doubles', status: 'registration_open',
      start_date: '2999-06-01', end_date: '2999-06-02', registration_deadline: '2999-05-25',
      skill_level_min: 2.5, skill_level_max: 3.8, skill_level: '2.5 - 3.8 (C2)',
      entry_fee: 150, image_url: null, thumb_url: null, structure: 'single_elimination',
      club_name: 'Kash Padel', description: '', prizes: [], sponsors: [],
      my_registration: null, my_waitlist_entry: null, waitlist_count: 0, is_full: false,
      ...over,
    },
    isLoading: false, isError: false, refetch: refetchTournament,
  } as any
}

function Probe() {
  const [params] = useSearchParams()
  return <div data-testid="route-probe">{params.toString()}</div>
}

/**
 * `eventOver` patches the default event entry — the fee-waiver tests need one
 * that declares `feeWaiver`, which only the (deliberately unstaged) Israel Open
 * entry does in the real constants file.
 */
export function renderPage(eventOver: Partial<CorporateTournamentEvent> = {}) {
  const event = { ...EVENT, ...eventOver }
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  // Rebuilt (not captured) so `rerender()` hands React a fresh element — passing
  // the same element reference back would let React bail out of the re-render.
  const tree = () => (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/join/acme']}>
        <Routes>
          <Route path="/join/:slug" element={<CorporateRegistrationPage event={event} />} />
          <Route path="/payment-method" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
  const utils = render(tree())
  // `rerender()` takes no element: it reconstructs the identical tree (same
  // QueryClient, same route) so a test that swaps a hook mock's return value
  // mid-test can force the PAGE to re-read it — a child's own setState only
  // re-renders the child. Same rationale as TournamentDetailPage.test.tsx's
  // `pageTree()`, minus leaking the QueryClient into every test file.
  return { ...utils, rerender: () => utils.rerender(tree()) }
}

/**
 * The default world: an open doubles tournament, a signed-in player whose profile
 * has loaded, nothing gating registration. Call from each test file's own
 * `beforeEach` — a hook declared here would not run for the importer.
 *
 * `useAppSession` and `useEnsureProfileEssentials` are mocked separately but are
 * defaulted to the SAME loaded profile: the real hook reads its profile from the
 * session, so a "ready" session with a null profile is a shape it rejects
 * (`PROFILE_NOT_LOADED`). A test that wants the fresh-account shape sets both.
 */
export function resetPageMocks() {
  vi.clearAllMocks()
  sessionStorage.clear()
  Element.prototype.scrollIntoView = vi.fn()
  mockUseTournament.mockReturnValue(tr())
  mockUseAppSession.mockReturnValue(session('ready', COMPLETE_PROFILE))
  mockUseAuthGate.mockReturnValue({ requireSignIn })
  requireSignIn.mockResolvedValue(undefined)
  mockUseGate.mockReturnValue(gate())
  mockUseRegistration.mockReturnValue({ register, isRegistering: false, registerError: null, gateError: null, setRegisterError: vi.fn(), setGateError: vi.fn() } as any)
  mockUseEnsure.mockReturnValue({ ensure, status: 'ready', playerProfile: COMPLETE_PROFILE, phoneLocked: true, levelLocked: true } as any)
  mockUploadEvidence.mockResolvedValue([])
  refetchTournament.mockResolvedValue(undefined)
}
