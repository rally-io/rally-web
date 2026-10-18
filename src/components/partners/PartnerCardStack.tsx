import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  DRAG_START_PX,
  DRAG_Y_SHARE,
  FLY_MS,
  HINT_DELAY_MS,
  HINT_FRACTION,
  HINT_HOLD_MS,
  HINT_LEAN_MS,
  MAX_ROTATE_DEG,
  SWIPE_FRACTION,
  VELOCITY_WINDOW_MS,
  releaseOutcome,
  releaseVelocity,
  swipeOutcome,
  type DragSample,
} from '@/lib/partners/swipe'
import { tick } from '@/lib/partners/vibrate'
import type { PartnerCard as PartnerCardData, PartnerDecision } from '@/types/partnerPool'
import { PartnerCard, type CourtViewer } from './PartnerCard'

export interface PartnerCardStackHandle {
  /** For the action buttons and the detail drawer: send the top card off as if swiped. */
  swipeTop: (decision: PartnerDecision) => void
  /** The top card's element, for the detail drawer to give focus back to. */
  topElement: () => HTMLElement | null
}

export interface PartnerCardStackProps {
  cards: PartnerCardData[]
  reducedMotion: boolean
  /** the signed-in player, drawn on each card's court */
  viewer?: CourtViewer
  /** Play the first-time swipe hint on the top card now. The page decides when (nothing
      covers the card, motion allowed) and whether it has been seen. */
  hint?: boolean
  /** The hint played through, or the player grabbed the card: either way they have it. */
  onHintDone?: () => void
  /** ← / → swipe while true. The page turns it off while a dialog or drawer is open. */
  keysEnabled: boolean
  onSwipe: (card: PartnerCardData, decision: PartnerDecision) => void
  onOpen: (card: PartnerCardData) => void
}

/** jsdom lays nothing out; a real card is ~390 px wide. */
const FALLBACK_WIDTH = 360
const SPRING_BACK = 'transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1)'

interface Drag {
  pointerId: number
  startX: number
  startY: number
  /** past DRAG_START_PX sideways: the card follows the pointer */
  dragging: boolean
  /** the card the pointer grabbed; a release only counts for it */
  grantedId: string | null
  width: number
  samples: DragSample[]
  dx: number
}

const widthOf = (el: HTMLElement | null): number => el?.getBoundingClientRect().width || FALLBACK_WIDTH

function transformFor(dx: number, dy: number, width: number): string {
  return `translate(${dx}px, ${dy * DRAG_Y_SHARE}px) rotate(${(dx / width) * MAX_ROTATE_DEG}deg)`
}

/** Typing in a field must never swipe a card. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/**
 * The deck: the top card follows a pointer drag and flies out past the line (ported from
 * rally-mobile's PartnerCardStack, PanResponder → Pointer Events). The drag writes styles
 * straight to the element, so a move re-renders nothing. Right is like in both languages.
 */
export const PartnerCardStack = forwardRef<PartnerCardStackHandle, PartnerCardStackProps>(function PartnerCardStack(
  { cards, reducedMotion, viewer, hint = false, onHintDone, keysEnabled, onSwipe, onOpen },
  ref,
) {
  const { t } = useTranslation()
  const top = cards[0] ?? null
  const next = cards[1] ?? null
  const topId = top?.player_id ?? null

  const cardRef = useRef<HTMLDivElement>(null)
  const likeRef = useRef<HTMLSpanElement>(null)
  const passRef = useRef<HTMLSpanElement>(null)
  /** One fly-out at a time: a second press inside FLY_MS would swipe the card underneath. */
  const flying = useRef(false)
  const flyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const drag = useRef<Drag | null>(null)
  /** The zone the pointer is in now (like, pass or neither), so each crossing ticks once. */
  const zone = useRef<PartnerDecision | null>(null)
  /** A drag just ended on the card: the click the browser sends next is not an open. */
  const suppressClick = useRef(false)
  /** The hint's animations while they play; null otherwise. */
  const hintAnims = useRef<Animation[] | null>(null)

  /* Handlers read the latest props through this ref. */
  const latest = useRef({ top, onSwipe, onOpen, onHintDone, reducedMotion })
  latest.current = { top, onSwipe, onOpen, onHintDone, reducedMotion }

  /** Move the card (and its stamps) to dx, dy. No transition: it follows the pointer. */
  const place = useCallback((dx: number, dy: number, width: number) => {
    const card = cardRef.current
    if (!card) return
    card.style.transform = transformFor(dx, dy, width)
    if (likeRef.current) likeRef.current.style.opacity = String(Math.min(1, Math.max(0, dx / (width * SWIPE_FRACTION))))
    if (passRef.current) passRef.current.style.opacity = String(Math.min(1, Math.max(0, -dx / (width * SWIPE_FRACTION))))
  }, [])

  /** Stop the hint if it is playing; true if it was. Cancelling also stands the card straight. */
  const cancelHint = useCallback((): boolean => {
    const anims = hintAnims.current
    if (!anims) return false
    hintAnims.current = null
    anims.forEach((a) => a.cancel())
    return true
  }, [])

  // A new top card (swiped, undone, or restored after a failed PUT) is a new element (keyed
  // below), so it starts centred; the one that flew out is unmounted, never pulled back.
  useLayoutEffect(() => {
    flying.current = false
    drag.current = null
    zone.current = null
  }, [topId])

  useEffect(
    () => () => {
      if (flyTimer.current) clearTimeout(flyTimer.current)
    },
    [],
  )

  const flyOut = useCallback(
    (decision: PartnerDecision) => {
      const { top: card, onSwipe: report, reducedMotion: still } = latest.current
      if (!card || flying.current) return
      // A button pressed mid-hint: the hint must not lean the card back while it flies.
      cancelHint()
      if (still) {
        report(card, decision)
        return
      }
      flying.current = true
      const el = cardRef.current
      const width = widthOf(el)
      if (el) el.style.transition = `transform ${FLY_MS}ms ease-out`
      place((decision === 'like' ? 1 : -1) * width * 1.5, 0, width)
      flyTimer.current = setTimeout(() => {
        flyTimer.current = null
        report(card, decision)
      }, FLY_MS)
    },
    [cancelHint, place],
  )

  const springBack = useCallback(() => {
    const el = cardRef.current
    if (el) el.style.transition = SPRING_BACK
    place(0, 0, widthOf(el))
  }, [place])

  useImperativeHandle(ref, () => ({ swipeTop: flyOut, topElement: () => cardRef.current }), [flyOut])

  // ← pass, → like: physical keys, the same in Hebrew, since the gesture is physical.
  useEffect(() => {
    if (!keysEnabled || !topId) return
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
      if (e.defaultPrevented || e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      if (isTypingTarget(e.target)) return
      e.preventDefault()
      flyOut(e.key === 'ArrowRight' ? 'like' : 'pass')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [keysEnabled, topId, flyOut])

  // The hint: lean to like, back, lean to pass, back. Uncovering the card again, or a new top
  // card, starts it over; only playing through (or a grab, below) reports it done.
  useEffect(() => {
    const el = cardRef.current
    if (!hint || !topId || reducedMotion || !el || typeof el.animate !== 'function') return
    const width = widthOf(el)
    const lean = HINT_FRACTION * width
    const total = HINT_DELAY_MS + 4 * HINT_LEAN_MS + 2 * HINT_HOLD_MS
    // [time, x]: wait, lean right, hold, back, lean left, hold, back.
    const path: [number, number][] = [
      [0, 0],
      [HINT_DELAY_MS, 0],
      [HINT_DELAY_MS + HINT_LEAN_MS, lean],
      [HINT_DELAY_MS + HINT_LEAN_MS + HINT_HOLD_MS, lean],
      [HINT_DELAY_MS + 2 * HINT_LEAN_MS + HINT_HOLD_MS, 0],
      [HINT_DELAY_MS + 3 * HINT_LEAN_MS + HINT_HOLD_MS, -lean],
      [HINT_DELAY_MS + 3 * HINT_LEAN_MS + 2 * HINT_HOLD_MS, -lean],
      [total, 0],
    ]
    const frames = (value: (x: number) => Keyframe) =>
      path.map(([time, x]) => ({ ...value(x), offset: time / total, easing: 'ease-in-out' }))
    const stampOpacity = (x: number) => Math.min(1, Math.max(0, x / (width * SWIPE_FRACTION)))
    const anims = [
      el.animate(frames((x) => ({ transform: transformFor(x, 0, width) })), { duration: total }),
      likeRef.current?.animate(frames((x) => ({ opacity: stampOpacity(x) })), { duration: total }),
      passRef.current?.animate(frames((x) => ({ opacity: stampOpacity(-x) })), { duration: total }),
    ].filter((a): a is Animation => a != null)
    hintAnims.current = anims
    anims[0].onfinish = () => {
      if (hintAnims.current !== anims) return // cancelled: whoever cancelled it owns what follows
      hintAnims.current = null
      latest.current.onHintDone?.()
    }
    // Covered (or gone) mid-hint: stop; cancelling stands the card straight for next time.
    return () => {
      cancelHint()
    }
  }, [hint, topId, reducedMotion, cancelHint])

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    suppressClick.current = false
    if (flying.current || (e.pointerType === 'mouse' && e.button !== 0)) return
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      dragging: false,
      grantedId: null,
      width: widthOf(cardRef.current),
      samples: [],
      dx: 0,
    }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.dragging) {
      // Horizontal drags only: a vertical one scrolls the page (touch-action: pan-y).
      if (Math.abs(dy) > DRAG_START_PX && Math.abs(dy) >= Math.abs(dx)) {
        drag.current = null
        return
      }
      if (Math.abs(dx) <= DRAG_START_PX || Math.abs(dx) <= Math.abs(dy)) return
      d.dragging = true
      d.grantedId = latest.current.top?.player_id ?? null
      zone.current = null
      // Grabbing the card mid-hint: they know how it works.
      if (cancelHint()) latest.current.onHintDone?.()
      if (cardRef.current) cardRef.current.style.transition = 'none'
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId)
      } catch {
        // the pointer may already be gone; the drag still works while it stays on the card
      }
    }
    d.dx = dx
    const now = performance.now()
    d.samples.push({ x: e.clientX, t: now })
    d.samples = d.samples.filter((s) => now - s.t <= VELOCITY_WINDOW_MS * 2)
    place(dx, dy, d.width)
    // A tick as the drag crosses into like or pass: the stamp is solid, and letting go now
    // counts. Distance only, so the tick lines up with the stamp.
    const inZone = swipeOutcome(dx, 0, d.width)
    if (inZone !== zone.current) {
      zone.current = inZone
      if (inZone) tick()
    }
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    drag.current = null
    zone.current = null
    if (!d.dragging) return // a press, not a drag: the click that follows opens the card
    suppressClick.current = true
    const vx = releaseVelocity([...d.samples, { x: e.clientX, t: performance.now() }])
    const decision = releaseOutcome(d.grantedId, latest.current.top?.player_id ?? null, d.dx, vx, d.width)
    if (decision) flyOut(decision)
    else springBack()
  }

  function onPointerCancel() {
    const d = drag.current
    drag.current = null
    zone.current = null
    if (d?.dragging) springBack()
  }

  function onClick() {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    const card = latest.current.top
    if (card && !flying.current) latest.current.onOpen(card)
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    onClick()
  }

  if (!top) return null

  return (
    <div data-testid="partner-stack" className="relative min-h-[460px] flex-1">
      {next && (
        <div
          aria-hidden
          data-testid="partner-stack-next"
          className="pointer-events-none absolute inset-0 translate-y-3 scale-95 opacity-70"
        >
          <PartnerCard card={next} viewer={viewer} />
        </div>
      )}
      <div
        key={top.player_id}
        ref={cardRef}
        role="button"
        tabIndex={0}
        aria-label={top.name}
        data-testid="partner-stack-top"
        className="absolute inset-0 cursor-grab touch-pan-y select-none rounded-3xl outline-none will-change-transform focus-visible:ring-2 focus-visible:ring-rally-accent active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onDragStart={(e) => e.preventDefault()}
      >
        <PartnerCard card={top} viewer={viewer} />
        {/* The like stamp sits on the side the card leaves FROM, the way it reads mid-swipe.
            Physical sides: the gesture does not mirror. */}
        <span
          ref={likeRef}
          aria-hidden
          data-testid="partner-stamp-like"
          className="pointer-events-none absolute left-6 top-7 -rotate-[14deg] rounded-[10px] border-[3px] border-rally-accent px-3 py-1 text-[26px] font-black uppercase text-rally-accent opacity-0"
        >
          {t('partners.like')}
        </span>
        <span
          ref={passRef}
          aria-hidden
          data-testid="partner-stamp-pass"
          className="pointer-events-none absolute right-6 top-7 rotate-[14deg] rounded-[10px] border-[3px] border-rally-error px-3 py-1 text-[26px] font-black uppercase text-rally-error opacity-0"
        >
          {t('partners.pass')}
        </span>
      </div>
    </div>
  )
})
