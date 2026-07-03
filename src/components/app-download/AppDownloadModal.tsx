// "Continue in the app" modal — the only action offered for register/book/pay
// on web now that all transactional flows live in the mobile app.
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Check } from 'lucide-react'
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
   * Optional in-app route (e.g. `/tournaments/<id>`). When set, the modal
   * carries the entity's OneLink everywhere: mobile gets a primary
   * "Open in the app" button, desktop gets a scannable QR + copy-link row,
   * and the store badges point at the OneLink instead of the plain stores.
   */
  deepLinkPath?: string
}

export function AppDownloadModal({ open, onOpenChange, variant, deepLinkPath }: Props) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const link = deepLinkPath ? buildAppDeepLink(deepLinkPath) : null
  const mobile = isMobileDevice()

  // Reset the copied indicator whenever the modal closes/reopens.
  useEffect(() => {
    if (!open) setCopied(false)
  }, [open])

  const handleCopy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable (permissions/old browser) — leave button as-is.
    }
  }

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

        {link && mobile && (
          <a
            href={link}
            className="mx-auto inline-flex h-12 w-full max-w-xs items-center justify-center rounded-full bg-rally-accent px-8 font-bold text-rally-accent-text hover:bg-rally-accent-hover transition-colors"
          >
            {t('appDownload.open_in_app')}
          </a>
        )}

        {link && !mobile && (
          <div className="flex flex-col items-center gap-3">
            <div
              role="img"
              aria-label={t('appDownload.qr_hint')}
              className="rounded-2xl bg-white p-3"
            >
              <QRCodeSVG value={link} size={140} />
            </div>
            <p className="text-rally-text-2 text-sm text-center max-w-[260px]">
              {t('appDownload.qr_hint')}
            </p>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-full border border-rally-border px-5 h-10 text-sm font-semibold text-rally-text hover:border-rally-accent/60 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-rally-accent" /> : <Copy className="w-4 h-4" />}
              {copied ? t('appDownload.copied') : t('appDownload.copy_link')}
            </button>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-3 pt-2 pb-1">
          <a
            href={link ?? APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:scale-105 transition-transform"
          >
            <img src={APP_STORE_BADGE} alt="App Store" className="h-11" />
          </a>
          <a
            href={link ?? PLAY_STORE_URL}
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
