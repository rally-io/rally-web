import { forwardRef, useCallback, useImperativeHandle, useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { DEFAULT_BACKGROUND } from '../constants'
import { usePlayerGlobe, type PlayerGlobeHandle } from '../hooks/usePlayerGlobe'
import type { NetworkIndex } from '../lib/networkIndex'
import type { GlobeGraph } from '../types'

export interface PlayerGlobeProps {
  graph: GlobeGraph
  index: NetworkIndex
  /** renderer clear colour; the surrounding page should match it */
  background?: string
  showRivals?: boolean
  spinning?: boolean
  className?: string
  onSelect?: (id: string | null) => void
  onHover?: (id: string | null) => void
  onBackgroundClick?: () => void
}

interface Cursor {
  x: number
  y: number
}

/** The padel ball with the player network on it. Fills its container; the container must
    have a definite size. Exposes focus / clear / reset through the ref. */
export const PlayerGlobe = forwardRef<PlayerGlobeHandle, PlayerGlobeProps>(function PlayerGlobe(
  { graph, index, background = DEFAULT_BACKGROUND, showRivals, spinning, className, onSelect, onHover, onBackgroundClick },
  ref,
) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [cursor, setCursor] = useState<Cursor>({ x: 0, y: 0 })

  const handleHover = useCallback(
    (id: string | null) => {
      setHoverId(id)
      onHover?.(id)
    },
    [onHover],
  )

  const { ready, handle } = usePlayerGlobe(containerRef, {
    graph,
    background,
    showRivals,
    spinning,
    onHover: handleHover,
    onSelect,
    onBackgroundClick,
  })
  useImperativeHandle(ref, () => handle, [handle])

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [])

  const hovered = hoverId ? index.nodeById.get(hoverId) : undefined

  /* touch-pan-y, not touch-none: the stage fills a phone screen, so leaving the browser no
     gesture at all would trap the page — vertical swipes have to keep scrolling it. */
  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden touch-pan-y select-none cursor-grab active:cursor-grabbing', className)}
      style={{ background }}
      onPointerMove={onPointerMove}
    >
      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-xs tracking-[0.08em] text-rally-text-muted">
          {t('network.loading')}
        </div>
      )}
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border border-rally-border bg-rally-bg/95 px-2.5 py-1.5 text-xs text-rally-text shadow-md"
          style={{ left: cursor.x, top: cursor.y, transform: 'translate(-50%, calc(-100% - 16px))' }}
        >
          {/* The name gets its own direction (Latin names in a Hebrew UI); the meta line keeps
              the page's, so "7 שותפים · 3 יריבים" keeps each number beside its own word —
              see wiki/gotchas/web-rtl-score-string-mirroring. */}
          <b className="block font-semibold" dir="auto">
            {hovered.name}
          </b>
          <small className="mt-0.5 block text-[10.5px] text-rally-text-2">
            {hovered.club
              ? t('network.tooltipMeta', {
                  partners: index.partnerCount(hovered.id),
                  rivals: index.rivalsOf.get(hovered.id)?.length ?? 0,
                  city: hovered.club.city,
                })
              : t('network.tooltipMetaNoCity', {
                  partners: index.partnerCount(hovered.id),
                  rivals: index.rivalsOf.get(hovered.id)?.length ?? 0,
                })}
          </small>
        </div>
      )}
    </div>
  )
})
