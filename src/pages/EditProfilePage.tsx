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
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { SkillLevelSlider } from '@/components/profile/SkillLevelSlider'
import { PhoneOtpVerification } from '@/components/profile/PhoneOtpVerification'
import { COUNTRY_CODES, DEFAULT_COUNTRY } from '@/constants/countryCodes'
import { normalizeSkillLevel } from '@/lib/skillLevel'
import { computeNeedsDetails, REQUIRED_STEPS } from '@/lib/onboardingGate'
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
  // Both purposes are the required-details step; they differ only in copy.
  const purpose = params.get('purpose')
  const detailsMode = purpose === 'onboarding' || purpose === 'tournament'
  const tournamentPurpose = purpose === 'tournament'
  useEffect(() => { window.scrollTo?.(0, 0) }, [])

  return (
    <main className="pt-24 pb-8 bg-rally-bg min-h-screen">
      <section className={cn('container mx-auto px-4', detailsMode ? 'max-w-xl' : 'max-w-3xl')}>
        <h1 className="font-display text-2xl sm:text-3xl font-black text-rally-text mb-2">
          {t(tournamentPurpose ? 'edit_profile.registrationTitle' : detailsMode ? 'edit_profile.onboardingTitle' : 'edit_profile.title')}
        </h1>
        <p className={cn('text-rally-text-2 text-sm', detailsMode ? 'mb-8' : 'mb-4')}>
          {t(tournamentPurpose ? 'edit_profile.registrationSubtitle' : detailsMode ? 'edit_profile.onboardingSubtitle' : 'edit_profile.subtitle')}
        </p>

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

// `error` is a genuine failure (the write or the refresh); `still_missing` is
// the write succeeding while the server still reports a required field absent.
// They must stay distinct: only `error` earns the retry-with-no-rewrite path
// and the disabled fieldset — a still-missing player has to be able to edit.
type Status =
  | { kind: 'idle' }
  | { kind: 'success' }
  | { kind: 'error'; message: string }
  | { kind: 'still_missing'; message: string }

/**
 * The spine of the details step.
 *
 * It replaced two stacked accent-green notices that said nearly the same thing
 * ("phone and level are required" / "still missing: phone · level") — six other
 * places on the page also wore the accent, so nothing led. The accent is now
 * spent once, on the button.
 *
 * Finished rows recede to muted and the outstanding one stays at full contrast
 * with an amber marker, so the page always shows exactly one thing to do. That
 * is the real structure of this screen, not decoration on top of it.
 */
function DetailsChecklist({ steps }: { steps: { key: string; label: string; done: boolean }[] }) {
  const { t } = useTranslation()
  return (
    <div role="status" className="rounded-2xl border border-rally-border bg-rally-surface px-5 py-4">
      <p className="text-xs font-bold uppercase tracking-wider text-rally-text-muted mb-3">
        {t('edit_profile.checklist.title')}
      </p>
      <ul className="space-y-2.5">
        {steps.map((step) => (
          <li key={step.key} className="flex items-center gap-3 text-sm">
            <span
              aria-hidden
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                step.done ? 'bg-rally-surface-2 text-rally-text-2' : 'border border-rally-warning',
              )}
            >
              {step.done && <Check className="h-3 w-3" />}
            </span>
            <span className={cn('flex-1', step.done ? 'text-rally-text-2' : 'text-rally-text font-semibold')}>
              {step.label}
            </span>
            <span className={cn('text-xs', step.done ? 'text-rally-text-muted' : 'text-rally-warning font-semibold')}>
              {t(step.done ? 'edit_profile.checklist.done' : 'edit_profile.checklist.todo')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Section headings are scaffolding — in the details step they must not compete
 *  with the page title, so they drop to a quiet eyebrow. */
function SectionLabel({ detailsMode, children }: { detailsMode: boolean; children: React.ReactNode }) {
  return detailsMode ? (
    <h2 className="text-xs font-bold uppercase tracking-wider text-rally-text-muted mb-4">{children}</h2>
  ) : (
    <h2 className="text-base font-semibold mb-3 text-rally-text">{children}</h2>
  )
}

/** onboarding-status step → the label the missing-details copy uses for it. */
const MISSING_STEP_LABEL: Record<string, string> = {
  first_name: 'edit_profile.missing.name',
  contact_number: 'edit_profile.missing.phone',
  skill_level: 'edit_profile.missing.level',
}

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
    // No default level, ever: a stored 0 (what mobile writes at complete-profile)
    // and a null both normalise to null, so the slider opens empty and the
    // player has to choose.
    skill_level: normalizeSkillLevel(profile?.skill_level),
  }
}

function EditProfileForm({ profile }: { profile: PlayerMe | null }) {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // Set by AppSessionContext's redirectToProfileEdit bridge (a 403/422 profile-
  // incomplete error) or by a page that sends the user here directly (e.g. the
  // tournament partner section) — send them straight back once profile is complete.
  const returnTo = params.has('returnTo') ? safeReturnTo(params.get('returnTo')) : null
  const purpose = params.get('purpose')
  const detailsMode = purpose === 'onboarding' || purpose === 'tournament'
  const tournamentPurpose = purpose === 'tournament'
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const saved = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  // A create that already landed must never be replayed. `profile` comes from the
  // cached session, and the still-missing branch deliberately does not refresh
  // that cache, so `profile === null` alone keeps saying "create" after a POST
  // that succeeded — and rally-api's POST /players has no "row exists" guard, so
  // the retry hits the primary key and surfaces an opaque "Failed to onboard
  // player" instead of the message naming what is still missing. Once the row
  // exists, retries take the PATCH path; `profile` is still null there, so the
  // details-mode stored-value disjuncts below send every required field, which
  // is exactly the right payload against a row we now know exists.
  const createdRef = useRef(false)
  const isCreate = profile === null && !createdRef.current

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

  useEffect(() => {
    if (detailsMode) trackFunnel('onboarding_details_shown', { step: purpose ?? 'onboarding' })
    // Fire once per mount of the step, not on every purpose re-read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finishSave = async (applied?: Partial<EditProfileFormValues>) => {
    if (!mounted.current) return
    saved.current = true
    try {
      const [onboarding, player] = await Promise.all([getOnboardingStatus(), getMyPlayerProfile()])
      if (!mounted.current) return
      if (!onboarding.success || !player.success) throw new Error('Profile refresh failed')
      // Same rule the session gate uses, so "saved" can never disagree with
      // "the gate will bounce them straight back here". This is NOT a refresh
      // failure: the write landed, the server just still wants something. Clear
      // `saved` so the next Continue really re-submits (otherwise `mutationFn`
      // short-circuits and no write is ever attempted again), leave the form
      // editable, and name the fields instead of telling the player to retry
      // something that structurally cannot succeed. The fresh status is
      // deliberately NOT written to the cache: flipping `profile_incomplete` to
      // `ready` would remount this form and throw the message away.
      if (detailsMode && computeNeedsDetails(onboarding.data)) {
        const fields = REQUIRED_STEPS
          .filter((step) => onboarding.data.missing_steps.includes(step))
          .map((step) => t(MISSING_STEP_LABEL[step]))
        saved.current = false
        setStatus(
          fields.length > 0
            ? { kind: 'still_missing', message: t('edit_profile.stillMissing', { fields: fields.join(' · ') }) }
            : { kind: 'error', message: t('edit_profile.savedRefreshFailed') },
        )
        return
      }
      queryClient.setQueryData(['onboarding-status', user?.id], onboarding.data)
      queryClient.setQueryData(['player-profile-me', user?.id], player.data)
      setStatus({ kind: 'success' })
      form.reset({ ...form.getValues(), ...applied } as EditProfileFormValues)
      // `purpose` is attacker-supplied query text; only let it through when it
      // actually selected details mode, so junk never reaches analytics.
      trackFunnel(detailsMode ? 'onboarding_details_completed' : 'profile_completed', {
        step: detailsMode && purpose ? purpose : 'profile',
      })
      // The details step is a gate, not a destination: never leave the player
      // parked on it once they are done. The permissive editor still stays put
      // and just shows "Profile updated".
      if (returnTo) navigate(returnTo)
      else if (detailsMode) navigate('/', { replace: true })
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
        // The row exists from here on, whatever the refetch goes on to say.
        createdRef.current = true
        return values
      }
      // Edit mode: PATCH only the dirty fields. The players row exists; the
      // server happily accepts any subset.
      const dirty = form.formState.dirtyFields
      const patch: ProfileUpdateRequest = {}
      // In details mode "not dirty" does not mean "the server has it". A box can
      // be pre-filled from OAuth user_metadata while rally_users still holds
      // NULL, and onboarding-status reads the column, not the form — so send
      // every required field whose STORED value is missing, or Continue posts an
      // empty patch and the refetch reports the same field missing forever.
      if (dirty.contact_number || (detailsMode && !profile?.contact_number && phone)) {
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
      if ((dirty.first_name || (detailsMode && !profile?.first_name?.trim())) && values.first_name?.trim()) {
        patch.first_name = values.first_name
      }
      if ((dirty.last_name || (detailsMode && !profile?.last_name?.trim())) && values.last_name?.trim()) {
        patch.last_name = values.last_name
      }
      // In details mode a player whose stored level reads as "not chosen"
      // (null, or mobile's 0) must persist the level they just picked even
      // though react-hook-form would call it dirty anyway — this keeps the
      // patch correct if the form is ever reset to the same value.
      if ((dirty.skill_level || (detailsMode && normalizeSkillLevel(profile?.skill_level) == null)) && values.skill_level != null) {
        patch.skill_level = values.skill_level
      }
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
  const namesFilled = Boolean(values.first_name?.trim() && values.last_name?.trim())
  const phoneReady = Boolean(values.contact_number?.trim() && phoneVerified)
  // No default level exists any more, so "chosen" is simply "not null".
  const levelChosen = values.skill_level != null
  const canSubmit =
    (isCreate || detailsMode || form.formState.isDirty) &&
    (!isCreate || namesFilled) &&
    (!detailsMode || (namesFilled && phoneReady && levelChosen)) &&
    !hasDirtyError &&
    !globalInvalid &&
    !phoneDirtyUnverified &&
    !mutation.isPending
  const showSave = isCreate || detailsMode || form.formState.isDirty

  // What the player still owes us, named field by field. Shown in details mode
  // whenever anything is missing — including on a first visit and when the
  // session gate bounced them here from a nav click. The same flags put an
  // accent border on the inputs the notice is talking about.
  const missingFirstName = detailsMode && !values.first_name?.trim()
  const missingLastName = detailsMode && !values.last_name?.trim()
  const missingPhone = detailsMode && !phoneReady
  const missingLevel = detailsMode && !levelChosen
  // The accent is spent on the submit button. A field the checklist is asking
  // for gets the checklist's own amber, so the two read as one thought.
  const MISSING_BORDER = detailsMode ? 'border-rally-warning/50' : 'border-rally-accent/60'

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn(detailsMode ? 'space-y-6' : 'space-y-3')} noValidate>
      <fieldset disabled={mutation.isPending} className="contents">
      {detailsMode && (
        <DetailsChecklist
          steps={[
            { key: 'name', label: t('edit_profile.missing.name'), done: namesFilled },
            { key: 'phone', label: t('edit_profile.missing.phone'), done: phoneReady },
            { key: 'level', label: t('edit_profile.missing.level'), done: levelChosen },
          ]}
        />
      )}
      <fieldset
        disabled={saved.current && status.kind === 'error'}
        className={cn(detailsMode ? 'space-y-6' : 'grid grid-cols-1 lg:grid-cols-2 gap-3')}
      >
        <Card className={cn('bg-rally-surface border-rally-border', detailsMode ? 'p-5 sm:p-6' : 'p-4')}>
          <SectionLabel detailsMode={detailsMode}>{t('edit_profile.section_personal')}</SectionLabel>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="first_name" className="mb-1 block text-sm">
                {t('edit_profile.firstName')}
              </Label>
              <Input
                id="first_name"
                autoComplete="given-name"
                required={isCreate}
                aria-invalid={missingFirstName || undefined}
                className={cn(missingFirstName && MISSING_BORDER)}
                {...form.register('first_name')}
              />
              {(firstNameClearedByUser || form.formState.errors.first_name) && (
                <p className="text-sm text-rally-error mt-1">
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
              <Input
                id="last_name"
                autoComplete="family-name"
                required={isCreate}
                aria-invalid={missingLastName || undefined}
                className={cn(missingLastName && MISSING_BORDER)}
                {...form.register('last_name')}
              />
              {(lastNameClearedByUser || form.formState.errors.last_name) && (
                <p className="text-sm text-rally-error mt-1">
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
                required={detailsMode}
                aria-invalid={missingPhone || undefined}
                className={cn(missingPhone && MISSING_BORDER)}
                {...form.register('contact_number')}
                placeholder="501234567"
              />
              {form.formState.errors.contact_number && (
                <p className="text-sm text-rally-error mt-1">
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
                className="h-11 w-full rounded-lg border border-rally-border bg-rally-surface-2 px-3 text-base sm:text-sm text-rally-text"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.iso} value={c.dial}>
                    {c.flag} {c.dial}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-2 space-y-2">
            {/* Above the verify button, not under it: underneath, this amber line
                (shown from the first digit typed) read as the reply to tapping verify. */}
            {phoneDirtyUnverified && (
              <p className="text-sm text-rally-warning">
                {t('edit_profile.validation.phoneNotVerified')}
              </p>
            )}
            <PhoneOtpVerification
              countryCode={values.country_code ?? DEFAULT_COUNTRY.dial}
              phone={values.contact_number ?? ''}
              verified={phoneVerified}
              onVerifiedChange={setPhoneVerified}
              initiallyVerified={Boolean(profile?.contact_number)}
            />
          </div>
        </Card>

        <Card
          className={cn(
            'bg-rally-surface',
            detailsMode ? 'p-5 sm:p-6 border-rally-border' : missingLevel ? MISSING_BORDER : 'border-rally-border',
          )}
        >
          <SectionLabel detailsMode={detailsMode}>{t('edit_profile.section_skill')}</SectionLabel>
          <Controller
            control={form.control}
            name="skill_level"
            render={({ field }) => (
              <SkillLevelSlider value={field.value ?? null} onChange={field.onChange} />
            )}
          />
          {detailsMode && !levelChosen && form.formState.isSubmitted && (
            <p className="text-sm text-rally-error mt-2">{t('edit_profile.validation.skillRequired')}</p>
          )}
        </Card>
      </fieldset>

      {showSave && (
        <div className={cn('flex gap-3', detailsMode ? 'pt-2' : 'justify-end')}>
          <Button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              'bg-rally-accent text-rally-accent-text hover:bg-rally-accent-hover',
              detailsMode && 'w-full h-12 rounded-full font-display font-bold text-base',
            )}
          >
            {mutation.isPending
              ? t('edit_profile.saving')
              : saved.current && status.kind === 'error'
                ? t('edit_profile.retry')
                : t(tournamentPurpose ? 'edit_profile.continueTournament' : detailsMode ? 'edit_profile.continue' : 'edit_profile.save')}
          </Button>
        </div>
      )}
      {detailsMode && (
        <button
          type="button"
          onClick={async () => {
            // Best-effort, the same shape as Navbar's sign-out: a failed call
            // must not strand the player on the gate with no way out, so leave
            // either way.
            try { await signOut() } catch { /* sign-out is best-effort */ }
            navigate('/', { replace: true })
          }}
          className="text-xs text-rally-text-muted underline underline-offset-2"
        >
          {t('edit_profile.notYou')}
        </button>
      )}
      {isCreate && (!values.first_name?.trim() || !values.last_name?.trim()) && (
        <p className="text-sm text-rally-text-2">{t('edit_profile.namesRequired')}</p>
      )}

      {status.kind === 'success' && (
        <p role="status" className="text-sm text-rally-accent text-end">
          {t('edit_profile.saveSuccess')}
        </p>
      )}
      {(status.kind === 'error' || status.kind === 'still_missing') && (
        <p role="alert" className="text-sm text-rally-error text-end">
          {status.message}
        </p>
      )}
      </fieldset>
    </form>
  )
}
