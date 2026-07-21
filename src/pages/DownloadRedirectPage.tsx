import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/constants/appLinks'
import { useDevicePlatform } from '@/hooks/useDevicePlatform'

/**
 * Universal smart download link: rallypadel.app/download
 * Phones are redirected straight to their store; desktop visitors
 * get both store options. Safe to use as the single URL in ads / QR codes.
 */
export default function DownloadRedirectPage() {
  const { t } = useTranslation()
  const platform = useDevicePlatform()

  useEffect(() => {
    if (platform === 'android') window.location.replace(GOOGLE_PLAY_URL)
    if (platform === 'ios') window.location.replace(APP_STORE_URL)
  }, [platform])

  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-20 text-center">
      {platform === 'desktop' ? (
        <>
          <h1 className="font-display text-3xl sm:text-5xl font-black tracking-tight mb-4">
            {t('home.downloadTitle')}
          </h1>
          <p className="text-base sm:text-lg text-rally-text-2 max-w-md mx-auto mb-8">
            {t('home.downloadSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 w-56 px-6 py-3.5 rounded-full bg-rally-accent text-rally-accent-text font-bold hover:bg-rally-accent-hover shadow-glow-electric transition-all"
            >
              {t('home.appStoreLabel')}
            </a>
            <a
              href={GOOGLE_PLAY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 w-56 px-6 py-3.5 rounded-full border border-rally-accent/50 text-rally-accent font-bold hover:bg-rally-accent/10 transition-all"
            >
              {t('home.googlePlayLabel')}
            </a>
          </div>
        </>
      ) : (
        <p className="text-lg text-rally-text-2">{t('home.downloadRedirecting')}</p>
      )}
    </main>
  )
}
