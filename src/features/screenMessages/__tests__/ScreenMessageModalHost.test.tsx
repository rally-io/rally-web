import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { ScreenMessageList } from '../components/ScreenMessageList'
import { ScreenMessageModalHost, resetScreenMessageModalSeenSet } from '../components/ScreenMessageModalHost'
import { useScreenMessages } from '../hooks/useScreenMessages'
import type { ScreenMessage, ScreenMessageSelection } from '../types'

// Both ScreenMessageList and ScreenMessageModalHost call the real, useQuery-
// backed useScreenMessages — no QueryClientProvider is mounted in this file,
// so it's mocked like every other hook-consuming test in this feature.
vi.mock('../hooks/useScreenMessages', () => ({ useScreenMessages: vi.fn() }))

const mockAcknowledgeMutate = vi.fn()
const mockAcknowledgeMutateAsync = vi.fn()
const mockDismissMutate = vi.fn()
const mockDismissMutateAsync = vi.fn()
vi.mock('../hooks/useMessageActions', () => ({
  // ScreenMessageCard (rendered by ScreenMessageList, alongside the dialog,
  // for any gating message) still calls `.mutate` — keep it wired even
  // though ScreenMessageModal itself now only calls `.mutateAsync`.
  useAcknowledgeMessage: () => ({
    mutate: mockAcknowledgeMutate,
    mutateAsync: mockAcknowledgeMutateAsync,
    isPending: false,
    error: null,
  }),
  useDismissMessage: () => ({
    mutate: mockDismissMutate,
    mutateAsync: mockDismissMutateAsync,
    isPending: false,
    error: null,
  }),
}))

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ session: { id: 'user-1' } }) }))
const mockRequireSignIn = vi.fn()
vi.mock('@/hooks/useAuthGate', () => ({
  useAuthGate: () => ({ requireSignIn: mockRequireSignIn }),
}))

const mockUseScreenMessages = vi.mocked(useScreenMessages)

function baseMessage(overrides: Partial<ScreenMessage> = {}): ScreenMessage {
  return {
    id: 'msg-1',
    version: 1,
    kind: 'info',
    display_mode: 'inline',
    title: 'A message',
    body: 'Body text',
    is_dismissible: false,
    requires_acknowledgment: false,
    gate_actions: [],
    is_acknowledged: false,
    acknowledged_at: null,
    ...overrides,
  }
}

function selection(
  overrides: Partial<{
    selectedIds: Set<string>
    onToggle: (id: string, version: number) => void
  }> = {},
): ScreenMessageSelection {
  return {
    action: 'tournament_registration',
    selectedIds: overrides.selectedIds ?? new Set<string>(),
    onToggle: overrides.onToggle ?? vi.fn<(id: string, version: number) => void>(),
  }
}

// Mirrors what TournamentDetailPage actually mounts: ScreenMessageList and
// ScreenMessageModalHost side by side, sharing one query. Tests 1–3 below
// (SCREEN_MESSAGES_WEB_PLAN.md Task 8) are about exactly this combination —
// neither component alone renders both a card and a dialog.
function surfacesTree(messages: ScreenMessage[], sel?: ScreenMessageSelection) {
  mockUseScreenMessages.mockReturnValue({ data: messages } as any)
  return (
    <>
      <ScreenMessageList query={{ scope: 'tournament', id: 't-1' }} selection={sel} />
      <ScreenMessageModalHost query={{ scope: 'tournament', id: 't-1' }} selection={sel} />
    </>
  )
}

function renderSurfaces(messages: ScreenMessage[], sel?: ScreenMessageSelection) {
  return render(surfacesTree(messages, sel))
}

beforeEach(() => {
  mockAcknowledgeMutate.mockReset()
  mockAcknowledgeMutateAsync.mockReset()
  mockAcknowledgeMutateAsync.mockResolvedValue({ acknowledged: true })
  mockDismissMutate.mockReset()
  mockDismissMutateAsync.mockReset()
  mockDismissMutateAsync.mockResolvedValue({ dismissed: true })
  mockRequireSignIn.mockReset()
  // A module-level cache tests cannot clear leaks state between tests — that
  // is its own bug (SCREEN_MESSAGES_WEB_PLAN.md Task 9 #3's own instruction).
  resetScreenMessageModalSeenSet()
})

describe('display_mode routing: ScreenMessageList + ScreenMessageModalHost', () => {
  it('a modal message that gates an action renders BOTH a dialog and an inline card (test 1: the dead-end-button defect)', () => {
    renderSurfaces(
      [
        baseMessage({
          id: 'terms-1',
          display_mode: 'modal',
          requires_acknowledgment: true,
          gate_actions: ['tournament_registration'],
          title: 'Tournament terms',
        }),
      ],
      selection(),
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByTestId('screen-message-list')).toBeInTheDocument()
    // Once in the dialog title, once in the inline card's title.
    expect(screen.getAllByText('Tournament terms')).toHaveLength(2)
  })

  it('a modal message that gates nothing renders a dialog and NO inline card (test 2)', () => {
    renderSurfaces([
      baseMessage({ id: 'news-1', display_mode: 'modal', gate_actions: [], title: 'Court news' }),
    ])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByTestId('screen-message-list')).not.toBeInTheDocument()
  })

  it('an inline message renders no dialog (test 3)', () => {
    renderSurfaces([
      baseMessage({ id: 'inline-1', display_mode: 'inline', title: 'Pool closed for cleaning' }),
    ])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Pool closed for cleaning')).toBeInTheDocument()
  })
})

describe('ScreenMessageModalHost: one at a time, session-scoped, version-aware', () => {
  it('only one dialog renders when two modal messages are live, in list order (test 7)', () => {
    renderSurfaces([
      baseMessage({ id: 'm1', display_mode: 'modal', title: 'First announcement' }),
      baseMessage({ id: 'm2', display_mode: 'modal', title: 'Second announcement' }),
    ])
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByText('First announcement')).toBeInTheDocument()
    expect(screen.queryByText('Second announcement')).not.toBeInTheDocument()
  })

  it('escape closes it, and it does not reopen on a re-render with the same data (test 5)', async () => {
    const { rerender } = renderSurfaces([
      baseMessage({ id: 'm1', display_mode: 'modal', title: 'First announcement' }),
    ])
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    // Simulate a background refetch landing — same data, a plain re-render.
    rerender(surfacesTree([baseMessage({ id: 'm1', display_mode: 'modal', title: 'First announcement' })]))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('a version bump on the same id DOES reopen it — new text (test 6)', async () => {
    const { rerender } = renderSurfaces([
      baseMessage({ id: 'm1', version: 1, display_mode: 'modal', title: 'First announcement' }),
    ])
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    rerender(
      surfacesTree([
        baseMessage({ id: 'm1', version: 2, display_mode: 'modal', title: 'First announcement — edited' }),
      ]),
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('First announcement — edited')).toBeInTheDocument()
  })

  it('closing a modal, unmounting the host, and remounting does not re-open it (test 7: defect #3)', async () => {
    const { unmount } = renderSurfaces([
      baseMessage({ id: 'm1', display_mode: 'modal', title: 'First announcement' }),
    ])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    // Simulates navigating away from the page (host unmounts) and back
    // (host remounts fresh) — a useState-backed seen-set would lose the
    // closure here and re-pop the dialog.
    unmount()
    renderSurfaces([baseMessage({ id: 'm1', display_mode: 'modal', title: 'First announcement' })])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('resetScreenMessageModalSeenSet actually clears the seen-set (test 8: guards test 7 against a false pass)', async () => {
    const { unmount } = renderSurfaces([
      baseMessage({ id: 'm1', display_mode: 'modal', title: 'First announcement' }),
    ])
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    unmount()

    resetScreenMessageModalSeenSet()
    renderSurfaces([baseMessage({ id: 'm1', display_mode: 'modal', title: 'First announcement' })])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('ScreenMessageModalHost: already-satisfied obligations do not re-pop (defect #2)', () => {
  it('a modal with requires_acknowledgment: true, is_acknowledged: true never opens (test 5 of the defect list)', () => {
    renderSurfaces([
      baseMessage({
        id: 'terms-1',
        display_mode: 'modal',
        requires_acknowledgment: true,
        is_acknowledged: true,
        gate_actions: ['tournament_registration'],
        title: 'Tournament terms',
      }),
    ])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('a non-dismissible, non-acknowledgeable info modal still opens — guards against over-filtering (test 6 of the defect list)', () => {
    renderSurfaces([
      baseMessage({
        id: 'news-1',
        display_mode: 'modal',
        is_dismissible: false,
        requires_acknowledgment: false,
        gate_actions: [],
        title: 'Court news',
      }),
    ])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('ScreenMessageModalHost: a failing accept never marks the message seen (Task 9 #1, second half)', () => {
  it('does not mark the modal seen — it still shows after a re-render with the same data (test 2 of the defect list)', async () => {
    mockAcknowledgeMutateAsync.mockImplementation(async () => {
      throw { code: 'ACK_FAILED', message: 'boom' }
    })
    // No `selection` — mirrors ClubDetailPage, which mounts
    // ScreenMessageModalHost with none. gate_actions is non-empty (so
    // ScreenMessageList ALSO renders an inline card for the same message —
    // Task 8's forced duplicate for any gating modal), so this dialog is
    // queried explicitly via `within` rather than relying on Radix's
    // aria-hidden of background content while it's open.
    const messages = [
      baseMessage({
        id: 'court-terms',
        display_mode: 'modal',
        requires_acknowledgment: true,
        is_acknowledged: false,
        gate_actions: ['court_booking'],
        title: 'Court booking terms',
      }),
    ]
    const { rerender } = renderSurfaces(messages)
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Accept' }))

    // Give the rejected mutateAsync's catch block a full macrotask to settle.
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Simulate a background refetch landing with the same data — if the
    // failure had incorrectly marked the message "seen", it would be
    // filtered out and the dialog would disappear here.
    rerender(surfacesTree(messages))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
