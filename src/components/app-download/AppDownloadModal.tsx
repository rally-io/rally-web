// "Continue in the app" modal — the only action offered for register/book/pay
// on web now that all transactional flows live in the mobile app.
// The device-specific handoff itself lives in <AppHandoff/>, shared with the
// coming-soon page so both offer the same routes into the app.
import { useTranslation } from 'react-i18next'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { AppHandoff } from './AppHandoff'

export type AppDownloadVariant = 'register' | 'book' | 'pay' | 'join'

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

        <AppHandoff deepLinkPath={deepLinkPath} />
      </DialogContent>
    </Dialog>
  )
}
