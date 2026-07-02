// "Continue in the app" modal — the only action offered for register/book/pay
// on web now that all transactional flows live in the mobile app.
import { useTranslation } from 'react-i18next'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  APP_STORE_URL, PLAY_STORE_URL, APP_STORE_BADGE, PLAY_STORE_BADGE,
  buildAppDeepLink, isMobileDevice,
} from '@/lib/appLinks'

export type AppDownloadVariant = 'register' | 'book' | 'pay'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant: AppDownloadVariant
  /**
   * Optional in-app route (e.g. `/tournaments/<id>`). On mobile devices this
   * adds a primary "Open in the app" OneLink that deep-links straight to the
   * entity; on desktop only the store badges show (a forced deep link there
   * just bounces to a fallback).
   */
  deepLinkPath?: string
}

export function AppDownloadModal({ open, onOpenChange, variant, deepLinkPath }: Props) {
  const { t } = useTranslation()
  const showDeepLink = !!deepLinkPath && isMobileDevice()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl bg-rally-surface border-rally-border">
        <DialogHeader className="sm:text-center text-center">
          <DialogTitle className="font-display text-2xl font-black text-rally-text">
            {t(`appDownload.title_${variant}`)}
          </DialogTitle>
          <DialogDescription className="text-rally-text-2 text-base">
            {t('appDownload.body')}
          </DialogDescription>
        </DialogHeader>
        {showDeepLink && (
          <a
            href={buildAppDeepLink(deepLinkPath)}
            className="mx-auto inline-flex h-12 w-full max-w-xs items-center justify-center rounded-full bg-rally-accent px-8 font-bold text-rally-accent-text hover:bg-rally-accent-hover transition-colors"
          >
            {t('appDownload.open_in_app')}
          </a>
        )}
        <div className="flex flex-wrap justify-center gap-3 pt-2 pb-1">
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
      </DialogContent>
    </Dialog>
  )
}
