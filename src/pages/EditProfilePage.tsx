import { useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppSession } from '@/hooks/useAppSession'
import { useAuth } from '@/hooks/useAuth'
import { useAuthGate } from '@/hooks/useAuthGate'
import { updateProfile, getOnboardingStatus, getMyPlayerProfile } from '@/services/api/profile'
import { createPlayerProfile } from '@/services/api/auth'
import { SignInRequiredPanel } from '@/components/auth/SignInRequiredPanel'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { SkillLevelSlider } from '@/components/profile/SkillLevelSlider'
import { PhoneOtpVerification } from '@/components/profile/PhoneOtpVerification'
import { COUNTRY_CODES, DEFAULT_COUNTRY } from '@/constants/countryCodes'
import { SKILL_DEFAULT } from '@/lib/skillLevel'
import { editProfileSchema, type EditProfileFormValues } from '@/lib/editProfileSchema'
import type { PlayerCreatePayload, PlayerMe, ProfileUpdateRequest } from '@/types/api'
import { safeReturnTo } from '@/lib/authReturn'
import { trackFunnel } from '@/lib/analytics'

export default function EditProfilePage() {
  const { t } = useTranslation()
  const { status, playerProfile, refetchOnboarding } = useAppSession()
  const { requireSignIn } = useAuthGate()
  const { user } = useAuth()
  const [params] = useSearchParams()
  const tournamentMode = params.get('purpose') === 'tournament'
  useEffect(() => { window.scrollTo?.(0, 0) }, [])

  return (
    <main className="pt-24 pb-8 bg-rally-bg min-h-screen">
      <section className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-2xl font-bold mb-1 text-rally-text">
          {t(tournamentMode ? 'edit_profile.registrationTitle' : 'edit_profile.title')}
        </h1>
        <p className="text-rally-text-2 text-sm mb-4">{t(tournamentMode ? 'edit_profile.registrationSubtitle' : 'edit_profile.subtitle')}</p>

        {status === 'loading' && (
          <div className="space-y-4">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        )}

        {status === 'signed_out' && (
          <SignInRequiredPanel
            message={t('auth.gate.sign_in_to_view')}
            ctaLabel={t('auth.gate.sign_in_button')}
            onSignIn={() => {
              void requireSignIn().catch(() => {})
            }}
          />
        )}

        {status === 'profile_error' && (
          <div role="alert" className="space-y-3 text-rally-text-2">
            <p>{t('edit_profile.loadError')}</p>
            <Button onClick={() => void refetchOnboarding()}>{t('edit_profile.retry')}</Button>
          </div>
        )}

        {status === 'profile_incomplete' && <EditProfileForm key={user?.id} profile={null} />}
        {status === 'ready' && playerProfile && (
          <EditProfileForm key={user?.id} profile={playerProfile} />
        )}
      </section>
    </main>
  )
}

type Status = { kind: 'idle' } | { kind: 'success' } | { kind: 'error'; message: string }

function metaName(user: { user_metadata?: Record<string, unknown> } | null, ...keys: string[]): string {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>
  for (const k of keys) {
    const v = meta[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

function defaultsFromProfile(
  profile: PlayerMe | null,
  user: { user_metadata?: Record<string, unknown> } | null,
): EditProfileFormValues {
  // For new profiles, fall back to Supabase user_metadata (set by OAuth providers
  // like Google), so social-login users land in the form with names pre-filled.
  // PlayerMe doesn't expose country_code — DEFAULT_COUNTRY.dial is used as the
  // initial selection until the user changes it. The submit code only sends
  // dirty fields, so an unchanged default isn't persisted.
  return {
    first_name: profile?.first_name ?? metaName(user, 'first_name', 'given_name') ?? '',
    last_name: profile?.last_name ?? metaName(user, 'last_name', 'family_name') ?? '',
    country_code: DEFAULT_COUNTRY.dial,
    contact_number: profile?.contact_number ?? '',
    skill_level: profile?.skill_level ?? SKILL_DEFAULT,
  }
}

function EditProfileForm({ profile }: { profile: PlayerMe | null }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // Set by AppSessionContext's redirectToProfileEdit bridge (a 403/422 profile-
  // incomplete error) or by a page that sends the user here directly (e.g. the
  // tournament partner section) — send them straight back once profile is complete.
  const returnTo = params.has('returnTo') ? safeReturnTo(params.get('returnTo')) : null
  const tournamentMode = params.get('purpose') === 'tournament'
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const saved = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const isCreate = profile === null
  const needsSkill = tournamentMode && !profile?.skill_level
  const [skillConfirmed, setSkillConfirmed] = useState(!needsSkill)

  const defaults = defaultsFromProfile(profile, user)
  // An existing saved number is trusted already — only a freshly typed number
  // needs (re-)verifying. Mirrors mobile's EditProfileScreen/PhoneVerificationField.
  const [phoneVerified, setPhoneVerified] = useState(Boolean(profile?.contact_number))

  const form = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: defaults,
    mode: 'onChange',
  })

  useEffect(() => {
    const subscription = form.watch((_, { name, type }) => {
      // form.reset() fires with no name/type; only clear on real user edits.
      if (!name || type !== 'change') return
      saved.current = false
      setStatus((s) => (s.kind === 'idle' ? s : { kind: 'idle' }))
    })
    return () => subscription.unsubscribe()
  }, [form])

  const finishSave = async (applied?: ProfileUpdateRequest) => {
    if (!mounted.current) return
    saved.current = true
    try {
      const [onboarding, player] = await Promise.all([getOnboardingStatus(), getMyPlayerProfile()])
      if (!mounted.current) return
      if (!onboarding.success || !player.success) throw new Error('Profile refresh failed')
      if (tournamentMode && (!onboarding.data.has_player_profile || onboarding.data.missing_steps.some((field) => field === 'contact_number' || field === 'skill_level'))) {
        throw new Error('Required details still missing')
      }
      queryClient.setQueryData(['onboarding-status', user?.id], onboarding.data)
      queryClient.setQueryData(['player-profile-me', user?.id], player.data)
      setStatus({ kind: 'success' })
      form.reset({ ...form.getValues(), ...applied } as EditProfileFormValues)
      trackFunnel('profile_completed', { step: tournamentMode ? 'tournament' : 'profile' })
      if (returnTo) navigate(returnTo)
    } catch {
      setStatus({ kind: 'error', message: t('edit_profile.savedRefreshFailed') })
    }
  }

  const mutation = useMutation({
    mutationFn: async (values: EditProfileFormValues) => {
      if (saved.current) return values
      const phone = (values.contact_number || '').trim()
      if (isCreate) {
        if (!user?.email) throw new Error(t('profile.errorCannotCreate'))
        // Backend rejects "country_code without contact_number" — only attach
        // the dial code when an actual phone number is present.
        const payload: PlayerCreatePayload = {
          first_name: (values.first_name || '').trim(),
          last_name: (values.last_name || '').trim(),
          email: user.email,
          contact_number: phone,
          gender: 'choose_not_to_answer',
          ...(phone ? { country_code: values.country_code ?? DEFAULT_COUNTRY.dial } : {}),
          ...(values.skill_level != null ? { skill_level: values.skill_level } : {}),
        }
        const result = await createPlayerProfile(payload)
        if (!result.success) {
          throw new Error(result.error.message ?? t('profile.errorCannotCreate'))
        }
        return values
      }
      // Edit mode: PATCH only the dirty fields. The players row exists; the
      // server happily accepts any subset.
      const dirty = form.formState.dirtyFields
      const patch: ProfileUpdateRequest = {}
      if (dirty.contact_number) {
        patch.contact_number = phone
        // H4: send country_code whenever phone is dirty so the backend stores
        // a dial prefix even if the user never touched the dropdown (defaults
        // to DEFAULT_COUNTRY.dial which is what the form already shows).
        patch.country_code = values.country_code ?? DEFAULT_COUNTRY.dial
      }
      if (dirty.country_code && phone) {
        // H3: only attach country_code when there is a real phone number.
        // "phone without country_code" is malformed; "country_code without
        // phone" the backend rejects.
        patch.country_code = values.country_code
      }
      if (dirty.first_name) patch.first_name = values.first_name
      if (dirty.last_name) patch.last_name = values.last_name
      if (dirty.skill_level || needsSkill) patch.skill_level = values.skill_level
      if (Object.keys(patch).length === 0) return
      const result = await updateProfile(patch)
      if (!result.success) {
        throw new Error(result.error.message ?? t('edit_profile.saveError'))
      }
      return patch
    },
    onSuccess: finishSave,
    onError: (err: unknown) => {
      const apiError = err as { code?: string; message?: string } | null
      const message = apiError?.code === 'MOBILE_ALREADY_EXISTS'
        ? t('edit_profile.phoneAccountHelp')
        : apiError?.message || t('edit_profile.saveError')
      setStatus({ kind: 'error', message })
    },
  })

  const onSubmit = (values: EditProfileFormValues) => {
    setStatus({ kind: 'idle' })
    if (!canSubmit) return
    mutation.mutate(values)
  }

  // form.watch() with no args subscribes to all field changes so canSubmit and
  // the name-required hint stay reactive.
  const values = form.watch()
  const dirtyKeys = Object.keys(form.formState.dirtyFields)
  // A name field that the user explicitly cleared is treated as an error — we
  // never want to silently wipe an existing name on save.
  const firstNameClearedByUser =
    !!form.formState.dirtyFields.first_name && !values.first_name?.trim()
  const lastNameClearedByUser =
    !!form.formState.dirtyFields.last_name && !values.last_name?.trim()
  const hasDirtyError =
    dirtyKeys.some((k) => k in form.formState.errors) ||
    firstNameClearedByUser ||
    lastNameClearedByUser
  // Re-introduce global validity check (H1): an untouched invalid field (e.g. a
  // stored phone that violates the regex, or an out-of-range skill_level from
  // legacy data) must block save even if the user hasn't touched it.
  const globalInvalid = Object.keys(form.formState.errors).length > 0
  // A freshly-entered phone number must be OTP-verified before it can be saved —
  // mirrors mobile's EditProfileScreen.validate() checking phoneVerified.
  const phoneDirtyUnverified =
    (isCreate || !!form.formState.dirtyFields.contact_number || !!form.formState.dirtyFields.country_code) &&
    !!values.contact_number?.trim() &&
    !phoneVerified
  const canSubmit =
    (isCreate || tournamentMode || form.formState.isDirty) &&
    (!isCreate || Boolean(values.first_name?.trim() && values.last_name?.trim())) &&
    (!tournamentMode || Boolean(values.contact_number?.trim() && phoneVerified && skillConfirmed)) &&
    !hasDirtyError &&
    !globalInvalid &&
    !phoneDirtyUnverified &&
    !mutation.isPending
  const showSave = isCreate || tournamentMode || form.formState.isDirty

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
      <fieldset disabled={mutation.isPending} className="contents">
      {tournamentMode && (
        <div className="rounded-2xl border border-rally-accent/30 bg-rally-accent/5 p-4 text-sm text-rally-text-2">
          {t('edit_profile.registrationRequirements')}
        </div>
      )}
      <fieldset disabled={saved.current && status.kind === 'error'} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-4 bg-rally-surface border-white/10">
          <h2 className="text-base font-semibold mb-3 text-rally-text">
            {t('edit_profile.section_personal')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="first_name" className="mb-1 block text-sm">
                {t('edit_profile.firstName')}
              </Label>
              <Input id="first_name" autoComplete="given-name" required={isCreate} {...form.register('first_name')} />
              {(firstNameClearedByUser || form.formState.errors.first_name) && (
                <p className="text-sm text-red-400 mt-1">
                  {form.formState.errors.first_name
                    ? t(form.formState.errors.first_name.message as string)
                    : t('edit_profile.validation.firstNameRequired')}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="last_name" className="mb-1 block text-sm">
                {t('edit_profile.lastName')}
              </Label>
              <Input id="last_name" autoComplete="family-name" required={isCreate} {...form.register('last_name')} />
              {(lastNameClearedByUser || form.formState.errors.last_name) && (
                <p className="text-sm text-red-400 mt-1">
                  {form.formState.errors.last_name
                    ? t(form.formState.errors.last_name.message as string)
                    : t('edit_profile.validation.lastNameRequired')}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3">
            <Label className="mb-1 block text-sm">{t('edit_profile.email')}</Label>
            <p className="text-rally-text-2 text-sm">{profile?.email ?? user?.email ?? '—'}</p>
          </div>

          <div className="grid grid-cols-[1fr_7rem] gap-3 mt-3">
            <div>
              <Label htmlFor="contact_number" className="mb-1 block text-sm">
                {t('edit_profile.phone')}
              </Label>
              <Input
                id="contact_number"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                required={tournamentMode}
                {...form.register('contact_number')}
                placeholder="501234567"
              />
              {form.formState.errors.contact_number && (
                <p className="text-sm text-red-400 mt-1">
                  {t(form.formState.errors.contact_number.message as string)}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="country_code" className="mb-1 block text-sm">
                {t('edit_profile.countryCode')}
              </Label>
              <select
                id="country_code"
                {...form.register('country_code')}
                className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-rally-text"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.iso} value={c.dial}>
                    {c.flag} {c.dial}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-2">
            <PhoneOtpVerification
              countryCode={values.country_code ?? DEFAULT_COUNTRY.dial}
              phone={values.contact_number ?? ''}
              verified={phoneVerified}
              onVerifiedChange={setPhoneVerified}
              initiallyVerified={Boolean(profile?.contact_number)}
            />
            {phoneDirtyUnverified && (
              <p className="text-sm text-red-400 mt-1">
                {t('edit_profile.validation.phoneNotVerified')}
              </p>
            )}
          </div>
        </Card>

        <Card className="p-4 bg-rally-surface border-white/10">
          <h2 className="text-base font-semibold mb-3 text-rally-text">
            {t('edit_profile.section_skill')}
          </h2>
          <Controller
            control={form.control}
            name="skill_level"
            render={({ field }) => (
              <SkillLevelSlider
                value={field.value ?? SKILL_DEFAULT}
                onChange={(value) => { field.onChange(value); setSkillConfirmed(true) }}
              />
            )}
          />
          {needsSkill && (
            <label className="mt-4 flex items-start gap-3 text-sm text-rally-text-2">
              <input type="checkbox" checked={skillConfirmed} onChange={(e) => setSkillConfirmed(e.target.checked)} className="mt-1 accent-rally-accent" />
              {t('edit_profile.confirmSkill')}
            </label>
          )}
        </Card>
      </fieldset>

      {showSave && (
        <div className="flex gap-3 justify-end">
          <Button
            type="submit"
            disabled={!canSubmit}
            className="bg-rally-accent text-rally-accent-text hover:bg-rally-accent-hover"
          >
            {mutation.isPending ? t('edit_profile.saving') : saved.current && status.kind === 'error' ? t('edit_profile.retry') : t(tournamentMode ? 'edit_profile.continueTournament' : 'edit_profile.save')}
          </Button>
        </div>
      )}
      {isCreate && (!values.first_name?.trim() || !values.last_name?.trim()) && (
        <p className="text-sm text-rally-text-2">{t('edit_profile.namesRequired')}</p>
      )}

      {status.kind === 'success' && (
        <p role="status" className="text-sm text-rally-accent text-end">
          {t('edit_profile.saveSuccess')}
        </p>
      )}
      {status.kind === 'error' && (
        <p role="alert" className="text-sm text-red-400 text-end">
          {status.message}
        </p>
      )}
      </fieldset>
    </form>
  )
}
