import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { updateProfile } from '@/services/api/profile'
import { createPlayerProfile } from '@/services/api/auth'
import { useAuth } from '@/hooks/useAuth'
import { useAppSession } from '@/hooks/useAppSession'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { SkillLevelPicker } from './SkillLevelPicker'
import type { Gender, PlayerCreatePayload } from '@/types/api'

export interface MissingField {
  field: string
  label: string
  scope: string
}

type InlineProps = {
  mode?: 'inline'
  open: boolean
  onOpenChange: (open: boolean) => void
  missingFields: MissingField[]
  onSuccess: () => void
}

type BlockingProps = {
  mode: 'blocking'
  open: boolean
  // In blocking mode the modal cannot be dismissed; we only expose this so the host
  // can react to a successful creation.
  onOpenChange?: (open: boolean) => void
  missingFields?: undefined
  onSuccess: () => void
  onCancel: () => void
}

type Props = InlineProps | BlockingProps

const COUNTRY_CODES = ['+972', '+44', '+1', '+33', '+34', '+49', '+39']

export function ProfileCompletionModal(props: Props) {
  if (props.mode === 'blocking') return <BlockingModal {...props} />
  return <InlineModal {...props} />
}

// ---------------------------------------------------------------------------
// Inline mode — preserves the existing behavior used by ProfileRing.
// ---------------------------------------------------------------------------
function InlineModal({ open, onOpenChange, missingFields, onSuccess }: InlineProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<Record<string, any>>({})

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] })
      onSuccess()
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{t('profile.completeTitle')}</DialogTitle>
        </DialogHeader>
        <p className="text-gray-400 mb-6">{t('profile.completeSubtitle')}</p>
        <div className="space-y-6">
          {(missingFields ?? []).map((field) => (
            <div key={field.field}>
              <Label className="mb-2 block">
                {field.field === 'contact_number' ? t('profile.phoneNumber') : field.label}
              </Label>
              {field.field === 'contact_number' ? (
                <Input
                  type="tel"
                  value={formData.contact_number ?? ''}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  placeholder="501234567"
                  className="mt-2"
                />
              ) : field.field === 'skill_level' ? (
                <div className="mt-2">
                  <SkillLevelPicker
                    value={formData.skill_level}
                    onChange={(val) => setFormData({ ...formData, skill_level: val })}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">{t('profile.cancel')}</Button>
          <Button
            onClick={() => mutation.mutate(formData)}
            disabled={mutation.isPending}
            className="flex-1 bg-electric-green text-slate-950 hover:bg-electric-green/90"
          >
            {mutation.isPending ? t('profile.saving') : t('profile.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Blocking mode — collects the minimum fields to create the players row.
// Cannot be dismissed by clicking backdrop or pressing ESC.
// ---------------------------------------------------------------------------
function BlockingModal({ open, onSuccess, onCancel }: BlockingProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [countryCode, setCountryCode] = useState('+972')
  const [contactNumber, setContactNumber] = useState('')
  const [gender, setGender] = useState<Gender>('choose_not_to_answer')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const genders: { value: Gender; label: string }[] = [
    { value: 'male', label: t('profile.genderMale') },
    { value: 'female', label: t('profile.genderFemale') },
    { value: 'choose_not_to_answer', label: t('profile.genderPreferNot') },
  ]

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) throw new Error('No signed-in user; cannot create profile')
      const payload: PlayerCreatePayload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: user.email,
        contact_number: contactNumber.trim(),
        country_code: countryCode,
        gender,
      }
      const result = await createPlayerProfile(payload)
      if (!result.success) {
        throw new Error(result.error.message ?? t('profile.errorCannotCreate'))
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] })
      onSuccess()
    },
    onError: (err: any) => {
      setSubmitError(err?.message ?? t('profile.errorGeneric'))
    },
  })

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    contactNumber.trim().length > 0 &&
    countryCode.length > 0

  return (
    <Dialog
      open={open}
      // Swallow open-change events — modal is non-dismissable.
      onOpenChange={() => {}}
    >
      <DialogContent
        className="bg-slate-900 border-white/10"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{t('profile.blockingTitle')}</DialogTitle>
        </DialogHeader>
        <p className="text-gray-400 mb-4">{t('profile.blockingSubtitle')}</p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block">{t('profile.firstName')}</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus />
            </div>
            <div>
              <Label className="mb-1 block">{t('profile.lastName')}</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <div>
              <Label className="mb-1 block">{t('profile.countryCode')}</Label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm"
              >
                {COUNTRY_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label className="mb-1 block">{t('profile.phone')}</Label>
              <Input
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="501234567"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1 block">{t('profile.gender')}</Label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm"
            >
              {genders.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>

          {submitError && (
            <p className="text-sm text-red-400">{submitError}</p>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            {t('profile.signOut')}
          </Button>
          <Button
            onClick={() => { setSubmitError(null); mutation.mutate() }}
            disabled={!canSubmit || mutation.isPending}
            className="flex-1 bg-electric-green text-slate-950 hover:bg-electric-green/90"
          >
            {mutation.isPending ? t('profile.saving') : t('profile.continue')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Imperative host — mounts once at the app shell. Owns blocking-modal state
// and registers itself with AppSessionContext so ensurePlayerProfile() can open
// the modal from anywhere (button click OR axios 403 retry).
// ---------------------------------------------------------------------------
export function ProfileCompletionGate() {
  const { __setBlockingHandlers } = useAppSession()
  const { signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const pendingRef = useRef<{ resolve: () => void; reject: (e: unknown) => void } | null>(null)

  useEffect(() => {
    __setBlockingHandlers({
      open: () =>
        new Promise<void>((resolve, reject) => {
          pendingRef.current = { resolve, reject }
          setOpen(true)
        }),
    })
    return () => __setBlockingHandlers(null)
  }, [__setBlockingHandlers])

  return (
    <ProfileCompletionModal
      mode="blocking"
      open={open}
      onSuccess={() => {
        setOpen(false)
        pendingRef.current?.resolve()
        pendingRef.current = null
      }}
      onCancel={async () => {
        setOpen(false)
        pendingRef.current?.reject(new Error('USER_CANCELLED'))
        pendingRef.current = null
        await signOut()
      }}
    />
  )
}
