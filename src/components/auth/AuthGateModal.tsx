import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useAuthGateInternals } from '@/contexts/AuthGateContext'
import { AuthFlow } from './AuthFlow'
import { LegalDisclaimer } from './LegalDisclaimer'
import { safeReturnTo } from '@/lib/authReturn'

export function AuthGateModal() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { open, cancel, confirmSignIn } = useAuthGateInternals()
  const tournament = /^\/tournaments\/[^/]+/.test(location.pathname)
  return <Dialog open={open} onOpenChange={(next) => { if (!next) cancel() }}>
    <DialogContent dir={i18n.dir()} className="bg-slate-900 border-white/10 w-[calc(100%_-_2rem)] max-w-md rounded-2xl max-h-[90dvh] overflow-y-auto [&_button]:min-h-11">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold text-slate-50">{t(tournament ? 'auth.gate.tournament_title' : 'auth.gate.modal_title')}</DialogTitle>
        <DialogDescription className="text-sm text-slate-400">{t(tournament ? 'auth.gate.tournament_subtitle' : 'auth.gate.modal_subtitle')}</DialogDescription>
      </DialogHeader>
      {open && <AuthFlow next={safeReturnTo(location.pathname + location.search + location.hash)} onSuccess={confirmSignIn} onLeave={cancel} />}
      <LegalDisclaimer />
    </DialogContent>
  </Dialog>
}
