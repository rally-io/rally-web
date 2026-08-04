// Catch-all for paths the website doesn't serve yet.
//
// Most visitors here didn't mistype: they opened a shared link for a coach, a
// class or a post on a desktop. The site only publishes tournaments today, so
// rather than a dead end this page hands them to the app — and the QR carries
// the path they were actually trying to reach, so scanning it opens the app on
// that thing instead of the home screen.
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Smartphone, Sparkles } from 'lucide-react'
import { AppHandoff } from '@/components/app-download/AppHandoff'

export default function NotFoundPage() {
  const { t, i18n } = useTranslation()
  const { pathname } = useLocation()

  // Hebrew has no case and reads worse tracked out, so the eyebrow's Latin
  // letter-spacing is LTR-only (same rule the app's store screen follows).
  const isRTL = i18n.language === 'he'

  return (
    <main className="flex-grow flex items-center justify-center pt-32 pb-24">
      <section className="container mx-auto px-4 flex flex-col items-center text-center">
        <div className="hero-rise hero-rise-1 inline-flex items-center justify-center w-24 h-24 rounded-full bg-rally-accent-dim text-rally-accent border border-rally-accent/30 shadow-glow-electric mb-6">
          <Smartphone className="w-11 h-11" />
        </div>

        <div
          className={`hero-rise hero-rise-2 inline-flex items-center gap-2 rounded-full border border-rally-accent/35 bg-rally-accent-dim px-4 py-1.5 mb-6 ${
            isRTL ? '' : 'tracking-wide'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-rally-accent" />
          <span className="text-xs font-bold text-rally-accent">{t('common.coming_soon')}</span>
        </div>

        <h1 className="hero-rise hero-rise-2 font-display text-4xl md:text-6xl font-black mb-5 text-rally-text max-w-3xl">
          {t('notFound.title')}
        </h1>
        <p className="hero-rise hero-rise-3 text-lg md:text-xl text-rally-text-2 max-w-xl mb-10">
          {t('notFound.body')}
        </p>

        <div className="hero-rise hero-rise-4 flex flex-col items-center gap-4 w-full max-w-md">
          <AppHandoff deepLinkPath={pathname} qrHint={t('notFound.qr_hint')} />
        </div>

        <Link
          to="/"
          className="hero-rise hero-rise-5 mt-10 text-rally-text-2 underline underline-offset-4 hover:text-rally-accent transition-colors"
        >
          {t('common.back_home')}
        </Link>
      </section>
    </main>
  )
}
