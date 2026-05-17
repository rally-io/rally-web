import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Plus, UserPlus, Search } from 'lucide-react'
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
  const [searchOpen, setSearchOpen] = useState(false)
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
      <div className="rounded-2xl bg-rally-surface border border-rally-accent/40 p-5 flex items-center gap-4 shadow-glow-electric">
        <Avatar name={name} src={p.type === 'existing' ? p.avatarUrl : null} />
        <div className="flex-1 min-w-0">
          <p className="text-rally-text font-bold text-lg truncate">{name}</p>
          <p className="text-xs text-rally-accent font-semibold">{badge}</p>
        </div>
        <button
          aria-label="remove partner"
          onClick={() => onChange({ phase: 'idle' })}
          className="text-rally-text-muted hover:text-rally-text transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Primary path: invite a new partner */}
      <div className="rounded-2xl bg-rally-surface border border-rally-border p-5 space-y-3">
        <div className="flex items-center gap-2 text-rally-text font-semibold mb-1">
          <UserPlus className="w-4 h-4 text-rally-accent" />
          <span>{t('tournament.partnerInviteHeading')}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            placeholder={t('tournament.partnerFirstNamePlaceholder')}
            className="rounded-md bg-rally-surface-2 border border-rally-border text-rally-text px-3 py-2.5 placeholder:text-rally-text-muted focus:outline-none focus:border-rally-accent focus:ring-4 focus:ring-rally-accent-dim transition-colors"
          />
          <input
            value={last}
            onChange={(e) => setLast(e.target.value)}
            placeholder={t('tournament.partnerLastNamePlaceholder')}
            className="rounded-md bg-rally-surface-2 border border-rally-border text-rally-text px-3 py-2.5 placeholder:text-rally-text-muted focus:outline-none focus:border-rally-accent focus:ring-4 focus:ring-rally-accent-dim transition-colors"
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
          className="w-full h-11 rounded-full bg-rally-accent text-rally-accent-text font-bold disabled:opacity-40 enabled:hover:bg-rally-accent-hover transition-colors"
        >
          {t('tournament.partnerInviteButton')}
        </button>
      </div>

      {/* Secondary path: search existing Rally player (collapsed by default) */}
      {!searchOpen ? (
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-rally-border text-rally-text-2 hover:text-rally-text hover:border-rally-border-strong px-4 py-3 text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{t('tournament.partnerSearchExpandCta')}</span>
        </button>
      ) : (
        <div className="rounded-2xl bg-rally-surface border border-rally-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-rally-text font-semibold">
              <Search className="w-4 h-4 text-rally-blue" />
              <span>{t('tournament.partnerSearchExistingTitle')}</span>
            </div>
            <button
              onClick={() => {
                setSearchOpen(false)
                setQuery('')
              }}
              className="text-rally-text-muted hover:text-rally-text transition-colors"
              aria-label="close search"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('tournament.partnerSearchPlaceholder')}
            className="w-full rounded-md bg-rally-surface-2 border border-rally-border text-rally-text px-4 py-2.5 placeholder:text-rally-text-muted focus:outline-none focus:border-rally-blue focus:ring-4 focus:ring-rally-blue-dim transition-colors"
            autoFocus
          />
          {query.length >= 2 && (
            <div className="mt-3 space-y-2">
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
                  className="w-full flex items-center gap-3 rounded-xl bg-rally-surface-2 hover:bg-rally-surface-2/80 p-3 text-start transition-colors"
                >
                  <Avatar
                    name={`${r.first_name} ${r.last_name}`}
                    src={r.avatar_url}
                  />
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
        </div>
      )}
    </div>
  )
}
