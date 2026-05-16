import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Calendar as CalendarIcon,
  MapPin,
  Trophy,
  Users,
  UserPlus,
  Plus,
  Check,
  ChevronLeft,
  Info,
  CreditCard,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProfileCompletionModal, type MissingField } from '@/components/profile/ProfileCompletionModal'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet'
import { useRegisterTournament } from '@/hooks/useRegisterTournament'
import type { Tournament, TournamentRegistrationRequest } from '@/types/api'

interface TournamentRegistrationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tournament: Tournament
  onSuccess?: () => void
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function TournamentRegistration({
  open,
  onOpenChange,
  tournament,
  onSuccess,
}: TournamentRegistrationProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const registerMutation = useRegisterTournament()

  const format = tournament.format ?? 'doubles'
  const isSingles = format === 'singles'
  const allowedPartnerTypes = isSingles ? (['none'] as const) : (['none', 'existing', 'invite'] as const)

  const [partnerType, setPartnerType] = useState<'none' | 'existing' | 'invite'>(allowedPartnerTypes[0])
  const [partnerPlayerId, setPartnerPlayerId] = useState('')
  const [invite, setInvite] = useState({ firstName: '', lastName: '', phone: '', country: '+972' })
  const [paymentChoice, setPaymentChoice] = useState<'full' | 'half'>('full')
  const [useCredits, setUseCredits] = useState(false)
  const [error, setError] = useState('')
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [missingFields, setMissingFields] = useState<MissingField[]>([])

  const fee = tournament.entry_fee ?? 0
  const totalAmount = isSingles ? fee : fee * 2
  const myAmount = paymentChoice === 'full' || isSingles ? totalAmount : fee
  const locale = i18n.language?.startsWith('he') ? 'he-IL' : 'en-US'
  const currencyFmt = new Intl.NumberFormat(locale, { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 })
  const formatAmount = (n: number) => currencyFmt.format(n)

  const buildPayload = (): TournamentRegistrationRequest => ({
    partner_type: partnerType,
    partner_player_id: partnerType === 'existing' ? partnerPlayerId.trim() || null : null,
    invite_first_name: partnerType === 'invite' ? invite.firstName.trim() || null : null,
    invite_last_name: partnerType === 'invite' ? invite.lastName.trim() || null : null,
    invite_phone: partnerType === 'invite' ? invite.phone.trim() || null : null,
    invite_country_code: partnerType === 'invite' ? invite.country.trim() || null : null,
    use_credits: useCredits,
  })

  const validateLocal = (): string | null => {
    if (partnerType === 'existing' && !UUID_RE.test(partnerPlayerId.trim())) {
      return t('tournaments.invalid_partner_id')
    }
    if (partnerType === 'invite') {
      if (!invite.firstName.trim() || !invite.lastName.trim() || !invite.phone.trim() || !invite.country.trim()) {
        return t('tournaments.invite_fields_required')
      }
    }
    return null
  }

  const submit = async () => {
    setError('')
    const localError = validateLocal()
    if (localError) {
      setError(localError)
      return
    }
    try {
      await registerMutation.mutateAsync({ tournamentId: tournament.id, data: buildPayload() })
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      if (err?.isProfileFieldsRequired) {
        setMissingFields(err.details?.missing_fields ?? [])
        setProfileModalOpen(true)
        return
      }
      if (err?.isUnauthorized) {
        navigate('/contact')
        return
      }
      setError(err?.message || t('tournaments.register_error'))
    }
  }

  const startDate = new Date(tournament.start_date)
  const dateFmt = startDate.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={i18n.dir() === 'rtl' ? 'left' : 'right'}>
        <SheetHeader>
          <SheetClose className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-3">
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            {t('tournaments.back_to_tournament')}
          </SheetClose>
          <SheetTitle>{t('tournaments.tournament_details')}</SheetTitle>
        </SheetHeader>

        <SheetBody>
          {/* Tournament summary */}
          <section className="rounded-2xl bg-slate-900/60 border border-white/5 p-5 space-y-3">
            <div className="flex items-center gap-3 text-gray-200">
              <Trophy className="w-4 h-4 text-electric-green flex-shrink-0" />
              <span className="text-sm">{tournament.name}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm">{tournament.club_name}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <CalendarIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm">{dateFmt}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm">
                {format === 'singles'
                  ? t('tournaments.format_singles')
                  : format === 'doubles'
                  ? t('tournaments.format_doubles')
                  : t('tournaments.format_mixed')}
              </span>
            </div>
          </section>

          {/* Players */}
          {!isSingles && (
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-white">{t('tournaments.players_section')}</h3>
              <div className="rounded-2xl bg-slate-900/60 border border-white/5 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <PlayerSlotYou label={t('tournaments.you')} />
                  <PlayerSlotPartner
                    label={t('tournaments.add_partner')}
                    active={partnerType !== 'none'}
                    onClick={() => setPartnerType(partnerType === 'none' ? 'invite' : 'none')}
                  />
                </div>
                <p className="text-xs text-gray-400">{t('tournaments.add_partner_hint')}</p>
              </div>

              {partnerType !== 'none' && (
                <div className="rounded-2xl bg-slate-900/60 border border-white/5 p-4 space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setPartnerType('existing')}
                      className={chipClass(partnerType === 'existing')}
                    >
                      {t('tournaments.partner_existing')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPartnerType('invite')}
                      className={chipClass(partnerType === 'invite')}
                    >
                      {t('tournaments.partner_invite')}
                    </button>
                  </div>
                  {partnerType === 'existing' && (
                    <div>
                      <Label className="text-gray-300">{t('tournaments.partner_id')}</Label>
                      <Input
                        value={partnerPlayerId}
                        onChange={(e) => setPartnerPlayerId(e.target.value)}
                        placeholder="UUID"
                        className="mt-2 bg-slate-950 border-white/10"
                      />
                    </div>
                  )}
                  {partnerType === 'invite' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-gray-300">{t('tournaments.first_name')}</Label>
                        <Input
                          value={invite.firstName}
                          onChange={(e) => setInvite({ ...invite, firstName: e.target.value })}
                          className="mt-2 bg-slate-950 border-white/10"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300">{t('tournaments.last_name')}</Label>
                        <Input
                          value={invite.lastName}
                          onChange={(e) => setInvite({ ...invite, lastName: e.target.value })}
                          className="mt-2 bg-slate-950 border-white/10"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300">{t('tournaments.phone')}</Label>
                        <Input
                          value={invite.phone}
                          onChange={(e) => setInvite({ ...invite, phone: e.target.value })}
                          className="mt-2 bg-slate-950 border-white/10"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300">{t('tournaments.country_code')}</Label>
                        <Input
                          value={invite.country}
                          onChange={(e) => setInvite({ ...invite, country: e.target.value })}
                          className="mt-2 bg-slate-950 border-white/10"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Payment options (only for team formats with non-zero fee) */}
          {!isSingles && fee > 0 && (
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-white">{t('tournaments.payment_options')}</h3>
              <div className="space-y-2">
                <PaymentOption
                  active={paymentChoice === 'full'}
                  onClick={() => setPaymentChoice('full')}
                  title={t('tournaments.pay_full')}
                  description={t('tournaments.pay_full_desc')}
                  amount={formatAmount(totalAmount)}
                  multiplier="x2"
                />
                <PaymentOption
                  active={paymentChoice === 'half'}
                  onClick={() => setPaymentChoice('half')}
                  title={t('tournaments.pay_half')}
                  description={t('tournaments.pay_half_desc', { amount: formatAmount(fee) })}
                  amount={formatAmount(fee)}
                  multiplier="x1"
                />
              </div>
            </section>
          )}

          {/* Payment method placeholder */}
          {fee > 0 && (
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-white">{t('tournaments.payment_section')}</h3>
              <button
                type="button"
                className="w-full rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-4 flex items-center justify-between hover:border-electric-green/40 transition-colors"
              >
                <div className="flex items-center gap-3 text-start">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-gray-300">
                    <Plus className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-sm text-white">{t('tournaments.add_card')}</p>
                    <p className="text-xs text-gray-400">{t('tournaments.charge_for', { amount: formatAmount(myAmount) })}</p>
                  </div>
                </div>
                <CreditCard className="w-4 h-4 text-gray-500" />
              </button>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCredits}
                  onChange={(e) => setUseCredits(e.target.checked)}
                  className="w-4 h-4 accent-electric-green"
                />
                <span className="text-sm text-gray-300">{t('tournaments.credits_applied')}</span>
              </label>
            </section>
          )}

          {/* Cancellation policy */}
          <section className="rounded-2xl bg-slate-900/60 border border-white/5 p-5 space-y-2">
            <div className="flex items-center gap-2 text-white">
              <Info className="w-4 h-4 text-gray-400" />
              <h3 className="text-base font-semibold">{t('tournaments.cancellation_policy')}</h3>
            </div>
            <p className="text-sm text-gray-400">
              {t('tournaments.cancellation_policy_body', { percent: 5 })}
            </p>
          </section>

          {error && (
            <p className="text-red-400 text-sm rounded-xl bg-red-500/10 border border-red-500/20 p-3">
              {error}
            </p>
          )}
        </SheetBody>

        <SheetFooter>
          <Button
            onClick={submit}
            disabled={registerMutation.isPending}
            className="w-full h-12 rounded-xl bg-sky-400 text-slate-950 hover:bg-sky-300 font-semibold"
          >
            {registerMutation.isPending
              ? t('tournaments.registering')
              : fee > 0
              ? t('tournaments.confirm_and_pay', { amount: formatAmount(myAmount) })
              : t('tournaments.register_cta')}
          </Button>
          <p className="mt-2 text-center text-xs text-gray-500">
            {t('tournaments.agree_prefix')}{' '}
            <a href="/terms" className="underline text-gray-400 hover:text-white">
              {t('tournaments.terms_of_use')}
            </a>
          </p>
        </SheetFooter>

        <ProfileCompletionModal
          open={profileModalOpen}
          onOpenChange={setProfileModalOpen}
          missingFields={missingFields}
          onSuccess={() => {
            setProfileModalOpen(false)
            submit()
          }}
        />
      </SheetContent>
    </Sheet>
  )
}

function chipClass(active: boolean) {
  return [
    'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
    active
      ? 'bg-electric-green text-slate-950'
      : 'bg-slate-800 text-gray-300 hover:bg-slate-700',
  ].join(' ')
}

function PlayerSlotYou({ label }: { label: string }) {
  return (
    <div className="rounded-xl bg-slate-950 border border-white/10 p-3 flex items-center gap-3">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-white text-sm font-semibold">
        S
      </span>
      <span className="text-sm text-gray-200">({label})</span>
    </div>
  )
}

function PlayerSlotPartner({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-xl border border-dashed p-3 flex items-center gap-3 transition-colors text-start',
        active
          ? 'border-electric-green/40 bg-electric-green/5'
          : 'border-white/15 bg-slate-950 hover:border-white/30',
      ].join(' ')}
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-gray-300">
        <UserPlus className="w-4 h-4" />
      </span>
      <span className="text-sm text-gray-300">{label}</span>
    </button>
  )
}

function PaymentOption({
  active,
  onClick,
  title,
  description,
  amount,
  multiplier,
}: {
  active: boolean
  onClick: () => void
  title: string
  description: string
  amount: string
  multiplier: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full rounded-2xl border p-4 flex items-center gap-4 transition-colors text-start',
        active
          ? 'border-electric-green/50 bg-electric-green/5'
          : 'border-white/10 bg-slate-900/40 hover:border-white/20',
      ].join(' ')}
    >
      <span
        className={[
          'h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
          active ? 'border-electric-green bg-electric-green' : 'border-white/30',
        ].join(' ')}
      >
        {active && <Check className="w-3 h-3 text-slate-950" />}
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-white">{amount}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-gray-400">{multiplier}</span>
      </div>
    </button>
  )
}
