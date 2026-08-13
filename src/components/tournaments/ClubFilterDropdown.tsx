import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, Search } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useTournamentFilterOptions } from '@/hooks/useTournamentFilterOptions'

export function ClubFilterDropdown({
  selected,
  onApply,
}: {
  selected: string[]
  onApply: (clubIds: string[]) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<string[]>(selected)
  const [query, setQuery] = useState('')
  const { data: clubs = [], isError, isPending, refetch } = useTournamentFilterOptions(open)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return clubs.filter((c) => c.name.toLowerCase().includes(q))
  }, [clubs, query])
  const draftCount = clubs
    .filter((c) => draft.includes(c.id))
    .reduce((sum, c) => sum + c.count, 0)

  const toggle = (id: string) =>
    setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]))

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
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
          {t('tournament.tournamentsFilterClubs')}
          {selected.length > 0 && (
            <span
              aria-label={String(selected.length)}
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rally-accent px-1 text-xs font-black text-rally-accent-text"
            >
              {selected.length}
            </span>
          )}
          <ChevronDown className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        {isError ? (
          <button type="button" onClick={() => refetch()} className="w-full py-4 text-sm text-rally-text-2">
            {t('tournament.tournamentsRetry')}
          </button>
        ) : (
          <>
            <div className="relative mb-2">
              <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rally-text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('tournament.tournamentsFilterSearchClub')}
                aria-label={t('tournament.tournamentsFilterSearchClub')}
                className="h-9 w-full rounded-lg border border-rally-border bg-rally-bg px-3 pe-9 text-sm text-rally-text placeholder:text-rally-text-muted focus:border-rally-accent focus:outline-none"
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {isPending ? (
                <p className="w-full py-4 text-center text-sm text-rally-text-2">{t('common.loading')}</p>
              ) : visible.length === 0 ? (
                <p className="w-full py-4 text-center text-sm text-rally-text-2">{t('clubs.empty')}</p>
              ) : (
                visible.map((club) => (
                  <button
                    key={club.id}
                    type="button"
                    role="checkbox"
                    aria-checked={draft.includes(club.id)}
                    onClick={() => toggle(club.id)}
                    className="flex w-full items-center gap-2.5 border-b border-rally-border-subtle px-1 py-2.5 text-sm text-rally-text last:border-b-0"
                  >
                    <span
                      className={`flex h-4.5 w-4.5 items-center justify-center rounded border ${
                        draft.includes(club.id)
                          ? 'border-rally-accent bg-rally-accent text-rally-accent-text'
                          : 'border-rally-border-strong'
                      }`}
                    >
                      {draft.includes(club.id) && <Check className="h-3 w-3" />}
                    </span>
                    <span className="flex-1 text-start">{club.name}</span>
                    <span className="text-xs text-rally-text-muted">{club.count}</span>
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
                {t('tournament.tournamentsFilterApply', { count: draftCount })}
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
