Build a complete marketing website for Rally — a padel sports platform
in Israel with a retail mobile app and B2B CRM. No login required.
Use HTML, CSS (Tailwind via CDN), and vanilla JS. Single repo, fully static.

---

## BRAND & CONTEXT
- Product: Rally
- Market: Israel
- Two products: (1) Consumer Mobile App, (2) B2B CRM for clubs/venues
- Stack: AWS, Google Maps, Cardcom or Tranzila (Israeli payment gateway)
- DEFAULT LANGUAGE: Hebrew (RTL). English available via toggle in nav.

---

## INTERNATIONALIZATION (i18n) — CRITICAL REQUIREMENT

### Architecture
- Create /assets/js/i18n.js — a translation engine
- Create /assets/locales/he.json — all Hebrew strings (DEFAULT)
- Create /assets/locales/en.json — all English strings
- Every single piece of visible text on every page must come from these 
  JSON files via a data-i18n="key" attribute on elements
- On page load, default to Hebrew. Read localStorage for saved preference.
- Language toggle in nav: "EN | עב" — switches all text instantly without reload
- When Hebrew is active: <html dir="rtl" lang="he">
- When English is active: <html dir="ltr" lang="en">

### RTL/LTR CSS Rules
- All layouts must flip correctly: flex-row-reverse where needed in RTL
- Text alignment, padding, margin, icons, and nav must all mirror in RTL
- Use CSS logical properties where possible (margin-inline-start, padding-inline-end)
- Test every component in both directions — nav, cards, forms, hero, footer
- Tailwind: use a custom rtl: variant config or explicit RTL overrides in style.css

### Typography
- Hebrew font: Heebo or Rubik (Google Fonts) — used when dir=rtl
- English font: Inter or Poppins (Google Fonts) — used when dir=ltr
- Switch fonts dynamically via JS when language toggles
- Hebrew body font-size slightly larger (17px base) for readability

### Translation Content
Write REAL, fluent, native-quality Hebrew marketing copy — not Google 
Translate. The tone should be energetic, modern, and local to Israel.
Use ״פאדל״ not "padel" in Hebrew copy where appropriate.
Example keys to include in he.json:
  - nav.app, nav.crm, nav.pricing, nav.contact
  - hero.headline: something like ״הפלטפורמה המובילה לפאדל בישראל״
  - hero.subheadline, hero.cta_app, hero.cta_crm
  - features.booking, features.tournaments, features.rating, features.payments
  - crm.headline, crm.features.*
  - footer.rights, footer.privacy, footer.terms
  - legal pages: full Hebrew privacy policy and terms of service

---

## SITE STRUCTURE (7 pages, all bilingual)

1. index.html — Hero landing page
2. app.html — Consumer mobile app features
3. crm.html — B2B CRM product page
4. pricing.html — Pricing tiers for both products
5. privacy.html — Privacy Policy
6. terms.html — Terms of Service
7. contact.html — Contact form + Google Maps embed

---

## FEATURES TO SHOWCASE

### Mobile App (Consumer)
- Court booking with real-time availability + Google Maps
- Tournament registration and brackets
- Player skill rating (ELO-style dynamic ranking)
- In-app payments via Cardcom/Tranzila (Israeli gateway)
- Match history and stats
- Push notifications for bookings and tournaments

### B2B CRM (Clubs & Venues)
- Court and facility management dashboard
- Tournament creation and bracket management
- Revenue analytics and reporting
- Player database and membership management
- Automated payments and invoicing
- Integrations: AWS, Google Maps, Cardcom, SMS/WhatsApp

---

## DESIGN REQUIREMENTS
- Modern sports aesthetic — dark navy + electric green palette
- Mobile-first, fully responsive
- Scroll animations (AOS via CDN or CSS keyframes)
- App store badges: Apple App Store + Google Play on hero and app page
- Video/mockup placeholder for app screenshots
- Sticky nav: transparent → solid on scroll, includes EN|עב language toggle
- All UI components (cards, buttons, forms, modals) must work in both RTL and LTR

---

## LEGAL PAGES (full generated content, bilingual)

### privacy.html
- Israeli Privacy Protection Law (5741-1981) + GDPR compliant
- Full Hebrew version by default, English on toggle
- Sections: data collected, usage, third parties (AWS/Google/Cardcom),
  user rights, cookies, DPO contact, last updated date

### terms.html
- Governed by laws of the State of Israel
- Hebrew default, English on toggle
- Sections: acceptance, service description, user obligations,
  payments & refunds, booking cancellations, tournament rules,
  liability limits, dispute resolution (Israeli courts)

---

## TECHNICAL SPECS
- Pure HTML/CSS/JS — no framework, no build step required
- Tailwind CSS via CDN
- Google Fonts: Heebo + Inter loaded together, switched by lang class
- Icons: Lucide via CDN
- Shared components injected via nav.js and footer.js
- Full meta tags, OG tags, hreflang tags (he/en) on all pages
- Accessible: ARIA labels in both languages, semantic HTML, keyboard nav
- Google Maps embed on contact page (placeholder API key)
- localStorage persists language choice across pages

---

## FILE STRUCTURE
/index.html
/app.html
/crm.html
/pricing.html
/privacy.html
/terms.html
/contact.html
/assets/css/style.css
/assets/js/main.js
/assets/js/nav.js
/assets/js/footer.js
/assets/js/i18n.js          ← translation engine
/assets/locales/he.json     ← Hebrew strings (default)
/assets/locales/en.json     ← English strings
/README.md                  ← deploy instructions for AWS S3 + CloudFront

---

## DELIVERABLES & QUALITY BAR
- All 7 pages fully built with real marketing copy in both languages
- Hebrew must read like it was written by a native Israeli marketer
- Every page renders correctly in RTL (Hebrew) and LTR (English)
- Language toggle works instantly across all pages with localStorage persistence
- Legal pages are complete, not placeholder — full real policy text in both languages
- Looks like a funded Israeli startup's website
- No lorem ipsum anywhere