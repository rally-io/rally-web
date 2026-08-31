import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, Search } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export interface FilterOption {
  value: string
  label: string
  /** Optional badge on the right of the row — how many tournaments the option
   * would yield. Never a scarcity signal; it is a count of results. */
  count?: number
  avatarUrl?: string | null
}

interface Props {
  /** Trigger text, e.g. "Clubs". */
  label: string
  options: FilterOption[]
  selected: string[]
  onApply: (values: string[]) => void
  /** Apply-button text for the drafted selection size. Per-dimension so the
   * copy can read "Show 2 clubs" / "Show 2 organizers". */
  applyLabel: (count: number) => string
  emptyLabel: string
  /** Adds the in-popover text filter. Off for short static lists. */
  searchable?: boolean
  searchPlaceholder?: string
  isPending?: boolean
  isError?: boolean
  onRetry?: () => void
  /** Lets the owner load options lazily on first open. */
  onOpenChange?: (open: boolean) => void
  icon?: ReactNode
}

/**
 * One multi-select filter: draft a selection in the popover, apply it in one
 * commit. Every tournament filter (clubs, organizers, skill, month) is a
 * configuration of this — options come from an API, from static definitions,
 * or from the loaded data, and none of that is this component's business.
 *
 * Drafting rather than applying per click keeps the URL — and therefore the
 * query key — from churning once per checkbox.
 */
export function FilterDropdown({
  label,
  options,
  selected,
  onApply,
  applyLabel,
  emptyLabel,
  searchable = false,
  searchPlaceholder,
  isPending = false,
  isError = false,
  onRetry,
  onOpenChange,
  icon,
}: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<string[]>(selected)
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    if (!searchable) return options
    const q = query.trim().toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query, searchable])

  const toggle = (value: string) =>
    setDraft((d) => (d.includes(value) ? d.filter((x) => x !== value) : [...d, value]))

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        onOpenChange?.(next)
        if (next) {
          setDraft(selected) // re-seed draft on every open
          setQuery('') // discard stale search text from the previous session
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors ${
            selected.length
              ? 'border-rally-accent bg-rally-accent-dim text-rally-accent'
              : 'border-rally-border bg-rally-surface text-rally-text hover:border-rally-border-strong'
          }`}
        >
          {icon}
          {label}
          {selected.length > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rally-accent px-1 text-xs font-black text-rally-accent-text">
              {selected.length}
            </span>
          )}
          <ChevronDown className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        {searchable && (
          <div className="relative mb-2">
            <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rally-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-9 w-full rounded-lg border border-rally-border bg-rally-bg px-3 pe-9 text-sm text-rally-text placeholder:text-rally-text-muted focus:border-rally-accent focus:outline-none"
            />
          </div>
        )}
        <div className="max-h-64 overflow-y-auto">
          {isError ? (
            <button
              type="button"
              onClick={() => onRetry?.()}
              className="w-full py-4 text-center text-sm text-rally-text-2 underline"
            >
              {t('tournament.tournamentsRetry')}
            </button>
          ) : isPending ? (
            <p className="w-full py-4 text-center text-sm text-rally-text-2">
              {t('common.loading')}
            </p>
          ) : visible.length === 0 ? (
            <p className="w-full py-4 text-center text-sm text-rally-text-2">{emptyLabel}</p>
          ) : (
            visible.map((option) => (
              <button
                key={option.value}
                type="button"
                role="checkbox"
                aria-checked={draft.includes(option.value)}
                onClick={() => toggle(option.value)}
                className="flex w-full items-center gap-2.5 border-b border-rally-border-subtle px-1 py-2.5 text-sm text-rally-text last:border-b-0"
              >
                <span
                  className={`flex h-4.5 w-4.5 items-center justify-center rounded border ${
                    draft.includes(option.value)
                      ? 'border-rally-accent bg-rally-accent text-rally-accent-text'
                      : 'border-rally-border-strong'
                  }`}
                >
                  {draft.includes(option.value) && <Check className="h-3 w-3" />}
                </span>
                {option.avatarUrl && (
                  <img
                    src={option.avatarUrl}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    className="h-6 w-6 shrink-0 rounded-full object-cover"
                  />
                )}
                <span className="flex-1 text-start">{option.label}</span>
                {option.count != null && (
                  <span className="text-xs text-rally-text-muted">{option.count}</span>
                )}
              </button>
            ))
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setDraft([])}
            className="flex-1 rounded-full border border-rally-border py-2 text-xs text-rally-text-2"
          >
            {t('tournament.tournamentsFilterClear')}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              onApply(draft)
              setOpen(false)
            }}
            className="flex-[2] rounded-full bg-rally-accent py-2 text-xs font-bold text-rally-accent-text disabled:opacity-40"
          >
            {applyLabel(draft.length)}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
