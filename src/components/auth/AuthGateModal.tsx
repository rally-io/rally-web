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
  // A first-time player arrives from a corporate /join link — open on the sign-up door.
  const initialMode = /^\/join\//i.test(location.pathname) ? 'signup' : 'signin'
  return <Dialog open={open} onOpenChange={(next) => { if (!next) cancel() }}>
    <DialogContent dir={i18n.dir()} className="bg-rally-surface border-rally-border w-[calc(100%_-_2rem)] max-w-md rounded-2xl max-h-[90dvh] overflow-y-auto p-0 [&_button]:min-h-11">
      <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-b from-rally-accent/15 to-transparent text-center sm:text-center">
        <DialogTitle className="text-xl font-bold text-rally-text">{t(tournament ? 'auth.gate.tournament_title' : 'auth.gate.modal_title')}</DialogTitle>
        <DialogDescription className="text-sm text-rally-text-2">{t(tournament ? 'auth.gate.tournament_subtitle' : 'auth.gate.modal_subtitle')}</DialogDescription>
      </DialogHeader>
      <div className="px-6 pb-6">
        {open && <AuthFlow next={safeReturnTo(location.pathname + location.search + location.hash)} onSuccess={confirmSignIn} onLeave={cancel} initialMode={initialMode} />}
        <LegalDisclaimer />
      </div>
    </DialogContent>
  </Dialog>
}
