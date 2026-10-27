import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandLogo } from './BrandLogo'
import { CLUBS } from './ballotData'
import { getBrand, photoFor } from './config'
import { keepsSettle, settleAt, type Settle } from './railSettle'
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

/** lg+: the rail is a pinned column beside the list. Below: a band pinned over it. */
const WIDE_QUERY = '(min-width: 1024px)'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** The phone band's bottom padding (elections.css): the row hidden under the band ends there. */
const BAND_PAD = 12

/** Rail geometry, in px. P: the slip under the open photo; Po: the open photo; Pp: a preview. */
interface Geometry {
  wide: boolean
  /** rail width */
  w: number
  /** open card width */
  W: number
  /** preview card width */
  Wp: number
  P: number
  Po: number
  Pp: number
  gap: number
  /** how dark a closed preview gets */
  dim: number
  /** rail height */
  H: number
  /** height of the fixed CTA bar at the bottom of the screen */
  barH: number
  /** phone band: how far above the band's bottom edge the reading line sits (0 beside the column) */
  cover: number
}

interface CardParts {
  el: HTMLDivElement
  plate: HTMLElement
  text: HTMLElement
  dim: HTMLElement
  img: HTMLImageElement | null
}

/**
 * The club ballot: search, region filter, and the list of clubs (the radio group),
 * with a "spotlight" rail of club photos that follows the list. Scrolling moves a
 * reading line through the list; the club on it opens out in the rail and its
 * neighbours show as smaller previews. Tapping a preview brings that club to the
 * line; tapping the open card, or the club in the list, picks it. On a phone the line
 * runs under the band, so the club open in the band is the row hidden beneath it and
 * no club shows twice.
 */
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
  const [activeId, setActiveId] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const rows = useRef(new Map<string, HTMLButtonElement>())
  const cards = useRef(new Map<string, CardParts>())
  // set by the rail effect; a no-op where the rail does not run (no rAF, e.g. jsdom)
  const bringToLine = useRef<(id: string) => void>(() => {})

  const clubs = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SORTED.filter((c) => {
      if (region && c.region !== region) return false
      if (!q) return true
      const brand = getBrand(c.brand)
      return [c.name, c.city, brand?.name, brand?.nameEn].some((s) => s?.toLowerCase().includes(q))
    })
  }, [query, region])

  useEffect(() => {
    const rail = railRef.current
    const wrap = wrapRef.current
    const list = listRef.current
    if (!rail || !wrap || !list || !clubs.length || typeof window.requestAnimationFrame !== 'function') {
      return
    }
    const order = clubs.map((c) => c.id)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const wideMq = window.matchMedia?.(WIDE_QUERY)
    const moves = () => !reduce?.matches
    let g: Geometry | null = null
    let target = 0
    let shown = 0
    let raf = 0
    let active = -1
    // a club brought to the line by a tap holds the rail until the visitor scrolls
    // themselves, so it opens even where the page cannot scroll it all the way
    let held: number | null = null
    // once scrolling stops between two clubs, the rail settles on the nearer one (railSettle.ts)
    let settled: Settle | null = null
    let idle = 0
    let touching = false
    let settleOnLift = false

    const measure = () => {
      const wide = !!wideMq?.matches
      const w = rail.clientWidth
      const W = wide ? w : Math.min(w - 32, 520)
      const P = wide ? 92 : 64
      const gap = wide ? 12 : 6
      let Pp: number
      let Po: number
      if (wide) {
        // the open card spans the column at up to 16:9, with a full preview above
        // and below it and the next ones just showing at the edges
        rail.style.removeProperty('--rail-h')
        const H = rail.clientHeight
        Pp = Math.round(clamp(H * 0.15, 110, 150))
        Po = Math.round(Math.min(W * 0.5625, H - P - 2 * (Pp + gap) - 40))
      } else {
        // the open card in the middle of the band with enough of the clubs above and
        // below it to see their photos, and the band kept short enough on small phones
        // to leave the list room
        Po = Math.round(Math.min(W * 0.36, window.innerHeight * 0.15))
        Pp = Math.round(Po * 0.4)
        rail.style.setProperty('--rail-h', `${Po + P + 2 * (Pp + gap)}px`)
      }
      rail.style.setProperty('--open-w', `${W}px`)
      rail.style.setProperty('--plate-h', `${P}px`)
      g = {
        wide,
        w,
        W,
        Wp: Math.round(W * (wide ? 0.58 : 0.9)),
        P,
        Po,
        Pp,
        gap,
        dim: wide ? 0.3 : 0.4,
        H: rail.clientHeight,
        barH: parseFloat(getComputedStyle(rail).getPropertyValue('--elx-bar-h')) || 110,
        cover: wide ? 0 : BAND_PAD + (rows.current.get(order[0])?.offsetHeight ?? 68) / 2,
      }
      fitList()
    }

    // On a phone the list starts with its first row under the band, and ends with room for
    // the last row to scroll under it too, so every club reaches the line hidden. The room
    // never shrinks past where the visitor has scrolled: Safari's toolbar resizes the page
    // as it scrolls, and pulling the end of the page up under a visitor would jolt it.
    const fitList = () => {
      const geo = g
      if (!geo) return
      if (geo.wide) {
        list.style.removeProperty('margin-top')
        list.style.removeProperty('padding-bottom')
        return
      }
      const first = rows.current.get(order[0])
      const last = rows.current.get(order[order.length - 1])
      if (!first || !last) return
      list.style.marginTop = `${-(first.offsetHeight + BAND_PAD)}px`
      const doc = document.documentElement
      const pad = () => parseFloat(list.style.paddingBottom) || 0
      // iOS reports a scroll past the end while the page bounces there, which must not count
      const left = Math.max(0, doc.scrollHeight - window.innerHeight - window.scrollY)
      const floor = Math.max(0, pad() - left)
      // with the band pinned at the top, the last row's centre has to reach the line; more
      // passes cover a short list, where the page's min-height takes up the first one
      for (let pass = 0; pass < 3; pass++) {
        const r = last.getBoundingClientRect()
        const scrollNeeded = (r.top + r.bottom) / 2 + window.scrollY - (wrap.offsetHeight - geo.cover)
        const next = Math.max(floor, Math.ceil(pad() + scrollNeeded + window.innerHeight - doc.scrollHeight))
        if (Math.abs(next - pad()) < 1) break
        list.style.paddingBottom = `${next}px`
      }
    }

    // Where the open card's centre sits, from the rail's top. Beside the list it is the
    // middle of the part of the column on screen (below the column's pinned top, 16px in
    // elections.css, and above the CTA bar), so before the column pins it stays clear
    // of the bar.
    const focus = () => {
      const geo = g
      if (!geo) return 0
      if (!geo.wide) return geo.H / 2
      const r = rail.getBoundingClientRect()
      const seen = (Math.max(r.top, 16) + Math.min(r.bottom, window.innerHeight - geo.barH)) / 2
      const half = (geo.Po + geo.P) / 2
      return clamp(seen - r.top, half, geo.H - half)
    }

    const layout = (pos: number) => {
      const geo = g
      if (!geo) return
      const n = order.length
      const sizes = order.map((_, i) => {
        const e = clamp(1 - Math.abs(i - pos), 0, 1)
        return { e, h: geo.Pp + (geo.Po - geo.Pp) * e + geo.P * e, top: 0 }
      })
      let y = 0
      for (const s of sizes) {
        s.top = y
        y += s.h + geo.gap
      }
      const k = clamp(Math.floor(pos), 0, n - 1)
      const f = pos - k
      const mid = (i: number) => sizes[i].top + sizes[i].h / 2
      const shift = focus() - (k + 1 < n ? mid(k) + (mid(k + 1) - mid(k)) * f : mid(k))
      order.forEach((id, i) => {
        const c = cards.current.get(id)
        if (!c) return
        if (Math.abs(i - pos) > 7) {
          c.el.style.display = 'none'
          return
        }
        const s = sizes[i]
        const w = geo.Wp + (geo.W - geo.Wp) * s.e
        const top = s.top + shift
        // fade only over the last 48px (or a whole phone strip) as a card leaves the rail
        const edge = Math.min(top + s.h, geo.H - top)
        // a lazy image loads only once on screen; start the near ones early so previews arrive ready
        if (c.img && c.img.loading === 'lazy' && Math.abs(i - pos) <= 4) c.img.loading = 'eager'
        c.el.style.display = ''
        c.el.style.width = `${w}px`
        c.el.style.height = `${s.h}px`
        c.el.style.transform = `translate(${(geo.w - w) / 2}px, ${top}px)`
        c.el.style.opacity = String(clamp(edge / Math.min(48, geo.Pp), 0, 1))
        c.plate.style.height = `${geo.P * s.e}px`
        // the slip fades in as it starts to unfold, so a closing card leaves no hairline
        c.plate.style.opacity = String(clamp(s.e / 0.25, 0, 1))
        c.text.style.opacity = String(clamp((s.e - 0.6) / 0.4, 0, 1))
        c.dim.style.opacity = String((1 - s.e) * geo.dim)
      })
    }

    // The reading line: the open card's centre beside a pinned column, or under the
    // band's bottom edge, where the band hides the club it shows open. Beside the column,
    // at the top of the page it starts on the first club (the first rows sit above the
    // card's centre) and moves down to its place as the page scrolls; over the last
    // stretch it slides down to the last club. So every club reaches it by scrolling.
    const readingLine = () => {
      const r = wrap.getBoundingClientRect()
      let y = g?.wide ? rail.getBoundingClientRect().top + focus() : r.bottom - (g?.cover ?? 0)
      const first = rows.current.get(order[0])
      const last = rows.current.get(order[order.length - 1])
      if (!first || !last) return y
      const fr = first.getBoundingClientRect()
      // from the first club's place at the top of the page, the line moves down the
      // screen as fast as the page scrolls, so it crosses the list at twice the speed
      // until it meets its own place
      y = Math.min(y, (fr.top + fr.bottom) / 2 + 2 * window.scrollY)
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      if (maxScroll <= 0) return y
      const lr = last.getBoundingClientRect()
      // where the last club will sit once the page is scrolled to the end
      const lastAtEnd = (lr.top + lr.bottom) / 2 - (maxScroll - window.scrollY)
      const D = lastAtEnd - y
      if (D <= 0) return y
      const start = Math.max(0, maxScroll - D)
      if (window.scrollY > start) y += ((window.scrollY - start) / (maxScroll - start)) * D
      return y
    }

    const scrollTarget = () => {
      const y = readingLine()
      let prev: number | null = null
      for (let i = 0; i < order.length; i++) {
        const row = rows.current.get(order[i])
        if (!row) continue
        const r = row.getBoundingClientRect()
        const c = (r.top + r.bottom) / 2
        if (c > y) {
          if (prev === null) return 0
          // hold each club open for a moment, then hand over to the next one: beside the
          // column over the middle of the way; under the band, halfway once the next club's
          // row has gone under the band (its centre BAND_PAD below the line), so the club the
          // band shows open is never a row on screen
          const mid = g?.wide === false ? 1 - BAND_PAD / (c - prev) : 0.5
          const half = Math.min(0.3, 1 - mid)
          const s = clamp(((y - prev) / (c - prev) - (mid - half)) / (2 * half), 0, 1)
          return i - 1 + s * s * (3 - 2 * s)
        }
        prev = c
      }
      return Math.max(0, order.length - 1)
    }

    const paint = () => {
      layout(shown)
      const i = clamp(Math.round(shown), 0, order.length - 1)
      if (i !== active) {
        active = i
        setActiveId(order[i])
      }
    }

    // writes happen once per frame; with reduced motion the rail snaps from club to club
    const step = () => {
      raf = 0
      const d = target - shown
      if (!moves()) shown = Math.round(target)
      else shown = Math.abs(d) < 0.002 ? target : shown + d * 0.22
      paint()
      if (moves() && shown !== target) raf = requestAnimationFrame(step)
    }

    const track = () => {
      const pos = scrollTarget()
      if (settled && !keepsSettle(settled, pos)) settled = null
      target = held ?? settled?.to ?? pos
      if (!raf) raf = requestAnimationFrame(step)
    }

    // Scroll events stop when the page does, momentum included. A finger still on the
    // screen is not a stop: the rail settles once it lifts, unless momentum carries on.
    const settle = () => {
      if (held !== null) return
      if (touching) {
        settleOnLift = true
        return
      }
      settled = settleAt(scrollTarget())
      if (!settled) return
      target = settled.to
      if (!raf) raf = requestAnimationFrame(step)
    }

    const settleSoon = () => {
      clearTimeout(idle)
      idle = window.setTimeout(settle, 150)
    }

    const onScroll = () => {
      track()
      settleSoon()
    }

    const release = () => {
      held = null
    }

    const touchStart = () => {
      touching = true
      release()
    }

    const touchEnd = () => {
      touching = false
      if (settleOnLift) {
        settleOnLift = false
        settleSoon()
      }
    }

    // Safari's toolbar resizes the band after a scroll stops, which can move the line
    const remeasure = () => {
      measure()
      track()
      settleSoon()
    }

    bringToLine.current = (id) => {
      const i = order.indexOf(id)
      const row = rows.current.get(id)
      if (i < 0 || !row) return
      held = i
      const r = row.getBoundingClientRect()
      // the phone band pins as the page scrolls, and the line moves up with it
      const line = g && !g.wide ? Math.min(readingLine(), wrap.offsetHeight - g.cover) : readingLine()
      window.scrollBy({
        top: (r.top + r.bottom) / 2 - line,
        behavior: moves() ? 'smooth' : 'auto',
      })
      track()
    }

    measure()
    target = shown = scrollTarget()
    paint()

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', remeasure)
    window.addEventListener('wheel', release, { passive: true })
    window.addEventListener('touchstart', touchStart, { passive: true })
    window.addEventListener('touchend', touchEnd, { passive: true })
    window.addEventListener('touchcancel', touchEnd, { passive: true })
    window.addEventListener('pointerdown', release)
    window.addEventListener('keydown', release)
    wideMq?.addEventListener?.('change', remeasure)
    // the column's height follows the CTA bar, which grows once a club is picked
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(remeasure)
    ro?.observe(rail)
    // the CTA bar's spacer under the list gets its height after this first measure, and
    // grows once a club is picked; refit the end of the list the next frame, since the
    // refit itself resizes the page
    let refit = 0
    const pageRo =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            cancelAnimationFrame(refit)
            refit = requestAnimationFrame(() => {
              fitList()
              track()
            })
          })
    pageRo?.observe(document.body)
    return () => {
      bringToLine.current = () => {}
      // the next list (or no list: nothing found) starts from the plain layout
      list.style.removeProperty('margin-top')
      list.style.removeProperty('padding-bottom')
      cancelAnimationFrame(raf)
      cancelAnimationFrame(refit)
      pageRo?.disconnect()
      clearTimeout(idle)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', remeasure)
      window.removeEventListener('wheel', release)
      window.removeEventListener('touchstart', touchStart)
      window.removeEventListener('touchend', touchEnd)
      window.removeEventListener('touchcancel', touchEnd)
      window.removeEventListener('pointerdown', release)
      window.removeEventListener('keydown', release)
      wideMq?.removeEventListener?.('change', remeasure)
      ro?.disconnect()
    }
  }, [clubs])

  const registerCard = (id: string, el: HTMLDivElement | null) => {
    if (!el) {
      cards.current.delete(id)
      return
    }
    cards.current.set(id, {
      el,
      plate: el.querySelector<HTMLElement>('.elx-card-plate')!,
      text: el.querySelector<HTMLElement>('.elx-card-plate > div')!,
      dim: el.querySelector<HTMLElement>('.elx-card-dim')!,
      img: el.querySelector('img'),
    })
  }

  const registerRow = (id: string, el: HTMLButtonElement | null) => {
    if (el) rows.current.set(id, el)
    else rows.current.delete(id)
  }

  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
      <div className="lg:col-span-5 lg:col-start-8 lg:row-start-1">
        <label className="relative block">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          {/* 16px: iOS Safari zooms the page in on focus of a smaller input (landscape too) and leaves it zoomed. */}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('elections.club.search')}
            aria-label={t('elections.club.search')}
            className="h-12 w-full rounded-full border border-white/15 bg-white/[0.07] pe-4 ps-10 text-[16px] text-white placeholder:text-white/45 focus:border-rally-accent focus:outline-none"
          />
        </label>

        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">
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
      </div>

      {clubs.length > 0 && (
        // The rail repeats the list in pictures, so it stays out of the accessibility
        // tree; the list below is the radio group for keyboard and screen readers.
        <div
          ref={wrapRef}
          aria-hidden
          className="elx-rail-wrap mt-3 lg:col-span-7 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-start"
        >
          <div ref={railRef} className="elx-rail">
            {clubs.map((club) => {
              const photo = photoFor(club.id)
              const isSel = club.id === selected
              return (
                <div
                  key={club.id}
                  ref={(el) => registerCard(club.id, el)}
                  className="elx-card"
                  data-picked={isSel}
                  onClick={() => (club.id === activeId ? onSelect(club.id) : bringToLine.current(club.id))}
                >
                  <div className="elx-card-ph">
                    {photo ? (
                      <img src={photo} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <CourtTile brandId={club.brand} />
                    )}
                    <span className="elx-card-dim" />
                  </div>
                  <div className="elx-card-plate">
                    <div>
                      <BrandLogo brandId={club.brand} className="h-10 w-10 text-xs lg:h-14 lg:w-14 lg:text-base" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-[15px] font-bold leading-tight lg:line-clamp-2 lg:whitespace-normal lg:text-[22px]">
                          {club.name}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-[#141a2e]/60 lg:text-[14px]">
                          {club.city}
                        </span>
                      </span>
                      <Checkbox checked={isSel} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="lg:col-span-5 lg:col-start-8 lg:row-start-2">
        <ul
          ref={listRef}
          className="mt-4 grid grid-cols-1 gap-2.5"
          role="radiogroup"
          aria-label={t('elections.club.title')}
        >
          {clubs.map((club) => {
            const isSel = club.id === selected
            return (
              <li key={club.id}>
                <button
                  ref={(el) => registerRow(club.id, el)}
                  type="button"
                  role="radio"
                  aria-checked={isSel}
                  data-selected={isSel}
                  data-active={club.id === activeId}
                  onClick={() => {
                    onSelect(club.id)
                    bringToLine.current(club.id)
                  }}
                  onFocus={(e) => {
                    // keyboard focus brings the club to the reading line, so the rail opens it
                    // (on a phone, under the band: the focused row rises over it, elections.css)
                    if (isFocusVisible(e.currentTarget)) bringToLine.current(club.id)
                  }}
                  className="elx-paper flex w-full items-center gap-3 px-3.5 py-3 text-start active:scale-[0.99]"
                >
                  <BrandLogo brandId={club.brand} className="h-11 w-11 text-sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[15px] font-bold leading-tight">
                      {club.name}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-[#141a2e]/60">{club.city}</span>
                  </span>
                  <Checkbox checked={isSel} />
                </button>
              </li>
            )
          })}
        </ul>

        {clubs.length === 0 && (
          <p className="py-10 text-center text-sm text-white/60">{t('elections.club.empty')}</p>
        )}
      </div>
    </div>
  )
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-2',
        checked ? 'border-[#141a2e] bg-[#141a2e]' : 'border-[#141a2e]/25',
      )}
      aria-hidden
    >
      {checked && <span className="elx-stamp text-lg font-black text-rally-accent">✓</span>}
    </span>
  )
}

/** A club with no photo: its brand logo on a padel court seen from above (20 × 10 m). */
function CourtTile({ brandId }: { brandId: string }) {
  return (
    <div className="elx-court">
      <svg viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <g
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        >
          <rect x="4" y="4" width="192" height="92" />
          <line x1="100" y1="4" x2="100" y2="96" />
          <line x1="33.3" y1="4" x2="33.3" y2="96" />
          <line x1="166.7" y1="4" x2="166.7" y2="96" />
          <line x1="33.3" y1="50" x2="166.7" y2="50" />
        </g>
      </svg>
      <BrandLogo brandId={brandId} className="elx-court-logo text-2xl" />
    </div>
  )
}

function isFocusVisible(el: Element): boolean {
  try {
    return el.matches(':focus-visible')
  } catch {
    return false
  }
}
