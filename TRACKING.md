# Marketing tracking — Meta Pixel, Conversions API, GA4

What fires, where it is wired, and the one-time console setup that is not code.

## IDs

| Tool | ID | Loaded in |
|---|---|---|
| Meta Pixel / dataset | `1484965156419109` | `index.html` (base code + noscript) |
| GA4 property "Rally Web" | `G-Y6MVKFNB3M` | `index.html` (gtag.js) |

All events are fired from one module: `src/lib/analytics.ts`.

## Events

| Moment | Meta Pixel | Meta CAPI (server) | GA4 |
|---|---|---|---|
| First page load | `PageView` (base code) | — | `page_view` (gtag config) |
| SPA route change | `PageView` via `<RouteTracker/>` | — | `page_view` via Enhanced Measurement ("page changes based on browser history events" — keep it ON; we deliberately do not fire a second one) |
| Lead form delivered to the Sheet (`/contact`, `/crm`, `/coaches`) or updates signup | `Lead` `{content_category: source, content_name: segment}` | `Lead`, same `event_id`, hashed `em`/`ph`, `fbp`/`fbc` | `generate_lead` `{lead_source, lead_segment, utm_campaign, utm_content}` |
| Click to App Store / Google Play / OneLink, or `tryOpenInApp` | custom `DownloadApp` `{store}` | `DownloadApp`, same `event_id` | `download_app` `{store}` |

`Lead` fires **only after** `/api/lead` confirmed the row reached the Google
Sheet (tournament-updates is the one optimistic exception, matching its UX), so
ads never optimise on broken submits.

Lead sources: `contact_form` (segments `club | tournament | coach | sponsor |
partnership`), `crm_waitlist`, `coach_application`, `tournament_updates`.

## Attribution into the Sheet

`src/lib/attribution.ts` captures `utm_source/medium/campaign/content/term`,
`fbclid`, `gclid`, `landing_page`, `referrer`, `landed_at` from the landing
URL (30-day last-touch, in `localStorage`), and every `/api/lead` payload
spreads them in. The Apps Script receives them as extra keys — if the Sheet
does not show new columns for them, add the headers (same names) to each tab.

`/contact?segment=club` preselects the persona — use it as the B2B ad landing URL.

Recommended B2B URL:
`https://rallypadel.app/contact?segment=club&utm_source=meta&utm_medium=paid&utm_campaign=b2b_clubs&utm_content={{ad.name}}`

## One-time console setup (not code)

### Meta Events Manager (pixel 1484965156419109)
1. **Conversions API** → Settings → "Generate access token" → put it in Vercel as
   `META_CAPI_ACCESS_TOKEN` (Production + Preview) → redeploy. Until then the
   relay answers 204 and only the browser pixel reports (still fine to launch).
2. Optional while verifying: Test events tab → copy the `TEST…` code → Vercel
   `META_CAPI_TEST_CODE` → submit a test lead → see "Lead" arrive with
   "Server" + "Browser" deduplicated → remove the env var.
3. Settings → **Automatic advanced matching** → ON (already on: email, phone,
   name, …). This is the only pixel-side matching we use — we do not re-init
   the pixel with `em`/`ph`; the hashed email/phone travel through the CAPI
   relay instead.
4. Ads Manager campaign: objective Leads → Conversion location Website →
   pixel → event **Lead**.

### GA4 (G-Y6MVKFNB3M)
1. Admin → Data display → Events → mark `generate_lead` and `download_app`
   as **key events** (generate_lead may already be there; it needs to fire once
   first).
2. Admin → Data streams → web stream → Enhanced measurement → keep
   "Page changes based on browser history events" **ON** (SPA page views).
3. Reports → Realtime is the quickest way to see `generate_lead` arrive with
   `lead_source` / `lead_segment`.

### Vercel
`LEADS_WEBHOOK_URL` (+ `LEADS_WEBHOOK_TOKEN`) must be set for Production **and
Preview**, otherwise `/api/lead` answers 503 and no Lead event ever fires.

## Verifying on a deploy

1. Open `https://<deploy>/contact?segment=club&utm_source=test&utm_campaign=verify`.
2. DevTools → Network, filter `facebook.com/tr` → a `PageView` request exists;
   filter `collect` → a GA4 hit exists.
3. Submit the form (name "TEST — delete me") → a `tr?…ev=Lead` request with
   `cd[content_category]=contact_form`, a `collect?…en=generate_lead` request,
   and a `POST /api/meta-capi` (200 if the token is set, 204 if not).
4. Meta Events Manager → Overview → "Lead" counts up; GA4 Realtime shows
   `generate_lead`. Delete the TEST row from the Sheet.
