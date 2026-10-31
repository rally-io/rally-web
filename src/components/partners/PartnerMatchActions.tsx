import { MessageCircle, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { registerStateOf } from '@/lib/partners/matchActions'
import type { PartnerMatch } from '@/types/partnerPool'

interface PartnerMatchActionsProps {
  match: PartnerMatch
  onRegisterTogether: () => void
  onWhatsApp: () => void
}

/** Register together (while both are free) and WhatsApp (when there is a number). Ported
    from rally-mobile's PartnerMatchActions. */
export function PartnerMatchActions({ match, onRegisterTogether, onWhatsApp }: PartnerMatchActionsProps) {
  const { t } = useTranslation()
  const state = registerStateOf(match)

  return (
    <div className="flex w-full flex-col gap-2.5">
      {state === 'register' && (
        <button
          type="button"
          onClick={onRegisterTogether}
          data-testid="partner-match-register"
          className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-rally-accent px-4 text-[15px] font-extrabold text-rally-accent-text transition hover:brightness-110"
        >
          <Users className="h-[18px] w-[18px]" />
          {t('partners.match.register')}
        </button>
      )}
      {state === 'already' && (
        <p data-testid="partner-match-already" className="text-[13px] text-rally-text-2">
          {t('partners.match.alreadyRegistered', { name: match.player.name })}
        </p>
      )}
      {match.whatsapp_url ? (
        <button
          type="button"
          onClick={onWhatsApp}
          data-testid="partner-match-whatsapp"
          className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-rally-border px-4 text-[15px] font-extrabold text-rally-text transition hover:border-rally-accent/50"
        >
          <MessageCircle className="h-[18px] w-[18px]" />
          {t('partners.match.whatsapp')}
        </button>
      ) : (
        <p data-testid="partner-match-no-phone" className="text-[13px] text-rally-text-2">
          {t('partners.match.noPhone')}
        </p>
      )}
    </div>
  )
}
