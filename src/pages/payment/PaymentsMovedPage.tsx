// Graceful landing for legacy /payment-method bookmarks and deep links —
// web no longer initiates payments; everything happens in the mobile app.
import { useTranslation } from 'react-i18next'
import {
  APP_STORE_URL, PLAY_STORE_URL, APP_STORE_BADGE, PLAY_STORE_BADGE,
} from '@/lib/appLinks'

export default function PaymentsMovedPage() {
  const { t } = useTranslation()

  return (
    <main className="min-h-screen bg-rally-bg flex items-center justify-center px-4">
      <div className="container max-w-md mx-auto text-center space-y-6">
        <h1 className="font-display text-3xl font-black text-rally-text">
          {t('appDownload.movedTitle')}
        </h1>
        <p className="text-rally-text-2">{t('appDownload.body')}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:scale-105 transition-transform"
          >
            <img src={APP_STORE_BADGE} alt="App Store" className="h-11" />
          </a>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:scale-105 transition-transform"
          >
            <img src={PLAY_STORE_BADGE} alt="Google Play" className="h-11" />
          </a>
        </div>
      </div>
    </main>
  )
}
