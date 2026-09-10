# Onboarding Details Step Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every sign-up, and every sign-in with a required detail missing, goes through one details step (name, OTP-verified phone, explicitly chosen skill level) before landing where the player was going; the skill slider has no default and carries a note about choosing the real level.

**Architecture:** A single session-level gate in `AppSessionContext` computes `needsDetails` from `onboarding-status` and redirects settled sessions to `/profile/edit?purpose=onboarding&returnTo=…` unless the route is exempt (`/join/*` collects details inline). `EditProfilePage`'s tournament-only required mode becomes a generic `detailsMode` (`purpose=onboarding|tournament`, copy differs). `SkillLevelSlider` accepts `null` and renders an empty state plus the note. The API is untouched.

**Tech Stack:** React 18, TypeScript, react-router v6, @tanstack/react-query, react-hook-form + zod, react-i18next, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-09-onboarding-details-step-design.md` (approved 2026-09-09).

**Base:** `feat/corporate-tournament-registration` AFTER the merge of `fix/tournament-auth-flow` lands (the merge commit + reconciliation commits). Do not start Task 6 before reading the merged `TournamentDetailPage.tsx`.

## Global Constraints

- Copy is exactly the spec's table (he/en). `corporateKeys.test.ts` and any he/en parity test stay green.
- No default skill level anywhere on the web: `SKILL_DEFAULT` is only `clampSkill`'s NaN fallback.
- `CorporateRegistrationPage` behaviour is unchanged; its existing tests pass unchanged.
- The gate never fires while `status` is `loading`, `signed_out` or `profile_error`, never on exempt routes, and never loops on `/profile/edit`.
- Outside details mode `EditProfilePage` remains the permissive editor (existing permissive tests pass unchanged).
- `src/constants/corporateEvents.ts` is intentionally dirty in the working tree — never stage it. Stage by explicit path; no `git add -A` / `-a`.
- Every commit ends with the two trailer lines:
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and
  `Claude-Session: https://claude.ai/code/session_01GHhmJYeuaaaU3hfxiQ9Wu8`.
- Run the targeted test files after each task, and `npx vitest run` + `npx tsc -b --noEmit` before each commit.

## File Structure

| File | Responsibility |
|---|---|
| `src/i18n/locales/{he,en}.json` | New `edit_profile.*` keys; `confirmSkill` removed |
| `src/lib/skillLevel.ts` | unchanged (`SKILL_DEFAULT` stays for `clampSkill`) |
| `src/lib/editProfileSchema.ts` | `skill_level` nullable |
| `src/components/profile/SkillLevelSlider.tsx` (+test) | `value: number \| null`, empty state, note |
| `src/lib/onboardingGate.ts` (+test) — NEW | `REQUIRED_STEPS`, `computeNeedsDetails`, `isOnboardingGateExempt` (pure, testable without React) |
| `src/contexts/AppSessionContext.tsx` (+ NEW test) | exposes `needsDetails`; the gate effect; bridge purpose |
| `src/pages/EditProfilePage.tsx` (+test) | `detailsMode`, copy per purpose, required skill, no checkbox, sign-out link, analytics |
| `src/pages/TournamentDetailPage.tsx` (+tests) | reads `needsDetails` from context |
| `src/lib/analytics.ts` | two new funnel event names |

---

### Task 1: Locale keys

**Files:**
- Modify: `src/i18n/locales/he.json` (`edit_profile` object), `src/i18n/locales/en.json` (`edit_profile` object)
- Test: existing `src/i18n/locales/corporateKeys.test.ts` (unchanged) + any existing he/en parity test

- [ ] **Step 1: Add the keys, remove `confirmSkill`**

he `edit_profile`:
```json
"onboardingTitle": "עוד רגע ואתם בפנים",
"onboardingSubtitle": "שם, טלפון מאומת ורמת משחק — ואפשר להתחיל.",
"requiredNote": "טלפון מאומת ורמת משחק הם שדות חובה: המספר מאפשר למארגנים ולשותפים ליצור איתכם קשר, והרמה קובעת מול מי תשחקו.",
"continue": "המשך",
"skillEmpty": "הזיזו את הסליידר כדי לבחור את הרמה שלכם",
"skillNote": "בחרו את הרמה האמיתית שלכם. הרמה קובעת מול מי תשחקו ואיך ידורגו המשחקים שלכם. רמה לא מדויקת פוגעת בכם ובשחקנים שאיתכם.",
"notYou": "לא החשבון שלכם? התנתקו",
"missingNotice": "לפני שממשיכים נשארו: {{fields}}",
"missing": { "name": "שם מלא", "phone": "טלפון מאומת", "level": "רמת משחק" }
```
he `edit_profile.validation`: `"skillRequired": "חובה לבחור רמת משחק"`.

en `edit_profile`:
```json
"onboardingTitle": "Almost in",
"onboardingSubtitle": "Your name, a verified phone and your level, and you're set.",
"requiredNote": "A verified phone and a skill level are required: the number lets organisers and partners reach you, and the level decides who you play with.",
"continue": "Continue",
"skillEmpty": "Slide to choose your level",
"skillNote": "Pick your real level. It decides who you're matched with and how your games are rated. An inaccurate level hurts you and the players around you.",
"notYou": "Not your account? Sign out",
"missingNotice": "Before you continue we still need: {{fields}}",
"missing": { "name": "full name", "phone": "a verified phone", "level": "your skill level" }
```
en `edit_profile.validation`: `"skillRequired": "Choose your skill level"`.

Delete `edit_profile.confirmSkill` from both files (grep `confirmSkill` in `src/` afterwards: the only remaining hits must be in `EditProfilePage.tsx` / its test, which Task 5 removes).

- [ ] **Step 2: Run** `npx vitest run src/i18n` — expected: all pass.
- [ ] **Step 3: Commit** `i18n(profile): onboarding details step copy`

---

### Task 2: `SkillLevelSlider` accepts `null`, renders an empty state and the note

**Files:**
- Modify: `src/components/profile/SkillLevelSlider.tsx`
- Test: `src/components/profile/SkillLevelSlider.test.tsx`

- [ ] **Step 1: Write the failing tests** (append to the existing `describe`)

```tsx
  it('renders the empty state and the note when value is null', () => {
    render(<SkillLevelSlider value={null} onChange={() => {}} />)
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    expect(input.value).toBe('')
    expect(screen.getByText(/slide to choose your level/i)).toBeInTheDocument()
    expect(screen.getByRole('slider')).toHaveAttribute('data-empty', 'true')
    expect(screen.getByText(/pick your real level/i)).toBeInTheDocument()
  })

  it('the first slider move sets a snapped value and clears the empty state', () => {
    const onChange = vi.fn()
    render(<SkillLevelSlider value={null} onChange={onChange} />)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '4.3' } })
    expect(onChange).toHaveBeenCalledWith(4.5)
  })

  it('typing a number while empty sets a value', () => {
    const onChange = vi.fn()
    render(<SkillLevelSlider value={null} onChange={onChange} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } })
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('shows the note under a set value too', () => {
    render(<SkillLevelSlider value={3} onChange={() => {}} />)
    expect(screen.getByText(/pick your real level/i)).toBeInTheDocument()
    expect(screen.queryByText(/slide to choose your level/i)).not.toBeInTheDocument()
    expect(screen.getByRole('slider')).toHaveAttribute('data-empty', 'false')
  })
```

- [ ] **Step 2: Run** `npx vitest run src/components/profile/SkillLevelSlider.test.tsx` — expected: the 4 new tests FAIL (type error on `null`, missing texts).

- [ ] **Step 3: Implement**

```tsx
import { useEffect, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { SKILL_MIN, SKILL_MAX, SKILL_STEP, clampSkill } from '@/lib/skillLevel'
import { useRtl } from '@/hooks/useRtl'

interface Props {
  /** null = the player has not chosen yet (no default is ever shown). */
  value: number | null
  onChange: (next: number) => void
}

const TICKS = Array.from({ length: SKILL_MAX - SKILL_MIN + 1 }, (_, i) => SKILL_MIN + i)
const MIDPOINT = clampSkill((SKILL_MIN + SKILL_MAX) / 2)

export function SkillLevelSlider({ value, onChange }: Props) {
  const { t } = useTranslation()
  const { dir } = useRtl()
  const isEmpty = value == null
  const [text, setText] = useState(isEmpty ? '' : value.toFixed(1))

  useEffect(() => {
    setText(value == null ? '' : value.toFixed(1))
  }, [value])

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(clampSkill(parseFloat(e.target.value)))
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value)
    const parsed = parseFloat(e.target.value)
    if (!Number.isNaN(parsed) && parsed >= SKILL_MIN && parsed <= SKILL_MAX) {
      onChange(clampSkill(parsed))
    }
  }

  const handleTextBlur = () => {
    const parsed = parseFloat(text)
    if (Number.isNaN(parsed)) {
      setText(value == null ? '' : value.toFixed(1))
      return
    }
    const next = clampSkill(parsed)
    setText(next.toFixed(1))
    if (next !== value) onChange(next)
  }

  const shown = value ?? MIDPOINT
  const fillPct = isEmpty ? '0%' : `${((shown - SKILL_MIN) / (SKILL_MAX - SKILL_MIN)) * 100}%`

  return (
    <div className="w-full">
      <div className="flex items-center justify-center mb-6">
        <input
          type="number"
          inputMode="decimal"
          min={SKILL_MIN}
          max={SKILL_MAX}
          step={SKILL_STEP}
          value={text}
          placeholder="—"
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          id="skill-level-value"
          aria-label="skill level"
          className="w-[150px] bg-transparent text-rally-accent font-black text-[72px] leading-none text-center tabular-nums focus:outline-none placeholder:text-rally-text-muted [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>

      {isEmpty && (
        <p className="mb-2 text-center text-sm font-semibold text-rally-accent">{t('edit_profile.skillEmpty')}</p>
      )}

      <input
        type="range"
        min={SKILL_MIN}
        max={SKILL_MAX}
        step={SKILL_STEP}
        value={shown}
        onChange={handleRangeChange}
        dir={dir}
        data-empty={isEmpty ? 'true' : 'false'}
        aria-controls="skill-level-value"
        aria-valuetext={isEmpty ? t('edit_profile.skillEmpty') : shown.toFixed(1)}
        className="skill-slider data-[empty=true]:opacity-60"
        style={{ '--skill-fill-pct': fillPct } as CSSProperties}
        aria-label="skill level slider"
      />

      <div className="flex justify-between mt-2 px-0">
        {TICKS.map((tick) => (
          <span key={tick} className="text-[10px] font-bold text-rally-text-muted tabular-nums">
            {tick.toFixed(1)}
          </span>
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-rally-text-2">{t('edit_profile.skillNote')}</p>
    </div>
  )
}
```

Note: the `.skill-slider` CSS (in `src/index.css` / `src/App.css`) paints the fill from `--skill-fill-pct`; `0%` plus the opacity utility is the empty look — no CSS change needed unless the thumb colour must also dim (optional: `.skill-slider[data-empty='true']::-webkit-slider-thumb { background: var(--rally-text-muted) }`, same for `::-moz-range-thumb`).

- [ ] **Step 4: Run** the slider tests — expected: all 9 pass. Run `npx tsc -b --noEmit` — expected: errors ONLY in `EditProfilePage.tsx` (`value={field.value ?? SKILL_DEFAULT}` still compiles; the errors, if any, come from callers passing `number` where `null` is now allowed — none expected). If tsc is clean, fine.
- [ ] **Step 5: Commit** `feat(profile): skill slider empty state and honest-level note`

---

### Task 3: Form schema allows a missing level; `normalizeSkillLevel`

**Files:**
- Modify: `src/lib/editProfileSchema.ts`, `src/lib/skillLevel.ts`, `src/hooks/useEnsureProfileEssentials.ts`
- Test: `src/lib/skillLevel.test.ts` (create if absent), `src/hooks/useEnsureProfileEssentials.test.tsx` (existing)

Why: the mobile app's complete-profile screen writes `skill_level: 0` and the API's
`missing_steps` treats 0 as missing. The web must read anything below `SKILL_MIN` as "not
chosen", or a mobile-created account gets an enabled Continue with "0.0" on the slider, the
patch skips the level, and the after-save check loops on "still missing" forever.

- [ ] **Step 1: Failing tests.** `src/lib/skillLevel.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { normalizeSkillLevel } from './skillLevel'

describe('normalizeSkillLevel', () => {
  it.each([null, undefined, 0, 0.5, -1, NaN])('reads %s as not chosen', (v) => {
    expect(normalizeSkillLevel(v as number | null | undefined)).toBeNull()
  })
  it('passes real levels through, snapped to the step', () => {
    expect(normalizeSkillLevel(1)).toBe(1)
    expect(normalizeSkillLevel(3.3)).toBe(3.5)
    expect(normalizeSkillLevel(7)).toBe(7)
    expect(normalizeSkillLevel(9)).toBe(7)
  })
})
```
In `useEnsureProfileEssentials.test.tsx` add one case: a session whose `playerProfile.skill_level` is `0` reports `levelLocked === false` (and `ensure({ skillLevel: 3.25 })` patches `skill_level`).

- [ ] **Step 2: Implement.** `src/lib/skillLevel.ts`, append:
```ts
/** A stored level below SKILL_MIN (mobile writes 0 at complete-profile) means "not chosen". */
export function normalizeSkillLevel(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value) || value < SKILL_MIN) return null
  return clampSkill(value)
}
```
`src/lib/editProfileSchema.ts`: `skill_level: z.number().min(SKILL_MIN).max(SKILL_MAX).nullable().optional(),`
`src/hooks/useEnsureProfileEssentials.ts`: `const levelLocked = normalizeSkillLevel(playerProfile?.skill_level) != null` and in `ensure()` the patch condition `if (normalizeSkillLevel(playerProfile?.skill_level) == null && input.skillLevel != null)`.

- [ ] **Step 3:** `npx vitest run src/lib/skillLevel.test.ts src/hooks/useEnsureProfileEssentials.test.tsx src/pages/CorporateRegistrationPage.test.tsx src/pages/CorporateRegistrationPage.form.test.tsx` → green; `npx tsc -b --noEmit` → clean.
- [ ] **Step 4: Commit** `refactor(profile): a stored level below 1.0 reads as not chosen`

---

### Task 4: `needsDetails` + the session-level onboarding gate

**Files:**
- Create: `src/lib/onboardingGate.ts`, `src/lib/onboardingGate.test.ts`
- Modify: `src/contexts/AppSessionContext.tsx`
- Create: `src/contexts/AppSessionContext.test.tsx`

- [ ] **Step 1: Pure helpers + failing tests**

`src/lib/onboardingGate.ts`:
```ts
import type { OnboardingStatus } from '@/types/api'

/** The onboarding-status steps a player must have before using the site. */
export const REQUIRED_STEPS = ['first_name', 'contact_number', 'skill_level'] as const

export function computeNeedsDetails(status: OnboardingStatus | null): boolean {
  if (!status) return false
  if (!status.has_player_profile) return true
  return status.missing_steps.some((step) => (REQUIRED_STEPS as readonly string[]).includes(step))
}

// Routes that either ARE the details step, are part of authentication, collect the
// details themselves (/join/*), are mid-payment, or are legal pages a player may need
// to read before finishing.
const EXEMPT = [
  /^\/profile\/edit$/,
  /^\/auth(\/|$)/,
  /^\/login(\/|$)/,
  /^\/set-password(\/|$)/,
  /^\/join(\/|$)/,
  /^\/payment-method$/,
  /^\/payments(\/|$)/,
  /^\/terms$/,
  /^\/privacy$/,
]

export function isOnboardingGateExempt(pathname: string): boolean {
  return EXEMPT.some((re) => re.test(pathname))
}
```

`src/lib/onboardingGate.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { computeNeedsDetails, isOnboardingGateExempt } from './onboardingGate'

const base = { is_authenticated: true, has_player_profile: true, completion_percent: 100, completed_steps: [], missing_steps: [] as string[] }

describe('computeNeedsDetails', () => {
  it('is false with no status yet', () => expect(computeNeedsDetails(null)).toBe(false))
  it('is true without a player profile', () => expect(computeNeedsDetails({ ...base, has_player_profile: false })).toBe(true))
  it('is true when a required step is missing', () => {
    expect(computeNeedsDetails({ ...base, missing_steps: ['skill_level'] })).toBe(true)
    expect(computeNeedsDetails({ ...base, missing_steps: ['contact_number'] })).toBe(true)
    expect(computeNeedsDetails({ ...base, missing_steps: ['first_name'] })).toBe(true)
  })
  it('ignores non-required steps', () => expect(computeNeedsDetails({ ...base, missing_steps: ['player_profile_photo'] })).toBe(false))
})

describe('isOnboardingGateExempt', () => {
  it.each(['/profile/edit', '/auth/callback', '/login', '/set-password', '/join/acme', '/payment-method', '/payments/return', '/terms', '/privacy'])('exempts %s', (p) => {
    expect(isOnboardingGateExempt(p)).toBe(true)
  })
  it.each(['/', '/tournaments', '/tournaments/t-1', '/clubs/c-1', '/my-activity', '/profile/edit/extra', '/joined'])('gates %s', (p) => {
    expect(isOnboardingGateExempt(p)).toBe(false)
  })
})
```
Run: `npx vitest run src/lib/onboardingGate.test.ts` — expected: FAIL (module missing) → create the module → PASS.

- [ ] **Step 2: Failing provider test** — `src/contexts/AppSessionContext.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
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
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toMatch(/\|profile_incomplete\|true$/))
    expect(screen.getByTestId('probe').textContent!.startsWith(path)).toBe(true)
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
```
Run: `npx vitest run src/contexts/AppSessionContext.test.tsx` — expected: FAIL (`needsDetails` undefined, no redirect).

- [ ] **Step 3: Implement in `AppSessionContext.tsx`**

Add to the imports: `import { computeNeedsDetails, isOnboardingGateExempt } from '@/lib/onboardingGate'` and `import { safeReturnTo } from '@/lib/authReturn'`.

Add `needsDetails: boolean` to `AppSessionContextValue`.

After `const playerProfile` / before `status`:
```ts
  const needsDetails = useMemo(() => computeNeedsDetails(onboardingStatus), [onboardingStatus])
```

After the `clearSession` callback, the gate:
```ts
  // The onboarding gate: once the session is settled and a required detail is missing,
  // send the player to the details step, carrying where they were. Exempt routes are
  // the step itself, auth pages, /join/* (collects the details inline), payment pages
  // and legal pages. Never fires while loading/signed out/errored — no flicker, no loop.
  useEffect(() => {
    const settled = status === 'profile_incomplete' || status === 'ready'
    if (!settled || !needsDetails) return
    if (isOnboardingGateExempt(location.pathname)) return
    const returnTo = safeReturnTo(`${location.pathname}${location.search}`)
    navigate(`/profile/edit?purpose=${detailsPurpose(location.pathname)}&returnTo=${encodeURIComponent(returnTo)}`, { replace: true })
  }, [status, needsDetails, location.pathname, location.search, navigate])
```
with, in `src/lib/onboardingGate.ts`:
```ts
/** Tournament pages keep their own copy on the details step; everything else is onboarding. */
export function detailsPurpose(pathname: string): 'tournament' | 'onboarding' {
  return pathname.startsWith('/tournaments/') ? 'tournament' : 'onboarding'
}
```
(add two cases to `onboardingGate.test.ts`: `/tournaments/t-1` → `tournament`, `/tournaments` and `/` → `onboarding`).

In the axios bridge, use the same helper so the fallback also lands in details mode:
```ts
        const purpose = `&purpose=${detailsPurpose(location.pathname)}`
```

Add `needsDetails` to the `value` memo and its deps.

- [ ] **Step 4: Fix the existing mocks of `useAppSession`.** Grep `vi.mock('@/hooks/useAppSession'` across `src/` and add `needsDetails: false` to each mocked value (TypeScript will not force it, but `TournamentDetailPage` reads it in Task 6, so add it now everywhere: `Navbar.test.tsx`, `ParticipantsSection.test.tsx`, `TournamentsPage.test.tsx`, `TournamentDetailPage.test.tsx`, `EditProfilePage.test.tsx`, `CorporateRegistrationPage.fixtures.tsx`, and any other hit).

- [ ] **Step 5: Run** `npx vitest run src/contexts src/lib/onboardingGate.test.ts` then `npx vitest run` — expected: all green. `npx tsc -b --noEmit` — clean.
- [ ] **Step 6: Commit** `feat(session): onboarding gate sends incomplete accounts to the details step`

---

### Task 5: `EditProfilePage` details mode

**Files:**
- Modify: `src/pages/EditProfilePage.tsx`
- Modify: `src/lib/analytics.ts` (add `'onboarding_details_shown' | 'onboarding_details_completed'` to `FunnelEvent`)
- Test: `src/pages/EditProfilePage.test.tsx`

- [ ] **Step 1: Failing tests.** In `EditProfilePage.test.tsx`:

(a) Replace `'cannot return with only a name and missing registration details'` with:
```tsx
  it('details mode: continue stays disabled until names, a verified phone and a chosen level exist', async () => {
    sessionState.status = 'profile_incomplete'
    renderPage('/profile/edit?purpose=onboarding&returnTo=%2Ftournaments%2Ft-1')
    const user = userEvent.setup()
    expect(screen.getByRole('heading', { name: /almost in/i })).toBeInTheDocument()
    expect(screen.getByText(/a verified phone and a skill level are required/i)).toBeInTheDocument()
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
  })
```
(b) Replace `'saves a confirmed default level for an existing player missing their level'` with:
```tsx
  it('details mode: a legacy player missing only the level chooses it and is sent back', async () => {
    sessionState.status = 'ready'
    sessionState.playerProfile = { ...READY_PROFILE, skill_level: null }
    vi.spyOn(profileApi, 'getOnboardingStatus').mockResolvedValue({ success: true, data: { is_authenticated: true, has_player_profile: true, missing_steps: [] } } as any)
    const update = vi.spyOn(profileApi, 'updateProfile').mockResolvedValue({ success: true, data: READY_PROFILE } as any)
    renderPage('/profile/edit?purpose=onboarding&returnTo=%2Ftournaments%2Ft-1')
    const user = userEvent.setup()
    expect(screen.getByRole('button', { name: /^continue$/i })).toBeDisabled()
    fireEvent.change(screen.getByRole('slider'), { target: { value: '4' } })
    await user.click(screen.getByRole('button', { name: /^continue$/i }))
    expect(await screen.findByTestId('tournament-probe')).toBeInTheDocument()
    expect(update).toHaveBeenCalledWith({ skill_level: 4 })
    update.mockRestore()
  })
```
(c) Keep `'lets a complete player continue without making a meaningless edit'` but assert the tournament-purpose CTA still reads "continue to tournament" (it does — purpose=tournament keeps that copy).

(d) New:
```tsx
  it('details mode: the sign-out link exists and the tournament purpose keeps its own copy', () => {
    sessionState.status = 'profile_incomplete'
    renderPage('/profile/edit?purpose=tournament&returnTo=%2Ftournaments%2Ft-1')
    expect(screen.getByRole('heading', { name: /your details for this tournament/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /not your account\? sign out/i })).toBeInTheDocument()
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

  it('permissive mode: no note about required fields, Save label, level may stay unset', () => {
    sessionState.status = 'ready'
    sessionState.playerProfile = { ...READY_PROFILE, skill_level: null }
    renderPage('/profile/edit')
    expect(screen.queryByText(/a verified phone and a skill level are required/i)).not.toBeInTheDocument()
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('')
  })
```
Adjust the `useAuth` mock in this file to also expose `signOut: vi.fn()` (used by the sign-out link).

Run the file — expected: the new/changed tests FAIL.

- [ ] **Step 2: Implement.** In `EditProfilePage.tsx`:

1. Replace every `tournamentMode` with a purpose pair. At the top of both components:
```ts
  const purpose = params.get('purpose')
  const detailsMode = purpose === 'onboarding' || purpose === 'tournament'
  const tournamentPurpose = purpose === 'tournament'
```
2. Header (outer component):
```tsx
   {t(tournamentPurpose ? 'edit_profile.registrationTitle' : detailsMode ? 'edit_profile.onboardingTitle' : 'edit_profile.title')}
   …
   {t(tournamentPurpose ? 'edit_profile.registrationSubtitle' : detailsMode ? 'edit_profile.onboardingSubtitle' : 'edit_profile.subtitle')}
```
3. `defaultsFromProfile`: `skill_level: normalizeSkillLevel(profile?.skill_level)` (`import { normalizeSkillLevel } from '@/lib/skillLevel'`). Remove the `SKILL_DEFAULT` import.
4. Remove `needsSkill`, `skillConfirmed`, `setSkillConfirmed` and the checkbox block. The slider becomes:
```tsx
              <SkillLevelSlider value={field.value ?? null} onChange={field.onChange} />
```
   and under the Card, when `detailsMode && values.skill_level == null`, render
   `<p className="text-sm text-red-400 mt-2">{t('edit_profile.validation.skillRequired')}</p>` — only after the user tried to submit or touched the slider? Keep it simple: show it only when `form.formState.isSubmitted`.
5. Requirements banner: `{detailsMode && (<div …>{t(tournamentPurpose ? 'edit_profile.registrationRequirements' : 'edit_profile.requiredNote')}</div>)}`.
   Directly under it, the **missing-details notice** (details mode only, while anything is missing):
```ts
  const missing = detailsMode
    ? [
        !(values.first_name?.trim() && values.last_name?.trim()) && t('edit_profile.missing.name'),
        !(values.contact_number?.trim() && phoneVerified) && t('edit_profile.missing.phone'),
        !levelChosen && t('edit_profile.missing.level'),
      ].filter((x): x is string => Boolean(x))
    : []
```
```tsx
      {missing.length > 0 && (
        <p role="status" className="rounded-xl border border-rally-accent/40 bg-rally-accent/10 px-4 py-3 text-sm font-semibold text-rally-text">
          {t('edit_profile.missingNotice', { fields: missing.join(' · ') })}
        </p>
      )}
```
   This is what a player sees after clicking a nav item while incomplete: the gate brings them back with the clicked page as `returnTo`, and the notice names exactly what is left. Add to the tests: in details mode with nothing filled the notice lists all three; after names + verified phone it lists only the level; it is absent once everything is set and absent in permissive mode.
6. `canSubmit`:
```ts
  const levelChosen = values.skill_level != null
  const canSubmit =
    (isCreate || detailsMode || form.formState.isDirty) &&
    (!isCreate || Boolean(values.first_name?.trim() && values.last_name?.trim())) &&
    (!detailsMode || Boolean(values.first_name?.trim() && values.last_name?.trim() && values.contact_number?.trim() && phoneVerified && levelChosen)) &&
    !hasDirtyError && !globalInvalid && !phoneDirtyUnverified && !mutation.isPending
  const showSave = isCreate || detailsMode || form.formState.isDirty
```
7. Patch path: replace `if (dirty.skill_level || needsSkill) patch.skill_level = values.skill_level` with
```ts
      if ((dirty.skill_level || (detailsMode && normalizeSkillLevel(profile?.skill_level) == null)) && values.skill_level != null) {
        patch.skill_level = values.skill_level
      }
```
   Create path already sends `skill_level` only when non-null; in details mode it is always non-null by `canSubmit`.
8. `finishSave`: the "still missing" check uses the shared helper:
```ts
      if (detailsMode && computeNeedsDetails(onboarding.data)) throw new Error('Required details still missing')
```
   (`import { computeNeedsDetails } from '@/lib/onboardingGate'`), and the funnel call becomes
```ts
      trackFunnel(detailsMode ? 'onboarding_details_completed' : 'profile_completed', { step: purpose ?? 'profile' })
```
9. On mount of the form in details mode: `useEffect(() => { if (detailsMode) trackFunnel('onboarding_details_shown', { step: purpose ?? 'onboarding' }) }, [])` (eslint-disable the deps line with a comment: fire once).
10. CTA label: `t(tournamentPurpose ? 'edit_profile.continueTournament' : detailsMode ? 'edit_profile.continue' : 'edit_profile.save')`.
11. Sign-out link, rendered only in details mode, under the button row:
```tsx
      {detailsMode && (
        <button type="button" onClick={() => { void signOut().then(() => navigate('/', { replace: true })) }} className="text-xs text-rally-text-muted underline underline-offset-2">
          {t('edit_profile.notYou')}
        </button>
      )}
```
   (`const { user, signOut } = useAuth()`).
12. `analytics.ts`: extend the `FunnelEvent` union with `'onboarding_details_shown' | 'onboarding_details_completed'`.

- [ ] **Step 3: Run** `npx vitest run src/pages/EditProfilePage.test.tsx src/lib/analytics.test.ts` → green; `npx vitest run` → green; `npx tsc -b --noEmit` → clean. Grep `confirmSkill` and `SKILL_DEFAULT` in `src/` — the only `SKILL_DEFAULT` hit must be `lib/skillLevel.ts`.
- [ ] **Step 4: Commit** `feat(profile): generic details mode — required phone + explicit level, no default`

---

### Task 6: `TournamentDetailPage` reads `needsDetails` from the session

**Files:**
- Modify: `src/pages/TournamentDetailPage.tsx` (merged version — read it first)
- Test: `src/pages/TournamentDetailPage.test.tsx`, `src/pages/TournamentDetailPage.registrationGate.test.tsx`

- [ ] **Step 1:** In the page, delete the local `needsRegistrationDetails` computation (`sessionStatus === 'profile_incomplete' || Boolean(onboardingStatus?.missing_steps.some(…))`) and read `const { …, needsDetails } = useAppSession()`; use `needsDetails` wherever `needsRegistrationDetails` was used (step indicator's active step, the partner-panel branch, the two CTA labels). `checkRegistrationProfile()` keeps its fresh `getOnboardingStatus()` call but decides with `computeNeedsDetails(result.data)` and navigates to `profilePath` (unchanged, `purpose=tournament`).
- [ ] **Step 2:** Update the page tests' `useAppSession` mock values to set `needsDetails` explicitly in the cases that previously relied on `missing_steps` (search the tests for `missing_steps: ['contact_number']` / `'skill_level'` and add `needsDetails: true` beside them). Existing assertions stay.
- [ ] **Step 3:** `npx vitest run src/pages/TournamentDetailPage*.test.tsx` → green; full suite + tsc → green.
- [ ] **Step 4: Commit** `refactor(tournament): registration details check comes from the session`

---

### Task 7: Commit the spec and plan; wiki note

- [ ] Stage and commit `docs/superpowers/specs/2026-09-09-onboarding-details-step-design.md` and this plan: `docs: onboarding details step spec + plan`.
- [ ] Wiki (monorepo `../wiki/`): add a short "Onboarding details step (web)" section to `modules/players-and-profiles.md` or the web auth page if one exists, and a line in `index.md` — via `/wiki-ingest` at the end of the session.

---

## Browser verification (controller, after all tasks, on the live dev stack)

1. Fresh account via the corporate page's gate → after the profile is written inline, no redirect to `/profile/edit` at any point (exempt route + fresh status).
2. Fresh account on `/tournaments/<id>` → sign in via the modal → lands on `/profile/edit?purpose=tournament&returnTo=/tournaments/<id>`: title "your details for the tournament", empty slider with the note, Continue disabled → type phone, OTP (dev: read the code from the API log / notification sink) → choose level → Continue → back on the tournament page with the register CTA.
3. Fresh account on `/` (Google or email) → `/profile/edit?purpose=onboarding&returnTo=/` with "Almost in"; sign-out link works.
4. Legacy dev account with `skill_level` null → sign in → one-time details step → after continue, navigating around does not re-trigger it.
5. `/profile/edit` without `purpose` for a complete player → the ordinary editor (Save only when dirty).
