## 1. Product & Commercial Overview
* Project Name: Rally Padel Platform: Digital Infrastructure for B2B Venue Management and Consumer Sports Leagues
* Target Customer & User Persona: Padel Club Owners, Tournament Organizers, Corporate Event Coordinators, and Competitive/Casual Padel Players seeking verified match play.
* The Core Problem (The "Before" State): Padel club operators previously depended on fragmented manual channels, including WhatsApp group chats, spreadsheet logs, paper scorecards, and disjointed payment software. This caused high administrative costs, abandoned player registrations, inaccurate skill ratings that disrupted tournament brackets, and zero attribution for ad spend.
* The Commercial Value Proposition: Rally unifies venue management, automated tournament brackets, and direct consumer registration into a single platform, eliminating manual administration and capturing every conversion for marketing optimization.

## 2. Product Brief & User Workflow
* Key Functional Capabilities:
  1. Tournament & League Administration: Configures singles, doubles, and mixed brackets with dynamic waitlists, automatic seat caps, and real-time standings displays for venue TV screens.
  2. B2B Club Management & Corporate Bookings: Manages court availability, fee waivers for local residents, and dedicated corporate tournament landing environments.
  3. Dynamic Skill Level Ladder & Player Verification: Synchronizes player ratings across dynamic 1 to 7 and 1 to 5 numeric scales using contract-driven server definitions and level-reliability indicators.
  4. Serverless Multi-Channel Lead Ingestion: Collects business leads and corporate applications using serverless proxy handlers that automatically synchronize with Google Sheets databases.
  5. Conversion Tracking & Attribution Pipeline: Captures 30-day campaign parameters (UTM parameters, Meta click IDs, Google click IDs) and transmits server-side events directly to Meta Conversions API with SHA-256 privacy hashing.
  6. Bi-Directional (Bidi) RTL UI Engine: Provides native Hebrew and English localizations with strict text isolation for scorelines, phone numbers, and mixed-direction player details.
* End-to-End User Workflow:
  1. Trigger: A player clicks a campaign link from a Meta advertisement or scans a venue QR code for an upcoming tournament.
  2. Ingestion: The single page web application reads campaign tracking parameters into local storage and requests live tournament details alongside current skill band schemas via custom Axios interceptors.
  3. Processing / Logic: The user submits registration details or invites a partner. The Axios API client attaches Supabase bearer tokens, while an application session bridge intercepts missing profile responses (403/422 status codes) to trigger required onboarding steps without aborting the pending transaction.
  4. Output / Storage: Registration data commits to the central database, while lead data passes through a Vercel serverless edge function (`/api/lead`) equipped with honeypot validation to sync with Google Sheets and fire deduplicated Meta Conversions API events.
  5. Client Notification: Players receive automated SMS or WhatsApp partner invitations, and venue administrators view live standings updated on venue screens via public share tokens (`/live/:token`).

## 3. Technical Architecture & Engineering Decisions
* System Overview: Rally operates as a decoupled architecture combining a high-performance React Single Page Application (SPA), a FastAPI/Supabase Postgres backend API (`rally-api`), and Vercel Serverless Edge Functions (`/api/*`). This split design separates static presentation and client interactivity from central database operations and secure third-party communication.

  The frontend uses React 18, TypeScript, and Vite, state management via React Query v5 and Zustand, and styling through Tailwind CSS v4. Edge routes handle serverless tasks including Google Sheets integration, OpenGraph social preview generation, and server-to-server conversion reporting.

  The architecture relies on an event-driven marketing pipeline and automated API request/response interceptors. Application state flows predictably from Supabase authentication providers through localized skill ladder contexts down to isolated page views and modal gates.

* Tech Stack Breakdown:
  * Frontend: React 18, TypeScript, Vite, Tailwind CSS v4, Radix UI primitives, Lucide React, i18next, FullCalendar, Recharts, Three.js, d3-force-3d.
  * Backend & Runtime: Vercel Serverless Functions (Node.js runtime for API relays), external FastAPI / Supabase backend core, Axios HTTP client with request and response interceptors.
  * Database & Storage: Supabase PostgreSQL (authentication, player profiles, club court bookings, tournament registrations, waitlists), client LocalStorage for 30-day marketing attribution data and language persistence.
  * Infrastructure & DevOps: Vercel deployment with single page application routing rewrites, automated TypeScript compilation (`tsc -b`), and Vitest test execution.
  * Third-Party APIs: Supabase Auth (implicit flow), Meta Conversions API (Graph API v21.0), Google Apps Script Webhook (Google Sheets database), GA4 Measurement Protocol, Meta Pixel.
* AI & Algorithmic Implementation: Deterministic heuristic algorithms and contract-driven rating reconciliation engines handle data structure transformations without heavy machine learning overhead. The platform uses a dynamic scale resolution contract (`GET /public/skill-bands`) that maps player level scores into distinct skill bands (A/B/C/D) across both 1 to 7 and 1 to 5 rating scales.

  Score string display algorithms apply bi-directional text isolation (Unicode mark isolation) to prevent right-to-left layout reversals when rendering set counts and match points. Tournament placement algorithms prioritize promoted venue slots without modifying organic ranking order on client devices.

* 2 Key Technical Hurdles & Architectural Solutions:
  * Hurdle 1: Profile Incompleteness and 403/422 Unauthenticated Access Bottlenecks.
    When a registered auth user attempted a restricted operation (such as registering for a tournament) without a complete player profile row in the database, the backend rejected requests with 403 or 422 HTTP status codes, breaking user registration flows and dropping prospective leads.
  * Solution 1: Imperative Axios API Session Bridge with Single-Retry Replay.
    Engineers implemented a lightweight bridge (`__setApiBridge`) connecting Axios HTTP response interceptors directly to the React application session context (`AppSessionContext`). When the interceptor detects a `PLAYER_NOT_FOUND` or `PROFILE_FIELDS_REQUIRED` response, it presents a modal profile completion workflow while preserving original request options. Upon successful profile creation, the interceptor re-executes the original API request once, completing the transaction without forcing the user to restart.
  * Hurdle 2: Ad-Blocker Signal Loss and Duplicate Conversions in Paid Marketing Campaigns.
    Browser ad-blockers and privacy restrictions frequently blocked client-side Meta Pixel scripts, resulting in under-reported conversion data. Conversely, firing duplicate tracking calls from both client and server created inflated lead metrics in ad managers.
  * Solution 2: Serverless Dual-Channel Relay with Event ID Deduplication.
    The team built a serverless proxy endpoint (`/api/meta-capi`) that captures conversion events, client user agents, IP addresses, and attribution click tokens (`fbclid`, `gclid`). Each event generates a deterministic unique identifier (`event_id`) shared between the browser pixel and the serverless relay. User emails and phone numbers undergo SHA-256 hashing before transmission to Meta Graph API v21.0. Meta Events Manager automatically deduplicates incoming browser and server hits using the shared identifier, maintaining complete conversion signals even when browser scripts fail.

## 4. Quantifiable Business Impact (Estimated Metrics)
* Efficiency Stat: 85% reduction in administrative effort -> Automated waitlists, self-service web registration, and digital partner invitations replace manual chat coordination and spreadsheet management.
* Cost / Scalability Stat: 100% elimination of third-party ticketing commissions -> Direct web registrations and mobile payment deep links avoid per-ticket software taxes on tournament entries.
* Reliability Stat: 99.9% conversion tracking accuracy across marketing channels -> Dual-stream browser pixel and serverless Conversions API reporting preserves ad measurement accuracy despite client-side ad blockers.

## 5. Ready-to-Publish Sales & Portfolio Assets
* One-Sentence Headline (Max 120 chars): Digital Infrastructure for B2B Padel Clubs, Automated Tournaments, and High-Converting Player Engagement
* Executive Case Summary (Situation, Complication, Resolution):
  Situation: Fast-growing padel club networks face operational strain caused by legacy scheduling software, manual tournament organization over mobile messaging apps, and unverified player skill entries that lead to unbalanced competitive matches.

  Complication: Manual registration workflows trigger high drop-off rates, poor match quality, and administrative fatigue. Venue owners spend thousands of dollars on digital marketing without clear insight into actual member acquisition costs or return on ad spend.

  Resolution: Rally deployed a unified digital platform combining an ultra-fast React web interface, automated tournament waitlists, venue TV leaderboard displays, and a serverless marketing attribution proxy. The platform automates administrative tasks while driving player retention and verified skill progression across all participating venues.
* Stakeholder Review Angle: "Before Rally, running a 32-pair tournament required endless hours of manual chat coordination, paper bracket tracking, and unverified skill claims. Now, players complete their own registrations, skill brackets align automatically, and our marketing conversion performance is tracked from initial ad click to final match score."
* 100-Word Pitch Copy: Managing a growing padel club or tournament league should not require juggling spreadsheets, manual WhatsApp messages, and untracked ad spending. Rally provides enterprise-grade software infrastructure tailored for padel operators. Built with React and serverless edge functions, Rally delivers real-time tournament brackets, live venue leaderboard displays, automated waitlists, and serverless conversion tracking. We remove administrative bottlenecks and third-party fee taxes for club owners while giving players an app-like experience in any web browser. Let us discuss how we can deploy custom digital infrastructure for your venue network.
