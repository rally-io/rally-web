import { useState } from 'react'
import { cn } from '@/lib/utils'
import { getBrand, logoFor } from './config'

const TILE_COLORS = [
  'bg-rally-blue text-white',
  'bg-rally-accent text-[#141a2e]',
  'bg-[#141a2e] text-rally-accent',
]

function initials(nameEn: string): string {
  const words = nameEn
    .replace(/[^A-Za-z0-9 ]/g, '')
    .split(' ')
    .filter(Boolean)
  const skip = new Set(['padel', 'club', 'center', 'sports', 'the'])
  const core = words.filter((w) => !skip.has(w.toLowerCase()))
  const pick = core.length ? core : words
  return pick
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

/** Brand logo, or a lettermark tile when no logo file is available (or it fails to load). */
export function BrandLogo({ brandId, className }: { brandId: string; className?: string }) {
  const brand = getBrand(brandId)
  const src = logoFor(brandId)
  const [failed, setFailed] = useState(false)

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn('shrink-0 rounded-[28%] bg-white object-cover', className)}
      />
    )
  }

  const color = TILE_COLORS[(brand?.id.length ?? 0) % TILE_COLORS.length]
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-[28%] font-display font-black',
        color,
        className,
      )}
    >
      {initials(brand?.nameEn ?? '?')}
    </span>
  )
}
