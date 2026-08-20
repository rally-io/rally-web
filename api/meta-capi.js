// Meta Conversions API relay. The browser (src/lib/analytics.ts) POSTs every
// pixel event here with the same event_id it gave fbq, so Events Manager
// deduplicates the browser and server copies and we keep signal when the
// pixel is blocked (ad blockers, ITP).
//
// Requires META_CAPI_ACCESS_TOKEN in the Vercel environment — generated in
// Events Manager → the pixel's Settings → Conversions API → Generate access
// token. Without it the endpoint answers 204 and does nothing, so deploys
// never break on a missing secret.

const DATASET_ID = '1484965156419109'
const GRAPH_URL = `https://graph.facebook.com/v21.0/${DATASET_ID}/events`

const ALLOWED_EVENTS = new Set(['Lead', 'DownloadApp', 'PageView'])

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method not allowed' })
  }

  const token = process.env.META_CAPI_ACCESS_TOKEN
  if (!token) return res.status(204).end()

  const { event_name, event_id, event_source_url, fbp, fbc, custom_data } = req.body || {}
  if (!ALLOWED_EVENTS.has(event_name) || !event_id) {
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
  if (fbp) userData.fbp = fbp
  if (fbc) userData.fbc = fbc

  const payload = {
    data: [
      {
        event_name,
        event_time: Math.floor(Date.now() / 1000),
        event_id,
        action_source: 'website',
        event_source_url,
        user_data: userData,
        ...(custom_data ? { custom_data } : {}),
      },
    ],
  }

  try {
    const r = await fetch(`${GRAPH_URL}?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await r.json().catch(() => ({}))
    if (!r.ok) {
      console.error('[meta-capi] graph error', r.status, JSON.stringify(body).slice(0, 500))
      return res.status(502).json({ error: 'graph error' })
    }
    return res.status(200).json({ received: body.events_received ?? 1 })
  } catch (err) {
    console.error('[meta-capi] request failed', err)
    return res.status(502).json({ error: 'relay failed' })
  }
}
