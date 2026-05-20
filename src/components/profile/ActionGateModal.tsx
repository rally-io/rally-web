import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useRtl } from '@/hooks/useRtl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SkillLevelSlider } from './SkillLevelSlider'
import { SKILL_DEFAULT, clampSkill } from '@/lib/skillLevel'
import { COUNTRY_CODES, DEFAULT_COUNTRY } from '@/constants/countryCodes'
import { createPlayerProfile } from '@/services/api/auth'
import { updateProfile } from '@/services/api/profile'
import { useAppSession } from '@/hooks/useAppSession'
import { useAuth } from '@/hooks/useAuth'
import type { Gender, PlayerCreatePayload } from '@/types/api'

export type GateAction = 'register_tournament' | 'book_court'

interface Props {
  open: boolean
  action: GateAction
  onOpenChange: (open: boolean) => void
  onConfirmed: () => void
}

export function ActionGateModal({ open, action, onOpenChange, onConfirmed }: Props) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { onboardingStatus, playerProfile, refetchOnboarding } = useAppSession()
  const { isRTL } = useRtl()
  const queryClient = useQueryClient()

  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>
  const metaFirst = String(meta.first_name ?? meta.given_name ?? '').trim()
  const metaLast = String(meta.last_name ?? meta.family_name ?? '').trim()

  const hasPlayerRow = onboardingStatus?.has_player_profile ?? false
  const needsCreate = !hasPlayerRow
  const needsPhone = needsCreate || !playerProfile?.contact_number
  const needsSkill =
    action === 'register_tournament' &&
    (needsCreate || playerProfile?.skill_level == null)
  const needsName = needsCreate && (!metaFirst || !metaLast)

  const [firstName, setFirstName] = useState(metaFirst)
  const [lastName, setLastName] = useState(metaLast)
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY.dial)
  const [phone, setPhone] = useState('')
  const [skill, setSkill] = useState(SKILL_DEFAULT)
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setFirstName(metaFirst)
      setLastName(metaLast)
      setCountryCode(DEFAULT_COUNTRY.dial)
      setPhone('')
      setSkill(SKILL_DEFAULT)
      setSkipConfirmOpen(false)
      setError(null)
    }
  }, [open, metaFirst, metaLast])

  const titleKey =
    action === 'register_tournament' ? 'profile.gateTournamentTitle' : 'profile.gateCourtTitle'
  const subtitleKey =
    action === 'register_tournament'
      ? 'profile.gateTournamentSubtitle'
      : 'profile.gateCourtSubtitle'

  const phoneValid = !needsPhone || phone.trim().length > 0
  const nameValid = !needsName || (firstName.trim().length > 0 && lastName.trim().length > 0)
  const canSubmit = phoneValid && nameValid

  async function persist(includeSkill: boolean) {
    if (needsCreate) {
      if (!user?.email) throw new Error(t('profile.errorCannotCreate'))
      const payload: PlayerCreatePayload = {
        first_name: (firstName.trim() || metaFirst),
        last_name: (lastName.trim() || metaLast),
        email: user.email,
        contact_number: phone.trim(),
        country_code: countryCode,
        gender: 'choose_not_to_answer' as Gender,
        ...(includeSkill && needsSkill ? { skill_level: clampSkill(skill) } : {}),
      }
      const res = await createPlayerProfile(payload)
      if (!res.success) throw new Error(res.error?.message ?? t('profile.errorCannotCreate'))
    } else {
      const patch: { contact_number?: string; skill_level?: number } = {}
      if (needsPhone && phone.trim()) patch.contact_number = phone.trim()
      if (needsSkill && includeSkill) patch.skill_level = clampSkill(skill)
      if (Object.keys(patch).length > 0) {
        const res = await updateProfile(patch)
        if (!res.success) throw new Error(res.error?.message ?? t('profile.errorGeneric'))
      }
    }
    await Promise.all([
      refetchOnboarding(),
      queryClient.invalidateQueries({ queryKey: ['player-profile-me'] }),
    ])
  }

  async function handleSubmit(includeSkill: boolean) {
    setError(null)
    setSubmitting(true)
    try {
      await persist(includeSkill)
      onOpenChange(false)
      onConfirmed()
    } catch (e: any) {
      setError(e?.message ?? t('profile.errorGeneric'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkipClick = () => setSkipConfirmOpen(true)
  const handleSkipConfirm = () => {
    setSkipConfirmOpen(false)
    void handleSubmit(false)
  }
  const handleSkipCancel = () => setSkipConfirmOpen(false)

  return (
    <>
      <Dialog open={open} onOpenChange={submitting ? () => {} : onOpenChange}>
        <DialogContent
          className="bg-rally-surface border-rally-border text-rally-text sm:max-w-md rounded-2xl"
          showCloseButton={!submitting}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight text-center">
              {t(titleKey)}
            </DialogTitle>
            <DialogDescription className="text-center text-rally-text-2">
              {t(subtitleKey)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {needsName && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="agm-first" className="mb-1 block">
                    {t('profile.firstName')}
                  </Label>
                  <Input
                    id="agm-first"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="agm-last" className="mb-1 block">
                    {t('profile.lastName')}
                  </Label>
                  <Input
                    id="agm-last"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {needsPhone && (
              <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-28 shrink-0">
                  <Label htmlFor="agm-cc" className="mb-1 block">
                    {t('profile.countryCode')}
                  </Label>
                  <select
                    id="agm-cc"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full rounded-md border border-rally-border bg-rally-surface-2 px-3 py-2 text-sm text-rally-text"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.iso} value={c.dial}>
                        {c.flag} {c.dial}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <Label htmlFor="agm-phone" className="mb-1 block">
                    {t('profile.phone')}
                  </Label>
                  <Input
                    id="agm-phone"
                    type="tel"
                    inputMode="tel"
                    dir={isRTL ? 'rtl' : 'ltr'}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="501234567"
                  />
                </div>
              </div>
            )}

            {needsSkill && (
              <div>
                <Label className="mb-2 block text-center">
                  {t('profile.skillModalSubtitle')}
                </Label>
                <SkillLevelSlider value={skill} onChange={setSkill} />
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-md bg-rally-error/10 border border-rally-error/30 text-rally-error text-sm p-2"
              >
                {error}
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3">
            {needsSkill && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleSkipClick}
                disabled={submitting}
              >
                {t('profile.skillModalSkip')}
              </Button>
            )}
            <Button
              type="button"
              className="flex-1 bg-rally-accent text-rally-accent-text hover:bg-rally-accent-hover font-bold"
              onClick={() => void handleSubmit(true)}
              disabled={submitting || !canSubmit}
            >
              {submitting ? t('profile.skillModalSaving') : t('profile.continue')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={skipConfirmOpen} onOpenChange={(o) => !o && handleSkipCancel()}>
        <DialogContent
          className="bg-rally-surface border-rally-border text-rally-text sm:max-w-sm rounded-2xl"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {t('profile.skillSkipConfirmTitle')}
            </DialogTitle>
            <DialogDescription className="text-rally-text-2">
              {t('profile.skillSkipConfirmBody')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleSkipConfirm}
            >
              {t('profile.skillSkipConfirmContinue')}
            </Button>
            <Button
              type="button"
              className="flex-1 bg-rally-accent text-rally-accent-text hover:bg-rally-accent-hover font-bold"
              onClick={handleSkipCancel}
            >
              {t('profile.skillSkipConfirmStay')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}