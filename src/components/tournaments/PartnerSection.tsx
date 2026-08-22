import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { usePlayerSearch } from '@/hooks/usePlayerSearch'
import { COUNTRY_CODES, DEFAULT_COUNTRY } from '@/constants/countryCodes'
import type { PartnerSelectionState } from '@/types/partner'
import type { PlayerSearchResult } from '@/types/api'

function buildDisplayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim()
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

interface InviteFormState {
  firstName: string
  lastName: string
  countryCode: string
  phone: string
}

const INITIAL_INVITE: InviteFormState = {
  firstName: '',
  lastName: '',
  countryCode: DEFAULT_COUNTRY.dial,
  phone: '',
}

function isInviteValid(form: InviteFormState): boolean {
  return (
    form.firstName.trim().length > 0 &&
    form.lastName.trim().length > 0 &&
    form.phone.trim().length > 6
  )
}

interface Props {
  selectionState: PartnerSelectionState
  onPartnerChange: (next: PartnerSelectionState) => void
}

export function PartnerSection({ selectionState, onPartnerChange }: Props) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [inviteForm, setInviteForm] = useState<InviteFormState>(INITIAL_INVITE)
  const { results, isLoading, isActive } = usePlayerSearch(query)

  const handleSelectExisting = (player: PlayerSearchResult) => {
    const displayName = buildDisplayName(player.first_name, player.last_name)
    onPartnerChange({
      phase: 'selected',
      partner: {
        type: 'existing',
        id: player.id,
        displayName,
        avatarUrl: player.avatar_url,
      },
    })
  }

  const handleInvite = () => {
    if (!isInviteValid(inviteForm)) return
    onPartnerChange({
      phase: 'selected',
      partner: {
        type: 'invite',
        firstName: inviteForm.firstName,
        lastName: inviteForm.lastName,
        countryCode: inviteForm.countryCode,
        phone: inviteForm.phone,
      },
    })
  }

  const handleRemove = () => {
    setQuery('')
    setInviteForm(INITIAL_INVITE)
    onPartnerChange({ phase: 'idle' })
  }

  const showNoResults = isActive && !isLoading && results.length === 0

  if (selectionState.phase === 'selected') {
    const { partner } = selectionState
    const displayName =
      partner.type === 'existing'
        ? partner.displayName
        : buildDisplayName(partner.firstName, partner.lastName)
    const badge =
      partner.type === 'existing'
        ? t('tournament.partnerBadgeRally')
        : t('tournament.partnerBadgeInvited')

    return (
      <div className="rounded-2xl bg-rally-surface border border-rally-border p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-rally-accent/15 border border-rally-accent/30 flex items-center justify-center shrink-0">
          <span className="text-sm font-extrabold text-rally-accent">
            {getInitials(displayName)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-rally-text font-bold truncate">{displayName}</p>
          <p className="text-xs text-rally-accent font-semibold">{badge}</p>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          aria-label={t('tournament.partnerRemove')}
          className="text-rally-text-muted hover:text-rally-text-2 p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-rally-surface border border-rally-border p-4 space-y-4">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rally-text-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('tournament.partnerSearchPlaceholder')}
          className="ps-9"
        />
      </div>

      {showNoResults ? (
        <p className="text-sm text-rally-text-muted text-center py-2">
          {t('tournament.partnerNoResults')}
        </p>
      ) : results.length > 0 ? (
        <div className="space-y-1 max-h-56 overflow-y-auto">
          {results.map((player) => {
            const displayName = buildDisplayName(player.first_name, player.last_name)
            return (
              <button
                type="button"
                key={player.id}
                onClick={() => handleSelectExisting(player)}
                className="w-full flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-rally-surface-2 text-start transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-rally-accent/15 border border-rally-accent/30 flex items-center justify-center shrink-0">
                  <span className="text-xs font-extrabold text-rally-accent">
                    {getInitials(displayName)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-rally-text font-semibold text-sm truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-rally-text-muted">
                    {t('tournament.partnerBadgeRally')}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-rally-border" />
        <span className="text-xs uppercase tracking-wider text-rally-text-muted">
          {t('tournament.partnerOrDivider')}
        </span>
        <div className="h-px flex-1 bg-rally-border" />
      </div>

      <div className="space-y-2">
        <p className="text-xs text-rally-text-2">{t('tournament.partnerInviteHeading')}</p>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={inviteForm.firstName}
            onChange={(e) => setInviteForm((f) => ({ ...f, firstName: e.target.value }))}
            placeholder={t('tournament.partnerFirstNamePlaceholder')}
          />
          <Input
            value={inviteForm.lastName}
            onChange={(e) => setInviteForm((f) => ({ ...f, lastName: e.target.value }))}
            placeholder={t('tournament.partnerLastNamePlaceholder')}
          />
        </div>
        <div className="grid grid-cols-[5.5rem_1fr] gap-2">
          <select
            value={inviteForm.countryCode}
            onChange={(e) => setInviteForm((f) => ({ ...f, countryCode: e.target.value }))}
            aria-label={t('tournament.partnerMobileNumberPlaceholder')}
            className="w-full h-11 rounded-lg border border-white/10 bg-rally-surface px-2 text-sm text-rally-text"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.iso} value={c.dial}>
                {c.flag} {c.dial}
              </option>
            ))}
          </select>
          <Input
            type="tel"
            inputMode="numeric"
            value={inviteForm.phone}
            onChange={(e) => setInviteForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder={t('tournament.partnerMobileNumberPlaceholder')}
          />
        </div>
        <Button
          type="button"
          variant="accent"
          size="sm"
          disabled={!isInviteValid(inviteForm)}
          onClick={handleInvite}
          className="w-full"
        >
          {t('tournament.partnerInviteButton')}
        </Button>
      </div>
    </div>
  )
}
