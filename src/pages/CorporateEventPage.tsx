import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getCorporateEvent } from '@/constants/corporateEvents'
import { useCorporateEventConfig } from '@/features/corporateDynamic/hooks'
import CorporateSignupPage from './CorporateSignupPage'
import CorporateRegistrationPage from './CorporateRegistrationPage'
import CorporateHubPage from './CorporateHubPage'
import CorporateDynamicPage from './CorporateDynamicPage'

/**
 * /join/:slug — one private link per corporate event.
 *
 * API-FIRST: an event built in the CRM (GET /public/corporate-events/{slug} -> 200) renders the
 * dynamic page. A 404 — or any failure of that call — falls back to the hardcoded registry, so
 * every legacy entry keeps working: lead mode is the original sheet-backed signup; tournament
 * mode registers and pays on a real tournament; hub mode links to the tournament-mode pages of
 * an event split into level categories. A slug in neither falls through to the lead page, which
 * renders the not-found card without confirming which slugs exist.
 *
 * While the API answers, a neutral loader shows — never "not found", which would flash on every
 * dynamic event's first paint.
 */
export default function CorporateEventPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: config, isPending, isError, refetch } = useCorporateEventConfig(slug)
  const legacy = getCorporateEvent(slug)

  if (slug && isPending) {
    return (
      <main className="min-h-screen bg-rally-bg flex items-center justify-center" aria-busy="true">
        <div className="h-10 w-10 rounded-full border-2 border-rally-border border-t-rally-accent animate-spin" data-testid="corporate-event-loading" role="status" />
      </main>
    )
  }

  if (config) return <CorporateDynamicPage event={config} />

  if (legacy?.mode === 'hub') return <CorporateHubPage event={legacy} />
  if (legacy?.mode === 'tournament') return <CorporateRegistrationPage event={legacy} />
  if (legacy) return <CorporateSignupPage />

  // Not a legacy slug, and the API did not answer 404: it is down, not "no such event".
  if (isError) return <ConfigError onRetry={() => void refetch()} />
  return <CorporateSignupPage />
}

function ConfigError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <main className="min-h-screen bg-rally-bg px-4 py-16">
      <div className="mx-auto max-w-md rounded-2xl bg-rally-surface border border-rally-border p-8 text-center space-y-4" role="alert">
        <p className="text-sm text-rally-text-2">{t('corporate.dyn.loadError')}</p>
        <button type="button" onClick={onRetry} className="text-sm font-display font-bold text-rally-accent">{t('corporate.reg.retry')}</button>
      </div>
    </main>
  )
}
