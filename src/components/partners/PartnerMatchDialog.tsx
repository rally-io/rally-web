import { useTranslation } from 'react-i18next'
import { Avatar } from '@/components/tournaments/Avatar'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { PartnerMatch } from '@/types/partnerPool'
import { PadelBall } from './PadelBall'
import { PartnerMatchActions } from './PartnerMatchActions'

interface PartnerMatchDialogProps {
  /** null: closed */
  match: PartnerMatch | null
  tournamentTitle: string
  onRegisterTogether: (match: PartnerMatch) => void
  onWhatsApp: (match: PartnerMatch) => void
  onClose: () => void
}

/** "It's a match!", above everything else (ported from rally-mobile's PartnerMatchSheet).
    Escape and a click outside close it like Keep swiping does. */
export function PartnerMatchDialog({ match, tournamentTitle, onRegisterTogether, onWhatsApp, onClose }: PartnerMatchDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={match !== null} onOpenChange={(open) => !open && onClose()}>
      {match && (
        <DialogContent
          showCloseButton={false}
          data-testid="partner-match-dialog"
          className="flex w-[calc(100%-2rem)] max-w-sm flex-col items-center gap-4 rounded-[28px] border-rally-border bg-rally-surface p-6 text-center"
        >
          <PadelBall className="h-11 w-11 text-rally-accent" />
          <DialogTitle className="font-display text-[30px] font-black text-rally-accent">{t('partners.match.title')}</DialogTitle>
          <Avatar name={match.player.name} src={match.player.avatar_url} size={88} />
          <DialogDescription dir="auto" className="text-base text-rally-text">
            {t('partners.match.body', { name: match.player.name, tournament: tournamentTitle })}
          </DialogDescription>
          <PartnerMatchActions
            match={match}
            onRegisterTogether={() => onRegisterTogether(match)}
            onWhatsApp={() => onWhatsApp(match)}
          />
          <button
            type="button"
            onClick={onClose}
            data-testid="partner-match-keep"
            className="min-h-11 px-4 text-[15px] font-bold text-rally-text-2 transition hover:text-rally-text"
          >
            {t('partners.match.keepSwiping')}
          </button>
        </DialogContent>
      )}
    </Dialog>
  )
}
