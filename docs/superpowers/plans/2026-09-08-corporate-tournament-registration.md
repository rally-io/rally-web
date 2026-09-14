# Corporate Tournament Registration Page Implementation Plan (rally-web)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A branded, unlisted `/join/<slug>` page where a client's employees sign in or sign up, register a pair for a real tournament, and place the payment hold — reusing the web's existing sign-in gate, partner picker, terms gate, register call and Grow checkout.

**Architecture:** `CorporateEvent` becomes a `lead | tournament` union; one route dispatches to the existing lead page or the new `CorporateRegistrationPage`. Shared hero/field components move out of `CorporateSignupPage` unchanged. `TournamentDetailPage`'s register branching (409 terms gate → zero-pay → `/payment-method`) moves into a shared `useTournamentRegistration` hook as a pure move guarded by the existing test file. A `return_to` path threads through `pendingPayment` so the confirmation lands back on the event. Profile essentials (name / phone / level) are written before registering, never overwriting a stored phone or level.

**Tech Stack:** React 18 + TypeScript, react-router v6, @tanstack/react-query, react-i18next, axios, Supabase JS, Tailwind, Vitest + Testing Library (jsdom), Vercel functions.

**Spec:** `docs/superpowers/specs/2026-09-08-corporate-tournament-registration-design.md` §5.
**Backend dependency:** none for the page itself — it works against any `registration_open` tournament. `is_unlisted` (rally-api plan `../rally-api/docs/superpowers/plans/2026-09-08-tournament-is-unlisted.md`) only affects discovery.

**Conventions (read before starting):**
- Tests: `npm test` runs `vitest run`; `test-setup.ts` forces English, so assert English copy. Page tests mock hooks with `vi.mock` (see `src/pages/TournamentDetailPage.test.tsx` for the canonical set); pages that call `useQueryClient` need a `QueryClientProvider` in the test tree.
- `tsc -b` type-checks `src/**` INCLUDING test files (`tsconfig.json` `include: ["src"]`) — a test's literal must satisfy the new types.
- i18n: every new key goes in BOTH `src/i18n/locales/he.json` and `en.json`; never `t(key, { defaultValue })` in new code (a key missing from `he.json` would silently render English).
- RTL: any time range printed on the page goes through `<bdi dir="ltr">` (already handled by `DetailChip`'s `isolateLtr`).
- Commit after every task. Never `git push` or open a PR in this plan.

---

### Task 0: Branch from origin/main

**Files:** none

- [ ] **Step 1: Create the branch and confirm the baseline is green**

```bash
cd /Users/shahafpariente/Desktop/SideKicks/Rally/rally-web
git fetch origin
git checkout -b feat/corporate-tournament-registration origin/main
git log --oneline -1
npm test -- --reporter=dot 2>&1 | tail -5
```
Expected: branch created from the `main` tip (`bf7cb45` or newer); vitest reports all passing (note the count — it is the regression baseline).

---

### Task 1: `CorporateEvent` becomes a `lead | tournament` union

**Files:**
- Modify: `src/constants/corporateEvents.ts`
- Modify: `src/pages/CorporateSignupPage.tsx:28-30` (narrow to lead mode)
- Modify: `src/pages/CorporateSignupPage.test.tsx:14-24` (`EVENT` gains `mode: 'lead'`)
- Test: `src/constants/corporateEvents.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/constants/corporateEvents.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { CORPORATE_EVENTS, getCorporateEvent, type CorporateEvent } from './corporateEvents'

describe('corporateEvents', () => {
  it('every entry declares a mode, and the two legacy entries are lead-mode', () => {
    for (const [slug, ev] of Object.entries(CORPORATE_EVENTS)) {
      expect(ev.slug).toBe(slug)
      expect(['lead', 'tournament']).toContain(ev.mode)
    }
    expect(getCorporateEvent('samsung-fold8')?.mode).toBe('lead')
    expect(getCorporateEvent('dani-shoval')?.mode).toBe('lead')
  })

  it('a lead entry carries a corporate_ sheet source; a tournament entry carries a tournament id', () => {
    for (const ev of Object.values(CORPORATE_EVENTS)) {
      if (ev.mode === 'lead') expect(ev.sheetSource).toMatch(/^corporate_[a-z0-9_]{1,40}$/)
      else expect(ev.tournamentId).toMatch(/^[0-9a-f-]{36}$/)
    }
  })

  it('narrows by mode at the type level', () => {
    const lead: CorporateEvent = {
      mode: 'lead', slug: 'x', sheetSource: 'corporate_x', company: 'X', tournamentName: 'X Cup',
      clubName: 'C', clubAddress: 'A', heroImage: '/x.jpg', dateLabel: 'd', timeLabel: '10:00–12:00',
    }
    const tournament: CorporateEvent = {
      mode: 'tournament', slug: 'y', tournamentId: '00000000-0000-0000-0000-000000000000',
      company: 'Y', tournamentName: 'Y Cup', clubName: 'C', clubAddress: 'A', heroImage: '/y.jpg',
      dateLabel: 'd', timeLabel: '10:00–12:00',
    }
    expect(lead.mode).toBe('lead')
    expect(tournament.mode).toBe('tournament')
  })

  it('returns null for an unknown or missing slug', () => {
    expect(getCorporateEvent('nope')).toBeNull()
    expect(getCorporateEvent(undefined)).toBeNull()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run src/constants/corporateEvents.test.ts
```
Expected: FAIL — `ev.mode` is `undefined`.

- [ ] **Step 3: Rewrite the types and add `mode` to both entries**

Replace the `CorporateEvent` interface in `src/constants/corporateEvents.ts` with:

```ts
export interface CorporateEventBase {
  /** URL segment: /join/<slug>. The private link. */
  slug: string
  /** Company name, shown in the page copy. */
  company: string
  /**
   * Tournament name. A newline forces a line break in the hero heading — use
   * it to stop a mixed Hebrew/Latin title from wrapping mid-product-name.
   * Newlines are flattened to spaces everywhere else (page title, sheet row).
   */
  tournamentName: string
  /** Hosting club, shown under the hero. */
  clubName: string
  /** Street address, shown as plain text (no map embed — keeps the page private). */
  clubAddress: string
  /** Hero image: a file in public/, or a full URL. */
  heroImage: string
  /**
   * How `heroImage` fills the hero band.
   *  - 'cover'   (default) crop to fill — right for a real photo of the courts.
   *  - 'contain' fit the whole image in, no crop — right for a logo card or
   *    any asset whose edges matter. A blurred copy of the same image fills
   *    the space around it, so 'contain' never leaves dead bars.
   */
  heroFit?: 'cover' | 'contain'
  /** Human-readable date, already in Hebrew. Not parsed — copy, not data. */
  dateLabel: string
  /** Human-readable time window, e.g. '17:00–21:00'. */
  timeLabel: string
}

/**
 * Lead mode: the form writes a row to the leads Google Sheet on a tab named
 * after `sheetSource`; staff turn it into registrations by hand afterwards.
 */
export interface CorporateLeadEvent extends CorporateEventBase {
  mode: 'lead'
  /** Google Sheet tab name. Must be `corporate_<a-z0-9_>` (api/lead.ts allow-list). */
  sheetSource: string
}

/**
 * Tournament mode: the page signs the employee in, writes their profile
 * essentials, registers a pair on the real tournament and hands off to the
 * Grow payment hold. The tournament must be `registration_open`; make it
 * `is_unlisted` so it stays out of every public list.
 */
export interface CorporateTournamentEvent extends CorporateEventBase {
  mode: 'tournament'
  /** rally-api tournament UUID — the row the registration lands on. */
  tournamentId: string
}

export type CorporateEvent = CorporateLeadEvent | CorporateTournamentEvent
```

Then add `mode: 'lead',` as the first property of both entries in `CORPORATE_EVENTS`. Leave `getCorporateEvent` unchanged. Update the file's leading doc comment's last line to: `Adding the next client is this object plus a hero image (and, for a tournament-mode event, the tournament's id). No new code.`

- [ ] **Step 4: Narrow `CorporateSignupPage` to lead mode**

In `src/pages/CorporateSignupPage.tsx` replace

```ts
  const event = useMemo(() => getCorporateEvent(slug), [slug])
```
with
```ts
  // This page is the LEAD flow only; the /join/:slug route dispatches tournament-mode
  // events to CorporateRegistrationPage. A tournament-mode slug landing here (only
  // possible by rendering this component directly) renders the not-found card.
  const event = useMemo(() => {
    const ev = getCorporateEvent(slug)
    return ev?.mode === 'lead' ? ev : null
  }, [slug])
```

- [ ] **Step 5: Keep the existing test's literal valid**

In `src/pages/CorporateSignupPage.test.tsx`, add `mode: 'lead',` as the first property of `EVENT`. Then check for any other `CorporateEvent` literal in the repo:

```bash
grep -rn "sheetSource:" src api --include=*.ts --include=*.tsx | grep -v "constants/corporateEvents.ts"
```
Add `mode: 'lead',` to every literal the grep finds (e.g. in `src/lib/og.test.ts` if it builds one).

- [ ] **Step 6: Run tests + typecheck**

```bash
npx vitest run src/constants src/pages/CorporateSignupPage.test.tsx src/lib/og.test.ts
npx tsc -b
```
Expected: all PASS; `tsc` clean.

- [ ] **Step 7: Commit**

```bash
git add src/constants/corporateEvents.ts src/constants/corporateEvents.test.ts src/pages/CorporateSignupPage.tsx src/pages/CorporateSignupPage.test.tsx src/lib/og.test.ts
git commit -m "feat(corporate-events): CorporateEvent becomes a lead | tournament union

Both existing entries are mode: 'lead' and behave exactly as before; a
tournament-mode entry carries the rally-api tournament id the new page will
register against."
```

---

### Task 2: Move the shared corporate components out of `CorporateSignupPage` (pure move)

**Files:**
- Create: `src/components/corporate/EventHero.tsx`, `DetailChip.tsx`, `Field.tsx`, `RallyWordmark.tsx`, `AppDownloadFooter.tsx`, `phone.ts`
- Modify: `src/pages/CorporateSignupPage.tsx` (delete the moved code, import it)
- Test: `src/components/corporate/phone.test.ts`; `src/pages/CorporateSignupPage.test.tsx` unchanged and green

- [ ] **Step 1: Write the failing test for the one pure function**

Create `src/components/corporate/phone.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { normalizeIsraeliLocal, isValidIsraeliLocal } from './phone'

describe('normalizeIsraeliLocal', () => {
  it('keeps digits only, strips the trunk 0 and caps at 9', () => {
    expect(normalizeIsraeliLocal('050-123-4567')).toBe('501234567')
    expect(normalizeIsraeliLocal('0501234567890')).toBe('501234567')
    expect(normalizeIsraeliLocal('  52 999 8877 ')).toBe('529998877')
  })
})

describe('isValidIsraeliLocal', () => {
  it('accepts 8–9 digits and nothing else', () => {
    expect(isValidIsraeliLocal('501234567')).toBe(true)
    expect(isValidIsraeliLocal('31234567')).toBe(true)
    expect(isValidIsraeliLocal('5012345')).toBe(false)
    expect(isValidIsraeliLocal('')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/components/corporate/phone.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create the moved modules**

`src/components/corporate/phone.ts`:

```ts
/** Israeli local number: digits only, drop the trunk 0, cap at 9. */
export function normalizeIsraeliLocal(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, 9)
}

/** 8–9 local digits (after `normalizeIsraeliLocal`). */
export function isValidIsraeliLocal(local: string): boolean {
  return local.length >= 8 && local.length <= 9
}
```

`src/components/corporate/RallyWordmark.tsx`:

```tsx
import { cn } from '@/lib/utils'

export function RallyWordmark({ className }: { className?: string }) {
  return (
    <img
      src="/rally-logo.jpg"
      alt="Rally"
      className={cn('h-12 sm:h-14 w-auto rounded-lg shadow-md', className)}
    />
  )
}
```

`src/components/corporate/DetailChip.tsx` — move the `DetailChip` function from `CorporateSignupPage.tsx:487-521` verbatim (including its `isolateLtr` doc comment) and `export` it.

`src/components/corporate/Field.tsx` — move `inputClass` (`:448-454`) and `Field` (`:456-485`) verbatim; `export` both. Add `import { cn } from '@/lib/utils'` at the top.

`src/components/corporate/AppDownloadFooter.tsx` — move `AppDownloadFooter` (`:398-441`) verbatim with its doc comment; `export` it; imports: `useTranslation` from `react-i18next` and `APP_STORE_URL, PLAY_STORE_URL, APP_STORE_BADGE, PLAY_STORE_BADGE` from `@/lib/appLinks`.

`src/components/corporate/EventHero.tsx` — the hero as a component taking the event's display fields (today it is an inner closure reading `event` and `t`):

```tsx
import { useTranslation } from 'react-i18next'
import { CalendarDays, Clock, MapPin, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CorporateEventBase } from '@/constants/corporateEvents'
import { DetailChip } from './DetailChip'
import { RallyWordmark } from './RallyWordmark'

/**
 * The client's hero: blurred backdrop + image, the "closed event" pill, company,
 * tournament name, hosting club, and the date / time / location chips. Renders
 * the config's Hebrew labels verbatim — copy, not data.
 */
export function EventHero({ event }: { event: CorporateEventBase }) {
  const { t } = useTranslation()
  const isContain = event.heroFit === 'contain'

  const titleBlock = (
    <>
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-rally-accent/40 bg-rally-accent/10 text-rally-accent text-xs font-bold backdrop-blur mb-4">
        <Lock className="w-3.5 h-3.5" />
        <span className="tracking-wide">{t('corporate.eyebrow')}</span>
      </span>
      <p className="font-display text-sm sm:text-base font-bold text-rally-accent mb-1">
        {event.company}
      </p>
      <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight leading-[1.1] text-rally-text whitespace-pre-line">
        {event.tournamentName}
      </h1>
      <p className="text-sm sm:text-base text-rally-text-2 mt-2">
        {t('corporate.hostedAt')} {event.clubName}
      </p>
    </>
  )

  const detailChips = (
    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <DetailChip icon={<CalendarDays className="w-4 h-4" />} label={t('corporate.detailsDate')} value={event.dateLabel} />
      <DetailChip icon={<Clock className="w-4 h-4" />} label={t('corporate.detailsTime')} value={event.timeLabel} isolateLtr />
      <DetailChip icon={<MapPin className="w-4 h-4" />} label={t('corporate.detailsLocation')} value={event.clubAddress} />
    </dl>
  )

  if (isContain) {
    return (
      <header className="relative">
        <div className="relative overflow-hidden">
          <img src={event.heroImage} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover scale-125 blur-2xl" />
          <img src={event.heroImage} alt={event.clubName} className="relative mx-auto block w-full max-h-[220px] sm:max-h-[300px] object-contain" />
          <RallyWordmark className="absolute top-4 start-4 sm:top-6 sm:start-6 z-10" />
        </div>
        <div className="container mx-auto px-4 max-w-xl pt-6 sm:pt-8">{titleBlock}</div>
        <div className="container mx-auto px-4 max-w-xl mt-6">{detailChips}</div>
      </header>
    )
  }

  return (
    <header className="relative">
      <div className="relative h-[430px] sm:h-[380px] overflow-hidden">
        <img src={event.heroImage} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover scale-125 blur-2xl" />
        <img src={event.heroImage} alt={event.clubName} className="absolute inset-x-0 top-0 w-full h-full object-cover" />
        <div aria-hidden className="absolute inset-0 bg-rally-bg/55" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-rally-bg/70 via-transparent to-rally-bg" />
        <RallyWordmark className="absolute top-4 start-4 sm:top-6 sm:start-6 z-10" />
        <div className="relative h-full container mx-auto px-4 max-w-xl flex flex-col">
          <div className="mt-auto pb-8 sm:pb-24">{titleBlock}</div>
        </div>
      </div>
      <div className="container mx-auto px-4 max-w-xl mt-4 sm:-mt-12 relative">{detailChips}</div>
    </header>
  )
}
```

(The `cover` branch drops the two `isContain ? … : …` ternaries that were unreachable — `contain` returns earlier. `cn` stays imported for parity with the original; remove it if `tsc` flags it unused.)

- [ ] **Step 4: Point `CorporateSignupPage` at the moved modules**

In `src/pages/CorporateSignupPage.tsx`:
- delete the inner `EventHero` closure (`:80-191`), and the module-level `AppDownloadFooter`, `normalizeIsraeliLocal`, `inputClass`, `Field`, `DetailChip`, `RallyWordmark` (`:398-531`);
- replace `<EventHero />` with `<EventHero event={event} />`;
- add imports:

```ts
import { EventHero } from '@/components/corporate/EventHero'
import { Field, inputClass } from '@/components/corporate/Field'
import { RallyWordmark } from '@/components/corporate/RallyWordmark'
import { AppDownloadFooter } from '@/components/corporate/AppDownloadFooter'
import { normalizeIsraeliLocal } from '@/components/corporate/phone'
```
- drop the now-unused imports (`CalendarDays, Clock, MapPin, Lock` from lucide; `APP_STORE_*`/`PLAY_STORE_*` from appLinks; `cn` if unused). Keep `CheckCircle2`.

- [ ] **Step 5: Run tests + typecheck + lint**

```bash
npx vitest run src/components/corporate src/pages/CorporateSignupPage.test.tsx
npx tsc -b && npx eslint src/components/corporate src/pages/CorporateSignupPage.tsx
```
Expected: all PASS, clean. `CorporateSignupPage.test.tsx` is untouched from Task 1 and still green — that is the proof this was a pure move.

- [ ] **Step 6: Commit**

```bash
git add src/components/corporate src/pages/CorporateSignupPage.tsx
git commit -m "refactor(corporate-events): lift the hero, chips, field and footer into components/corporate

Pure move — CorporateSignupPage.test.tsx passes unchanged. The tournament-mode
page reuses these next."
```

---

### Task 3: `/join/:slug` dispatcher

**Files:**
- Create: `src/pages/CorporateEventPage.tsx`
- Create: `src/pages/CorporateRegistrationPage.tsx` (a stub that the dispatcher can import; filled in Tasks 11–12)
- Modify: `src/App.tsx:41,76`
- Test: `src/pages/CorporateEventPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/CorporateEventPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@/constants/corporateEvents')
vi.mock('./CorporateSignupPage', () => ({ default: () => <div>LEAD PAGE</div> }))
vi.mock('./CorporateRegistrationPage', () => ({
  default: ({ event }: { event: { slug: string } }) => <div>REG PAGE {event.slug}</div>,
}))

import CorporateEventPage from './CorporateEventPage'
import { getCorporateEvent } from '@/constants/corporateEvents'

function renderAt(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/join/${slug}`]}>
      <Routes>
        <Route path="/join/:slug" element={<CorporateEventPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(getCorporateEvent).mockImplementation((slug) => {
    if (slug === 'lead-co') return { mode: 'lead', slug, sheetSource: 'corporate_lead' } as any
    if (slug === 'reg-co') return { mode: 'tournament', slug, tournamentId: 't-1' } as any
    return null
  })
})

describe('CorporateEventPage', () => {
  it('renders the lead page for a lead-mode slug', () => {
    renderAt('lead-co')
    expect(screen.getByText('LEAD PAGE')).toBeInTheDocument()
  })
  it('renders the registration page for a tournament-mode slug', () => {
    renderAt('reg-co')
    expect(screen.getByText('REG PAGE reg-co')).toBeInTheDocument()
  })
  it('falls through to the lead page (which renders not-found) for an unknown slug', () => {
    renderAt('nope')
    expect(screen.getByText('LEAD PAGE')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/pages/CorporateEventPage.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create the dispatcher and the page stub**

`src/pages/CorporateEventPage.tsx`:

```tsx
import { useParams } from 'react-router-dom'
import { getCorporateEvent } from '@/constants/corporateEvents'
import CorporateSignupPage from './CorporateSignupPage'
import CorporateRegistrationPage from './CorporateRegistrationPage'

/**
 * /join/:slug — one private link per corporate event, two kinds of page behind it.
 * Lead mode is the original sheet-backed signup; tournament mode registers and
 * pays on a real tournament. An unknown slug falls through to the lead page,
 * which renders the not-found card without confirming which slugs exist.
 */
export default function CorporateEventPage() {
  const { slug } = useParams<{ slug: string }>()
  const event = getCorporateEvent(slug)
  if (event?.mode === 'tournament') return <CorporateRegistrationPage event={event} />
  return <CorporateSignupPage />
}
```

`src/pages/CorporateRegistrationPage.tsx` (stub, replaced in Task 11):

```tsx
import type { CorporateTournamentEvent } from '@/constants/corporateEvents'

export default function CorporateRegistrationPage({ event }: { event: CorporateTournamentEvent }) {
  return <main className="min-h-screen bg-rally-bg" data-testid="corporate-registration-stub">{event.slug}</main>
}
```

In `src/App.tsx`: replace `import CorporateSignupPage from './pages/CorporateSignupPage'` with `import CorporateEventPage from './pages/CorporateEventPage'`, and the route element `<CorporateSignupPage />` with `<CorporateEventPage />`. Update the route comment to: `Unlisted corporate event pages (lead signup or real registration — see CorporateEventPage). Bare on purpose: no nav, no app prompt.`

- [ ] **Step 4: Run tests + typecheck**

```bash
npx vitest run src/pages/CorporateEventPage.test.tsx src/pages/CorporateSignupPage.test.tsx
npx tsc -b
```
Expected: PASS, clean.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CorporateEventPage.tsx src/pages/CorporateEventPage.test.tsx src/pages/CorporateRegistrationPage.tsx src/App.tsx
git commit -m "feat(corporate-events): /join/:slug dispatches by event mode"
```

---

### Task 4: Extract `useTournamentRegistration` from `TournamentDetailPage` (pure move)

**Files:**
- Create: `src/hooks/useTournamentRegistration.ts`
- Modify: `src/pages/TournamentDetailPage.tsx` (delete the moved code; call the hook)
- Modify: `src/services/api/tournaments.ts:87-92` (optional third argument)
- Test: `src/hooks/useTournamentRegistration.test.tsx`; `src/pages/TournamentDetailPage.test.tsx` + `TournamentDetailPage.registrationGate.test.tsx` unchanged and green

- [ ] **Step 1: Write the failing hook test**

Create `src/hooks/useTournamentRegistration.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useSearchParams, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

vi.mock('@/services/api/tournaments', () => ({ registerTournament: vi.fn() }))
vi.mock('@/services/api/payments', () => ({ confirmTournamentZeroPayment: vi.fn() }))

import { useTournamentRegistration, buildRegisterPayload } from './useTournamentRegistration'
import { registerTournament } from '@/services/api/tournaments'
import { confirmTournamentZeroPayment } from '@/services/api/payments'

const mockRegister = vi.mocked(registerTournament)
const mockZero = vi.mocked(confirmTournamentZeroPayment)

let lastPath = ''
function Probe() {
  const loc = useLocation()
  const [sp] = useSearchParams()
  lastPath = `${loc.pathname}?${sp.toString()}`
  return null
}
function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/tournaments/t-1']}>
      <Routes>
        <Route path="*" element={<><Probe />{children}</>} />
      </Routes>
    </MemoryRouter>
  )
}
function gate(over: Record<string, unknown> = {}) {
  return {
    isSatisfied: true, payload: [], blocking: [], outstanding: [],
    selectedIds: new Set<string>(), toggle: vi.fn(), reset: vi.fn(),
    handleGateError: vi.fn(() => false), ...over,
  } as any
}
const T = { id: 't-1', format: 'doubles' } as any
const PARTNER = { phase: 'selected', partner: { type: 'existing', id: 'p-2', displayName: 'Dana' } } as const

beforeEach(() => { vi.clearAllMocks(); lastPath = '' })

describe('buildRegisterPayload', () => {
  it('sends partner_type none for singles', () => {
    expect(buildRegisterPayload('singles', { phase: 'idle' }, [])).toEqual({ partner_type: 'none', acknowledged_messages: [] })
  })
  it('maps an existing partner and an invited partner', () => {
    expect(buildRegisterPayload('doubles', PARTNER as any, [])).toEqual({ partner_type: 'existing', partner_player_id: 'p-2', acknowledged_messages: [] })
    const invite = { phase: 'selected', partner: { type: 'invite', firstName: 'A', lastName: 'B', countryCode: '+972', phone: '501234567' } } as any
    expect(buildRegisterPayload('mixed', invite, [{ id: 'm', version: 2 }])).toEqual({
      partner_type: 'invite', invite_first_name: 'A', invite_last_name: 'B', invite_country_code: '+972', invite_phone: '501234567',
      acknowledged_messages: [{ id: 'm', version: 2 }],
    })
  })
})

describe('useTournamentRegistration', () => {
  it('paid registration → /payment-method with amount, carrying return_to when given', async () => {
    mockRegister.mockResolvedValue({ success: true, data: { id: 'r-1', amount_to_pay: 150 } } as any)
    const { result } = renderHook(() => useTournamentRegistration(T, gate(), { returnTo: '/join/acme' }), { wrapper })
    await act(() => result.current.register(PARTNER as any))
    expect(mockRegister).toHaveBeenCalledWith('t-1', expect.objectContaining({ partner_type: 'existing' }))
    expect(lastPath).toBe('/payment-method?registration_id=r-1&tournament_id=t-1&amount=150&return_to=%2Fjoin%2Facme')
  })

  it('free registration → confirm-zero-payment → /payments/confirming', async () => {
    mockRegister.mockResolvedValue({ success: true, data: { id: 'r-1', amount_to_pay: 0 } } as any)
    mockZero.mockResolvedValue({ success: true, data: { confirmed: true } } as any)
    const { result } = renderHook(() => useTournamentRegistration(T, gate()), { wrapper })
    await act(() => result.current.register(PARTNER as any))
    expect(mockZero).toHaveBeenCalledWith('r-1')
    expect(lastPath).toBe('/payments/confirming?type=tournament_registration&id=r-1&tournament_id=t-1')
  })

  it('a 409 the gate recognises sets gateError and never navigates', async () => {
    mockRegister.mockRejectedValue({ code: 'ACKNOWLEDGMENT_REQUIRED', status: 409 })
    const g = gate({ handleGateError: vi.fn(() => true) })
    const { result } = renderHook(() => useTournamentRegistration(T, g), { wrapper })
    await act(() => result.current.register(PARTNER as any))
    expect(result.current.gateError).toMatch(/accept the tournament terms/i)
    expect(lastPath).toBe('/tournaments/t-1?')
  })

  it('TOURNAMENT_FULL with an onTournamentFull handler → full-line error and the callback', async () => {
    mockRegister.mockRejectedValue({ code: 'TOURNAMENT_FULL', status: 409, message: 'Tournament is full' })
    const onFull = vi.fn()
    const { result } = renderHook(() => useTournamentRegistration(T, gate(), { onTournamentFull: onFull }), { wrapper })
    await act(() => result.current.register(PARTNER as any))
    expect(onFull).toHaveBeenCalled()
    expect(result.current.registerError).toBeTruthy()
  })

  it('a backend message is translated into registerError', async () => {
    mockRegister.mockRejectedValue({ message: 'You are already registered for this tournament', status: 400 })
    const { result } = renderHook(() => useTournamentRegistration(T, gate()), { wrapper })
    await act(() => result.current.register(PARTNER as any))
    expect(result.current.registerError).toBeTruthy()
    expect(result.current.isRegistering).toBe(false)
  })

  it('passes skipProfileRedirect through to the API call only when set', async () => {
    mockRegister.mockResolvedValue({ success: true, data: { id: 'r-1', amount_to_pay: 10 } } as any)
    const { result } = renderHook(() => useTournamentRegistration(T, gate(), { skipProfileRedirect: true }), { wrapper })
    await act(() => result.current.register(PARTNER as any))
    expect(mockRegister).toHaveBeenCalledWith('t-1', expect.anything(), { skipProfileRedirect: true })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/hooks/useTournamentRegistration.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 3: Give `registerTournament` an optional third argument**

In `src/services/api/tournaments.ts` replace `registerTournament` with:

```ts
export interface RegisterCallOptions {
  /** Keep a residual 422 PROFILE_FIELDS_REQUIRED on the calling page instead of
   *  the global redirect to /profile/edit (see client.ts). */
  skipProfileRedirect?: boolean
}

export async function registerTournament(
  tournamentId: string,
  payload: RegisterPayload,
  options?: RegisterCallOptions,
): Promise<ApiResponse<TournamentRegistrationResult>> {
  return client.post(`/rally/v1/tournaments/${tournamentId}/register`, payload, {
    skipProfileRedirect: options?.skipProfileRedirect,
  })
}
```
(`skipProfileRedirect` on the axios config is declared in Task 6; until then `tsc` will flag it — do Task 6's Step 3 augmentation now if `tsc -b` complains, it is one `declare module` block.)

- [ ] **Step 4: Create the hook (the detail page's code, moved)**

`src/hooks/useTournamentRegistration.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { registerTournament } from '@/services/api/tournaments'
import { confirmTournamentZeroPayment } from '@/services/api/payments'
import { translateRegistrationError } from '@/lib/registrationErrors'
import type { useRegistrationGate } from '@/features/screenMessages/hooks/useRegistrationGate'
import type { PartnerSelectionState } from '@/types/partner'
import type { AcknowledgedMessageRef, RegisterPayload } from '@/types/api'

export type RegistrationGate = ReturnType<typeof useRegistrationGate>

// Pure helper — no side-effects, fully testable in isolation. Shared by the
// register and join-waitlist paths (the waitlist replays the same payload shape
// at promotion time).
export function buildRegisterPayload(
  format: string,
  state: PartnerSelectionState,
  acknowledgedMessages: AcknowledgedMessageRef[],
): RegisterPayload {
  const needsPartner = format === 'doubles' || format === 'mixed'
  if (!needsPartner) return { partner_type: 'none', acknowledged_messages: acknowledgedMessages }

  if (state.phase === 'selected') {
    if (state.partner.type === 'existing') {
      return {
        partner_type: 'existing',
        partner_player_id: state.partner.id,
        acknowledged_messages: acknowledgedMessages,
      }
    }
    return {
      partner_type: 'invite',
      invite_first_name: state.partner.firstName,
      invite_last_name: state.partner.lastName,
      invite_country_code: state.partner.countryCode,
      invite_phone: state.partner.phone,
      acknowledged_messages: acknowledgedMessages,
    }
  }
  // Guard — unreachable when the partner-required gate is enforced by the caller.
  return { partner_type: 'none', acknowledged_messages: acknowledgedMessages }
}

export interface UseTournamentRegistrationOptions {
  /** Same-origin path the payment pages return to afterwards (e.g. /join/acme).
   *  Omitted ⇒ today's behaviour (confirmation offers /my-activity). */
  returnTo?: string
  /** 409 TOURNAMENT_FULL: set the full-line error and call this (the caller
   *  refetches so the page flips to its full state). Omitted ⇒ the raw backend
   *  message is shown, as before. */
  onTournamentFull?: () => void
  /** Keep a residual 422 PROFILE_FIELDS_REQUIRED inline instead of the global
   *  redirect to /profile/edit. */
  skipProfileRedirect?: boolean
}

/**
 * The register branching TournamentDetailPage's "Register now" used to own:
 * build the payload → POST → 409 terms gate → free (confirm-zero-payment →
 * confirming) or paid (→ /payment-method) → translated errors. The caller still
 * owns sign-in, the partner-required scroll and the unsatisfied-gate scroll —
 * those are DOM concerns of a specific page.
 */
export function useTournamentRegistration(
  tournament: { id: string; format: string } | null | undefined,
  gate: RegistrationGate,
  options: UseTournamentRegistrationOptions = {},
) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { returnTo, onTournamentFull, skipProfileRedirect } = options
  const [isRegistering, setIsRegistering] = useState(false)
  const [registerError, setRegisterError] = useState<string | null>(null)
  // Separate from registerError on purpose: this is the ONE state a tick can
  // retire on its own, without the player pressing anything. Overloading
  // registerError meant a ticked, re-enabled button could still sit under a
  // red "you must accept the terms" sentence from the 409 that led to the
  // tick in the first place.
  const [gateError, setGateError] = useState<string | null>(null)

  // The moment ticking satisfies the gate, any stale 409 note is wrong — the
  // player just did the thing it was asking for.
  useEffect(() => {
    if (gate.isSatisfied) setGateError(null)
  }, [gate.isSatisfied])

  const register = useCallback(
    async (partnerState: PartnerSelectionState): Promise<void> => {
      if (!tournament) return
      setIsRegistering(true)
      setRegisterError(null)
      setGateError(null)
      try {
        const payload = buildRegisterPayload(tournament.format, partnerState, gate.payload)
        const result = skipProfileRedirect
          ? await registerTournament(tournament.id, payload, { skipProfileRedirect: true })
          : await registerTournament(tournament.id, payload)
        if (!result.success) {
          setRegisterError(translateRegistrationError(result.error.message, t))
          return
        }
        const reg = result.data
        const amountToPay = reg.amount_to_pay ?? 0
        // No intermediate summary screen — go straight from Register Now to
        // the add-card step (or, for a free tournament, straight to confirming).
        if (amountToPay < 0.01) {
          const zeroResult = await confirmTournamentZeroPayment(reg.id)
          if (!zeroResult.success) {
            setRegisterError(zeroResult.error.message)
            return
          }
          const sp = new URLSearchParams({
            type: 'tournament_registration',
            id: reg.id,
            tournament_id: tournament.id,
          })
          if (returnTo) sp.set('return_to', returnTo)
          navigate(`/payments/confirming?${sp.toString()}`)
          return
        }
        const sp = new URLSearchParams({
          registration_id: reg.id,
          tournament_id: tournament.id,
          amount: String(amountToPay),
        })
        if (returnTo) sp.set('return_to', returnTo)
        navigate(`/payment-method?${sp.toString()}`)
      } catch (e) {
        // Validation failures (partner already registered, tournament closed,
        // etc.) are RallyException on rally-api — a non-2xx response, which the
        // axios client's interceptor turns into a rejected plain object
        // ({status, code, message, details}), not an Error instance.
        const err = e as { code?: string; message?: string; details?: unknown } | null
        // The 409 safety net (SCREEN_MESSAGES_WEB_SPEC.md §6a): a message
        // was published/edited between page load and register. Refetch,
        // clear ticks, and say so — never auto-retry, the player hasn't
        // seen the new text yet. Must run before the generic fallback below
        // so ACKNOWLEDGMENT_REQUIRED never surfaces as raw backend text.
        if (gate.handleGateError(err)) {
          setGateError(
            t('screenMessages.registrationGateRequired', {
              defaultValue: 'You must accept the tournament terms to continue',
            }),
          )
          return
        }
        if (err?.code === 'TOURNAMENT_FULL' && onTournamentFull) {
          setRegisterError(t('tournament.tournamentFullLine'))
          onTournamentFull()
          return
        }
        // Extract the real backend message and translate it — rally-api
        // sends plain English text with no distinct error code for most of
        // these.
        setRegisterError(
          err?.message
            ? translateRegistrationError(err.message, t)
            : t('tournament.registrationFailedTitle'),
        )
      } finally {
        setIsRegistering(false)
      }
    },
    [tournament, gate, t, navigate, returnTo, onTournamentFull, skipProfileRedirect],
  )

  return { register, isRegistering, registerError, gateError, setRegisterError, setGateError }
}
```

- [ ] **Step 5: Make `TournamentDetailPage` call the hook**

In `src/pages/TournamentDetailPage.tsx`:
1. Delete the module-level `buildRegisterPayload` (`:42-73`) and import it: `import { useTournamentRegistration, buildRegisterPayload } from '@/hooks/useTournamentRegistration'`.
2. Delete the `isRegistering`, `registerError`, `gateError` `useState`s and the `useEffect` that clears `gateError` on `gate.isSatisfied`. Directly after `const gate = useRegistrationGate(...)` add:

```ts
  const {
    register, isRegistering, registerError, gateError, setGateError,
  } = useTournamentRegistration(tr, gate)
```
3. Replace the body of `handleRegisterNow` after the two scroll guards (from `setIsRegistering(true)` through the `finally` block) with a single line:

```ts
        await register(partnerState)
```
so the handler reads: `requireSignIn().then(async () => { if (!tr) return; <partnerRequired scroll>; <gate scroll>; await register(partnerState) }).catch(() => {})`.
4. `handleJoinWaitlist` keeps calling `buildRegisterPayload` and `setGateError` (both still in scope).
5. Remove now-unused imports: `registerTournament` (keep `joinTournamentWaitlist, leaveTournamentWaitlist`), `confirmTournamentZeroPayment`, `translateRegistrationError` (keep `translateWaitlistError`), and the `AcknowledgedMessageRef, RegisterPayload` types if unused.

- [ ] **Step 6: Run the hook test and BOTH detail-page test files unchanged**

```bash
npx vitest run src/hooks/useTournamentRegistration.test.tsx src/pages/TournamentDetailPage.test.tsx src/pages/TournamentDetailPage.registrationGate.test.tsx
npx tsc -b && npx eslint src/hooks/useTournamentRegistration.ts src/pages/TournamentDetailPage.tsx
```
Expected: all PASS with the detail-page files untouched; `tsc`/eslint clean. If a detail test fails, the move was not pure — fix the hook, not the test.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useTournamentRegistration.ts src/hooks/useTournamentRegistration.test.tsx src/pages/TournamentDetailPage.tsx src/services/api/tournaments.ts
git commit -m "refactor(tournaments): extract the register branching into useTournamentRegistration

Pure move guarded by TournamentDetailPage's tests. Adds three opt-in options
(returnTo, onTournamentFull, skipProfileRedirect) that the detail page does not
use, so its behaviour is byte-for-byte unchanged."
```

---

### Task 5: `return_to` — land back on the event after payment

**Files:**
- Create: `src/lib/returnTo.ts`
- Modify: `src/hooks/usePendingPayment.ts` (`returnTo?`)
- Modify: `src/pages/payment/PaymentMethodPage.tsx`, `PaymentReturnPage.tsx`, `PaymentConfirmingPage.tsx`
- Modify: `src/i18n/locales/he.json` + `en.json` (`payment.backToEvent`)
- Test: `src/lib/returnTo.test.ts`, `src/pages/payment/PaymentConfirmingPage.test.tsx`, `PaymentReturnPage.test.tsx`, `PaymentMethodPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/returnTo.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { sanitizeReturnTo, stashAuthReturn, readAuthReturn, buildAuthCallbackUrl, AUTH_RETURN_KEY } from './returnTo'

beforeEach(() => sessionStorage.clear())

describe('sanitizeReturnTo', () => {
  it('accepts same-origin absolute paths only', () => {
    expect(sanitizeReturnTo('/join/acme')).toBe('/join/acme')
    expect(sanitizeReturnTo('/join/acme?x=1')).toBe('/join/acme?x=1')
    expect(sanitizeReturnTo('//evil.example/x')).toBeNull()
    expect(sanitizeReturnTo('https://evil.example/x')).toBeNull()
    expect(sanitizeReturnTo('join/acme')).toBeNull()
    expect(sanitizeReturnTo(null)).toBeNull()
    expect(sanitizeReturnTo(undefined)).toBeNull()
    expect(sanitizeReturnTo('')).toBeNull()
  })
})

describe('auth return stash', () => {
  it('round-trips through sessionStorage under the key AuthCallbackPage reads', () => {
    stashAuthReturn('/join/acme')
    expect(sessionStorage.getItem(AUTH_RETURN_KEY)).toBe('/join/acme')
    expect(readAuthReturn()).toBe('/join/acme')
  })
  it('never returns an unsafe stashed value', () => {
    sessionStorage.setItem(AUTH_RETURN_KEY, '//evil.example')
    expect(readAuthReturn()).toBeNull()
  })
})

describe('buildAuthCallbackUrl', () => {
  it('appends ?next= only when a safe return path is stashed', () => {
    expect(buildAuthCallbackUrl('https://rallypadel.app')).toBe('https://rallypadel.app/auth/callback')
    stashAuthReturn('/join/acme')
    expect(buildAuthCallbackUrl('https://rallypadel.app')).toBe('https://rallypadel.app/auth/callback?next=%2Fjoin%2Facme')
  })
})
```

Append to `src/pages/payment/PaymentConfirmingPage.test.tsx` (inside a new `describe`; the file already mounts `/my-activity` — add a `/join/:slug` probe route to `renderConfirming`'s `<Routes>`: `<Route path="/join/:slug" element={<div>EVENT PAGE</div>} />`):

```tsx
describe('PaymentConfirmingPage — return_to', () => {
  it('offers "back to the event" and navigates to a same-origin return_to', () => {
    mockUseEntityPolling.mockReturnValue({
      status: 'confirmed', attempts: 1,
      entity: { status: 'registered', payment_status: 'payment_held' },
    })
    renderConfirming('?type=tournament_registration&id=r-1&tournament_id=t-1&return_to=%2Fjoin%2Facme')
    const cta = screen.getByRole('button', { name: /back to the event/i })
    cta.click()
    expect(screen.getByText('EVENT PAGE')).toBeInTheDocument()
  })

  it('ignores an off-origin return_to and keeps the activity CTA', () => {
    mockUseEntityPolling.mockReturnValue({ status: 'confirmed', attempts: 1, entity: null })
    renderConfirming('?type=booking&id=b-1&return_to=https%3A%2F%2Fevil.example')
    expect(screen.queryByRole('button', { name: /back to the event/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /activity/i })).toBeInTheDocument()
  })
})
```

Append to `src/pages/payment/PaymentReturnPage.test.tsx` (read its existing `renderAt`/probe helper first and reuse it; if it asserts on the confirming URL via a probe, add):

```tsx
it('copies pendingPayment.returnTo into the confirming URL', () => {
  pendingPayment.set({ type: 'tournament_registration', entityId: '11111111-1111-1111-1111-111111111111', amount: 150, tournamentId: 't-1', returnTo: '/join/acme' })
  renderAt('/payments/return?status=success&type=tournament_registration&id=11111111-1111-1111-1111-111111111111')
  expect(screen.getByTestId('route-probe').textContent).toContain('return_to=%2Fjoin%2Facme')
})
```
(`pendingPayment` is imported from `@/hooks/usePendingPayment`; the probe reads `useSearchParams().toString()` on the `/payments/confirming` route — mirror the file's existing probe.)

Append to `src/pages/payment/PaymentMethodPage.test.tsx`:

```tsx
it('stores return_to in the pending-payment context before redirecting', async () => {
  mockInitiate.mockResolvedValue({ success: true, data: { payment_url: 'https://grow.example/checkout/abc' }, meta: null, error: null })
  renderAt('?registration_id=r-1&tournament_id=t-1&amount=150&return_to=%2Fjoin%2Facme')
  fireEvent.click(screen.getByRole('button', { name: i18n.t('payment.paymentMethodAddCardCta') }))
  await waitFor(() => expect(pendingPayment.get()?.returnTo).toBe('/join/acme'))
})
```

- [ ] **Step 2: Run to verify they fail**

```bash
npx vitest run src/lib/returnTo.test.ts src/pages/payment
```
Expected: FAIL — `returnTo` module missing; "back to the event" not found; `returnTo` undefined.

- [ ] **Step 3: Create `src/lib/returnTo.ts`**

```ts
/** sessionStorage key AuthCallbackPage restores after an OAuth / verify-email round trip. */
export const AUTH_RETURN_KEY = 'rally:auth-return'

/** Same-origin absolute path or nothing. Never an off-origin URL, never protocol-relative. */
export function sanitizeReturnTo(value: string | null | undefined): string | null {
  if (!value) return null
  if (!value.startsWith('/') || value.startsWith('//')) return null
  return value
}

export function stashAuthReturn(path: string): void {
  try {
    sessionStorage.setItem(AUTH_RETURN_KEY, path)
  } catch {
    // sessionStorage may be unavailable (private mode) — non-fatal.
  }
}

export function readAuthReturn(): string | null {
  try {
    return sanitizeReturnTo(sessionStorage.getItem(AUTH_RETURN_KEY))
  } catch {
    return null
  }
}

/**
 * The Supabase emailRedirectTo for sign-up. Carries the stashed return path as
 * `?next=` so a verification link opened on ANOTHER device (empty sessionStorage)
 * still lands back where the sign-up started. Requires the Supabase project's
 * redirect allowlist to admit the query variant; if it does not, Supabase falls
 * back to the Site URL — the same place today's flow lands.
 */
export function buildAuthCallbackUrl(origin: string): string {
  const base = `${origin}/auth/callback`
  const next = readAuthReturn()
  return next ? `${base}?next=${encodeURIComponent(next)}` : base
}
```

- [ ] **Step 4: Thread `returnTo` through the payment pages**

`src/hooks/usePendingPayment.ts` — add to `PendingPayment`:
```ts
  /** Same-origin path the confirming page offers to return to (e.g. /join/acme). */
  returnTo?: string
```
(`isValidShape` needs no change — the field is optional.)

`src/pages/payment/PaymentMethodPage.tsx`:
- `import { sanitizeReturnTo } from '@/lib/returnTo'`
- after `const tournamentId = …` add `const returnTo = sanitizeReturnTo(params.get('return_to'))`
- in `pendingPayment.set({...})` add `returnTo: returnTo ?? undefined,`

`src/pages/payment/PaymentReturnPage.tsx` — in the success branch, after `if (eid) sp.set('event_id', eid)` add:
```ts
      if (pending?.returnTo) sp.set('return_to', pending.returnTo)
```

`src/pages/payment/PaymentConfirmingPage.tsx`:
- `import { sanitizeReturnTo } from '@/lib/returnTo'`
- after `const eventId = …` add `const returnTo = sanitizeReturnTo(params.get('return_to'))`
- replace BOTH CTA buttons (confirmed state and timeout state) with:

```tsx
          <button
            onClick={() => navigate(returnTo ?? '/my-activity')}
            className="w-full h-12 rounded-full bg-rally-accent text-rally-accent-text font-bold"
          >
            {returnTo ? t('payment.backToEvent') : t('payment.viewActivity')}
          </button>
```
(in the timeout state the fallback label stays `t('payment.stillProcessingCta')`: `{returnTo ? t('payment.backToEvent') : t('payment.stillProcessingCta')}`).

i18n — add under `payment` in `he.json`: `"backToEvent": "חזרה לעמוד האירוע"` and in `en.json`: `"backToEvent": "Back to the event"`.

- [ ] **Step 5: Run the tests**

```bash
npx vitest run src/lib/returnTo.test.ts src/pages/payment src/hooks
npx tsc -b
```
Expected: all PASS; clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/returnTo.ts src/lib/returnTo.test.ts src/hooks/usePendingPayment.ts src/pages/payment src/i18n/locales/he.json src/i18n/locales/en.json
git commit -m "feat(payments): return_to threads through checkout so confirmation lands back on the event"
```

---

### Task 6: `skipProfileRedirect` — keep a residual 422 on the page

**Files:**
- Modify: `src/services/api/client.ts:63-70`
- Test: `src/services/api/client.skipProfileRedirect.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/services/api/client.skipProfileRedirect.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: null } })) } },
}))

import client, { __setApiBridge } from './client'

function rejected() {
  // axios stores interceptors as {fulfilled, rejected}; index 0 is the one client.ts registered.
  const handlers = (client.interceptors.response as unknown as { handlers: { rejected: (e: unknown) => Promise<unknown> }[] }).handlers
  return handlers[0].rejected
}

function profileError(config: Record<string, unknown>) {
  return {
    config,
    response: {
      status: 422,
      data: { success: false, error: { code: 'PROFILE_FIELDS_REQUIRED', message: 'Profile fields required to perform this action', details: { missing_fields: [] } } },
    },
  }
}

describe('client — PROFILE_FIELDS_REQUIRED redirect', () => {
  const bridge = { redirectToProfileEdit: vi.fn(), forceSignOut: vi.fn(async () => {}) }
  beforeEach(() => { vi.clearAllMocks(); __setApiBridge(bridge) })

  it('redirects by default', async () => {
    await expect(rejected()(profileError({}))).rejects.toMatchObject({ code: 'PROFILE_FIELDS_REQUIRED' })
    expect(bridge.redirectToProfileEdit).toHaveBeenCalledTimes(1)
  })

  it('does not redirect when the request opted out', async () => {
    await expect(rejected()(profileError({ skipProfileRedirect: true }))).rejects.toMatchObject({ code: 'PROFILE_FIELDS_REQUIRED' })
    expect(bridge.redirectToProfileEdit).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/services/api/client.skipProfileRedirect.test.ts
```
Expected: the second test FAILS — the bridge was called.

- [ ] **Step 3: Declare the config flag and honour it**

At the top of `src/services/api/client.ts` (after the imports) add:

```ts
declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Keep a 422 PROFILE_FIELDS_REQUIRED on the calling page instead of the
     *  global redirect to /profile/edit. Set by pages that collect the missing
     *  fields themselves (CorporateRegistrationPage). */
    skipProfileRedirect?: boolean
  }
}
```

Replace

```ts
    if ((status === 403 || status === 422) && needsPlayerRow) {
      _bridge?.redirectToProfileEdit()
    }
```
with
```ts
    if ((status === 403 || status === 422) && needsPlayerRow && !error.config?.skipProfileRedirect) {
      _bridge?.redirectToProfileEdit()
    }
```

- [ ] **Step 4: Run tests + typecheck**

```bash
npx vitest run src/services/api
npx tsc -b
```
Expected: PASS (including the pre-existing `client.test.ts`); clean.

- [ ] **Step 5: Commit**

```bash
git add src/services/api/client.ts src/services/api/client.skipProfileRedirect.test.ts src/services/api/tournaments.ts
git commit -m "feat(api-client): per-request opt-out of the profile-edit redirect"
```

---

### Task 7: Two more translated registration errors

**Files:**
- Modify: `src/lib/registrationErrors.ts`
- Modify: `src/i18n/locales/he.json` + `en.json` (`tournament.registrationErrors.ownPhone`, `.missingInviteDetails`)
- Test: `src/lib/registrationErrors.test.ts` (create if absent; extend if present)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import i18n from '@/i18n'
import { translateRegistrationError } from './registrationErrors'

describe('translateRegistrationError — corporate page additions', () => {
  const t = i18n.t.bind(i18n)
  it('maps the own-phone partner refusal', () => {
    expect(translateRegistrationError('That is your own phone number. Choose a different partner.', t))
      .toBe(i18n.t('tournament.registrationErrors.ownPhone'))
  })
  it('maps the missing-invite-details refusal', () => {
    expect(translateRegistrationError('Missing invite details (first name, phone, or country code)', t))
      .toBe(i18n.t('tournament.registrationErrors.missingInviteDetails'))
  })
  it('still falls back to the raw text for unknown messages', () => {
    expect(translateRegistrationError('Something new', t)).toBe('Something new')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/lib/registrationErrors.test.ts
```
Expected: FAIL — raw text returned / key missing.

- [ ] **Step 3: Add the two matches and the keys**

In `translateRegistrationError`, before the `// e.g. "A partner is required …"` regex block, add:

```ts
  if (message === 'That is your own phone number. Choose a different partner.') {
    return t('tournament.registrationErrors.ownPhone')
  }
  if (message === 'Missing invite details (first name, phone, or country code)') {
    return t('tournament.registrationErrors.missingInviteDetails')
  }
```

Under `tournament.registrationErrors` — `he.json`: `"ownPhone": "זה מספר הטלפון שלך. בחר/י שותף/ה אחר/ת."`, `"missingInviteDetails": "חסרים פרטי השותף/ה (שם פרטי, טלפון או קידומת)"`; `en.json`: `"ownPhone": "That's your own number — pick a different partner."`, `"missingInviteDetails": "Partner details are missing (first name, phone or country code)"`.

- [ ] **Step 4: Run + commit**

```bash
npx vitest run src/lib/registrationErrors.test.ts
git add src/lib/registrationErrors.ts src/lib/registrationErrors.test.ts src/i18n/locales/he.json src/i18n/locales/en.json
git commit -m "feat(tournaments): translate the own-phone and missing-invite registration refusals"
```

---

### Task 8: Email sign-up finds its way back (`?next=` + the stash)

**Files:**
- Modify: `src/contexts/AuthContext.tsx:81-95` (`signUpWithEmail` uses `buildAuthCallbackUrl`)
- Modify: `src/pages/auth/AuthCallbackPage.tsx:22-33` (prefer a safe `next`)
- Test: `src/pages/auth/AuthCallbackPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/auth/AuthCallbackPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn() } },
}))

import AuthCallbackPage from './AuthCallbackPage'
import { supabase } from '@/lib/supabase'
import { AUTH_RETURN_KEY } from '@/lib/returnTo'

function renderAt(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/auth/callback${search}`]}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/" element={<div>HOME</div>} />
        <Route path="/join/:slug" element={<div>EVENT PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  sessionStorage.clear()
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { access_token: 'x' } }, error: null } as any)
})

describe('AuthCallbackPage return path', () => {
  it('prefers a same-origin ?next= over the stash', async () => {
    sessionStorage.setItem(AUTH_RETURN_KEY, '/')
    renderAt('?next=%2Fjoin%2Facme')
    await waitFor(() => expect(screen.getByText('EVENT PAGE')).toBeInTheDocument())
  })
  it('falls back to the stash when next is absent', async () => {
    sessionStorage.setItem(AUTH_RETURN_KEY, '/join/acme')
    renderAt('')
    await waitFor(() => expect(screen.getByText('EVENT PAGE')).toBeInTheDocument())
  })
  it('ignores an off-origin next', async () => {
    renderAt('?next=https%3A%2F%2Fevil.example')
    await waitFor(() => expect(screen.getByText('HOME')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/pages/auth/AuthCallbackPage.test.tsx
```
Expected: the first and third tests FAIL (`next` is ignored today).

- [ ] **Step 3: Honour `next` in the callback and emit it at sign-up**

In `src/pages/auth/AuthCallbackPage.tsx` add `import { sanitizeReturnTo, readAuthReturn, AUTH_RETURN_KEY } from '@/lib/returnTo'` and replace the block from `let returnTo = '/'` through the closing `}` of its `try/catch` with:

```ts
    // A same-origin ?next= (set by signUpWithEmail from the stash) wins, so a
    // verification link opened on another device still returns to the page the
    // sign-up started on. Otherwise the same-browser stash, otherwise home.
    const returnTo = sanitizeReturnTo(params.get('next')) ?? readAuthReturn() ?? '/'
```
and in the success branch replace `sessionStorage.removeItem('rally:auth-return')` with `sessionStorage.removeItem(AUTH_RETURN_KEY)`. Add `params` to the effect's dependency array.

In `src/contexts/AuthContext.tsx` add `import { buildAuthCallbackUrl } from '@/lib/returnTo'` and in `signUpWithEmail` replace `emailRedirectTo: \`${window.location.origin}/auth/callback\`,` with `emailRedirectTo: buildAuthCallbackUrl(window.location.origin),`.

- [ ] **Step 4: Run + typecheck + commit**

```bash
npx vitest run src/pages/auth src/lib/returnTo.test.ts
npx tsc -b
git add src/pages/auth/AuthCallbackPage.tsx src/pages/auth/AuthCallbackPage.test.tsx src/contexts/AuthContext.tsx
git commit -m "feat(auth): email sign-up carries its return path as ?next= and the callback honours it"
```

---

### Task 9: `useEnsureProfileEssentials` — write name / phone / level before registering

**Files:**
- Modify: `src/types/api.ts:378` (`gender?: Gender`)
- Create: `src/hooks/useEnsureProfileEssentials.ts`
- Test: `src/hooks/useEnsureProfileEssentials.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useEnsureProfileEssentials.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/hooks/useAppSession', () => ({ useAppSession: vi.fn() }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn(() => ({ user: { email: 'dana@acme.co.il' } })) }))
vi.mock('@/services/api/auth', () => ({ createPlayerProfile: vi.fn() }))
vi.mock('@/services/api/profile', () => ({ updateProfile: vi.fn() }))

import { useEnsureProfileEssentials, bandForLevel, LEVEL_BANDS } from './useEnsureProfileEssentials'
import { useAppSession } from '@/hooks/useAppSession'
import { createPlayerProfile } from '@/services/api/auth'
import { updateProfile } from '@/services/api/profile'

const mockSession = vi.mocked(useAppSession)
const mockCreate = vi.mocked(createPlayerProfile)
const mockUpdate = vi.mocked(updateProfile)
const refetch = vi.fn(async () => {})

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient()
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
function session(status: string, playerProfile: Record<string, unknown> | null) {
  mockSession.mockReturnValue({ status, playerProfile, onboardingStatus: null, refetchOnboarding: refetch, clearSession: vi.fn() } as any)
}
const INPUT = { firstName: 'Dana', lastName: 'Cohen', phone: '501234567', skillLevel: 3.25 }

beforeEach(() => { vi.clearAllMocks(); mockCreate.mockResolvedValue({ success: true } as any); mockUpdate.mockResolvedValue({ success: true } as any) })

describe('useEnsureProfileEssentials', () => {
  it('profile_incomplete → creates the player row with the auth email and +972', async () => {
    session('profile_incomplete', null)
    const { result } = renderHook(() => useEnsureProfileEssentials(), { wrapper })
    await act(() => result.current.ensure(INPUT))
    expect(mockCreate).toHaveBeenCalledWith({
      first_name: 'Dana', last_name: 'Cohen', email: 'dana@acme.co.il',
      contact_number: '501234567', country_code: '+972', skill_level: 3.25,
    })
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(refetch).toHaveBeenCalled()
  })

  it('ready with empty phone/level → patches only what is missing (and names when changed)', async () => {
    session('ready', { first_name: 'Dana', last_name: null, contact_number: null, skill_level: null })
    const { result } = renderHook(() => useEnsureProfileEssentials(), { wrapper })
    await act(() => result.current.ensure(INPUT))
    expect(mockUpdate).toHaveBeenCalledWith({ last_name: 'Cohen', contact_number: '501234567', country_code: '+972', skill_level: 3.25 })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('ready with a stored phone and level → never sends them, even if the input differs', async () => {
    session('ready', { first_name: 'Dana', last_name: 'Cohen', contact_number: '509999999', skill_level: 4.6 })
    const { result } = renderHook(() => useEnsureProfileEssentials(), { wrapper })
    expect(result.current.phoneLocked).toBe(true)
    expect(result.current.levelLocked).toBe(true)
    await act(() => result.current.ensure({ ...INPUT, phone: '501111111', skillLevel: 2.0 }))
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(refetch).toHaveBeenCalled()
  })

  it('a failed write throws so the page can show it', async () => {
    session('ready', { first_name: null, last_name: null, contact_number: null, skill_level: null })
    mockUpdate.mockResolvedValue({ success: false, error: { message: 'nope' } } as any)
    const { result } = renderHook(() => useEnsureProfileEssentials(), { wrapper })
    await expect(act(() => result.current.ensure(INPUT))).rejects.toThrow('nope')
  })

  it('signed out / loading throws SESSION_NOT_READY', async () => {
    session('signed_out', null)
    const { result } = renderHook(() => useEnsureProfileEssentials(), { wrapper })
    await expect(act(() => result.current.ensure(INPUT))).rejects.toThrow('SESSION_NOT_READY')
  })
})

describe('bandForLevel', () => {
  it('uses the same thresholds as getSkillLevelName', () => {
    expect(bandForLevel(2.0).key).toBe('beginner')
    expect(bandForLevel(2.5).key).toBe('intermediate')
    expect(bandForLevel(4.0).key).toBe('advanced')
    expect(bandForLevel(5.5).key).toBe('pro')
    expect(LEVEL_BANDS.map((b) => b.value)).toEqual([2.0, 3.25, 4.75, 6.0])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/hooks/useEnsureProfileEssentials.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 3: Loosen `gender` and create the hook**

In `src/types/api.ts` change `gender: Gender` in `PlayerCreatePayload` to `gender?: Gender` (rally-api's `PlayerCreate.gender` is `Optional[str] = None`; `EditProfilePage` still passes a value).

Create `src/hooks/useEnsureProfileEssentials.ts`:

```ts
import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAppSession } from '@/hooks/useAppSession'
import { useAuth } from '@/hooks/useAuth'
import { createPlayerProfile } from '@/services/api/auth'
import { updateProfile } from '@/services/api/profile'
import { DEFAULT_COUNTRY } from '@/constants/countryCodes'
import type { ProfileUpdateRequest } from '@/types/api'

/**
 * The four self-assessed bands the corporate page offers, mapped to the midpoints
 * of the thresholds `getSkillLevelName` uses (<2.5 / <4 / <5.5 / else).
 */
export const LEVEL_BANDS = [
  { key: 'beginner', value: 2.0 },
  { key: 'intermediate', value: 3.25 },
  { key: 'advanced', value: 4.75 },
  { key: 'pro', value: 6.0 },
] as const

export type LevelBand = (typeof LEVEL_BANDS)[number]

export function bandForLevel(level: number): LevelBand {
  if (level < 2.5) return LEVEL_BANDS[0]
  if (level < 4.0) return LEVEL_BANDS[1]
  if (level < 5.5) return LEVEL_BANDS[2]
  return LEVEL_BANDS[3]
}

export interface ProfileEssentialsInput {
  firstName: string
  lastName: string
  /** Israeli local digits, trunk 0 stripped (see components/corporate/phone.ts). */
  phone: string
  skillLevel: number | null
}

/**
 * rally-api refuses `register` until the profile has `contact_number` and
 * `skill_level` (profile_service.REQUIRED_FOR). This writes what the corporate
 * page collected BEFORE the register call, so the employee never meets the
 * generic /profile/edit page:
 *  - no `players` row yet (`profile_incomplete`) → POST /rally/v1/players/
 *  - row exists (`ready`)                        → PATCH only what is null
 * A stored phone or level is NEVER overwritten (a rated/verified level with no
 * snapshot would be destroyed); names are editable.
 */
export function useEnsureProfileEssentials() {
  const { status, playerProfile, refetchOnboarding } = useAppSession()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const phoneLocked = !!playerProfile?.contact_number
  const levelLocked = playerProfile?.skill_level != null

  const ensure = useCallback(
    async (input: ProfileEssentialsInput): Promise<void> => {
      if (status === 'profile_incomplete') {
        const res = await createPlayerProfile({
          first_name: input.firstName,
          last_name: input.lastName,
          email: user?.email ?? '',
          contact_number: input.phone,
          country_code: DEFAULT_COUNTRY.dial,
          ...(input.skillLevel != null ? { skill_level: input.skillLevel } : {}),
        })
        if (!res.success) throw new Error(res.error?.message ?? 'PROFILE_CREATE_FAILED')
      } else if (status === 'ready') {
        const patch: ProfileUpdateRequest = {}
        if (input.firstName && input.firstName !== (playerProfile?.first_name ?? '')) {
          patch.first_name = input.firstName
        }
        if (input.lastName && input.lastName !== (playerProfile?.last_name ?? '')) {
          patch.last_name = input.lastName
        }
        if (!playerProfile?.contact_number && input.phone) {
          patch.contact_number = input.phone
          patch.country_code = DEFAULT_COUNTRY.dial
        }
        if (playerProfile?.skill_level == null && input.skillLevel != null) {
          patch.skill_level = input.skillLevel
        }
        if (Object.keys(patch).length > 0) {
          const res = await updateProfile(patch)
          if (!res.success) throw new Error(res.error?.message ?? 'PROFILE_UPDATE_FAILED')
        }
      } else {
        throw new Error('SESSION_NOT_READY')
      }
      await refetchOnboarding()
      await queryClient.invalidateQueries({ queryKey: ['player-profile-me'] })
    },
    [status, playerProfile, user?.email, refetchOnboarding, queryClient],
  )

  return { ensure, status, playerProfile, phoneLocked, levelLocked }
}
```

Check `DEFAULT_COUNTRY.dial` is `'+972'` (`src/constants/countryCodes.ts:21` → `COUNTRY_CODES[0]`); if the field is named differently, use the field that holds the dial code.

- [ ] **Step 4: Run + typecheck + commit**

```bash
npx vitest run src/hooks/useEnsureProfileEssentials.test.tsx src/pages/EditProfilePage.test.tsx
npx tsc -b
git add src/types/api.ts src/hooks/useEnsureProfileEssentials.ts src/hooks/useEnsureProfileEssentials.test.tsx
git commit -m "feat(profile): useEnsureProfileEssentials — write name/phone/level before registering, never overwrite a stored phone or level"
```

---

### Task 10: i18n — the `corporate.reg.*` copy in both locales, with a parity test

**Files:**
- Modify: `src/i18n/locales/he.json`, `src/i18n/locales/en.json`
- Test: `src/i18n/locales/corporateKeys.test.ts`

- [ ] **Step 1: Write the failing parity test**

Create `src/i18n/locales/corporateKeys.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import he from './he.json'
import en from './en.json'

function flat(obj: unknown, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object') return [prefix]
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flat(v, prefix ? `${prefix}.${k}` : k),
  )
}

const REQUIRED_REG_KEYS = [
  'signInCta', 'formTitle', 'firstName', 'lastName', 'phone', 'level', 'levelHint',
  'phoneLocked', 'levelLocked', 'level_beginner', 'level_intermediate', 'level_advanced', 'level_pro',
  'partnerTitle', 'partnerRequiredHint', 'priceLabel', 'holdNote', 'submitCta', 'submitting',
  'registeredTitle', 'registeredPartner', 'registeredStatus_pending', 'registeredStatus_held',
  'registeredStatus_confirmed', 'completePayment', 'notOpenTitle', 'notOpenBody', 'closedTitle',
  'closedBody', 'fullTitle', 'fullBody', 'profileSaveError', 'sessionError', 'retry',
  'errorRequired', 'errorPhone', 'errorLevel',
]

describe('corporate copy parity', () => {
  it('he and en carry the same corporate.* keys', () => {
    expect(new Set(flat((he as any).corporate))).toEqual(new Set(flat((en as any).corporate)))
  })
  it('every key the registration page reads exists in both', () => {
    for (const k of REQUIRED_REG_KEYS) {
      expect((he as any).corporate.reg?.[k], `he corporate.reg.${k}`).toBeTruthy()
      expect((en as any).corporate.reg?.[k], `en corporate.reg.${k}`).toBeTruthy()
    }
    for (const k of ['ownPhone', 'missingInviteDetails']) {
      expect((he as any).tournament.registrationErrors[k]).toBeTruthy()
      expect((en as any).tournament.registrationErrors[k]).toBeTruthy()
    }
    expect((he as any).payment.backToEvent).toBeTruthy()
    expect((en as any).payment.backToEvent).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/i18n/locales/corporateKeys.test.ts
```
Expected: FAIL — `corporate.reg` missing.

- [ ] **Step 3: Add the copy**

Add a `"reg"` object inside `"corporate"` in **`he.json`**:

```json
"reg": {
  "signInCta": "להרשמה לטורניר",
  "signInHint": "נכנסים עם Google או עם אימייל — לוקח חצי דקה.",
  "formTitle": "פרטי הרשמה",
  "firstName": "שם פרטי",
  "lastName": "שם משפחה",
  "phone": "טלפון נייד",
  "level": "הרמה שלך",
  "levelHint": "הערכה עצמית — עוזרת לנו לשבץ משחקים מאוזנים.",
  "phoneLocked": "המספר מהפרופיל שלך. לעדכון — דרך עמוד הפרופיל באפליקציה.",
  "levelLocked": "הרמה מהפרופיל שלך ב-Rally.",
  "level_beginner": "מתחיל/ה",
  "level_intermediate": "בינוני/ת",
  "level_advanced": "מתקדם/ת",
  "level_pro": "מקצוען/ית",
  "partnerTitle": "השותף/ה שלך",
  "partnerRequiredHint": "הרשמה היא בזוגות — חפשו שחקן/ית Rally או הזמינו לפי שם וטלפון.",
  "priceLabel": "דמי הרשמה לזוג",
  "holdNote": "הסכום ייתפס בכרטיס ויחויב רק לאחר אישור ההרשמה על ידי מארגני הטורניר.",
  "submitCta": "הרשמה ותשלום",
  "submitting": "רגע…",
  "registeredTitle": "נרשמתם! נתראה במגרש",
  "registeredPartner": "שותף/ה:",
  "registeredStatus_pending": "ההרשמה ממתינה לתשלום.",
  "registeredStatus_held": "ההרשמה התקבלה — התשלום נתפס וימתין לאישור המארגנים.",
  "registeredStatus_confirmed": "ההרשמה אושרה.",
  "completePayment": "להשלמת התשלום",
  "notOpenTitle": "ההרשמה עוד לא נפתחה",
  "notOpenBody": "הקישור נכון — ההרשמה תיפתח בקרוב. כדאי לחזור מאוחר יותר.",
  "closedTitle": "ההרשמה נסגרה",
  "closedBody": "מועד ההרשמה חלף. לשאלות פנו למארגני הטורניר בחברה.",
  "fullTitle": "כל המקומות נתפסו",
  "fullBody": "הטורניר מלא. פנו למארגני הטורניר בחברה — אולי יתפנה מקום.",
  "profileSaveError": "לא הצלחנו לשמור את הפרטים. בדקו את הטלפון והרמה ונסו שוב.",
  "sessionError": "משהו השתבש בטעינת הפרופיל.",
  "retry": "נסו שוב",
  "errorRequired": "שדה חובה",
  "errorPhone": "מספר טלפון ישראלי לא תקין",
  "errorLevel": "בחרו רמה"
}
```

and in **`en.json`**:

```json
"reg": {
  "signInCta": "Register for the tournament",
  "signInHint": "Sign in with Google or email — it takes half a minute.",
  "formTitle": "Registration details",
  "firstName": "First name",
  "lastName": "Last name",
  "phone": "Mobile number",
  "level": "Your level",
  "levelHint": "Self-assessed — it helps us seed balanced matches.",
  "phoneLocked": "From your profile. To change it, use the profile page in the app.",
  "levelLocked": "Your level on Rally.",
  "level_beginner": "Beginner",
  "level_intermediate": "Intermediate",
  "level_advanced": "Advanced",
  "level_pro": "Pro",
  "partnerTitle": "Your partner",
  "partnerRequiredHint": "Registration is in pairs — search a Rally player or invite by name and phone.",
  "priceLabel": "Entry fee per pair",
  "holdNote": "The amount is held on your card and charged only once the organisers approve your registration.",
  "submitCta": "Register & pay",
  "submitting": "One moment…",
  "registeredTitle": "You're in — see you on court",
  "registeredPartner": "Partner:",
  "registeredStatus_pending": "Your registration is waiting for payment.",
  "registeredStatus_held": "Registration received — the hold is in place, pending the organisers' approval.",
  "registeredStatus_confirmed": "Your registration is confirmed.",
  "completePayment": "Complete payment",
  "notOpenTitle": "Registration hasn't opened yet",
  "notOpenBody": "The link is right — registration opens soon. Check back later.",
  "closedTitle": "Registration has closed",
  "closedBody": "The registration deadline has passed. Ask your tournament organiser.",
  "fullTitle": "All spots are taken",
  "fullBody": "The tournament is full. Ask your tournament organiser — a spot may free up.",
  "profileSaveError": "We couldn't save your details. Check the phone number and level and try again.",
  "sessionError": "Something went wrong loading your profile.",
  "retry": "Try again",
  "errorRequired": "Required",
  "errorPhone": "That Israeli number doesn't look right",
  "errorLevel": "Pick a level"
}
```

- [ ] **Step 4: Run + commit**

```bash
npx vitest run src/i18n
git add src/i18n/locales/he.json src/i18n/locales/en.json src/i18n/locales/corporateKeys.test.ts
git commit -m "i18n(corporate): registration page copy in both locales, with a parity test"
```

---

### Task 11: `CorporateRegistrationPage` — the page and its states

**Files:**
- Replace: `src/pages/CorporateRegistrationPage.tsx` (the Task 3 stub)
- Test: `src/pages/CorporateRegistrationPage.test.tsx`

- [ ] **Step 1: Write the failing state tests**

Create `src/pages/CorporateRegistrationPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
import { AUTH_RETURN_KEY } from '@/lib/returnTo'
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
export const requireSignIn = vi.fn()
export const register = vi.fn(async () => {})
export const ensure = vi.fn(async () => {})
export const refetchOnboarding = vi.fn(async () => {})

export function gate(over: Record<string, unknown> = {}) {
  return {
    blocking: [], selectedIds: new Set<string>(), toggle: vi.fn(), isSatisfied: true,
    payload: [], outstanding: [], handleGateError: vi.fn(() => false), reset: vi.fn(), ...over,
  } as any
}
export function session(status: string, playerProfile: Record<string, unknown> | null = null) {
  return { status, playerProfile, onboardingStatus: null, refetchOnboarding, clearSession: vi.fn() } as any
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
    isLoading: false, isError: false,
  } as any
}
function Probe() {
  const [params] = useSearchParams()
  return <div data-testid="route-probe">{params.toString()}</div>
}
export function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/join/acme']}>
        <Routes>
          <Route path="/join/:slug" element={<CorporateRegistrationPage event={EVENT} />} />
          <Route path="/payment-method" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  Element.prototype.scrollIntoView = vi.fn()
  mockUseTournament.mockReturnValue(tr())
  mockUseAppSession.mockReturnValue(session('ready', { first_name: 'Dana', last_name: 'Cohen', contact_number: null, skill_level: null }))
  mockUseAuthGate.mockReturnValue({ requireSignIn })
  requireSignIn.mockResolvedValue(undefined)
  mockUseGate.mockReturnValue(gate())
  mockUseRegistration.mockReturnValue({ register, isRegistering: false, registerError: null, gateError: null, setRegisterError: vi.fn(), setGateError: vi.fn() } as any)
  mockUseEnsure.mockReturnValue({ ensure, status: 'ready', playerProfile: null, phoneLocked: false, levelLocked: false } as any)
})

describe('CorporateRegistrationPage — states', () => {
  it('shows the event hero from the config, not from the tournament', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Acme Padel Cup')
    expect(screen.getByText('Thursday, 20 August 2026')).toBeInTheDocument()
    expect(screen.getByText('Acme Ltd')).toBeInTheDocument()
  })

  it('renders a skeleton while the tournament loads', () => {
    mockUseTournament.mockReturnValue({ data: undefined, isLoading: true, isError: false } as any)
    renderPage()
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(document.querySelector('[data-testid="corporate-loading"]')).toBeInTheDocument()
  })

  it('renders the not-found card when the tournament cannot be loaded', () => {
    mockUseTournament.mockReturnValue({ data: null, isLoading: false, isError: true } as any)
    renderPage()
    expect(screen.getByText('Link not found')).toBeInTheDocument()
  })

  it('registered + confirmed → registered card with the partner name, no form', () => {
    mockUseTournament.mockReturnValue(tr({ my_registration: { id: 'r-1', status: 'confirmed', payment_status: 'completed', player_2_name: 'Yossi Levi' } }))
    renderPage()
    expect(screen.getByText(/you're in/i)).toBeInTheDocument()
    expect(screen.getByText('Yossi Levi')).toBeInTheDocument()
    expect(screen.getByText(/registration is confirmed/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /register & pay/i })).not.toBeInTheDocument()
  })

  it('registered but unpaid → "complete payment" resumes at /payment-method with return_to', () => {
    mockUseTournament.mockReturnValue(tr({ my_registration: { id: 'r-1', status: 'registered', payment_status: 'pending', guest_player_2_name: 'Guest Gal' } }))
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /complete payment/i }))
    expect(screen.getByTestId('route-probe').textContent).toBe('registration_id=r-1&tournament_id=t-1&return_to=%2Fjoin%2Facme')
  })

  it('approved (not yet open) → "opens soon" card, no button', () => {
    mockUseTournament.mockReturnValue(tr({ status: 'approved' }))
    renderPage()
    expect(screen.getByText(/hasn't opened yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('deadline passed → closed card', () => {
    mockUseTournament.mockReturnValue(tr({ registration_deadline: '2000-01-01' }))
    renderPage()
    expect(screen.getByText(/registration has closed/i)).toBeInTheDocument()
  })

  it('full → full card', () => {
    mockUseTournament.mockReturnValue(tr({ is_full: true }))
    renderPage()
    expect(screen.getByText(/all spots are taken/i)).toBeInTheDocument()
  })

  it('signed out → one CTA that stashes the return path and opens the sign-in gate', async () => {
    mockUseAppSession.mockReturnValue(session('signed_out'))
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /register for the tournament/i }))
    expect(sessionStorage.getItem(AUTH_RETURN_KEY)).toBe('/join/acme')
    expect(requireSignIn).toHaveBeenCalled()
    await waitFor(() => expect(refetchOnboarding).toHaveBeenCalled())
  })

  it('signed in → the registration form with the entry fee', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /register & pay/i })).toBeInTheDocument()
    expect(screen.getByText(/150/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/pages/CorporateRegistrationPage.test.tsx
```
Expected: FAIL — the stub renders none of this.

- [ ] **Step 3: Write the page**

Replace `src/pages/CorporateRegistrationPage.tsx` with:

```tsx
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, CreditCard, Info, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTournament } from '@/hooks/useTournament'
import { useAuthGate } from '@/hooks/useAuthGate'
import { useAppSession } from '@/hooks/useAppSession'
import { useRegistrationGate } from '@/features/screenMessages/hooks/useRegistrationGate'
import { ScreenMessageList } from '@/features/screenMessages/components/ScreenMessageList'
import { ScreenMessageModalHost } from '@/features/screenMessages/components/ScreenMessageModalHost'
import { PartnerSection } from '@/components/tournaments/PartnerSection'
import { useTournamentRegistration, type RegistrationGate } from '@/hooks/useTournamentRegistration'
import {
  useEnsureProfileEssentials, LEVEL_BANDS, bandForLevel,
} from '@/hooks/useEnsureProfileEssentials'
import { ctaFor } from '@/lib/tournamentCta'
import { isRegistrationOpen, formatCurrency } from '@/lib/tournamentHelpers'
import { stashAuthReturn } from '@/lib/returnTo'
import { EventHero } from '@/components/corporate/EventHero'
import { Field, inputClass } from '@/components/corporate/Field'
import { RallyWordmark } from '@/components/corporate/RallyWordmark'
import { AppDownloadFooter } from '@/components/corporate/AppDownloadFooter'
import { normalizeIsraeliLocal, isValidIsraeliLocal } from '@/components/corporate/phone'
import type { CorporateTournamentEvent } from '@/constants/corporateEvents'
import type { PartnerSelectionState } from '@/types/partner'
import type { MyRegistration, TournamentDetail } from '@/types/api'

// The only gate action web can reach — same constant TournamentDetailPage uses.
const REGISTRATION_GATE_ACTION = 'tournament_registration' as const

/**
 * Unlisted registration page for a closed corporate tournament: /join/<slug>
 * in tournament mode. Same brief as the lead page (no site nav, no app gate,
 * the client's hero) but every submission is a real tournament_registrations
 * row with a Grow pre-auth hold on it. Composes the pieces TournamentDetailPage
 * already runs: the sign-in gate, PartnerSection, the terms gate, the shared
 * register hook and the payment pages.
 */
export default function CorporateRegistrationPage({ event }: { event: CorporateTournamentEvent }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: tr, isLoading, isError } = useTournament(event.tournamentId)
  const { requireSignIn } = useAuthGate()
  const { status: sessionStatus, refetchOnboarding } = useAppSession()
  const gate = useRegistrationGate({ scope: 'tournament', id: tr?.id }, REGISTRATION_GATE_ACTION)
  const returnTo = `/join/${event.slug}`
  const registration = useTournamentRegistration(tr, gate, {
    returnTo,
    skipProfileRedirect: true,
    onTournamentFull: () => {
      void queryClient.invalidateQueries({ queryKey: ['tournament', event.tournamentId] })
    },
  })

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => {
      document.head.removeChild(meta)
    }
  }, [])

  const flatName = event.tournamentName.replace(/\s+/g, ' ').trim()
  useEffect(() => {
    const previous = document.title
    document.title = `${flatName} · ${event.company}`
    return () => {
      document.title = previous
    }
  }, [flatName, event.company])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-rally-bg">
        <EventHero event={event} />
        <section className="px-4 pt-6 pb-10">
          <div className="mx-auto w-full max-w-xl h-64 rounded-2xl bg-rally-surface animate-pulse" data-testid="corporate-loading" />
        </section>
      </main>
    )
  }

  if (isError || !tr) {
    return (
      <main className="min-h-screen bg-rally-bg flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <RallyWordmark className="mx-auto mb-8" />
          <h1 className="font-display text-2xl sm:text-3xl font-black text-rally-text mb-3">
            {t('corporate.notFoundTitle')}
          </h1>
          <p className="text-rally-text-2 leading-relaxed">{t('corporate.notFoundBody')}</p>
        </div>
      </main>
    )
  }

  const myReg = (tr.my_registration ?? null) as MyRegistration | null
  // The detail page's `isOpen` is deadline-only. This page also has to render an
  // `approved` (not yet open) tournament honestly — the link goes out before the
  // cron flips it — so the status is checked too when the API sends it.
  const open =
    isRegistrationOpen(tr.registration_deadline) &&
    (tr.status == null || tr.status === 'registration_open')
  const isFull = tr.is_full === true
  const cta = ctaFor({
    isOpen: open, isFull, waitlistEnabled: false, myWaitlistEntry: null, myRegistration: myReg,
  })

  let body: React.ReactNode
  if (cta === 'my_registration' && myReg) {
    body = <RegisteredCard tr={tr} myReg={myReg} returnTo={returnTo} />
  } else if (!open) {
    const notYet = tr.status === 'approved'
    body = (
      <InfoCard
        title={t(notYet ? 'corporate.reg.notOpenTitle' : 'corporate.reg.closedTitle')}
        body={t(notYet ? 'corporate.reg.notOpenBody' : 'corporate.reg.closedBody')}
      />
    )
  } else if (isFull) {
    body = <InfoCard title={t('corporate.reg.fullTitle')} body={t('corporate.reg.fullBody')} />
  } else if (sessionStatus === 'signed_out') {
    body = (
      <div className="rounded-2xl bg-rally-surface border border-rally-border p-6 sm:p-8 text-center shadow-lg">
        <p className="text-2xl font-black text-rally-accent mb-1">{formatCurrency(tr.entry_fee)}</p>
        <p className="text-sm text-rally-text-2 mb-6">{t('corporate.reg.priceLabel')}</p>
        <button
          type="button"
          onClick={() => {
            stashAuthReturn(returnTo)
            void requireSignIn()
              .then(() => refetchOnboarding())
              .catch(() => {
                // USER_CANCELLED or SUPERSEDED — stay on the page as-is.
              })
          }}
          className="w-full h-12 rounded-full bg-rally-accent text-rally-accent-text font-display font-bold text-base shadow-glow-electric hover:bg-rally-accent-hover transition-colors"
        >
          {t('corporate.reg.signInCta')}
        </button>
        <p className="text-xs text-rally-text-muted mt-3">{t('corporate.reg.signInHint')}</p>
      </div>
    )
  } else if (sessionStatus === 'loading') {
    body = <div className="h-64 rounded-2xl bg-rally-surface animate-pulse" data-testid="corporate-loading" />
  } else if (sessionStatus === 'profile_error') {
    body = (
      <InfoCard title={t('corporate.reg.sessionError')} body="">
        <button type="button" onClick={() => void refetchOnboarding()} className="mt-4 text-sm font-bold text-rally-accent">
          {t('corporate.reg.retry')}
        </button>
      </InfoCard>
    )
  } else {
    body = (
      <RegistrationForm
        tr={tr}
        gate={gate}
        register={registration.register}
        isRegistering={registration.isRegistering}
        registerError={registration.registerError}
        gateError={registration.gateError}
      />
    )
  }

  return (
    <main className="min-h-screen bg-rally-bg">
      <EventHero event={event} />
      <ScreenMessageList
        query={{ scope: 'tournament', id: tr.id }}
        className="container mx-auto px-4 max-w-xl mt-6"
        selection={{ action: REGISTRATION_GATE_ACTION, selectedIds: gate.selectedIds, onToggle: gate.toggle }}
      />
      <ScreenMessageModalHost
        query={{ scope: 'tournament', id: tr.id }}
        selection={{ action: REGISTRATION_GATE_ACTION, selectedIds: gate.selectedIds, onToggle: gate.toggle }}
      />
      <section className="relative px-4 pt-6 pb-10">
        <div className="mx-auto w-full max-w-xl">{body}</div>
      </section>
      <AppDownloadFooter />
    </main>
  )
}

function InfoCard({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-rally-surface border border-rally-border p-6 sm:p-8 text-center shadow-lg">
      <Info className="w-10 h-10 text-rally-accent mb-3 mx-auto" />
      <h2 className="font-display text-xl sm:text-2xl font-black text-rally-text mb-2">{title}</h2>
      {body && <p className="text-sm text-rally-text-2 leading-relaxed">{body}</p>}
      {children}
    </div>
  )
}

function RegisteredCard({ tr, myReg, returnTo }: { tr: TournamentDetail; myReg: MyRegistration; returnTo: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  // Same rule TournamentDetailPage uses for its "Pay now" bar.
  const payState =
    myReg.status === 'payment_pending' ||
    myReg.status === 'approved' ||
    (myReg.status === 'registered' &&
      myReg.payment_status !== 'payment_held' &&
      myReg.payment_status !== 'completed')
  const statusKey = payState
    ? 'corporate.reg.registeredStatus_pending'
    : myReg.payment_status === 'payment_held'
      ? 'corporate.reg.registeredStatus_held'
      : 'corporate.reg.registeredStatus_confirmed'
  const partner = myReg.player_2_name ?? myReg.guest_player_2_name ?? t('tournament.partnerSelf')

  return (
    <div className="rounded-2xl bg-rally-surface border border-rally-accent/40 p-6 sm:p-8 shadow-glow-electric text-center">
      <CheckCircle2 className="w-12 h-12 text-rally-accent mb-4 mx-auto" />
      <h2 className="font-display text-2xl sm:text-3xl font-black text-rally-text mb-3">
        {t('corporate.reg.registeredTitle')}
      </h2>
      <p className="inline-flex items-center gap-2 text-rally-text-2 text-sm mb-2">
        <Users className="w-4 h-4" />
        {t('corporate.reg.registeredPartner')} <span className="font-bold text-rally-text">{partner}</span>
      </p>
      <p className="text-sm text-rally-text-2 leading-relaxed">{t(statusKey)}</p>
      {payState && (
        <button
          type="button"
          onClick={() =>
            navigate(
              `/payment-method?${new URLSearchParams({
                registration_id: myReg.id,
                tournament_id: tr.id,
                return_to: returnTo,
              }).toString()}`,
            )
          }
          className="mt-6 w-full h-12 rounded-full bg-rally-accent text-rally-accent-text font-display font-bold inline-flex items-center justify-center gap-2 hover:bg-rally-accent-hover transition-colors"
        >
          <CreditCard className="w-4 h-4" />
          {t('corporate.reg.completePayment')}
        </button>
      )}
    </div>
  )
}

interface RegistrationFormProps {
  tr: TournamentDetail
  gate: RegistrationGate
  register: (partnerState: PartnerSelectionState) => Promise<void>
  isRegistering: boolean
  registerError: string | null
  gateError: string | null
}

function RegistrationForm({ tr, gate, register, isRegistering, registerError, gateError }: RegistrationFormProps) {
  const { t } = useTranslation()
  const { ensure, playerProfile, phoneLocked, levelLocked } = useEnsureProfileEssentials()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [level, setLevel] = useState<number | null>(null)
  const [partnerState, setPartnerState] = useState<PartnerSelectionState>({ phase: 'idle' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [profileError, setProfileError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Prefill once the profile lands; a stored phone/level is shown, never edited.
  useEffect(() => {
    if (!playerProfile) return
    setFirstName((v) => v || playerProfile.first_name || '')
    setLastName((v) => v || playerProfile.last_name || '')
    if (playerProfile.contact_number) setPhone(normalizeIsraeliLocal(playerProfile.contact_number))
    if (playerProfile.skill_level != null) setLevel(playerProfile.skill_level)
  }, [playerProfile])

  const needsPartner = tr.format === 'doubles' || tr.format === 'mixed'
  const partnerRequired = needsPartner && partnerState.phase === 'idle'
  const busy = saving || isRegistering

  const validate = () => {
    const next: Record<string, string> = {}
    if (!firstName.trim()) next.firstName = t('corporate.reg.errorRequired')
    if (!lastName.trim()) next.lastName = t('corporate.reg.errorRequired')
    if (!phoneLocked) {
      if (!phone) next.phone = t('corporate.reg.errorRequired')
      else if (!isValidIsraeliLocal(phone)) next.phone = t('corporate.reg.errorPhone')
    }
    if (!levelLocked && level == null) next.level = t('corporate.reg.errorLevel')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    if (partnerRequired) {
      document.getElementById('partner-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    // An unsatisfied gate scrolls to the blocking card instead of submitting
    // (product decision 2026-08-29, mirrored from TournamentDetailPage).
    if (!gate.isSatisfied) {
      const first = gate.blocking[0]
      if (first) {
        document.getElementById(`screen-message-${first.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }
    setProfileError(null)
    setSaving(true)
    try {
      await ensure({ firstName: firstName.trim(), lastName: lastName.trim(), phone, skillLevel: level })
    } catch {
      setProfileError(t('corporate.reg.profileSaveError'))
      setSaving(false)
      return
    }
    setSaving(false)
    await register(partnerState)
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={t('corporate.reg.formTitle')}
      className="rounded-2xl bg-rally-surface border border-rally-border p-5 sm:p-7 shadow-lg"
    >
      <h2 className="font-display text-xl sm:text-2xl font-black text-rally-text mb-6">
        {t('corporate.reg.formTitle')}
      </h2>

      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('corporate.reg.firstName')} error={errors.firstName} htmlFor="cr-first">
            <input id="cr-first" type="text" autoComplete="given-name" value={firstName}
              onChange={(e) => setFirstName(e.target.value)} className={inputClass(!!errors.firstName)} />
          </Field>
          <Field label={t('corporate.reg.lastName')} error={errors.lastName} htmlFor="cr-last">
            <input id="cr-last" type="text" autoComplete="family-name" value={lastName}
              onChange={(e) => setLastName(e.target.value)} className={inputClass(!!errors.lastName)} />
          </Field>
        </div>

        <Field
          label={t('corporate.reg.phone')}
          error={errors.phone}
          hint={phoneLocked ? t('corporate.reg.phoneLocked') : t('corporate.phoneHint')}
          htmlFor="cr-phone"
        >
          {phoneLocked ? (
            <p id="cr-phone" dir="ltr" className="rounded-md bg-rally-surface-2 border border-rally-border px-3 py-3 text-rally-text text-start">
              +972 {phone}
            </p>
          ) : (
            <div
              dir="ltr"
              className={cn(
                'flex items-stretch rounded-md overflow-hidden border bg-rally-surface-2 transition-colors',
                'focus-within:border-rally-accent focus-within:ring-4 focus-within:ring-rally-accent-dim',
                errors.phone ? 'border-rally-error' : 'border-rally-border',
              )}
            >
              <span className="flex items-center px-3 font-display font-bold text-rally-text-2 bg-white/[0.04] border-e border-rally-border select-none">
                +972
              </span>
              <input id="cr-phone" type="tel" inputMode="numeric" autoComplete="tel-national" value={phone}
                onChange={(e) => setPhone(normalizeIsraeliLocal(e.target.value))}
                placeholder={t('corporate.phonePlaceholder')}
                className="flex-1 min-w-0 bg-transparent px-3 py-3 text-rally-text placeholder:text-rally-text-muted focus:outline-none" />
            </div>
          )}
        </Field>

        <fieldset>
          <legend className="block font-display font-bold text-sm text-rally-text mb-2">
            {t('corporate.reg.level')}
          </legend>
          {levelLocked && level != null ? (
            <p className="rounded-md bg-rally-surface-2 border border-rally-border px-3 py-3 text-rally-text">
              {t(`corporate.reg.level_${bandForLevel(level).key}`)}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LEVEL_BANDS.map((band) => (
                <label
                  key={band.key}
                  className={cn(
                    'cursor-pointer rounded-md border px-3 py-3 text-center text-sm font-bold transition-colors',
                    level === band.value
                      ? 'border-rally-accent bg-rally-accent/10 text-rally-accent'
                      : 'border-rally-border bg-rally-surface-2 text-rally-text hover:border-rally-border-strong',
                  )}
                >
                  <input type="radio" name="cr-level" value={band.value} checked={level === band.value}
                    onChange={() => setLevel(band.value)} className="sr-only" />
                  {t(`corporate.reg.level_${band.key}`)}
                </label>
              ))}
            </div>
          )}
          <p className="text-xs mt-1.5 leading-relaxed text-rally-text-muted">
            {errors.level ? <span className="text-rally-error">{errors.level}</span>
              : levelLocked ? t('corporate.reg.levelLocked') : t('corporate.reg.levelHint')}
          </p>
        </fieldset>

        {needsPartner && (
          <section id="partner-section">
            <h3 className="font-display font-bold text-sm text-rally-text mb-2">{t('corporate.reg.partnerTitle')}</h3>
            {partnerState.phase === 'idle' && (
              <p className="text-xs text-rally-accent font-semibold mb-3">{t('corporate.reg.partnerRequiredHint')}</p>
            )}
            <PartnerSection selectionState={partnerState} onPartnerChange={setPartnerState} />
          </section>
        )}
      </div>

      <div className="mt-7 rounded-xl bg-rally-surface-2 border border-rally-border px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-rally-text-muted">{t('corporate.reg.priceLabel')}</p>
          <p className="text-2xl font-black text-rally-accent">{formatCurrency(tr.entry_fee)}</p>
        </div>
        <CreditCard className="w-6 h-6 text-rally-text-muted shrink-0" />
      </div>
      <p className="text-xs text-rally-text-muted mt-2 leading-relaxed">{t('corporate.reg.holdNote')}</p>

      <button
        type="submit"
        disabled={busy}
        aria-describedby={gateError ? 'registration-gate-reason' : undefined}
        className="mt-5 w-full h-12 rounded-full bg-rally-accent text-rally-accent-text font-display font-bold text-base shadow-glow-electric hover:bg-rally-accent-hover disabled:opacity-50 transition-colors"
      >
        {busy ? t('corporate.reg.submitting') : partnerRequired ? t('tournament.ctaMissingPartner') : t('corporate.reg.submitCta')}
      </button>

      {gateError && (
        <p id="registration-gate-reason" aria-live="polite" className="mt-2 text-sm text-rally-error text-center">{gateError}</p>
      )}
      {profileError && <p role="alert" className="mt-2 text-sm text-rally-error text-center">{profileError}</p>}
      {registerError && <p role="alert" className="mt-2 text-sm text-rally-error text-center">{registerError}</p>}

      <p className="text-xs text-rally-text-muted text-center mt-3 leading-relaxed">{t('corporate.consent')}</p>
    </form>
  )
}
```

- [ ] **Step 4: Run the state tests + typecheck + lint**

```bash
npx vitest run src/pages/CorporateRegistrationPage.test.tsx src/pages/CorporateEventPage.test.tsx
npx tsc -b && npx eslint src/pages/CorporateRegistrationPage.tsx
```
Expected: all PASS; clean. If `MyRegistration`'s `status`/`payment_status` typing disagrees with the literals used, widen with `as string` locally rather than changing the shared type.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CorporateRegistrationPage.tsx src/pages/CorporateRegistrationPage.test.tsx
git commit -m "feat(corporate-events): CorporateRegistrationPage — states and the registration form"
```

---

### Task 12: The form's behaviour — prefill, locks, validation, submit order

**Files:**
- Test: `src/pages/CorporateRegistrationPage.form.test.tsx`

- [ ] **Step 1: Write the tests**

Create `src/pages/CorporateRegistrationPage.form.test.tsx` (re-uses the exported harness from the states file):

```tsx
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  renderPage, tr, session, gate, mockUseTournament, mockUseAppSession, mockUseGate, mockUseEnsure,
  mockUseRegistration, ensure, register,
} from './CorporateRegistrationPage.test'

describe('CorporateRegistrationPage — form', () => {
  it('prefills names from the profile and shows a stored phone + level read-only', () => {
    mockUseAppSession.mockReturnValue(session('ready', { first_name: 'Dana', last_name: 'Cohen', contact_number: '0501234567', skill_level: 4.6 }))
    mockUseEnsure.mockReturnValue({ ensure, status: 'ready', playerProfile: { first_name: 'Dana', last_name: 'Cohen', contact_number: '0501234567', skill_level: 4.6 }, phoneLocked: true, levelLocked: true } as any)
    renderPage()
    expect(screen.getByLabelText('First name')).toHaveValue('Dana')
    expect(screen.getByLabelText('Last name')).toHaveValue('Cohen')
    expect(screen.queryByRole('textbox', { name: 'Mobile number' })).not.toBeInTheDocument()
    expect(screen.getByText('+972 501234567')).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.getByText('Advanced')).toBeInTheDocument()
    expect(screen.getByText(/your level on rally/i)).toBeInTheDocument()
  })

  it('blocks submit and flags every empty required field for a new account', async () => {
    mockUseAppSession.mockReturnValue(session('profile_incomplete'))
    mockUseEnsure.mockReturnValue({ ensure, status: 'profile_incomplete', playerProfile: null, phoneLocked: false, levelLocked: false } as any)
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /register & pay/i }))
    expect(screen.getAllByText('Required').length).toBeGreaterThanOrEqual(3)
    expect(screen.getByText('Pick a level')).toBeInTheDocument()
    expect(ensure).not.toHaveBeenCalled()
    expect(register).not.toHaveBeenCalled()
  })

  it('singles + valid details → ensure(profile) THEN register(no partner)', async () => {
    const user = userEvent.setup()
    mockUseAppSession.mockReturnValue(session('profile_incomplete'))
    mockUseEnsure.mockReturnValue({ ensure, status: 'profile_incomplete', playerProfile: null, phoneLocked: false, levelLocked: false } as any)
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    renderPage()
    await user.type(screen.getByLabelText('First name'), 'Dana')
    await user.type(screen.getByLabelText('Last name'), 'Cohen')
    await user.type(screen.getByLabelText('Mobile number'), '050-123-4567')
    await user.click(screen.getByLabelText('Intermediate'))
    await user.click(screen.getByRole('button', { name: /register & pay/i }))
    await waitFor(() => expect(register).toHaveBeenCalledWith({ phase: 'idle' }))
    expect(ensure).toHaveBeenCalledWith({ firstName: 'Dana', lastName: 'Cohen', phone: '501234567', skillLevel: 3.25 })
    expect(ensure.mock.invocationCallOrder[0]).toBeLessThan(register.mock.invocationCallOrder[0])
  })

  it('doubles with no partner → scrolls to the partner block, no writes', async () => {
    const user = userEvent.setup()
    renderPage()  // default: ready, doubles, names prefilled
    await user.type(screen.getByLabelText('Mobile number'), '0501234567')
    await user.click(screen.getByLabelText('Beginner'))
    await user.click(screen.getByRole('button', { name: /partner/i }))
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    expect(ensure).not.toHaveBeenCalled()
    expect(register).not.toHaveBeenCalled()
  })

  it('an unsatisfied terms gate scrolls to the blocking card and never writes', async () => {
    const user = userEvent.setup()
    mockUseGate.mockReturnValue(gate({ isSatisfied: false, blocking: [{ id: 'm-1' }] }))
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    renderPage()
    await user.type(screen.getByLabelText('Mobile number'), '0501234567')
    await user.click(screen.getByLabelText('Pro'))
    await user.click(screen.getByRole('button', { name: /register & pay/i }))
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    expect(ensure).not.toHaveBeenCalled()
  })

  it('a failed profile write shows the profile error and never registers', async () => {
    const user = userEvent.setup()
    ensure.mockRejectedValueOnce(new Error('nope'))
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    renderPage()
    await user.type(screen.getByLabelText('Mobile number'), '0501234567')
    await user.click(screen.getByLabelText('Advanced'))
    await user.click(screen.getByRole('button', { name: /register & pay/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't save your details/i)
    expect(register).not.toHaveBeenCalled()
  })

  it('renders the hook\'s errors next to the button', () => {
    mockUseRegistration.mockReturnValue({ register, isRegistering: false, registerError: 'Already registered', gateError: 'Accept the terms', setRegisterError: vi.fn(), setGateError: vi.fn() } as any)
    renderPage()
    expect(screen.getByText('Already registered')).toBeInTheDocument()
    expect(screen.getByText('Accept the terms')).toBeInTheDocument()
  })

  it('picking a searched partner enables a real doubles registration', async () => {
    const user = userEvent.setup()
    const { usePlayerSearch } = await import('@/hooks/usePlayerSearch')
    vi.mocked(usePlayerSearch).mockReturnValue({ results: [{ id: 'p-2', first_name: 'Yossi', last_name: 'Levi', avatar_url: null }], isLoading: false, isActive: true } as any)
    renderPage()
    await user.type(screen.getByLabelText('Mobile number'), '0501234567')
    await user.click(screen.getByLabelText('Beginner'))
    await user.click(screen.getByText('Yossi Levi'))
    await user.click(screen.getByRole('button', { name: /register & pay/i }))
    await waitFor(() => expect(register).toHaveBeenCalled())
    expect(register.mock.calls[0][0]).toMatchObject({ phase: 'selected', partner: { type: 'existing', id: 'p-2' } })
  })
})
```

The searched-partner test depends on `PartnerSection`'s search box markup: read `src/components/tournaments/PartnerSection.tsx` for the input's label/placeholder and the result row's text before running it, and adjust the two `getBy*` queries to what it actually renders (its own test file, `PartnerSection.test.tsx`, shows the working queries). The assertion — `register` receives the selected existing partner — is the contract.

- [ ] **Step 2: Run the tests**

```bash
npx vitest run src/pages/CorporateRegistrationPage.form.test.tsx src/pages/CorporateRegistrationPage.test.tsx
```
Expected: all PASS. Fix the page, not the assertions, for any behavioural failure; fix only query selectors for the PartnerSection-dependent test.

- [ ] **Step 3: Commit**

```bash
git add src/pages/CorporateRegistrationPage.form.test.tsx
git commit -m "test(corporate-events): prefill, locks, validation and submit order on the registration form"
```

---

### Task 13: Whole-repo gate — lint, typecheck, build, full test run

**Files:** none new

- [ ] **Step 1: Run everything**

```bash
npm run lint
npx tsc -b
npm run build
npm test -- --reporter=dot 2>&1 | tail -8
```
Expected: lint clean, `tsc` clean, build succeeds, vitest all green with count ≥ the Task 0 baseline + the new tests. Fix anything that fails in the code it points at; do not skip or delete a test.

- [ ] **Step 2: Review the branch**

```bash
git log --oneline origin/main..HEAD
git diff --stat origin/main..HEAD
```
Expected: 13 commits, one per task; no changes outside the file map in the spec's §9 apart from test files and the two locale files.

- [ ] **Step 3: Hand back to the orchestrator**

Report the commit list and the final test count. The browser E2E (spec §7) is run by the orchestrator against the local dev stack, not by a subagent: it needs the dev tournament (`registration_open`, `is_unlisted`, `doubles`, an `entry_fee`), a `tournament`-mode `CorporateEvent` entry pointing at its id, rally-api running with `NOTIFICATIONS_SINK=capture`, and Chrome.

---

## Self-review against the spec (§5)

- 5.1 config union → T1 ✓ (`api/join-og.ts`, `vercel.json` unchanged)
- 5.2 dispatcher / component move / hook extraction → T3, T2, T4 ✓
- 5.3 page states (not found / registered / pending-payment / not open / full / signed-out / form) → T11 ✓
- 5.4 the form (details, partner, terms, price, submit; scroll-to-partner, scroll-to-gate) → T11 + T12 ✓
- 5.5 profile essentials rule (POST vs PATCH, phone/level protected, names editable) → T9 ✓
- 5.6 return path (stash before gate → T11; `?next=` → T8) ✓
- 5.7 `return_to` through pendingPayment / method / return / confirming → T5 ✓
- 5.8 interceptor opt-out → T6 (+ hook passes it, T4) ✓
- 5.9 errors (two texts → T7; TOURNAMENT_FULL → T4/T11; profile/network inline → T11) ✓
- 5.10 i18n both locales + parity test → T10 ✓
- §7 E2E → orchestrator, after T13

**Type consistency:** `useTournamentRegistration(tournament, gate, options)` returns `{ register, isRegistering, registerError, gateError, setRegisterError, setGateError }` (T4) and is consumed with exactly those names in T11. `useEnsureProfileEssentials()` returns `{ ensure, status, playerProfile, phoneLocked, levelLocked }` (T9), consumed in T11. `RegisterCallOptions.skipProfileRedirect` (T4) ↔ `AxiosRequestConfig.skipProfileRedirect` (T6). `PendingPayment.returnTo` (T5) read in `PaymentReturnPage` (T5). `AUTH_RETURN_KEY`/`stashAuthReturn`/`sanitizeReturnTo`/`readAuthReturn`/`buildAuthCallbackUrl` (T5) used in T8 and T11.
