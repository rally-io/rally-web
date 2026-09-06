import { useId, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { LocateFixed, Search } from 'lucide-react'
import { Avatar } from '@/components/tournaments/Avatar'
import { cn } from '@/lib/utils'
import type { SearchResult } from '../lib/searchNodes'

export interface NetworkSearchProps {
  query: string
  onQueryChange: (query: string) => void
  results: SearchResult[]
  onPick: (id: string) => void
  onFindMe: () => void
  /** a line under the row — "not on the ball yet" and the like */
  statusMessage: string | null
  /** until the graph has loaded */
  disabled: boolean
}

/** The search row of the network page's floating panel: the input, a results list dropping
    under it, and the icon-only "find me" pill. Keyboard: ↑ ↓ move, Enter picks, Escape clears. */
export function NetworkSearch({
  query, onQueryChange, results, onPick, onFindMe, statusMessage, disabled,
}: NetworkSearchProps) {
  const { t } = useTranslation()
  const listId = useId()
  const [active, setActive] = useState(-1)
  const open = query.trim().length > 0

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(results.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' && active >= 0 && results[active]) {
      e.preventDefault()
      onPick(results[active].node.id)
    } else if (e.key === 'Escape') {
      onQueryChange('')
      setActive(-1)
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute end-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-rally-text-muted" />
          <input
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 && results[active] ? `${listId}-opt-${active}` : undefined}
            value={query}
            disabled={disabled}
            maxLength={60}
            placeholder={t('network.searchPlaceholder')}
            onChange={(e) => {
              onQueryChange(e.target.value)
              setActive(-1)
            }}
            onKeyDown={onKeyDown}
            className="h-12 w-full rounded-xl border border-rally-border bg-rally-bg/70 px-4 pe-11 text-rally-text placeholder:text-rally-text-muted transition-colors focus:border-rally-accent focus:outline-none focus:ring-4 focus:ring-rally-accent-dim disabled:opacity-60"
          />
        </div>
        <button
          type="button"
          onClick={onFindMe}
          disabled={disabled}
          title={t('network.findMe')}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rally-accent text-rally-accent-text shadow-glow-electric transition-colors hover:bg-rally-accent-hover disabled:opacity-60"
        >
          <LocateFixed className="h-5 w-5" />
          <span className="sr-only">{t('network.findMe')}</span>
        </button>
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-[20px] border border-rally-border bg-rally-surface shadow-lg"
        >
          {/* presentation: a listbox may only contain options, and this line is not one. */}
          {results.length === 0 && (
            <li role="presentation" className="px-5 py-4 text-sm text-rally-text-2">
              {t('network.searchNoResults')}
            </li>
          )}
          {results.map((r, i) => (
            <li
              key={r.node.id}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(r.node.id)}
              className={cn(
                'flex min-h-[56px] cursor-pointer items-center gap-3 px-4 py-2 transition-colors',
                i === active ? 'bg-white/5' : 'hover:bg-white/5',
              )}
            >
              <Avatar name={r.node.name} src={r.node.avatarUrl} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-rally-text">{r.node.name}</span>
                {r.node.club && (
                  <span className="block truncate text-xs text-rally-text-2">
                    {r.node.club.name} · {r.node.club.city}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-rally-accent">
                {t('network.partnersCount', { count: r.partners })}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Always mounted so the live region exists before a message lands; takes no room
          while empty so the panel stays a search row on phones. */}
      <p role="status" aria-live="polite" className={cn('text-sm text-rally-text-2', statusMessage ? 'mt-3' : 'mt-0')}>
        {statusMessage ?? ''}
      </p>
    </div>
  )
}
