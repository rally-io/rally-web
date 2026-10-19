import { MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

/** The one-time note on the first deck: a match can message you on WhatsApp. Escape and a
    click outside close it like Got it does. */
export function PartnerNoteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        data-testid="partner-note-dialog"
        className="flex w-[calc(100%-2rem)] max-w-sm flex-col items-center gap-3 rounded-[28px] border-rally-border bg-rally-surface p-6 text-center"
      >
        <MessageCircle aria-hidden className="h-10 w-10 text-rally-accent" />
        <DialogTitle className="font-display text-xl font-black text-rally-text">{t('partners.whatsappNote.title')}</DialogTitle>
        <DialogDescription className="text-[15px] text-rally-text-2">{t('partners.whatsappNote.body')}</DialogDescription>
        <button
          type="button"
          onClick={onClose}
          data-testid="partner-note-ok"
          className="mt-2 min-h-12 w-full rounded-full bg-rally-accent px-5 text-[15px] font-extrabold text-rally-accent-text transition hover:brightness-110"
        >
          {t('partners.whatsappNote.ok')}
        </button>
      </DialogContent>
    </Dialog>
  )
}
