// Lead capture for the public marketing forms (coach applications, contact,
// and CRM waitlist).
//
// Posts to the same-origin `/api/lead` serverless proxy (see api/lead.ts),
// which forwards the row to a Google Sheet. Same origin means no CORS and no
// auth token — these are public, unauthenticated forms, so this deliberately
// does NOT go through the axios `client` (which attaches a Supabase token and
// points at the Rally API base URL).

export type LeadPayload = Record<string, unknown> & { source: string }

export async function submitLead(lead: LeadPayload): Promise<void> {
  // The Vite dev server (`npm run dev`) doesn't run Vercel functions, so
  // `/api/lead` 404s locally. Don't let that block UI work — the caller still
  // captures the lead in localStorage. Exercise the real path on a Vercel
  // preview deploy (or `vercel dev` + curl against /api/lead).
  if (import.meta.env.DEV) {
    console.info('[submitLead] dev mode — skipping POST /api/lead', lead)
    return
  }

  const res = await fetch('/api/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead),
  })

  if (!res.ok) {
    throw new Error(`lead submit failed (${res.status})`)
  }
}
