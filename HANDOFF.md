# Handoff — Rally Web Pre-Launch

**Branch:** `new-design`
**Scope:** Tournaments registration flow + full site design (home, CRM, contact, header) for launch 2026-05-19.
**Status:** Design complete on mock data. **Backend tables + email forwarding needed before forms work end-to-end.**

---

## 1. The Mock Toggle (must remove before merge)

The tournaments pages run on mock data while `VITE_USE_MOCK_DATA=true`. To switch to real data:

### Step 1 — Remove env flag
In `.env` (or `.env.local`): delete `VITE_USE_MOCK_DATA=true`.

### Step 2 — Remove mock branches
File: `src/services/api/tournaments.ts`

```ts
// REMOVE these:
import { getMockTournamentList, getMockTournamentDetail } from '@/lib/mockTournaments'
const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true'

// And the `if (USE_MOCK)` guards inside getTournaments / getTournament
```

### Step 3 — Delete mock module
```bash
rm src/lib/mockTournaments.ts
```

### Step 4 — Fix CORS on the API
`api.rallypadel.app` rejects `http://localhost:5174` with `"Disallowed CORS origin"`. Whitelist dev localhost ports **or** add a Vite proxy in `vite.config.ts`.

---

## 2. 🚨 Backend Work — REQUIRED before launch

Two lead-capture forms (CRM + Contact) write to Supabase. Tables don't exist yet — leads currently survive only in browser `localStorage` until you create them.

### SQL — create tables

```sql
-- CRM waitlist (from /crm)
create table public.crm_leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  name        text not null,
  club        text,
  email       text not null,
  phone       text,
  city        text,
  source      text
);

-- Contact form (from /contact, 5 segments)
create table public.contact_leads (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now(),
  segment      text not null,      -- club | tournament | coach | sponsor | partnership
  name         text not null,
  email        text not null,
  phone        text,
  open_answer  text,                -- segment-specific question response
  message      text,                -- optional free-form
  source       text
);

-- RLS — allow anonymous INSERT only (public lead capture)
alter table public.crm_leads     enable row level security;
alter table public.contact_leads enable row level security;

create policy "anon insert crm"     on public.crm_leads     for insert to anon with check (true);
create policy "anon insert contact" on public.contact_leads for insert to anon with check (true);
```

### Email forwarding — REQUIRED

Each new row in either table needs to be emailed to **`info@rallypadel.app`**. Options:
- **Supabase Edge Function** triggered by `db.insert` webhook
- **DB trigger** that calls `net.http_post()` to a transactional email provider (Resend/Sendgrid)
- Or any other workflow you prefer

The user explicitly required: leads must be saved **AND** forwarded by email.

---

## 3. New pages built this round

| Route | File | Notes |
|---|---|---|
| `/` (Home) | `src/pages/HomePage.tsx` | Hero with bg image + Eyebrow + countdown to **2026-06-01** + App Store/Google Play "Coming Soon" badges + cycling iPhone mockups (6 app screens) + live tournaments chip |
| `/tournaments` | `src/pages/TournamentsPage.tsx` | Polished list page; atmospheric padel bg; countdown chips on cards; 2 "Coming Soon" teasers |
| `/tournaments/:id` | `src/pages/TournamentDetailPage.tsx` | Redesigned hero, date strip with days-remaining pill, fact cards (no scarcity per product), prizes with 🥇🥈🥉, sponsor logo support, partner flow invite-first, sticky CTA with state-driven label |
| `/crm` | `src/pages/CrmPage.tsx` | Club CRM lead capture (waitlist). Animated background blobs, 3 stacked browser-window mockups with lightly-blurred CRM screens cycling, value props (vague — no feature reveal per product), lead form |
| `/contact` | `src/pages/ContactPage.tsx` | Segmented contact form (5 personas: clubs / tournament managers / coaches / sponsors / partnerships). Segment-specific open question, plus optional message. Right column: "what happens after you hit send" + direct mailto link |
| `/login` | `src/pages/auth/LoginPage.tsx` | Back arrow added (browser history → `/` fallback). Subtitle copy. Centered logo inside card. Email button styling matches social buttons. |

### New components
- `src/components/tournaments/PrizesGrid.tsx` — gold/silver/bronze cards with medal emojis
- `src/components/tournaments/CountdownCard.tsx` — **unused** (built then removed from UI; safe to delete)
- `src/constants/israeliCities.ts` — 46 Israeli cities for the CRM form dropdown (bilingual labels)
- `src/lib/mockTournaments.ts` — mock fixtures (delete when mock toggle removed)

### Modified building blocks
- `src/components/layout/Navbar.tsx` — redesigned with new Logo (size md), Rubik font on nav items, lime underline on active route, mobile drawer rebuilt with icons + segment pills, **language switcher: desktop = flag + dropdown showing the other language, mobile = direct flag toggle as last drawer item**
- `src/components/ui/Logo.tsx` — image + "Rally" wordmark + tagline "Less Admin, More Padel."; responsive sizing; RTL-consistent (image always to LEFT of "Rally")
- `src/components/auth/AuthCard.tsx` — accepts `onBack` prop, renders top-corner back arrow; logo centered above title; padel-toned colors
- `src/components/auth/AuthOptionsStep.tsx` — all 4 sign-in buttons (Google/Apple/Facebook/Email) aligned with same icon wrapper + label spacing

---

## 4. Product decisions baked into the UI (do not undo)

1. **No scarcity signals** — never show `available_seats`, "X מקומות נותרו", or fillness bars. Goal is **max registrations for data collection**.
2. **No feature reveals on `/crm`** — competitors will visit the day after launch. Screens are blurred + small enough to convey "mood not info". The teaser cards talk in vague value language ("technology that works", "less admin", "more profit") — never specifics.
3. **Phone numbers** display in international format (country code on left, then digits). RTL-aware placeholder.
4. **Hebrew terminology** — use "מחבט" (not "רקטה") for racket; "נוקאאוט" (not "הדחה") for knockout-style structures.
5. **Sticky CTA on tournament detail** is action-first, never blocking — when partner is missing, button says "מלאו את הפרטים" and scrolls to the partner section.
6. **Partner flow** is invite-first — invitation form expanded by default; existing-player search is collapsed behind `+` button (most early users have partners not yet on Rally).
7. **Bilingual integrity** — every visible string goes through i18n. No hardcoded HE/EN in JSX.

---

## 5. Image optimization done this round

Trimmed `public/` from ~17MB to ~3.8MB.
- Deleted 6 redundant duplicates (PNG versions where JPG already existed).
- Converted heavy PNGs to compressed JPGs (`padel-hero-bg`, `padel-court-home`, `crm-calendar`, `crm-shop`) — 70–89% smaller each.
- Generated `og-image.jpg` (1200×630, 102 KB) for social-media sharing.

---

## 6. SEO / Meta tags

Added to `index.html`:
- Real `<title>` (HE)
- `<meta name="description">`
- Open Graph (title, description, image, dimensions, url, locales)
- Twitter Card (summary_large_image)
- `theme-color` for mobile browser chrome

`og-image.jpg` is the Rally launch teaser (padel court + lime "Rally" + "1.6.2026 · Official Launch").

---

## 7. Translation keys touched / added

Major sections added or rewritten in both `he.json` and `en.json`:
- `home.*` — hero, countdown, teaser, app badges
- `crm.*` — hero, form, success state, teasers, closing CTA
- `contact.*` — segments, fields, success, benefits, direct email
- `auth.*` — welcome copy + subtitle, social button labels updated to "Sign in with X" / "התחבר עם X"
- `nav.app/tournaments/crm/contact` — only 4 active links (clubs/level/pricing hidden from nav but routes still work)
- `tournament.*` — partner flow keys translated to HE (17 keys were English in `he.json`); plus countdowns, teasers, prizes, my-tournaments empty state, structure labels updated to "נוקאאוט"

---

## 8. Open items / pending decisions

- **CORS on `api.rallypadel.app`** — whitelist dev localhost(s) or set up a Vite proxy. Currently blocks all local API calls.
- **Player search privacy** — `/players/search` accepting phone-only from any user is a data-exposure surface. Consider exact-match-only / rate limit / require name + partial phone.
- **Payment flow** — tournament sticky CTA's "המשך לתשלום" calls existing `handleRegister`. Follow-on payment screen is your scope.
- **Sponsor images** — UI supports `sponsor.image_url`. Mock uses `placehold.co` placeholders. Real sponsors need an upload mechanism.
- **`CountdownCard.tsx`** — built then removed; safe to delete.
- **Auth state** — `/tournaments` "my" tab assumes API filters by current user when `type=my`.

---

## 9. How to run locally

```bash
npm install
cp .env.example .env.local
# Edit .env.local with real Supabase URL + anon key (and optionally VITE_USE_MOCK_DATA=true)
npm run dev          # → http://localhost:5174/
```

Without real env values the app crashes at module load (Supabase client throws). Use real values or keep `VITE_USE_MOCK_DATA=true` and any placeholder Supabase values for design preview.

---

## 10. Recommended review path

1. `src/App.css` — design tokens + keyframes
2. `index.html` — SEO meta
3. `src/components/layout/Navbar.tsx` — header
4. `src/pages/HomePage.tsx` — homepage launch teaser
5. `src/pages/TournamentsPage.tsx` + `TournamentDetailPage.tsx` — tournaments
6. `src/pages/CrmPage.tsx` — club CRM lead capture
7. `src/pages/ContactPage.tsx` — segmented contact
8. `src/services/api/tournaments.ts` — mock toggle (to remove)
9. Translation diffs (`he.json` / `en.json`) — mostly mechanical, scan for tone
