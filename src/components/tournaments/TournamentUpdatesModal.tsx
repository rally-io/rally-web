import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useRtl } from '@/hooks/useRtl'
import { supabase } from '@/lib/supabase'

const inputClass =
  'rounded-md bg-rally-surface-2 border border-rally-border text-rally-text text-base px-3 py-3 placeholder:text-rally-text-muted focus:outline-none focus:border-rally-accent focus:ring-4 focus:ring-rally-accent-dim transition-colors'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TournamentUpdatesModal({ open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const { isRTL } = useRtl()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return

    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()
    if (!trimmedEmail && !trimmedPhone) {
      setError(true)
      return
    }

    setSubmitting(true)

    const lead = {
      email: trimmedEmail || null,
      phone: trimmedPhone || null,
      source: 'tournament_updates',
      created_at: new Date().toISOString(),
    }

    // Safety net: persist locally so a subscriber is never silently lost.
    try {
      const existing = JSON.parse(localStorage.getItem('rallyUpdateLeads') || '[]')
      existing.push(lead)
      localStorage.setItem('rallyUpdateLeads', JSON.stringify(existing))
    } catch {
      // localStorage may be unavailable — non-fatal
    }

    // BACKEND-TODO (Shahaf): create Supabase table `update_leads` (see HANDOFF.md)
    // with INSERT policy for anon, plus email forwarding to info@rallypadel.app.
    try {
      const { error: insertError } = await supabase.from('update_leads').insert([lead])
      if (insertError) console.error('[update_leads] insert failed:', insertError.message)
    } catch (err) {
      console.error('[update_leads] insert threw:', err)
    }

    setSubmitted(true)
    setSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl bg-rally-surface border-rally-border">
        {submitted ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-rally-accent mb-4 mx-auto" />
            <h3 className="font-display text-2xl font-black text-rally-text mb-3">
              {t('updates.successTitle')}
            </h3>
            <p className="text-base text-rally-text-2 leading-relaxed">
              {t('updates.successMessage')}
            </p>
          </div>
        ) : (
          <>
            <DialogHeader className="text-center sm:text-center">
              <div className="mx-auto inline-flex items-center justify-center w-12 h-12 rounded-full bg-rally-accent/15 text-rally-accent mb-2">
                <Bell className="w-6 h-6" />
              </div>
              <DialogTitle className="font-display text-2xl font-black text-rally-text">
                {t('updates.title')}
              </DialogTitle>
              <DialogDescription className="text-rally-text-2 leading-relaxed">
                {t('updates.subtitle')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 mt-2">
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(false)
                }}
                placeholder={t('updates.emailPlaceholder')}
                className={cn(inputClass, 'w-full')}
              />
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir={isRTL ? 'rtl' : 'ltr'}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  setError(false)
                }}
                placeholder={t('updates.phonePlaceholder')}
                className={cn(inputClass, 'w-full')}
              />
              {error && (
                <p className="text-sm text-rally-error">{t('updates.atLeastOne')}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-full bg-rally-accent text-rally-accent-text font-display font-bold text-base shadow-glow-electric hover:bg-rally-accent-hover disabled:opacity-50 transition-colors"
              >
                {submitting ? t('updates.submitting') : t('updates.cta')}
              </button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function TournamentUpdatesTrigger({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full border border-rally-accent/50 bg-rally-accent/10 text-rally-accent font-bold text-sm sm:text-base hover:bg-rally-accent/20 hover:border-rally-accent hover:shadow-glow-electric transition-all"
    >
      <Bell className="w-4 h-4" />
      <span>{t('updates.trigger')}</span>
    </button>
  )
}
