import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Download, FileCheck2 } from 'lucide-react'
import { RallyWordmark } from '@/components/corporate/RallyWordmark'
import { downloadCsv, formatAnswer, rosterToCsv } from '@/features/corporateDynamic/csv'
import { useRoster } from '@/features/corporateDynamic/hooks'

/**
 * /join/:slug/roster/:token — the HR roster. Read-only, behind the unguessable roster link, no
 * layout, noindex. The slug in the path is decoration (so the link reads like the event's); only
 * the token opens anything.
 */
export default function CorporateRosterPage() {
  const { token } = useParams<{ slug: string; token: string }>()
  const { t } = useTranslation()
  const { data: roster, isPending, isError } = useRoster(token)

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    const previous = document.title
    document.title = t('corporate.dyn.roster.title')
    return () => {
      meta.remove()
      document.title = previous
    }
  }, [t])

  if (isPending) {
    return (
      <main className="min-h-screen bg-rally-bg px-4 py-10">
        <div className="mx-auto max-w-5xl h-64 rounded-2xl bg-rally-surface animate-pulse" data-testid="roster-loading" />
      </main>
    )
  }

  if (isError || !roster) {
    return (
      <main className="min-h-screen bg-rally-bg px-4 py-16">
        <div className="mx-auto max-w-md rounded-2xl bg-rally-surface border border-rally-border p-8 text-center" role="alert">
          <h1 className="font-display text-xl font-black text-rally-text mb-2">{t('corporate.dyn.roster.notFoundTitle')}</h1>
          <p className="text-sm text-rally-text-2">{t('corporate.dyn.roster.notFoundBody')}</p>
        </div>
      </main>
    )
  }

  const questions = roster.questions.filter((q) => !q.archived)
  const labels = { yes: t('corporate.dyn.roster.yes'), no: t('corporate.dyn.roster.no') }
  const statusLabel = (s: 'confirmed' | 'waitlisted') => t(`corporate.dyn.roster.status.${s}`)

  function handleDownload() {
    if (!roster) return
    const csv = rosterToCsv(roster, {
      ...labels,
      category: t('corporate.dyn.roster.category'),
      status: t('corporate.dyn.roster.statusCol'),
      statusValues: { confirmed: statusLabel('confirmed'), waitlisted: statusLabel('waitlisted') },
      firstName: t('corporate.reg.firstName'),
      lastName: t('corporate.reg.lastName'),
      phone: t('corporate.dyn.roster.phone'),
      email: t('corporate.email'),
      level: t('corporate.dyn.roster.level'),
      partner: t('corporate.dyn.roster.partner'),
      documents: t('corporate.dyn.roster.documents'),
      registeredAt: t('corporate.dyn.roster.registeredAt'),
    })
    const safeName = roster.event_name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'roster'
    downloadCsv(`${safeName}-roster.csv`, csv)
  }

  return (
    <main className="min-h-screen bg-rally-bg px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display text-sm font-bold text-rally-accent" dir="auto">{roster.customer_name}</p>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-rally-text" dir="auto">{roster.event_name}</h1>
            <p className="mt-1 text-xs text-rally-text-muted">
              {t('corporate.dyn.roster.count', { n: roster.rows.length })} ·{' '}
              <bdi dir="ltr">{new Date(roster.generated_at).toLocaleString()}</bdi>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <RallyWordmark className="h-9 sm:h-10" />
            <button
              type="button" onClick={handleDownload}
              className="h-11 px-4 rounded-lg bg-rally-accent text-rally-accent-text text-sm font-bold inline-flex items-center gap-2 hover:bg-rally-accent-hover transition-colors"
            >
              <Download className="w-4 h-4" aria-hidden />
              {t('corporate.dyn.roster.download')}
            </button>
          </div>
        </header>

        {roster.rows.length === 0 ? (
          <p className="rounded-2xl bg-rally-surface border border-rally-border p-8 text-center text-sm text-rally-text-2">{t('corporate.dyn.roster.empty')}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-rally-border bg-rally-surface">
            <table className="w-full min-w-[720px] text-sm text-start">
              <thead className="bg-rally-surface-2 text-xs text-rally-text-muted">
                <tr>
                  {[
                    t('corporate.dyn.roster.category'), t('corporate.dyn.roster.statusCol'), t('corporate.dyn.roster.name'),
                    t('corporate.dyn.roster.phone'), t('corporate.email'), t('corporate.dyn.roster.level'), t('corporate.dyn.roster.partner'),
                    ...questions.map((q) => q.label), t('corporate.dyn.roster.documents'),
                  ].map((h, i) => <th key={i} scope="col" className="px-3 py-2.5 text-start font-bold whitespace-nowrap" dir="auto">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-rally-border-subtle text-rally-text">
                {roster.rows.map((row, i) => (
                  <tr key={i} className="align-top">
                    <td className="px-3 py-2.5" dir="auto">{row.category}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{statusLabel(row.status)}</td>
                    <td className="px-3 py-2.5" dir="auto">{`${row.first_name} ${row.last_name}`.trim()}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap"><bdi dir="ltr">{row.phone}</bdi></td>
                    <td className="px-3 py-2.5"><bdi dir="ltr">{row.email ?? ''}</bdi></td>
                    <td className="px-3 py-2.5"><bdi dir="ltr">{row.skill_level ?? ''}</bdi></td>
                    <td className="px-3 py-2.5" dir="auto">{row.partner_name ?? ''}</td>
                    {questions.map((q) => <td key={q.id} className="px-3 py-2.5" dir="auto">{formatAnswer(row.answers[q.id], q, labels)}</td>)}
                    <td className="px-3 py-2.5">
                      {row.has_documents
                        ? <span className="inline-flex items-center gap-1 text-rally-success"><FileCheck2 className="w-4 h-4" aria-hidden />{labels.yes}</span>
                        : <span className="text-rally-text-muted">{labels.no}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
