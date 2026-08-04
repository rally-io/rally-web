// How the web hands a visitor off to the mobile app, in one place.
//
// The shape depends on the device, because the useful action does:
//   • phone   → tap through to the app (or the store if it isn't installed)
//   • desktop → scan a code with the phone you'd actually open the app on,
//               or copy the link to send yourself
//
// When `deepLinkPath` is set, every route out of here — QR, badges, button —
// carries the OneLink for that in-app path, so the app opens ON the thing the
// visitor came for instead of the home screen.
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Check } from 'lucide-react'
import {
  APP_STORE_URL, PLAY_STORE_URL, APP_STORE_BADGE, PLAY_STORE_BADGE,
  buildAppDeepLink, isMobileDevice,
} from '@/lib/appLinks'

interface Props {
  /** In-app route, e.g. `/coaches/<id>`. Omit for a plain "get the app" handoff. */
  deepLinkPath?: string
  /** Overrides the QR caption. Defaults to the tournament-specific copy. */
  qrHint?: string
}

export function AppHandoff({ deepLinkPath, qrHint }: Props) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const link = deepLinkPath ? buildAppDeepLink(deepLinkPath) : null
  const mobile = isMobileDevice()
  const hint = qrHint ?? t('appDownload.qr_hint')

  // Don't leave a stale "Copied!" behind when the link changes.
  useEffect(() => setCopied(false), [link])

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
    <>
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
          {/* White plate: QR readers need the light quiet zone, so this stays
              light-on-dark by design rather than following the dark surface. */}
          <div role="img" aria-label={hint} className="rounded-2xl bg-white p-3">
            <QRCodeSVG value={link} size={140} />
          </div>
          <p className="text-rally-text-2 text-sm text-center max-w-[260px]">{hint}</p>
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
    </>
  )
}
