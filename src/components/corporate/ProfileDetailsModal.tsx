import { useEffect, useState, type FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useEnsureProfileEssentials, type ProfileEssentialsError } from '@/hooks/useEnsureProfileEssentials'
import { useAuth } from '@/hooks/useAuth'
import { SkillLevelSlider } from '@/components/profile/SkillLevelSlider'
import { PhoneOtpVerification } from '@/components/profile/PhoneOtpVerification'
import { formatLevelWithTier } from '@/lib/skillTiers'
import { normalizeSkillLevel } from '@/lib/skillLevel'
import { DEFAULT_COUNTRY } from '@/constants/countryCodes'
import { Field } from './Field'
import { inputClass } from './inputClass'
import { normalizeIsraeliLocal, isValidIsraeliLocal } from './phone'

interface ProfileDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The tournament's own range on the same scale ('2.5 - 3.8 (C2)'), or null
   *  for an all-levels tournament. Shown beside the slider, where the choice is
   *  actually made. */
  tournamentLevel: string | null
  /** Open with the level editor already unlocked — the caller's control said
   *  "change my level", so making them click the pencil again is a dead step. */
  editLevel?: boolean
  /**
   * The essentials as written, handed straight back to the caller. The profile
   * query needs a refetch round-trip to catch up, and the summary card must not
   * still read "missing" in that window — a player would see the modal close and
   * nothing change, and a register click there would reopen it.
   */
  onSaved?: (saved: SavedProfileEssentials) => void
}

export interface SavedProfileEssentials {
  first_name: string
  last_name: string
  contact_number: string
  skill_level: number | null
}

/**
 * Who you are, asked once, on its own.
 *
 * These four fields used to sit at the top of the registration form, above the
 * residency pills and the partner search, so one card mixed "my account" with
 * "how I am entering this tournament" and the player could not tell which was
 * which. They are the same fields, the same validation and the same single
 * write — `useEnsureProfileEssentials` still refuses to overwrite a stored
 * phone, and still refuses to overwrite a stored level unless the player opened
 * the editor themselves. Only the container changed.
 *
 * The write happens on Save, not on register: by the time the player submits the
 * registration their profile already exists, which is also what lights up the
 * partner search (`PartnerSection` needs a `players` row to search from).
 */
export function ProfileDetailsModal({
  open, onOpenChange, tournamentLevel, editLevel = false, onSaved,
}: ProfileDetailsModalProps) {
  const { t, i18n } = useTranslation()
  const { ensure, playerProfile, phoneLocked, levelLocked } = useEnsureProfileEssentials()
  const { user, signOut } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [level, setLevel] = useState<number | null>(null)
  // The player asked to change a level they already had. Gates BOTH the slider
  // and the profile overwrite — see `overwriteStoredLevel`.
  const [levelEditing, setLevelEditing] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [profileError, setProfileError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // A NEW number must be proven by OTP before it is written, exactly as Edit
  // Profile and the app require (both gate their save on it; the server does
  // not). This state means nothing when `phoneLocked`: a stored number was
  // proven when it was stored, and the profile that says so arrives AFTER this
  // modal auto-opens — seeding a flag from it once would leave every existing
  // player stuck on "verify" beside a read-only field with no verify button.
  const [phoneVerified, setPhoneVerified] = useState(false)
  // The number belongs to another Rally account (the OTP pre-check, or the save
  // itself as a backstop). The fix is to sign in as that account, not to edit
  // the field, so this is what puts the button to do it beside the message.
  const [phoneConflict, setPhoneConflict] = useState(false)
  const signedInAs = user?.email || user?.phone || null

  // Each opening starts from the caller's intent, not from the last one's
  // leftovers: reopening plain must not inherit an editor the player opened,
  // and reopening from "change my level" must not need the pencil again.
  useEffect(() => {
    if (open) setLevelEditing(editLevel)
  }, [open, editLevel])

  // Prefill once the profile lands; a stored phone/level is shown, never edited.
  useEffect(() => {
    if (!playerProfile) return
    setFirstName((v) => v || playerProfile.first_name || '')
    setLastName((v) => v || playerProfile.last_name || '')
    if (playerProfile.contact_number) setPhone(normalizeIsraeliLocal(playerProfile.contact_number))
    // `normalizeSkillLevel`, not the raw column: mobile writes 0 at
    // complete-profile to mean "not chosen", and prefilling that showed a
    // declared-looking "0.0 (D2)" that also satisfied the required check. The
    // `levelEditing` guard keeps a profile refetch from reverting an open editor.
    if (!levelEditing) setLevel(normalizeSkillLevel(playerProfile.skill_level))
  }, [playerProfile])

  const validate = () => {
    const next: Record<string, string> = {}
    if (!firstName.trim()) next.firstName = t('corporate.reg.errorRequired')
    if (!lastName.trim()) next.lastName = t('corporate.reg.errorRequired')
    if (!phoneLocked) {
      if (!phone) next.phone = t('corporate.reg.errorRequired')
      else if (!isValidIsraeliLocal(phone)) next.phone = t('corporate.reg.errorPhone')
      // Same key Edit Profile uses for the same refusal.
      else if (!phoneVerified) next.phone = t('edit_profile.validation.phoneNotVerified')
    }
    if (!levelLocked && level == null) next.level = t('corporate.reg.errorLevel')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (saving) return
    if (!validate()) return
    setProfileError(null)
    setSaving(true)
    try {
      await ensure({
        firstName: firstName.trim(), lastName: lastName.trim(), phone, skillLevel: level,
        overwriteStoredLevel: levelEditing,
      })
    } catch (e) {
      // Translate what we know; never print the server's own English message to
      // a Hebrew page. The OTP pre-check normally catches a taken number before
      // any SMS is sent, so this branch is the backstop for a race between it and
      // the write — the same account-switch fix applies either way.
      const err = e as ProfileEssentialsError
      if (err?.code === 'MOBILE_ALREADY_EXISTS') {
        setPhoneConflict(true)
        setProfileError(t('edit_profile.phoneAccountHelp'))
      } else {
        console.debug('[ProfileDetailsModal]', err?.code ?? '', err?.message ?? e)
        setProfileError(t('corporate.reg.profileSaveError'))
      }
      setSaving(false)
      return
    }
    setSaving(false)
    onSaved?.({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      contact_number: phone,
      skill_level: level,
    })
    onOpenChange(false)
  }

  /**
   * Sign out and let the page offer sign-in again, with every provider it has.
   * Closing here matters: otherwise the modal stays up over a page that has
   * just become signed-out. (If the player then signs back in WITHOUT a page
   * load — email and password — the page will not auto-open this modal a
   * second time; OAuth returns through a redirect, which remounts, so it does.)
   */
  const handleSwitchAccount = async () => {
    onOpenChange(false)
    await signOut()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next) }}>
      <DialogContent
        dir={i18n.dir()}
        className="bg-rally-surface border-rally-border w-[calc(100%_-_2rem)] max-w-md rounded-2xl max-h-[90dvh] overflow-y-auto p-0"
      >
        <DialogHeader className="px-6 pt-6 pb-4 text-start sm:text-start">
          <DialogTitle className="font-display text-xl font-black text-rally-text">
            {t('corporate.reg.detailsTitle')}
          </DialogTitle>
          <DialogDescription className="text-sm text-rally-text-2 leading-relaxed">
            {t('corporate.reg.detailsSubtitle')}
          </DialogDescription>
          {/* Who this modal is filling in. A browser that kept an old session skips
              sign-in entirely and lands here, so without this line a player has no
              way to tell they are on a second account — which is exactly how a
              taken phone number reads as "your details are wrong". */}
          {signedInAs && (
            <p className="text-xs text-rally-text-muted pt-1">
              <Trans
                i18nKey="corporate.reg.signedInAs"
                values={{ account: signedInAs }}
                components={{ account: <bdi dir="ltr" className="text-rally-text-2" /> }}
              />
              {' · '}
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSwitchAccount()}
                className="font-bold text-rally-accent hover:text-rally-accent-hover disabled:opacity-50"
              >
                {t('corporate.reg.switchAccount')}
              </button>
            </p>
          )}
        </DialogHeader>

        {/* No `aria-label`: an unnamed <form> carries no `form` role, so this one
            can never be mistaken for the registration form the page tests query. */}
        <form onSubmit={handleSubmit} noValidate className="px-6 pb-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('corporate.reg.firstName')} error={errors.firstName} htmlFor="cr-first">
              <input id="cr-first" type="text" autoComplete="given-name" value={firstName}
                onChange={(e) => setFirstName(e.target.value)} className={inputClass(!!errors.firstName)}
                aria-invalid={!!errors.firstName}
                aria-describedby={errors.firstName ? 'cr-first-error' : undefined} />
            </Field>
            <Field label={t('corporate.reg.lastName')} error={errors.lastName} htmlFor="cr-last">
              <input id="cr-last" type="text" autoComplete="family-name" value={lastName}
                onChange={(e) => setLastName(e.target.value)} className={inputClass(!!errors.lastName)}
                aria-invalid={!!errors.lastName}
                aria-describedby={errors.lastName ? 'cr-last-error' : undefined} />
            </Field>
          </div>

          <Field
            label={t('corporate.reg.phone')}
            error={errors.phone}
            hint={phoneLocked ? t('corporate.reg.phoneLocked') : t('corporate.phoneHint')}
            htmlFor="cr-phone"
          >
            {phoneLocked ? (
              // A readOnly <input>, not a <p>: Field's htmlFor can only associate its
              // label with a labelable element, so a <p> left this field nameless to a
              // screen reader. PlayerMe carries no country_code (see EditProfilePage's
              // note on the same gap), so the dial prefix comes from the shared
              // constant rather than a literal.
              <input
                id="cr-phone"
                type="tel"
                dir="ltr"
                readOnly
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? 'cr-phone-error' : undefined}
                value={`${DEFAULT_COUNTRY.dial} ${phone}`}
                className="w-full rounded-md bg-rally-surface-2 border border-rally-border px-3 py-3 text-rally-text text-start"
              />
            ) : (
              <div
                dir="ltr"
                className={cn(
                  'flex items-stretch rounded-md overflow-hidden border bg-rally-surface-2 transition-colors',
                  'focus-within:border-rally-accent focus-within:ring-4 focus-within:ring-rally-accent-dim',
                  errors.phone ? 'border-rally-error' : 'border-rally-border',
                )}
              >
                <span className="flex items-center px-3 font-display font-bold text-rally-text-2 bg-rally-surface border-e border-rally-border select-none">
                  {DEFAULT_COUNTRY.dial}
                </span>
                <input id="cr-phone" type="tel" inputMode="numeric" autoComplete="tel-national" value={phone}
                  onChange={(e) => {
                    setPhone(normalizeIsraeliLocal(e.target.value))
                    // A different number is a different question.
                    setPhoneConflict(false)
                  }}
                  placeholder={t('corporate.phonePlaceholder')}
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? 'cr-phone-error' : undefined}
                  // 16px on phones: iOS zooms the page into any input under 16px on
                  // focus and leaves it zoomed (the 2026-09-17 Edit Profile fix).
                  className="flex-1 min-w-0 bg-transparent px-3 py-3 text-base sm:text-sm text-rally-text placeholder:text-rally-text-muted focus:outline-none" />
              </div>
            )}
          </Field>

          {/* Below the field and its hint, so the order reads "type it, then prove
              it". Its buttons are type="button", so none of them submits this form. */}
          {!phoneLocked && (
            <div className="space-y-2">
              <PhoneOtpVerification
                countryCode={DEFAULT_COUNTRY.dial}
                phone={phone}
                verified={phoneVerified}
                onVerifiedChange={setPhoneVerified}
                onAccountConflict={() => setPhoneConflict(true)}
              />
              {phoneConflict && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSwitchAccount()}
                  className="h-11 w-full rounded-lg bg-rally-accent text-rally-accent-text text-sm font-bold hover:bg-rally-accent-hover disabled:opacity-50 transition-colors"
                >
                  {t('corporate.reg.useExistingAccount')}
                </button>
              )}
            </div>
          )}

          <fieldset>
            <legend className="block font-display font-bold text-sm text-rally-text mb-2">
              {t('corporate.reg.level')}
            </legend>
            {levelLocked && !levelEditing && level != null ? (
              <div className="flex items-center justify-between gap-3 rounded-md bg-rally-surface-2 border border-rally-border px-3 py-3">
                {/* "4.6 (B1)" is Latin + digits inside a Hebrew paragraph — isolate it or the
                    bidi algorithm renders "(B1) 4.6". */}
                <span className="text-rally-text"><bdi dir="ltr">{formatLevelWithTier(level)}</bdi></span>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setLevelEditing(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-rally-accent hover:text-rally-accent-hover disabled:opacity-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {t('corporate.reg.levelEdit')}
                </button>
              </div>
            ) : (
              // The web's level slider, mounted exactly as Edit Profile mounts it. Its
              // number, track, ticks and note ARE the control. This used to sit in an
              // extra box with a second readout ("2.0 (D1)" under a "2.00") and a
              // second hint, which made the modal a variant of the slider rather than
              // the slider — one number shown two ways, side by side.
              <SkillLevelSlider value={level} onChange={setLevel} />
            )}
            {/* Only what the slider cannot say for itself: a validation error, or the
                note about a level this account already has. `role` only while it
                carries the error — an always-on alert would announce the note. */}
            {(errors.level || levelLocked) && (
              <p role={errors.level ? 'alert' : undefined} className="text-xs mt-1.5 leading-relaxed text-rally-text-muted">
                {errors.level ? <span className="text-rally-error">{errors.level}</span>
                  : !levelEditing ? t('corporate.reg.levelLocked')
                  : t('corporate.reg.levelEditNote')}
              </p>
            )}
            {tournamentLevel && (
              <p className="text-xs mt-1 text-rally-text-2">
                {/* The range is Latin + digits ("2.5 - 3.8 (C2)") inside Hebrew copy —
                    isolate it or bidi reorders it, exactly as for the readout above. */}
                <Trans
                  i18nKey="corporate.reg.levelTournament"
                  values={{ range: tournamentLevel }}
                  components={{ range: <bdi dir="ltr" /> }}
                />
              </p>
            )}
          </fieldset>

          <button
            type="submit"
            disabled={saving}
            className="w-full h-12 rounded-full bg-rally-accent text-rally-accent-text font-display font-bold text-base hover:bg-rally-accent-hover disabled:opacity-50 transition-colors"
          >
            {saving ? t('corporate.reg.detailsSaving') : t('corporate.reg.detailsSave')}
          </button>

          {profileError && <p role="alert" className="text-sm text-rally-error text-center">{profileError}</p>}
        </form>
      </DialogContent>
    </Dialog>
  )
}
