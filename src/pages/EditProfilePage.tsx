import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAppSession } from '@/hooks/useAppSession'
import { useAuthGate } from '@/hooks/useAuthGate'
import { updateProfile } from '@/services/api/profile'
import { SignInRequiredPanel } from '@/components/auth/SignInRequiredPanel'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { SkillLevelSlider } from '@/components/profile/SkillLevelSlider'
import { COUNTRY_CODES, DEFAULT_COUNTRY } from '@/constants/countryCodes'
import { editProfileSchema, type EditProfileFormValues } from '@/lib/editProfileSchema'
import type { PlayerMe, ProfileUpdateRequest } from '@/types/api'

export default function EditProfilePage() {
  const { t } = useTranslation()
  const { status, playerProfile, ensurePlayerProfile } = useAppSession()
  const { requireSignIn } = useAuthGate()

  useEffect(() => {
    if (status === 'profile_incomplete') {
      void ensurePlayerProfile().catch(() => {})
    }
  }, [status, ensurePlayerProfile])

  return (
    <main className="pt-24 pb-8 bg-rally-bg min-h-screen">
      <section className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-2xl font-bold mb-1 text-rally-text">
          {t('edit_profile.title')}
        </h1>
        <p className="text-rally-text-2 text-sm mb-4">{t('edit_profile.subtitle')}</p>

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
          <p className="text-rally-text-2">{t('edit_profile.loadError')}</p>
        )}

        {status === 'ready' && playerProfile && (
          <EditProfileForm profile={playerProfile} />
        )}
      </section>
    </main>
  )
}

type Status = { kind: 'idle' } | { kind: 'success' } | { kind: 'error'; message: string }

function defaultsFromProfile(profile: PlayerMe): EditProfileFormValues {
  // PlayerMe doesn't expose country_code — DEFAULT_COUNTRY.dial is used as the
  // initial selection until the user changes it. The submit code only sends
  // dirty fields, so an unchanged default isn't persisted.
  return {
    first_name: profile.first_name ?? '',
    last_name: profile.last_name ?? '',
    country_code: DEFAULT_COUNTRY.dial,
    contact_number: profile.contact_number ?? '',
    skill_level: profile.skill_level ?? 3.0,
  }
}

function EditProfileForm({ profile }: { profile: PlayerMe }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const defaults = defaultsFromProfile(profile)

  const form = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: defaults,
    mode: 'onChange',
  })

  useEffect(() => {
    const subscription = form.watch((_, { name, type }) => {
      // form.reset() fires with no name/type; only clear on real user edits.
      if (!name || type !== 'change') return
      setStatus((s) => (s.kind === 'idle' ? s : { kind: 'idle' }))
    })
    return () => subscription.unsubscribe()
  }, [form])

  const mutation = useMutation({
    mutationFn: (payload: ProfileUpdateRequest) => updateProfile(payload),
    onSuccess: (result, payload) => {
      if (!result.success) {
        setStatus({ kind: 'error', message: result.error.message || t('edit_profile.saveError') })
        return
      }
      setStatus({ kind: 'success' })
      void queryClient.invalidateQueries({ queryKey: ['onboarding-status'] })
      void queryClient.invalidateQueries({ queryKey: ['player-profile-me'] })
      form.reset({ ...form.getValues(), ...payload } as EditProfileFormValues)
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : t('edit_profile.saveError')
      setStatus({ kind: 'error', message })
    },
  })

  const onSubmit = (values: EditProfileFormValues) => {
    setStatus({ kind: 'idle' })
    const dirty = form.formState.dirtyFields
    const payload: ProfileUpdateRequest = {}
    if (dirty.first_name) payload.first_name = values.first_name
    if (dirty.last_name) payload.last_name = values.last_name
    if (dirty.country_code) payload.country_code = values.country_code
    if (dirty.contact_number) payload.contact_number = values.contact_number
    if (dirty.skill_level) payload.skill_level = values.skill_level
    if (Object.keys(payload).length === 0) return
    mutation.mutate(payload)
  }

  const canSubmit =
    form.formState.isDirty && form.formState.isValid && !mutation.isPending

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-4 bg-rally-surface border-white/10">
          <h2 className="text-base font-semibold mb-3 text-rally-text">
            {t('edit_profile.section_personal')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="first_name" className="mb-1 block text-sm">
                {t('edit_profile.firstName')}
              </Label>
              <Input id="first_name" {...form.register('first_name')} />
              {form.formState.errors.first_name && (
                <p className="text-sm text-red-400 mt-1">
                  {t(form.formState.errors.first_name.message as string)}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="last_name" className="mb-1 block text-sm">
                {t('edit_profile.lastName')}
              </Label>
              <Input id="last_name" {...form.register('last_name')} />
              {form.formState.errors.last_name && (
                <p className="text-sm text-red-400 mt-1">
                  {t(form.formState.errors.last_name.message as string)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3">
            <Label className="mb-1 block text-sm">{t('edit_profile.email')}</Label>
            <p className="text-rally-text-2 text-sm">{profile.email ?? '—'}</p>
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
        </Card>

        <Card className="p-4 bg-rally-surface border-white/10">
          <h2 className="text-base font-semibold mb-3 text-rally-text">
            {t('edit_profile.section_skill')}
          </h2>
          <Controller
            control={form.control}
            name="skill_level"
            render={({ field }) => (
              <SkillLevelSlider value={field.value} onChange={field.onChange} />
            )}
          />
        </Card>
      </div>

      {form.formState.isDirty && (
        <div className="flex gap-3 justify-end">
          <Button
            type="submit"
            disabled={!canSubmit}
            className="bg-rally-accent text-rally-accent-text hover:bg-rally-accent-hover"
          >
            {mutation.isPending ? t('edit_profile.saving') : t('edit_profile.save')}
          </Button>
        </div>
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
    </form>
  )
}
