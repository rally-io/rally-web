import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import type { PartnerSelectionState } from '@/types/api'
import { usePlayerSearch } from '@/hooks/usePlayerSearch'
import { PhoneInput } from './PhoneInput'
import { Avatar } from './Avatar'

interface Props {
  state: PartnerSelectionState
  onChange: (s: PartnerSelectionState) => void
}

export function PartnerSection({ state, onChange }: Props) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [phone, setPhone] = useState({ countryCode: '+972', phone: '' })
  const { data: results, isFetching } = usePlayerSearch(query)

  const inviteValid =
    first.trim() !== '' && last.trim() !== '' && phone.phone.trim().length > 6

  if (state.phase === 'selected') {
    const p = state.partner
    const name =
      p.type === 'existing' ? p.displayName : `${p.firstName} ${p.lastName}`
    const badge =
      p.type === 'existing'
        ? t('tournament.partnerBadgeRally')
        : t('tournament.partnerBadgeInvited')
    return (
      <div className="rounded-2xl bg-[#222226] p-4 flex items-center gap-3">
        <Avatar name={name} src={p.type === 'existing' ? p.avatarUrl : null} />
        <div className="flex-1 min-w-0">
          <p className="text-rally-text font-semibold truncate">{name}</p>
          <p className="text-xs text-rally-text-2">{badge}</p>
        </div>
        <button
          aria-label="remove partner"
          onClick={() => onChange({ phase: 'idle' })}
          className="text-rally-text-muted hover:text-rally-text"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-[#222226] p-4 space-y-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('tournament.partnerSearchPlaceholder')}
        className="w-full rounded-md bg-rally-surface-2 border border-rally-border text-rally-text px-3 py-2"
      />
      {query.length >= 2 && (
        <div className="space-y-2">
          {isFetching && (
            <p className="text-sm text-rally-text-muted">
              {t('tournament.partnerSearching')}
            </p>
          )}
          {!isFetching && (results?.length ?? 0) === 0 && (
            <p className="text-sm text-rally-text-muted">
              {t('tournament.partnerNoResults')}
            </p>
          )}
          {results?.map((r) => (
            <button
              key={r.id}
              onClick={() =>
                onChange({
                  phase: 'selected',
                  partner: {
                    type: 'existing',
                    id: r.id,
                    displayName: `${r.first_name} ${r.last_name}`,
                    avatarUrl: r.avatar_url,
                  },
                })
              }
              className="w-full flex items-center gap-3 rounded-xl bg-rally-surface p-3 text-start"
            >
              <Avatar name={`${r.first_name} ${r.last_name}`} src={r.avatar_url} />
              <span className="flex-1 min-w-0">
                <span className="block text-rally-text truncate">
                  {r.first_name} {r.last_name}
                </span>
                <span className="block text-xs text-rally-text-2">
                  {t('tournament.partnerBadgeRally')}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 text-rally-text-muted text-xs">
        <span className="flex-1 h-px bg-rally-border" />
        {t('tournament.partnerOrDivider')}
        <span className="flex-1 h-px bg-rally-border" />
      </div>

      <div className="space-y-3">
        <p className="text-rally-text font-semibold">
          {t('tournament.partnerInviteHeading')}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <input
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            placeholder={t('tournament.partnerFirstNamePlaceholder')}
            className="rounded-md bg-rally-surface-2 border border-rally-border text-rally-text px-3 py-2"
          />
          <input
            value={last}
            onChange={(e) => setLast(e.target.value)}
            placeholder={t('tournament.partnerLastNamePlaceholder')}
            className="rounded-md bg-rally-surface-2 border border-rally-border text-rally-text px-3 py-2"
          />
        </div>
        <PhoneInput
          placeholder={t('tournament.partnerMobileNumberPlaceholder')}
          onChange={setPhone}
        />
        <button
          disabled={!inviteValid}
          onClick={() =>
            onChange({
              phase: 'selected',
              partner: {
                type: 'invite',
                firstName: first.trim(),
                lastName: last.trim(),
                countryCode: phone.countryCode,
                phone: phone.phone.trim(),
              },
            })
          }
          className="w-full h-11 rounded-full bg-rally-accent text-rally-accent-text font-bold disabled:opacity-40"
        >
          {t('tournament.partnerInviteButton')}
        </button>
      </div>
    </div>
  )
}
