import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CorporateSignupPage from './CorporateSignupPage'
import { submitLead } from '@/services/api/leads'
import { getCorporateEvent, type CorporateEvent } from '@/constants/corporateEvents'
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/appLinks'

vi.mock('@/services/api/leads')
// Mocked so these tests don't break every time a real client is added to or
// removed from the live event config.
vi.mock('@/constants/corporateEvents')

const EVENT: CorporateEvent = {
  slug: 'acme',
  sheetSource: 'corporate_acme',
  company: 'Acme Ltd',
  tournamentName: 'Acme Padel Cup',
  clubName: 'Kash Padel',
  clubAddress: '1 Padel St, Tel Aviv',
  heroImage: '/padel-court-home.jpg',
  dateLabel: 'Thursday, 20 August 2026',
  timeLabel: '17:00–21:00',
}

function renderPage(path = '/join/acme') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/join/:slug" element={<CorporateSignupPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** Fill every required field. Phone is typed as a user would: with the trunk 0. */
async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Full name'), 'Dana Cohen')
  await user.type(screen.getByLabelText('Email'), 'dana@acme.co.il')
  await user.type(screen.getByLabelText('Mobile number'), '050-123-4567')
}

describe('CorporateSignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(getCorporateEvent).mockImplementation((slug) =>
      slug === 'acme' ? EVENT : null,
    )
    vi.mocked(submitLead).mockResolvedValue(undefined)
  })

  it('renders the event details for a known slug', () => {
    renderPage()
    expect(screen.getByText('Acme Padel Cup')).toBeInTheDocument()
    expect(screen.getByText('Acme Ltd')).toBeInTheDocument()
    expect(screen.getByText('Thursday, 20 August 2026')).toBeInTheDocument()
    expect(screen.getByText('1 Padel St, Tel Aviv')).toBeInTheDocument()
  })

  // Regression: the page is RTL, so a bare time range gets bidi-reordered and
  // "19:30-03:00" paints as "03:00-19:30". Within one day that misreads as an
  // obvious mistake, but a range crossing midnight reverses into a plausible
  // one and a guest arrives sixteen hours early. jsdom does no layout, so this
  // asserts the isolation element rather than the painted order.
  it('isolates the time range from RTL bidi reordering, but not the date', () => {
    vi.mocked(getCorporateEvent).mockReturnValue({ ...EVENT, timeLabel: '19:30–03:00' })
    const { container } = renderPage()

    const isolated = container.querySelectorAll('bdi[dir="ltr"]')
    expect(isolated).toHaveLength(1)
    expect(isolated[0]).toHaveTextContent('19:30–03:00')

    // The date and address are Hebrew prose and must stay in the page direction.
    expect(screen.getByText('Thursday, 20 August 2026').closest('bdi')).toBeNull()
    expect(screen.getByText('1 Padel St, Tel Aviv').closest('bdi')).toBeNull()
  })

  it('shows a not-found message for an unknown slug', () => {
    renderPage('/join/nope')
    expect(screen.getByText('Link not found')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm signup' })).not.toBeInTheDocument()
  })

  it('submits E.164 phone with the trunk zero stripped and the +972 prefix applied', async () => {
    const user = userEvent.setup()
    renderPage()
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Confirm signup' }))

    await waitFor(() => expect(submitLead).toHaveBeenCalledTimes(1))
    expect(vi.mocked(submitLead).mock.calls[0][0]).toMatchObject({
      source: 'corporate_acme',
      company: 'Acme Ltd',
      full_name: 'Dana Cohen',
      email: 'dana@acme.co.il',
      phone: '+972501234567',
      partner_name: '',
    })
  })

  it('treats the partner field as optional', async () => {
    const user = userEvent.setup()
    renderPage()
    await fillValidForm(user)
    await user.type(screen.getByLabelText("Partner's name"), 'Yossi Levi')
    await user.click(screen.getByRole('button', { name: 'Confirm signup' }))

    await waitFor(() => expect(submitLead).toHaveBeenCalledTimes(1))
    expect(vi.mocked(submitLead).mock.calls[0][0]).toMatchObject({
      partner_name: 'Yossi Levi',
    })
  })

  it('blocks submission and flags every empty required field', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Confirm signup' }))

    expect(await screen.findAllByText('Required')).toHaveLength(3)
    expect(submitLead).not.toHaveBeenCalled()
  })

  it('rejects a malformed email without submitting', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Full name'), 'Dana Cohen')
    await user.type(screen.getByLabelText('Email'), 'dana@acme')
    await user.type(screen.getByLabelText('Mobile number'), '0501234567')
    await user.click(screen.getByRole('button', { name: 'Confirm signup' }))

    expect(await screen.findByText("That email doesn't look right")).toBeInTheDocument()
    expect(submitLead).not.toHaveBeenCalled()
  })

  it('rejects a too-short phone number without submitting', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Full name'), 'Dana Cohen')
    await user.type(screen.getByLabelText('Email'), 'dana@acme.co.il')
    await user.type(screen.getByLabelText('Mobile number'), '050123')
    await user.click(screen.getByRole('button', { name: 'Confirm signup' }))

    expect(await screen.findByText("That Israeli number doesn't look right")).toBeInTheDocument()
    expect(submitLead).not.toHaveBeenCalled()
  })

  it('never claims success when delivery fails, and keeps a local copy', async () => {
    vi.mocked(submitLead).mockRejectedValue(new Error('offline'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    renderPage()
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Confirm signup' }))

    await waitFor(() => expect(submitLead).toHaveBeenCalled())
    expect(screen.queryByText("You're in — see you on court")).not.toBeInTheDocument()
    // The safety net: the signup survives a failed POST.
    const stored = JSON.parse(localStorage.getItem('rallyCorporateSignups') || '[]')
    expect(stored).toHaveLength(1)
    expect(stored[0].phone).toBe('+972501234567')
  })

  it('flattens a multi-line tournament name before it reaches the sheet', async () => {
    vi.mocked(getCorporateEvent).mockReturnValue({
      ...EVENT,
      tournamentName: 'טורניר פאדל\nSamsung Galaxy Z Fold8',
    })
    const user = userEvent.setup()
    renderPage()
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Confirm signup' }))

    await waitFor(() => expect(submitLead).toHaveBeenCalledTimes(1))
    expect(vi.mocked(submitLead).mock.calls[0][0]).toMatchObject({
      tournament: 'טורניר פאדל Samsung Galaxy Z Fold8',
    })
  })

  it('offers both store links, opened safely in a new tab', () => {
    renderPage()
    const appStore = screen.getByRole('link', { name: /app store/i })
    const play = screen.getByRole('link', { name: /google play/i })
    expect(appStore).toHaveAttribute('href', APP_STORE_URL)
    expect(play).toHaveAttribute('href', PLAY_STORE_URL)
    for (const link of [appStore, play]) {
      expect(link).toHaveAttribute('target', '_blank')
      // Without noopener the opened tab can reach back via window.opener.
      expect(link.getAttribute('rel')).toContain('noopener')
    }
  })

  it('does not show the store links on the not-found page', () => {
    renderPage('/join/nope')
    expect(screen.queryByRole('link', { name: /app store/i })).not.toBeInTheDocument()
  })

  it('marks the page noindex while mounted and cleans up on unmount', () => {
    const selector = 'meta[name="robots"]'
    expect(document.head.querySelector(selector)).toBeNull()
    const { unmount } = renderPage()
    expect(document.head.querySelector(selector)?.getAttribute('content')).toBe(
      'noindex, nofollow',
    )
    unmount()
    expect(document.head.querySelector(selector)).toBeNull()
  })
})
