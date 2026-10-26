import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandLogo } from './BrandLogo'
import { CLUBS } from './ballotData'
import { getBrand } from './config'
import type { ElectionRegion } from './types'

const REGIONS: ElectionRegion[] = [
  'tlv',
  'sharon',
  'center',
  'shfela',
  'jerusalem',
  'haifa',
  'north',
  'south',
]

const SORTED = [...CLUBS].sort((a, b) => a.name.localeCompare(b.name, 'he'))

export function ClubBallot({
  selected,
  onSelect,
}: {
  selected: string | null
  onSelect: (id: string) => void
}) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState<ElectionRegion | null>(null)

  const clubs = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SORTED.filter((c) => {
      if (region && c.region !== region) return false
      if (!q) return true
      const brand = getBrand(c.brand)
      return [c.name, c.city, brand?.name, brand?.nameEn].some((s) => s?.toLowerCase().includes(q))
    })
  }, [query, region])

  return (
    <div>
      <label className="relative block">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('elections.club.search')}
          aria-label={t('elections.club.search')}
          className="h-12 w-full rounded-full border border-white/15 bg-white/[0.07] pe-4 ps-10 text-[15px] text-white placeholder:text-white/45 focus:border-rally-accent focus:outline-none"
        />
      </label>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {[null, ...REGIONS].map((r) => (
          <button
            key={r ?? 'all'}
            type="button"
            onClick={() => setRegion(r)}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
              region === r
                ? 'border-rally-accent bg-rally-accent text-[#141a2e]'
                : 'border-white/15 bg-white/[0.05] text-white/80',
            )}
          >
            {t(r ? `elections.regions.${r}` : 'elections.regions.all')}
          </button>
        ))}
      </div>

      <ul
        className="mt-4 grid gap-2.5 md:grid-cols-2 md:gap-3"
        role="radiogroup"
        aria-label={t('elections.club.title')}
      >
        {clubs.map((club) => {
          const isSel = club.id === selected
          return (
            <li key={club.id}>
              <button
                type="button"
                role="radio"
                aria-checked={isSel}
                data-selected={isSel}
                onClick={() => onSelect(club.id)}
                className="elx-paper flex w-full items-center gap-3 px-3.5 py-3 text-start active:scale-[0.99]"
              >
                <BrandLogo brandId={club.brand} className="h-11 w-11 text-sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[15px] font-bold leading-tight">
                    {club.name}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-[#141a2e]/60">{club.city}</span>
                </span>
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-2',
                    isSel ? 'border-[#141a2e] bg-[#141a2e]' : 'border-[#141a2e]/25',
                  )}
                  aria-hidden
                >
                  {isSel && (
                    <span className="elx-stamp text-lg font-black text-rally-accent">✓</span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {clubs.length === 0 && (
        <p className="py-10 text-center text-sm text-white/60">{t('elections.club.empty')}</p>
      )}
    </div>
  )
}
