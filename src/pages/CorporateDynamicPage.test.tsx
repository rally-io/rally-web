import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/features/corporateDynamic/api', async (orig) => ({
  ...(await orig<typeof import('@/features/corporateDynamic/api')>()),
  registerForEvent: vi.fn(),
  fetchRegistrationStatus: vi.fn(),
  uploadCorporateEvidence: vi.fn(),
}))

import CorporateDynamicPage from './CorporateDynamicPage'
import { fetchRegistrationStatus, registerForEvent, uploadCorporateEvidence } from '@/features/corporateDynamic/api'
import { readStoredRegistration } from '@/features/corporateDynamic/storage'
import { AMERICANO, DOUBLES, Q_SIZE, Q_TEXT, config, eventFixture } from '@/features/corporateDynamic/__tests__/fixtures'
import type { PublicCorporateEvent, PublicRegistrationStatus } from '@/features/corporateDynamic/types'

const STATUS: PublicRegistrationStatus = {
  registration_id: 'reg-1', tournament_id: DOUBLES.tournament_id, category_name: 'Open doubles', status: 'confirmed',
  waitlist_position: null, participants: [{ slot: 1, first_name: 'Dana', last_name: 'Levi' }, { slot: 2, first_name: 'Omer', last_name: '' }],
  evidence_counts: {}, evidence_required: false,
}

function renderPage(event: PublicCorporateEvent) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <CorporateDynamicPage event={event} />
    </QueryClientProvider>,
  )
}

const withComponents = (patch: (c: ReturnType<typeof config>['components'][number]) => object, questions: ReturnType<typeof config>['questions'] = []) =>
  eventFixture({ landing_config: config({ questions, components: config().components.map((c) => ({ ...c, ...patch(c) })) as never }) })

async function fillPair(user: ReturnType<typeof userEvent.setup>, opts: { second?: boolean } = { second: true }) {
  await user.type(document.getElementById('corp-p0-first')!, 'Dana')
  await user.type(document.getElementById('corp-p0-phone')!, '0501234567')
  await user.type(document.getElementById('corp-p0-email')!, 'dana@acme.com')
  if (opts.second !== false) {
    await user.type(document.getElementById('corp-p1-first')!, 'Omer')
    await user.type(document.getElementById('corp-p1-phone')!, '0521112222')
    await user.type(document.getElementById('corp-p1-email')!, 'omer@acme.com')
  }
}

beforeEach(() => {
  localStorage.clear()
  vi.mocked(registerForEvent).mockReset()
  vi.mocked(fetchRegistrationStatus).mockReset().mockResolvedValue(STATUS)
  vi.mocked(uploadCorporateEvidence).mockReset().mockResolvedValue(undefined)
})
afterEach(() => { document.head.querySelectorAll('meta[name="robots"]').forEach((m) => m.remove()) })

describe('CorporateDynamicPage', () => {
  it('renders the enabled components, is noindex, and has no site nav', () => {
    renderPage(eventFixture())
    expect(screen.getByRole('heading', { level: 1, name: 'Acme Padel Day' })).toBeInTheDocument()
    expect(screen.getByText('Thursday 12 Nov · 17:00–21:00')).toBeInTheDocument()
    expect(screen.getByTestId('corporate-dynamic-form')).toBeInTheDocument()
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    expect(document.title).toBe('Acme Padel Day · Acme')
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('omits the hero image/intro/terms when their components are disabled', () => {
    renderPage(withComponents((c) => (c.type === 'intro' || c.type === 'terms' ? { enabled: false } : {})))
    expect(screen.queryByText(/Welcome/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('I accept the rules')).not.toBeInTheDocument()
  })

  describe('layout — the tournament page\'s, not a new look', () => {
    const IMG = 'https://cdn.example/banner.jpg'
    const LOGO = 'https://cdn.example/logo.png'
    const heroWith = (patch: object) => withComponents((c) => (c.type === 'hero' ? patch : {}))

    it('shows the event image as the banner and the company logo over it', () => {
      renderPage(heroWith({ image_url: IMG, company_logo_url: LOGO }))
      const banner = screen.getByTestId('event-banner')
      expect(banner.querySelector('img[alt="Acme Padel Day"]')).toHaveAttribute('src', IMG)
      expect(screen.getByTestId('event-logo')).toHaveAttribute('src', LOGO)
      expect(screen.getByTestId('event-logo')).toHaveAttribute('alt', 'Acme')
      expect(banner.className).toContain('h-[220px]') // the tournament page's banner height
    })

    it('falls back to the plain band, with no broken images, when there are none', () => {
      renderPage(eventFixture())
      const banner = screen.getByTestId('event-banner')
      expect(banner.querySelector('img')).toBeNull()
      expect(banner.className).toContain('h-[88px]')
    })

    it('drops an image or logo that fails to load instead of showing a broken box', () => {
      renderPage(heroWith({ image_url: IMG, company_logo_url: LOGO }))
      fireEvent.error(screen.getByTestId('event-banner').querySelector('img[alt="Acme Padel Day"]')!)
      fireEvent.error(screen.getByTestId('event-logo'))
      expect(screen.getByTestId('event-banner').querySelector('img')).toBeNull()
      expect(screen.getByTestId('event-banner').className).toContain('h-[88px]')
    })

    it('has the tournament sections in order: date, About, Venue, Category, register', () => {
      renderPage(eventFixture())
      const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
      expect(headings).toEqual(['About', 'Location', 'Category', 'Registration details'])
      expect(screen.getByText(/^Welcome/)).toBeInTheDocument()
    })

    it('shows the club pill, company, and Format / Skill Level / Structure fact cards with capacity', () => {
      renderPage(eventFixture())
      expect(screen.getByText('Padel TLV', { selector: 'span.rounded-full' })).toBeInTheDocument()
      const facts = within(screen.getByTestId('category-facts'))
      expect(facts.getByText('Format')).toBeInTheDocument()
      expect(facts.getByText('Skill Level')).toBeInTheDocument()
      expect(facts.getByText('Structure')).toBeInTheDocument()
      expect(facts.getByText('3.0–3.5')).toBeInTheDocument()
      // registered/capacity ("4/16 pairs registered"), never a count of free seats
      expect(facts.getByText('4').closest('p')).toHaveTextContent('4/16')
      expect(screen.queryByText(/spots? left/i)).not.toBeInTheDocument()
    })

    it('titles each category and badges a full one when there are several', () => {
      renderPage(eventFixture({ categories: [DOUBLES, AMERICANO] }))
      const blocks = screen.getAllByTestId('category-facts')
      expect(blocks).toHaveLength(2)
      expect(within(blocks[0]).getByRole('heading', { name: 'Open doubles' })).toBeInTheDocument()
      expect(within(blocks[1]).getByText('Full — waiting list')).toBeInTheDocument()
    })

    it('has a sticky register bar that scrolls to the register panel and reflects state', async () => {
      const user = userEvent.setup()
      const scroll = vi.fn()
      Element.prototype.scrollIntoView = scroll
      renderPage(eventFixture())
      await user.click(screen.getByRole('button', { name: 'Register Now' }))
      expect(scroll).toHaveBeenCalled()
    })

    it('shows the closed state on the sticky bar', () => {
      renderPage(eventFixture({ state: 'closed' }))
      expect(screen.getByRole('button', { name: 'Registration closed' })).toBeDisabled()
    })

    it('offers the waiting list on the sticky bar when every category is full', () => {
      renderPage(eventFixture({ categories: [AMERICANO] }))
      expect(screen.getByRole('button', { name: 'Join Waiting List' })).toBeInTheDocument()
    })

    it('shows the manager\'s terms as the collapsed rules block above the register panel', () => {
      renderPage(eventFixture())
      expect(screen.getByRole('button', { name: /Tournament rules|Rules/i })).toBeInTheDocument()
      expect(screen.getByLabelText('I accept the rules')).toBeInTheDocument()
    })
  })

  describe('confirmation screen', () => {
    async function register(user: ReturnType<typeof userEvent.setup>, event: PublicCorporateEvent, status: 'confirmed' | 'waitlisted' = 'confirmed') {
      vi.mocked(registerForEvent).mockResolvedValue({ registration_id: 'reg-1', status, access_token: 'tok-1' })
      vi.mocked(fetchRegistrationStatus).mockResolvedValue({ ...STATUS, status, waitlist_position: status === 'waitlisted' ? 2 : null })
      renderPage(event)
      await fillPair(user)
      await user.click(screen.getByLabelText('I accept the rules'))
      await user.click(screen.getByRole('button', { name: 'Register' }))
      return screen.findByTestId('confirmation-screen')
    }
    const withMessage = (md: string) => eventFixture({ landing_config: config({ success_message_md: md }) })

    it('replaces the whole page: no banner, facts, form, sticky bar or footer', async () => {
      const user = userEvent.setup()
      const screenEl = await register(user, withMessage(''))
      expect(within(screenEl).getByTestId('registered-card')).toHaveTextContent("You're in")
      for (const id of ['event-banner', 'corporate-dynamic-form', 'category-facts']) expect(screen.queryByTestId(id)).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Register Now' })).not.toBeInTheDocument()
      expect(screen.queryByText('Category')).not.toBeInTheDocument()
    })

    it('renders the CRM success message as markdown in place of the stock wording', async () => {
      const user = userEvent.setup()
      const screenEl = await register(user, withMessage('Thanks for **joining**!\n\n- Bring shoes'))
      expect(within(screenEl).getByText('joining').tagName).toBe('STRONG')
      expect(within(screenEl).getByText('Bring shoes')).toBeInTheDocument()
      expect(within(screenEl).queryByText(/organisers will be in touch/i)).not.toBeInTheDocument()
    })

    it('falls back to the default message when the CRM one is empty or blank', async () => {
      const user = userEvent.setup()
      const screenEl = await register(user, withMessage('   '))
      expect(within(screenEl).getByText(/organisers will be in touch/i)).toBeInTheDocument()
    })

    it('uses waitlisted wording (with the position) and still shows the CRM message', async () => {
      const user = userEvent.setup()
      const screenEl = await register(user, withMessage('We will email you'), 'waitlisted')
      expect(within(screenEl).getByText("You're on the waiting list")).toBeInTheDocument()
      expect(within(screenEl).getByText(/number 2/)).toBeInTheDocument()
      expect(within(screenEl).getByText('We will email you')).toBeInTheDocument()
    })

    it('is also what a reload with the stored token shows, with one small "register another" link', async () => {
      localStorage.setItem('rally:corp:acme-day', JSON.stringify({ registration_id: 'reg-1', access_token: 'tok-1' }))
      renderPage(eventFixture())
      expect(await screen.findByTestId('confirmation-screen')).toBeInTheDocument()
      expect(await screen.findAllByRole('button', { name: 'Register another pair' })).toHaveLength(1)
      expect(screen.queryByTestId('event-banner')).not.toBeInTheDocument()
    })
  })

  describe('optional phone / email', () => {
    const optionalEvent = () => eventFixture({ landing_config: config({ require_phone: false, require_email: false }) })

    it('labels the fields optional and registers with them empty, sending ""', async () => {
      const user = userEvent.setup()
      vi.mocked(registerForEvent).mockResolvedValue({ registration_id: 'reg-1', status: 'confirmed', access_token: 'tok-1' })
      renderPage(optionalEvent())
      expect(screen.getAllByText('Mobile number (optional)')).toHaveLength(2)
      expect(screen.getAllByText('Email (optional)')).toHaveLength(2)
      await user.type(document.getElementById('corp-p0-first')!, 'Dana')
      await user.type(document.getElementById('corp-p1-first')!, 'Omer')
      await user.click(screen.getByLabelText('I accept the rules'))
      await user.click(screen.getByRole('button', { name: 'Register' }))
      await waitFor(() => expect(registerForEvent).toHaveBeenCalledTimes(1))
      expect(vi.mocked(registerForEvent).mock.calls[0][1].participants.map((p) => [p.phone, p.email])).toEqual([['', ''], ['', '']])
    })

    it('still rejects a malformed value that was typed', async () => {
      const user = userEvent.setup()
      renderPage(optionalEvent())
      await user.type(document.getElementById('corp-p0-first')!, 'Dana')
      await user.type(document.getElementById('corp-p1-first')!, 'Omer')
      await user.type(document.getElementById('corp-p0-email')!, 'nope')
      await user.click(screen.getByLabelText('I accept the rules'))
      await user.click(screen.getByRole('button', { name: 'Register' }))
      expect(registerForEvent).not.toHaveBeenCalled()
      expect(await screen.findByText("That email doesn't look right")).toBeInTheDocument()
    })

    it('keeps them required (no "optional") by default', () => {
      renderPage(eventFixture())
      expect(screen.queryByText('Mobile number (optional)')).toBeNull()
      expect(screen.queryByText('Email (optional)')).toBeNull()
    })
  })

  describe('accent', () => {
    it('sets the theme variables on the page root, with readable text on the accent', () => {
      renderPage(eventFixture({ landing_config: config({ accent: '#ff6600' }) }))
      const root = document.querySelector('main')!
      expect(root.style.getPropertyValue('--color-rally-accent')).toBe('#ff6600')
      expect(root.style.getPropertyValue('--color-rally-accent-text')).toMatch(/^#(000000|ffffff)$/)
      expect(root.style.getPropertyValue('--shadow-glow-electric')).toContain('255, 102, 0')
    })

    it('leaves the default brand colour alone when accent is null, and covers the confirmation screen too', async () => {
      const { unmount } = renderPage(eventFixture())
      expect(document.querySelector('main')!.getAttribute('style') ?? '').not.toContain('--color-rally-accent')
      unmount()
      localStorage.setItem('rally:corp:acme-day', JSON.stringify({ registration_id: 'reg-1', access_token: 'tok-1' }))
      renderPage(eventFixture({ landing_config: config({ accent: '#0055ff' }) }))
      expect((await screen.findByTestId('confirmation-screen')).style.getPropertyValue('--color-rally-accent')).toBe('#0055ff')
    })

    it('tints the no-image banner band with the accent', () => {
      renderPage(eventFixture({ landing_config: config({ accent: '#ff6600' }) }))
      expect(screen.getByTestId('event-banner').className).toContain('from-rally-accent/25')
    })
  })

  describe('one register button', () => {
    class FakeObserver {
      static instances: FakeObserver[] = []
      constructor(public cb: IntersectionObserverCallback) { FakeObserver.instances.push(this) }
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() { return [] }
      fire(isIntersecting: boolean) { this.cb([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver) }
    }
    beforeEach(() => { FakeObserver.instances = []; vi.stubGlobal('IntersectionObserver', FakeObserver) })
    afterEach(() => { vi.unstubAllGlobals() })

    it('shows the sticky bar while the form is out of view and hides it once the form is visible', () => {
      renderPage(eventFixture())
      expect(screen.getByRole('button', { name: 'Register Now' })).toBeInTheDocument()
      act(() => FakeObserver.instances.forEach((o) => o.fire(true)))
      expect(screen.queryByRole('button', { name: 'Register Now' })).not.toBeInTheDocument()
      // The form's own submit is then the only register button.
      expect(screen.getAllByRole('button', { name: /^Register/ })).toHaveLength(1)
      act(() => FakeObserver.instances.forEach((o) => o.fire(false)))
      expect(screen.getByRole('button', { name: 'Register Now' })).toBeInTheDocument()
    })
  })

  describe('validation UX', () => {
    let scroll: ReturnType<typeof vi.fn<(arg?: boolean | ScrollIntoViewOptions) => void>>
    beforeEach(() => { scroll = vi.fn<(arg?: boolean | ScrollIntoViewOptions) => void>(); Element.prototype.scrollIntoView = scroll })

    it('on a refused submit: toast, smooth-scroll to and focus the FIRST invalid field, errors stay visible', async () => {
      const user = userEvent.setup()
      renderPage(eventFixture())
      await user.click(screen.getByRole('button', { name: 'Register' }))
      expect(await screen.findByTestId('form-toast')).toHaveTextContent('Please fix the errors')
      const first = document.getElementById('corp-p0-first')!
      await waitFor(() => expect(document.activeElement).toBe(first))
      expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
      expect(scroll.mock.contexts[scroll.mock.contexts.length - 1]).toBe(first)
      expect(screen.getAllByText('Required').length).toBeGreaterThan(0)
    })

    it('focuses the consent checkbox when it is the only problem', async () => {
      const user = userEvent.setup()
      renderPage(eventFixture())
      await fillPair(user)
      await user.click(screen.getByRole('button', { name: 'Register' }))
      await waitFor(() => expect(document.activeElement).toBe(document.getElementById('corp-terms')))
    })

    it('does the same for API field errors (server index/field)', async () => {
      const user = userEvent.setup()
      vi.mocked(registerForEvent).mockRejectedValue({ status: 409, code: 'CORPORATE_DUPLICATE_PARTICIPANT', message: '', details: { index: 1, field: 'phone' } })
      renderPage(eventFixture())
      await fillPair(user)
      await user.click(screen.getByLabelText('I accept the rules'))
      await user.click(screen.getByRole('button', { name: 'Register' }))
      expect(await screen.findByTestId('form-toast')).toBeInTheDocument()
      await waitFor(() => expect(document.activeElement).toBe(document.getElementById('corp-p1-phone')))
      expect(screen.getByText('This phone number is already registered for this event')).toBeInTheDocument()
    })

    it('does not raise the toast for a banner-only failure (rate limit)', async () => {
      const user = userEvent.setup()
      vi.mocked(registerForEvent).mockRejectedValue({ status: 429, code: 'RATE_LIMITED', message: '' })
      renderPage(eventFixture())
      await fillPair(user)
      await user.click(screen.getByLabelText('I accept the rules'))
      await user.click(screen.getByRole('button', { name: 'Register' }))
      expect(await screen.findByTestId('submit-error')).toBeInTheDocument()
      expect(screen.queryByTestId('form-toast')).not.toBeInTheDocument()
    })
  })

  it('shows two participant blocks for a pair and one for a singles category, with the full badge', async () => {
    const user = userEvent.setup()
    renderPage(eventFixture({ categories: [DOUBLES, AMERICANO] }))
    // once in the category facts, once on the picker card
    expect(screen.getAllByText('Full — waiting list')).toHaveLength(2)
    expect(screen.queryByTestId('participant-0')).not.toBeInTheDocument() // nothing until a category is chosen
    await user.click(screen.getByLabelText(/Open doubles/))
    expect(screen.getAllByTestId(/^participant-/)).toHaveLength(2)
    await user.click(screen.getByLabelText(/Americano/))
    expect(screen.getAllByTestId(/^participant-/)).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Join the waiting list' })).toBeInTheDocument()
  })

  it('blocks an incomplete submit with inline errors and sends nothing', async () => {
    const user = userEvent.setup()
    renderPage(eventFixture())
    await user.click(screen.getByRole('button', { name: 'Register' }))
    expect(registerForEvent).not.toHaveBeenCalled()
    expect((await screen.findAllByText('Required')).length).toBeGreaterThan(0)
    expect(screen.getByText('You need to accept the terms to register')).toBeInTheDocument()
  })

  it('submits the full request: participants, answers, consent, honeypot and started_at_ms', async () => {
    const user = userEvent.setup()
    vi.mocked(registerForEvent).mockResolvedValue({ registration_id: 'reg-1', status: 'confirmed', access_token: 'tok-1' })
    renderPage(eventFixture({ landing_config: config({ questions: [Q_TEXT, Q_SIZE] }) }))
    await fillPair(user)
    await user.type(screen.getByLabelText(/Department/), 'Sales')
    const sizes = screen.getAllByLabelText(/Shirt size/)
    await user.selectOptions(sizes[0], 'M')
    await user.selectOptions(sizes[1], 'L')
    await user.click(screen.getByLabelText('I accept the rules'))
    await user.click(screen.getByRole('button', { name: 'Register' }))

    await waitFor(() => expect(registerForEvent).toHaveBeenCalledTimes(1))
    const [slug, body] = vi.mocked(registerForEvent).mock.calls[0]
    expect(slug).toBe('acme-day')
    expect(body).toMatchObject({
      tournament_id: DOUBLES.tournament_id, terms_accepted: true, website: '',
      answers: { [Q_TEXT.id]: 'Sales', [Q_SIZE.id]: ['M', 'L'] },
    })
    expect(body.participants.map((p) => p.phone)).toEqual(['501234567', '521112222'])
    expect(body.participants[0]).toMatchObject({ first_name: 'Dana', country_code: '+972', email: 'dana@acme.com' })
    expect(typeof body.started_at_ms).toBe('number')
  })

  it('persists {registration_id, access_token} and shows the registered card', async () => {
    const user = userEvent.setup()
    vi.mocked(registerForEvent).mockResolvedValue({ registration_id: 'reg-1', status: 'confirmed', access_token: 'tok-1' })
    renderPage(eventFixture())
    await fillPair(user)
    await user.click(screen.getByLabelText('I accept the rules'))
    await user.click(screen.getByRole('button', { name: 'Register' }))

    expect(await screen.findByTestId('registered-card')).toHaveTextContent("You're in")
    expect(readStoredRegistration('acme-day')).toEqual({ registration_id: 'reg-1', access_token: 'tok-1' })
    expect(fetchRegistrationStatus).toHaveBeenCalledWith('reg-1', 'tok-1')
  })

  it('still shows the card when localStorage is unavailable', async () => {
    const user = userEvent.setup()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    vi.mocked(registerForEvent).mockResolvedValue({ registration_id: 'reg-1', status: 'confirmed', access_token: 'tok-1' })
    renderPage(eventFixture())
    await fillPair(user)
    await user.click(screen.getByLabelText('I accept the rules'))
    await user.click(screen.getByRole('button', { name: 'Register' }))
    expect(await screen.findByTestId('registered-card')).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('on reload shows the card (waitlisted with position) from the stored token', async () => {
    localStorage.setItem('rally:corp:acme-day', JSON.stringify({ registration_id: 'reg-1', access_token: 'tok-1' }))
    vi.mocked(fetchRegistrationStatus).mockResolvedValue({ ...STATUS, status: 'waitlisted', waitlist_position: 3 })
    renderPage(eventFixture())
    expect(await screen.findByTestId('registered-card')).toHaveTextContent("You're on the waiting list")
    expect(screen.getByTestId('registered-card')).toHaveTextContent('number 3')
    expect(screen.queryByTestId('corporate-dynamic-form')).not.toBeInTheDocument()
  })

  it('drops a stored token the API rejects and shows the form again', async () => {
    localStorage.setItem('rally:corp:acme-day', JSON.stringify({ registration_id: 'reg-1', access_token: 'stale' }))
    vi.mocked(fetchRegistrationStatus).mockRejectedValue({ status: 403, code: 'FORBIDDEN', message: '' })
    renderPage(eventFixture())
    expect(await screen.findByTestId('corporate-dynamic-form')).toBeInTheDocument()
    expect(localStorage.getItem('rally:corp:acme-day')).toBeNull()
  })

  it('"register another pair" brings the form back', async () => {
    const user = userEvent.setup()
    localStorage.setItem('rally:corp:acme-day', JSON.stringify({ registration_id: 'reg-1', access_token: 'tok-1' }))
    renderPage(eventFixture())
    await user.click(await screen.findByRole('button', { name: 'Register another pair' }))
    expect(screen.getByTestId('corporate-dynamic-form')).toBeInTheDocument()
  })

  describe('evidence', () => {
    const evidenceEvent = () => withComponents((c) => (c.type === 'evidence' ? { enabled: true, required: true, instructions_md: 'Upload your ID' } : {}))
    const pdf = (n: string) => new File(['x'], n, { type: 'application/pdf' })

    async function registerWithEvidence(user: ReturnType<typeof userEvent.setup>) {
      renderPage(evidenceEvent())
      await fillPair(user)
      await user.upload(document.getElementById('corp-evidence-1') as HTMLInputElement, pdf('dana.pdf'))
      await user.upload(document.getElementById('corp-evidence-2') as HTMLInputElement, pdf('omer.pdf'))
      await user.click(screen.getByLabelText('I accept the rules'))
      await user.click(screen.getByRole('button', { name: 'Register' }))
    }

    it('requires the document client-side before submitting', async () => {
      const user = userEvent.setup()
      renderPage(evidenceEvent())
      await fillPair(user)
      await user.click(screen.getByLabelText('I accept the rules'))
      await user.click(screen.getByRole('button', { name: 'Register' }))
      expect(registerForEvent).not.toHaveBeenCalled()
      expect((await screen.findAllByText('Attach the required document')).length).toBe(2)
    })

    it('uploads each participant\'s files with the registration token after registering', async () => {
      const user = userEvent.setup()
      vi.mocked(registerForEvent).mockResolvedValue({ registration_id: 'reg-1', status: 'confirmed', access_token: 'tok-1' })
      vi.mocked(fetchRegistrationStatus).mockResolvedValue({ ...STATUS, evidence_counts: { '1': 1, '2': 1 }, evidence_required: true })
      await registerWithEvidence(user)
      await screen.findByTestId('registered-card')
      await waitFor(() => expect(uploadCorporateEvidence).toHaveBeenCalledTimes(2))
      expect(uploadCorporateEvidence).toHaveBeenCalledWith('reg-1', 'tok-1', 1, [expect.objectContaining({ name: 'dana.pdf' })])
      expect(uploadCorporateEvidence).toHaveBeenCalledWith('reg-1', 'tok-1', 2, [expect.objectContaining({ name: 'omer.pdf' })])
    })

    it('a failed upload never blocks the flow: the card shows, the other upload lands, and a retry is offered', async () => {
      const user = userEvent.setup()
      vi.mocked(registerForEvent).mockResolvedValue({ registration_id: 'reg-1', status: 'confirmed', access_token: 'tok-1' })
      vi.mocked(uploadCorporateEvidence).mockImplementation(async (_r, _t, slot) => { if (slot === 1) throw { status: 400, code: 'INVALID_DOCUMENT', message: '' } })
      vi.mocked(fetchRegistrationStatus).mockResolvedValue({ ...STATUS, evidence_counts: { '2': 1 }, evidence_required: true })
      await registerWithEvidence(user)

      expect(await screen.findByTestId('registered-card')).toHaveTextContent("You're in")
      const remaining = await screen.findByTestId('remaining-evidence')
      expect(readStoredRegistration('acme-day')).not.toBeNull()
      expect(await within(remaining).findByText(/couldn't be read/i)).toBeInTheDocument()
      // Participant 2's upload still landed despite participant 1's failure.
      expect(uploadCorporateEvidence).toHaveBeenCalledWith('reg-1', 'tok-1', 2, expect.any(Array))
    })
  })

  describe('API error mapping', () => {
    async function submitWith(error: object) {
      const user = userEvent.setup()
      vi.mocked(registerForEvent).mockRejectedValue(error)
      const event = eventFixture({ email_domain_restricted: true })
      renderPage(event)
      await fillPair(user)
      await user.click(screen.getByLabelText('I accept the rules'))
      await user.click(screen.getByRole('button', { name: 'Register' }))
    }

    it('CORPORATE_DUPLICATE_PARTICIPANT lands on the second player\'s email field', async () => {
      await submitWith({ status: 409, code: 'CORPORATE_DUPLICATE_PARTICIPANT', message: '', details: { index: 1, field: 'email' } })
      const field = document.getElementById('corp-p1-email')!
      expect(await screen.findByText('This email is already registered for this event')).toBeInTheDocument()
      expect(field).toHaveAttribute('aria-invalid', 'true')
    })

    it('CORPORATE_EMAIL_DOMAIN lands on the FIRST TYPED email, whatever index the server names', async () => {
      await submitWith({ status: 400, code: 'CORPORATE_EMAIL_DOMAIN', message: '', details: { index: 1 } })
      expect(await screen.findByText('At least one of the two emails must be a company email address')).toBeInTheDocument()
      expect(document.getElementById('corp-p0-email')).toHaveAttribute('aria-invalid', 'true')
      expect(document.getElementById('corp-p1-email')).not.toHaveAttribute('aria-invalid', 'true')
    })

    it('RATE_LIMITED shows a banner and keeps the typed values', async () => {
      await submitWith({ status: 429, code: 'RATE_LIMITED', message: '' })
      expect(await screen.findByTestId('submit-error')).toHaveTextContent('Too many attempts')
      expect(document.getElementById('corp-p0-first')).toHaveValue('Dana')
    })

    it('CORPORATE_REGISTRATION_CLOSED swaps the form for the closed card', async () => {
      await submitWith({ status: 409, code: 'CORPORATE_REGISTRATION_CLOSED', message: '' })
      expect(await screen.findByTestId('event-state-closed')).toBeInTheDocument()
      expect(screen.queryByTestId('corporate-dynamic-form')).not.toBeInTheDocument()
    })

    it('CORPORATE_TERMS_REQUIRED shows on the consent checkbox', async () => {
      await submitWith({ status: 422, code: 'CORPORATE_TERMS_REQUIRED', message: '' })
      expect(await screen.findAllByText('You need to accept the terms to register')).not.toHaveLength(0)
    })
  })

  it('states the one-of-two company-email rule, and nudges only when every typed email is personal', async () => {
    const user = userEvent.setup()
    renderPage(eventFixture({ email_domain_restricted: true }))
    expect(screen.getByTestId('email-rule')).toHaveTextContent('At least one of the two emails must be a company email address')
    expect(screen.queryByTestId('email-hint')).not.toBeInTheDocument()
    await user.type(document.getElementById('corp-p0-email')!, 'dana@gmail.com')
    expect(screen.getByTestId('email-hint')).toBeInTheDocument()
    // The second player's email may be anything, but a company address on EITHER clears the nudge.
    await user.type(document.getElementById('corp-p1-email')!, 'omer@acme.com')
    expect(screen.queryByTestId('email-hint')).not.toBeInTheDocument()
  })

  it('says the single email must match for a singles category, and shows no rule when unrestricted', async () => {
    const user = userEvent.setup()
    renderPage(eventFixture({ email_domain_restricted: true, categories: [AMERICANO] }))
    expect(screen.getByTestId('email-rule')).toHaveTextContent('Your email must be a company email address')
    await user.type(document.getElementById('corp-p0-email')!, 'x@gmail.com')
    expect(screen.getByTestId('email-hint')).toHaveTextContent('company email address is required')
    document.body.innerHTML = ''
    renderPage(eventFixture())
    expect(screen.queryByTestId('email-rule')).not.toBeInTheDocument()
  })

  it('renders a closed card instead of the form for a non-open event, but still the hero', () => {
    renderPage(eventFixture({ state: 'cancelled' }))
    expect(screen.getByTestId('event-state-cancelled')).toBeInTheDocument()
    expect(screen.queryByTestId('corporate-dynamic-form')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('has a honeypot field named website that is hidden from assistive tech', () => {
    renderPage(eventFixture())
    const input = document.getElementById('corp-website') as HTMLInputElement
    expect(input.name).toBe('website')
    expect(input.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(input.tabIndex).toBe(-1)
  })
})
