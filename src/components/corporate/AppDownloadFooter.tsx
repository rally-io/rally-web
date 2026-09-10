import { useTranslation } from 'react-i18next'
import {
  APP_STORE_URL,
  PLAY_STORE_URL,
  APP_STORE_BADGE,
  PLAY_STORE_BADGE,
} from '@/lib/appLinks'

/**
 * Store links at the foot of the page, shared by both /join/<slug> modes.
 *
 * Deliberately framed as "keep playing after the tournament", not "track your
 * tournament here". In lead mode a signup creates no Rally account at all, so
 * there is nothing for that employee to log into. Tournament mode DOES create
 * one (the registration is a real row on a real account), but the tournament is
 * unlisted, so this footer is not the place to promise a bracket to follow. The
 * pitch that is true in BOTH modes is the one made here: courts, tournaments and
 * coaches to keep playing with after this event.
 */
export function AppDownloadFooter() {
  const { t } = useTranslation()
  return (
    <footer className="border-t border-rally-border px-4 py-10">
      <div className="mx-auto w-full max-w-xl text-center">
        <p className="inline-flex items-center gap-2 text-sm text-rally-text-2 mb-7">
          <img src="/rally-logo.jpg" alt="" aria-hidden className="h-5 w-auto rounded" />
          {t('corporate.managedBy')}
        </p>

        <p className="font-display font-bold text-rally-text">{t('corporate.appTitle')}</p>
        <p className="text-sm text-rally-text-2 mt-2 leading-relaxed">
          {t('corporate.appBody')}
        </p>
        <div className="flex items-center justify-center gap-3 mt-5">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <img src={APP_STORE_BADGE} alt="App Store" className="h-10" />
          </a>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <img src={PLAY_STORE_BADGE} alt="Google Play" className="h-10" />
          </a>
        </div>
      </div>
    </footer>
  )
}
