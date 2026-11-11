import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import i18n from '@/i18n'
import { AppDownloadFooter } from '@/components/corporate/AppDownloadFooter'
import { EventTerms } from '@/components/corporate/EventTerms'
import { EventBanner } from '@/features/corporateDynamic/components/EventBanner'
import { CategoriesSection, DateCard, VenueSection } from '@/features/corporateDynamic/components/EventFacts'
import { RegisteredCard, type PendingEvidence } from '@/features/corporateDynamic/components/RegisteredCard'
import { RegistrationForm, type RegisteredPayload } from '@/features/corporateDynamic/components/RegistrationForm'
import { accentStyle } from '@/features/corporateDynamic/accent'
import { headingFor, pageTitleFor } from '@/features/corporateDynamic/hero'
import { Markdown } from '@/features/corporateDynamic/markdown'
import { termsSectionsFromMarkdown } from '@/features/corporateDynamic/markdownText'
import {
  clearStoredRegistration, readStoredRegistration, writeStoredRegistration, type StoredRegistration,
} from '@/features/corporateDynamic/storage'
import { findComponent, type PublicCorporateEvent } from '@/features/corporateDynamic/types'

/** Adopt the event's language unless the visitor picked one themselves (rallyLang, set by the navbar). */
function useEventLanguage(locale: 'he' | 'en') {
  useEffect(() => {
    let chosen: string | null = null
    try { chosen = localStorage.getItem('rallyLang') } catch { /* storage blocked */ }
    if (!chosen && i18n.language !== locale) void i18n.changeLanguage(locale)
  }, [locale])
}

/** noindex + the page title, restored on unmount. */
function usePageMeta(title: string) {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    const previous = document.title
    document.title = title
    return () => {
      meta.remove()
      document.title = previous
    }
  }, [title])
}

/** True while any part of `ref`'s element is on screen. Without IntersectionObserver (old browsers, jsdom) it stays false. */
function useInView(ref: RefObject<Element | null>, watch: unknown): boolean {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(false)
      return
    }
    const observer = new IntersectionObserver((entries) => setInView(entries.some((e) => e.isIntersecting)))
    observer.observe(el)
    return () => observer.disconnect()
    // `watch` re-attaches when the observed element is swapped (form <-> closed card).
  }, [ref, watch])
  return inView
}

/**
 * /join/<slug> for an event built in the CRM. It is laid out like TournamentDetailPage — banner,
 * club pill + title, date card, About, Category fact cards, rules, then the register panel with a
 * sticky register bar — because that is what a tournament looks like to the same visitors.
 *
 * Guests register without a Rally account, so none of the sign-in, profile, partner-search or
 * payment machinery of the tournament flow applies: the register panel is one anonymous form.
 */
export default function CorporateDynamicPage({ event }: { event: PublicCorporateEvent }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const cfg = event.landing_config
  useEventLanguage(cfg.locale)
  usePageMeta(pageTitleFor(event))

  const heading = headingFor(event)
  const intro = findComponent(cfg, 'intro')
  const terms = findComponent(cfg, 'terms')
  const registrationOn = Boolean(findComponent(cfg, 'registration')?.enabled)
  const startedAtMs = useRef(Date.now()).current

  const [registration, setRegistration] = useState<StoredRegistration | null>(() => readStoredRegistration(event.slug))
  const [pending, setPending] = useState<PendingEvidence | undefined>(undefined)
  const [showForm, setShowForm] = useState(false)
  const [closedLocally, setClosedLocally] = useState(false)

  const handleRegistered = useCallback(({ result, evidence, slots }: RegisteredPayload) => {
    const stored = { registration_id: result.registration_id, access_token: result.access_token }
    // Best effort: without storage the card still shows for this visit, a reload just shows the form.
    writeStoredRegistration(event.slug, stored)
    setPending({ files: evidence, slots })
    setRegistration(stored)
    setShowForm(false)
    window.scrollTo?.({ top: 0 })
  }, [event.slug])

  const handleInvalidToken = useCallback(() => {
    clearStoredRegistration(event.slug)
    setRegistration(null)
    setPending(undefined)
  }, [event.slug])

  const handleClosed = useCallback(() => {
    setClosedLocally(true)
    void queryClient.invalidateQueries({ queryKey: ['corporate-event', event.slug] })
  }, [queryClient, event.slug])

  const open = event.state === 'open' && !closedLocally
  const showCard = registration !== null && !showForm
  const allFull = event.categories.length > 0 && event.categories.every((c) => c.is_full)
  const termsSections = terms?.enabled && terms.body_md.trim()
    ? termsSectionsFromMarkdown(terms.body_md, terms.title || t('corporate.terms.title'))
    : []

  const registerRef = useRef<HTMLElement>(null)
  // The sticky bar is only for getting TO the form: once the form is on screen its own submit is the one button.
  const formInView = useInView(registerRef, `${showCard}-${open}`)
  const style = accentStyle(cfg.accent)

  const scrollToRegister = () => document.getElementById('register')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })

  // After registering (and on every later visit with the stored token) the page IS the confirmation:
  // no banner, facts, form or register bar — the status, the manager's message, any documents still
  // to upload, and one small link back to the form.
  if (registrationOn && showCard) {
    return (
      <main style={style} className="min-h-screen bg-rally-bg flex items-center justify-center px-4 py-10" data-testid="confirmation-screen">
        <div className="w-full max-w-xl">
          <RegisteredCard
            event={event}
            registration={registration}
            pendingEvidence={pending}
            onRegisterAnother={() => { setShowForm(true); setPending(undefined) }}
            onInvalidToken={handleInvalidToken}
          />
        </div>
      </main>
    )
  }

  return (
    <main style={style} className="min-h-screen bg-rally-bg pb-28">
      <EventBanner imageUrl={heading.imageUrl} logoUrl={heading.logoUrl} alt={heading.title} logoAlt={event.customer_name} tinted={Boolean(style)} />

      <header className="container mx-auto px-4 max-w-3xl mt-6 md:mt-8">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rally-accent/40 bg-rally-accent/10 text-rally-accent px-3 py-1.5 text-xs md:text-sm font-bold">
            <Lock className="w-3.5 h-3.5" aria-hidden />
            {t('corporate.eyebrow')}
          </span>
          {event.club_name && (
            <span className="inline-block rounded-full bg-rally-accent/15 text-rally-accent px-4 py-1.5 text-sm md:text-base font-semibold">
              {event.club_name}
            </span>
          )}
        </div>
        <p dir="auto" className="mt-4 font-display text-sm md:text-base font-bold text-rally-accent">{event.customer_name}</p>
        <h1 dir="auto" className="font-display mt-1 text-3xl md:text-5xl font-black tracking-tight leading-[1.1] text-rally-text whitespace-pre-line">
          {heading.title}
        </h1>
        {heading.subtitle && <p dir="auto" className="mt-3 text-base md:text-lg text-rally-text-2">{heading.subtitle}</p>}
      </header>

      <div className="container mx-auto px-4 max-w-3xl space-y-10 mt-8">
        <DateCard event={event} />

        {intro?.enabled && intro.body_md.trim() && (
          <section>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-rally-text mb-4">{t('tournament.tournamentDetailAbout')}</h2>
            <Markdown
              source={intro.body_md}
              className="space-y-3 text-rally-text-2 text-base md:text-lg leading-relaxed max-w-prose border-e-2 border-rally-accent/40 pe-5"
            />
          </section>
        )}

        <VenueSection event={event} />

        <CategoriesSection categories={event.categories} />

        {termsSections.length > 0 && (
          <EventTerms dir={cfg.locale === 'en' ? 'ltr' : 'rtl'} sections={termsSections} />
        )}

        {registrationOn && (
          <section id="register" ref={registerRef} className="scroll-mt-6">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-rally-text mb-5">{t('corporate.reg.formTitle')}</h2>
            {open ? (
              <RegistrationForm event={event} startedAtMs={startedAtMs} onRegistered={handleRegistered} onClosed={handleClosed} />
            ) : (
              <ClosedCard state={closedLocally ? 'closed' : event.state} />
            )}
          </section>
        )}
      </div>

      <AppDownloadFooter />

      {registrationOn && !formInView && (
        // Same sticky bar as the tournament page: action-first, never blocking — it scrolls to the
        // register panel. There is no entry fee to show (the company pays outside the system).
        <div className="fixed bottom-0 inset-x-0 z-10 bg-rally-bg/95 backdrop-blur border-t border-rally-border">
          <div className="container mx-auto max-w-3xl px-4 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-rally-text-muted">{t('corporate.eyebrow')}</p>
              <p dir="auto" className="text-lg md:text-2xl font-black text-rally-accent truncate">{event.customer_name}</p>
            </div>
            {!open ? (
              <button disabled className="shrink-0 min-w-[160px] h-12 rounded-full bg-rally-accent text-rally-accent-text font-bold opacity-40">
                {t('tournament.tournamentDetailRegistrationClosed')}
              </button>
            ) : allFull ? (
              <button
                onClick={scrollToRegister}
                className="shrink-0 min-w-[160px] md:min-w-[200px] px-6 h-12 md:h-14 rounded-full border-2 border-rally-accent text-rally-accent font-bold hover:bg-rally-accent/10 transition-all"
              >
                {t('tournament.tournamentJoinWaitlist')}
              </button>
            ) : (
              <button
                onClick={scrollToRegister}
                className="shrink-0 min-w-[160px] md:min-w-[200px] px-6 h-12 md:h-14 rounded-full bg-rally-accent text-rally-accent-text font-bold hover:bg-rally-accent-hover hover:shadow-glow-electric transition-all"
              >
                {t('tournament.tournamentDetailRegisterNow')}
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

function ClosedCard({ state }: { state: PublicCorporateEvent['state'] }) {
  const { t } = useTranslation()
  const key = state === 'open' ? 'closed' : state
  return (
    <div className="rounded-2xl bg-rally-surface border border-rally-border p-8 text-center" role="status" data-testid={`event-state-${key}`}>
      <Lock className="w-10 h-10 text-rally-text-muted mb-4 mx-auto" aria-hidden />
      <h2 className="font-display text-xl font-black text-rally-text mb-2">{t(`corporate.dyn.state.${key}.title`)}</h2>
      <p className="text-sm text-rally-text-2 leading-relaxed">{t(`corporate.dyn.state.${key}.body`)}</p>
    </div>
  )
}
