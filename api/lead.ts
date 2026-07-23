import type { VercelRequest, VercelResponse } from '@vercel/node'

// Thin proxy that forwards a lead-form submission to the Google Sheet webhook
// (a Google Apps Script web app; see docs/leads-google-sheet.md for setup).
//
// Why a proxy instead of posting to the Apps Script from the browser:
//  - the webhook URL / shared secret stay server-side, out of the JS bundle,
//  - it's same-origin for the SPA, so there is no CORS to fight,
//  - it's the one place to validate input and drop spam.
//
// Config (Vercel project env vars):
//  - LEADS_WEBHOOK_URL   the Apps Script "web app" exec URL (required)
//  - LEADS_WEBHOOK_TOKEN a shared secret the script checks (optional)
const WEBHOOK_URL = process.env.LEADS_WEBHOOK_URL
const WEBHOOK_TOKEN = process.env.LEADS_WEBHOOK_TOKEN ?? ''

// Only these lead sources are accepted, so a typo can't spawn junk sheet tabs.
const ALLOWED_SOURCES = new Set([
  'coach_application',
  'contact_form',
  'crm_waitlist',
])

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'invalid_body' })
  }

  // Honeypot: a hidden field real users never fill. Bots do — pretend success
  // so they don't learn they were caught, but never forward the row.
  if (body._hp) return res.status(200).json({ ok: true })

  if (!ALLOWED_SOURCES.has(body.source)) {
    return res.status(400).json({ ok: false, error: 'invalid_source' })
  }

  if (!WEBHOOK_URL) {
    // Fail loudly rather than claim a success we can't deliver: with no sink the
    // lead would vanish. The form shows its retry state and nothing is lost.
    console.error('[lead] LEADS_WEBHOOK_URL is not configured')
    return res.status(503).json({ ok: false, error: 'not_configured' })
  }

  const lead = { ...body }
  delete lead._hp

  try {
    const upstream = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...lead,
        token: WEBHOOK_TOKEN,
        received_at: new Date().toISOString(),
      }),
    })
    if (!upstream.ok) {
      console.error('[lead] webhook responded', upstream.status)
      return res.status(502).json({ ok: false, error: 'upstream_error' })
    }
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[lead] webhook unreachable', err)
    return res.status(502).json({ ok: false, error: 'upstream_unreachable' })
  }
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
