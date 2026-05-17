# Handoff — Tournaments UI Redesign

**Branch:** `new-design`
**Scope:** Visual redesign of `/tournaments` (list) and `/tournaments/:id` (detail) for the campaign launching 2026-05-18.
**Status:** Design complete on mock data. Ready for real-API wiring.

---

## 1. The Mock Toggle (critical to remove before merge)

The UI runs entirely on mock data while `VITE_USE_MOCK_DATA=true` is set. To switch to real data:

### Step 1 — Remove the env flag
In `.env` (or `.env.local`): delete the line `VITE_USE_MOCK_DATA=true`.

### Step 2 — Remove the mock branches in code
File: `src/services/api/tournaments.ts`

```ts
// REMOVE these 3 lines:
import { getMockTournamentList, getMockTournamentDetail } from '@/lib/mockTournaments'
const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true'

// And the `if (USE_MOCK)` guards inside:
export async function getTournaments(...) {
  if (USE_MOCK) return getMockTournamentList(params)   // ← remove
  return client.get('/rally/v1/tournaments/', { params })
}

export async function getTournament(...) {
  if (USE_MOCK) return getMockTournamentDetail(tournamentId)  // ← remove
  return client.get(`/rally/v1/tournaments/${tournamentId}`)
}
```

### Step 3 — Delete the mock module
```bash
rm src/lib/mockTournaments.ts
```

### Step 4 — Fix CORS on the API
The current `https://api.rallypadel.app` rejects requests from `http://localhost:5174` with `"Disallowed CORS origin"`. Add localhost dev ports (5173, 5174, etc.) to the API's CORS allowlist, **or** add a Vite proxy in `vite.config.ts` for dev.

---

## 2. New files created

| File | Purpose |
|---|---|
| `src/components/tournaments/PrizesGrid.tsx` | Prizes section — gold/silver/bronze cards with 🥇🥈🥉 emojis and gradients |
| `src/components/tournaments/CountdownCard.tsx` | **Unused** (built but removed from UI per product decision). Safe to delete. |
| `src/lib/mockTournaments.ts` | Mock tournament fixtures + filtering. Delete when removing mock. |
| `public/padel-hero-bg.png` | Atmospheric background for `/tournaments` list page (Premier Padel Tel Aviv photo) |

## 3. Modified files

### Design system foundation
- `src/App.css` — Tailwind v4 `@theme` rewritten with the full Rally token set (colors, fonts, radius, shadows). New tokens: `rally-blue`, `rally-accent-hover`, `rally-border-subtle`, `shadow-glow-electric`, etc. Body/h1 default to `Heebo`/`Rubik`.
- `index.html` — preconnects + loads Rubik + Heebo from Google Fonts.

### List page (`/tournaments`)
- `src/pages/TournamentsPage.tsx` — new hero (huge title + subtitle), polished tabs/search, atmospheric padel bg, 2 inline `TournamentCardTeaser` cards at the end (blurred fake content + "ההרשמה תיפתח בקרוב" pill).
- `src/components/tournaments/TournamentCard.tsx` — skill-level badge now top-right of card (lime border, "athletic" style), date line shows weekday + date (no time, per design), countdown pill "X ימים נותרו לרישום", `dir="ltr"` on skill text.

### Detail page (`/tournaments/:id`)
- `src/pages/TournamentDetailPage.tsx` — major rewrite below hero:
  - Hero: bigger title (text-4xl→text-7xl), taller (400-520px), gradient overlay.
  - Date+countdown strip: weekday + date + time, with pill "עוד X ימים לטורניר" (or "מחר!"/"היום!").
  - About: typography upgrade + lime accent border on the right (RTL).
  - 3 FactCards grid: format / skill level / structure (NO availability — see §5).
  - Prizes via `PrizesGrid` with emojis + medal gradients.
  - Sponsors: 2-3 column grid, image support (`s.image_url`), wraps in `<a>` if `website_url` present.
  - Partner section: invite-first UX (collapsed search), `*` asterisk + "שדה חובה" note, `ref` + smooth scroll from sticky CTA.
  - Sticky CTA: text changes by state — `"מלאו את הפרטים"` when partner missing (scrolls), `"המשך לתשלום"` when ready, `"ההרשמה נסגרה"` when closed.

### Components
- `src/components/tournaments/FactCard.tsx` — simplified: vertical layout (icon disc + label + value), `value` is now `ReactNode` (was `string`). `highlight*` props removed.
- `src/components/tournaments/PartnerSection.tsx` — full Hebrew translation, invite-first order, collapsible "search existing player" plus-button.
- `src/components/tournaments/PhoneInput.tsx` — RTL-aware: `flex-row-reverse` in RTL so country code stays on the left, `dir` on input follows locale so placeholder aligns correctly.

### Helpers
- `src/lib/tournamentHelpers.ts` — added `formatTournamentCardDate(start, end, locale, withTime?)` and `getCountdown(target)`. Both used by card + detail page.

### Translations
- `src/i18n/locales/he.json` — fixed 17 keys that were English-in-Hebrew (partner flow, error messages, etc.); added ~25 new keys for countdowns, fact cards, prizes, CTA states, teaser, empty state, micro-copy.
- `src/i18n/locales/en.json` — parallel new keys added.

### Service layer
- `src/services/api/tournaments.ts` — mock toggle wrapper (see §1).

---

## 4. Translation keys added (worth scanning if you have a content/CMS audit)

```
tournament.tabTournaments             "טורנירים ב-Rally"
tournament.tournamentsHeroSubtitle    Hero subtitle copy
tournament.tournamentsComingSoon      "ההרשמה תיפתח בקרוב" (teaser pill)
tournament.tournamentsCountdownToday    / OneDay / Days
tournament.countdownStartsIn          (unused now — was for CountdownCard)
tournament.countdownDeadlineIn        (same)
tournament.countdownDays / countdownHours
tournament.daysRemainingToTournament  "עוד {{count}} ימים לטורניר"
tournament.tournamentToday / tournamentTomorrow / tournamentPast
tournament.factCardFormat / Skill / Structure
tournament.prizesTitle / prizeFirst / Second / Third
tournament.partnerSectionTitle
tournament.partnerRequiredNote        "* שדה חובה"
tournament.partnerSearchExistingTitle / partnerSearchExpandCta
tournament.ctaFillDetails             "מלאו את הפרטים"
tournament.ctaMissingPartner          (now unused)
tournament.partnerSelectedPrefix      (now unused)
tournament.tournamentsMyEmptyTitle / Message / Cta  (empty state for "My tournaments" tab)
```

Plus updated values for `tournamentsEntryFee` ("דמי השתתפות לזוג"), `tournamentsUpcomingTab` ("טורנירים פתוחים"), and 17 partner-section keys that were untranslated (English) in `he.json`.

---

## 5. Product decisions baked into the UI (do not undo)

1. **No scarcity signals** — never show `available_seats`, "X מקומות נותרו", or progress bars of fillness. Goal is to maximize registrations for data collection. The UI hides this field even when the API returns it.
2. **Phone numbers display LTR with country code on left** (`+972 | מספר`) regardless of page direction — international standard.
3. **Hebrew terminology** — use "מחבט" not "רקטה"; "נוקאאוט" not "הדחה" for knockout-style structures.
4. **Sticky CTA is action-first**, never blocking: when partner is missing, button says "מלאו את הפרטים" and scrolls to the partner section. No disabled-with-no-explanation states.
5. **Partner flow is invite-first** — invitation form is expanded by default; existing-player search is collapsed behind a `+` button (under the assumption most early users have partners not yet on Rally).
6. **Bilingual integrity** — every visible string goes through i18n. No hardcoded Hebrew/English in JSX.

---

## 6. Open items / pending decisions

- **CORS on `api.rallypadel.app`** — must whitelist dev localhost OR set up a Vite proxy. Currently blocks all local API calls.
- **Player search privacy** — if `/players/search` accepts phone-only queries from any authenticated user, that's a data exposure surface (anyone can phone-number-lookup Rally accounts). Worth limiting: require exact phone match, rate-limit, or require name + partial phone. UI is ready for whichever you choose.
- **Payment flow** — sticky CTA's "המשך לתשלום" button just calls existing `handleRegister`. The follow-on payment screen is your scope.
- **Sponsor images** — UI supports `sponsor.image_url`. Mock uses `placehold.co` placeholders. Real sponsors need an upload mechanism.
- **`CountdownCard.tsx`** — file exists but is no longer rendered. Safe to delete (or keep if you want to revive countdown UX later).
- **Authentication state** — the "Tournaments mine" tab assumes API filters by current user when `type=my`. Make sure the endpoint respects auth.

---

## 7. How to run locally

```bash
# In the project root:
npm install                                    # if not already
cp .env.example .env.local                     # then fill in real Supabase + API values
npm run dev                                    # → http://localhost:5174/
```

Without real env values, the app crashes at module load (Supabase client throws). Use real values from a Supabase project + the Rally API URL.

For preview-only / design work without backend: keep `VITE_USE_MOCK_DATA=true` and any placeholder Supabase URL in `.env.local`.

---

## 8. Recommended review path

If you want to validate the work, look at these in order:

1. `src/App.css` — design tokens
2. `src/pages/TournamentsPage.tsx` — list page top-to-bottom
3. `src/components/tournaments/TournamentCard.tsx` — card
4. `src/pages/TournamentDetailPage.tsx` — detail page top-to-bottom
5. `src/components/tournaments/PartnerSection.tsx` — partner flow
6. `src/components/tournaments/PrizesGrid.tsx` — prizes
7. `src/lib/mockTournaments.ts` — mock fixtures (for shape reference)
8. `src/services/api/tournaments.ts` — mock toggle (to remove)

Translation diffs (`he.json` / `en.json`) are mostly mechanical but worth a glance for tone.
