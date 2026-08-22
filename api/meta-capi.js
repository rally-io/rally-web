// Meta Conversions API relay. The browser (src/lib/analytics.ts) POSTs every
// pixel event here with the same event_id it gave fbq, so Events Manager
// deduplicates the browser and server copies and we keep signal when the
// pixel is blocked (ad blockers, ITP).
//
// Config (Vercel project env vars):
//  - META_CAPI_ACCESS_TOKEN  generated in Events Manager → the pixel's
//                            Settings → Conversions API → Generate access
//                            token. Without it the endpoint answers 204 and
//                            does nothing, so deploys never break on a missing
//                            secret.
//  - META_CAPI_TEST_CODE     optional. The "Test events" code from Events
//                            Manager; while set, events show up in that tab so
//                            the relay can be verified, then unset it.

import { createHash } from 'node:crypto'

const DATASET_ID = '1484965156419109'
const GRAPH_URL = `https://graph.facebook.com/v21.0/${DATASET_ID}/events`

const ALLOWED_EVENTS = new Set(['Lead', 'DownloadApp', 'PageView'])

const sha256 = (value) => createHash('sha256').update(value, 'utf8').digest('hex')

// Meta requires lower-case trimmed emails and digit-only phones with country
// code, hashed with SHA-256. The browser already normalises; this is the
// backstop so a raw value never reaches the Graph API unhashed.
export function hashEmail(email) {
  if (typeof email !== 'string') return undefined
  const v = email.trim().toLowerCase()
  return v.includes('@') ? sha256(v) : undefined
}

export function hashPhone(phone) {
  if (typeof phone !== 'string') return undefined
  let digits = phone.replace(/\D/g, '')
  if (!digits) return undefined
  if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = `972${digits.slice(1)}`
  return digits.length >= 10 ? sha256(digits) : undefined
}

// fbc format per Meta docs: fb.<subdomain index>.<creation time ms>.<fbclid>
export function fbcFromClickId(fbclid) {
  if (typeof fbclid !== 'string' || !/^[\w-]{1,500}$/.test(fbclid)) return undefined
  return `fb.1.${Date.now()}.${fbclid}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method not allowed' })
  }

  const token = process.env.META_CAPI_ACCESS_TOKEN
  if (!token) return res.status(204).end()

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body
  const { event_name, event_id, event_source_url, fbp, fbc, fbclid, custom_data, user_data } =
    body || {}
  if (!ALLOWED_EVENTS.has(event_name) || typeof event_id !== 'string' || !event_id) {
    return res.status(400).json({ error: 'bad event' })
  }

  const clientIp =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    undefined

  const userData = {
    client_user_agent: req.headers['user-agent'],
    client_ip_address: clientIp,
  }
  if (typeof fbp === 'string' && fbp) userData.fbp = fbp
  const resolvedFbc = (typeof fbc === 'string' && fbc) || fbcFromClickId(fbclid)
  if (resolvedFbc) userData.fbc = resolvedFbc

  const em = hashEmail(user_data?.em)
  const ph = hashPhone(user_data?.ph)
  if (em) userData.em = [em]
  if (ph) userData.ph = [ph]

  const payload = {
    data: [
      {
        event_name,
        event_time: Math.floor(Date.now() / 1000),
        event_id,
        action_source: 'website',
        event_source_url,
        user_data: userData,
        ...(custom_data && typeof custom_data === 'object' ? { custom_data } : {}),
      },
    ],
  }
  const testCode = process.env.META_CAPI_TEST_CODE
  if (testCode) payload.test_event_code = testCode

  try {
    const r = await fetch(`${GRAPH_URL}?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await r.json().catch(() => ({}))
    if (!r.ok) {
      console.error('[meta-capi] graph error', r.status, JSON.stringify(result).slice(0, 500))
      return res.status(502).json({ error: 'graph error' })
    }
    return res.status(200).json({ received: result.events_received ?? 1 })
  } catch (err) {
    console.error('[meta-capi] request failed', err)
    return res.status(502).json({ error: 'relay failed' })
  }
}

function safeParse(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
