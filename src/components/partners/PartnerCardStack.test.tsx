import { createRef } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/partners/vibrate', () => ({ tick: vi.fn(), buzz: vi.fn() }))

import { makeCard } from '@/lib/partners/testCards'
import { FLY_MS, HINT_FRACTION, MAX_ROTATE_DEG, SWIPE_FRACTION } from '@/lib/partners/swipe'
import { tick } from '@/lib/partners/vibrate'
import { PartnerCardStack, type PartnerCardStackHandle, type PartnerCardStackProps } from './PartnerCardStack'

/* Ported from rally-mobile's PartnerCardStack.test.tsx; the PanResponder cases become pointer
   events. The pure rules (swipeOutcome, releaseOutcome, releaseVelocity) are in swipe.test.ts. */

const W = 400
const LINE = W * SWIPE_FRACTION // 112
const CARDS = [makeCard({ player_id: 'a', name: 'Noa' }), makeCard({ player_id: 'b', name: 'Dana' })]

const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')

beforeEach(() => {
  vi.mocked(tick).mockClear()
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: W, height: 600, top: 0, left: 0, right: W, bottom: 600, x: 0, y: 0, toJSON: () => ({}),
  } as DOMRect)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  if (originalAnimate) Object.defineProperty(Element.prototype, 'animate', originalAnimate)
  else delete (Element.prototype as { animate?: unknown }).animate
})

function renderStack(props: Partial<PartnerCardStackProps> = {}) {
  const ref = createRef<PartnerCardStackHandle>()
  const onSwipe = vi.fn()
  const onOpen = vi.fn()
  const onHintDone = vi.fn()
  const element = (p: Partial<PartnerCardStackProps>) => (
    <PartnerCardStack
      ref={ref}
      cards={CARDS}
      reducedMotion={false}
      keysEnabled
      onSwipe={onSwipe}
      onOpen={onOpen}
      onHintDone={onHintDone}
      {...p}
    />
  )
  const view = render(element(props))
  return { ref, onSwipe, onOpen, onHintDone, rerender: (p: Partial<PartnerCardStackProps>) => view.rerender(element({ ...props, ...p })) }
}

const topCard = () => screen.getByTestId('partner-stack-top')
const down = (el: Element, x = 0, y = 0) =>
  fireEvent.pointerDown(el, { pointerId: 1, clientX: x, clientY: y, button: 0, pointerType: 'mouse' })
const move = (el: Element, x: number, y = 0) => fireEvent.pointerMove(el, { pointerId: 1, clientX: x, clientY: y })
const up = (el: Element, x: number, y = 0) => fireEvent.pointerUp(el, { pointerId: 1, clientX: x, clientY: y })

/** Press, move through `xs`, let go at the last one. */
function dragTo(el: Element, ...xs: number[]) {
  down(el)
  xs.forEach((x) => move(el, x))
  up(el, xs[xs.length - 1])
}

describe('PartnerCardStack', () => {
  it('draws the top card, with the next one behind it', () => {
    renderStack()
    expect(within(topCard()).getByText('Noa')).toBeTruthy()
    expect(within(screen.getByTestId('partner-stack-next')).getByText('Dana')).toBeTruthy()
  })

  it('a click on the top card opens it, and so do Enter and Space', () => {
    const { onOpen } = renderStack()
    fireEvent.click(topCard())
    fireEvent.keyDown(topCard(), { key: 'Enter' })
    fireEvent.keyDown(topCard(), { key: ' ' })
    expect(onOpen).toHaveBeenCalledTimes(3)
    expect(onOpen).toHaveBeenCalledWith(CARDS[0])
  })

  it('topElement is the top card, for the detail drawer to hand focus back to', () => {
    const { ref, rerender } = renderStack()
    expect(ref.current?.topElement()).toBe(topCard())
    rerender({ cards: CARDS.slice(1) })
    expect(ref.current?.topElement()).toBe(topCard())
    expect(topCard()).toHaveAccessibleName(CARDS[1].name)
  })

  it('swipeTop flies the card out, then reports the swipe once', () => {
    vi.useFakeTimers()
    const { ref, onSwipe } = renderStack()
    act(() => ref.current?.swipeTop('like'))
    expect(onSwipe).not.toHaveBeenCalled()
    expect(topCard().style.transform).toContain(`translate(${W * 1.5}px`)
    act(() => {
      vi.advanceTimersByTime(FLY_MS)
    })
    expect(onSwipe).toHaveBeenCalledTimes(1)
    expect(onSwipe).toHaveBeenCalledWith(CARDS[0], 'like')
  })

  it('a second swipeTop while the first card is still flying is ignored', () => {
    vi.useFakeTimers()
    const { ref, onSwipe } = renderStack()
    act(() => {
      ref.current?.swipeTop('like')
      ref.current?.swipeTop('pass')
    })
    act(() => {
      vi.advanceTimersByTime(FLY_MS * 2)
    })
    expect(onSwipe).toHaveBeenCalledTimes(1)
    expect(onSwipe).toHaveBeenCalledWith(CARDS[0], 'like')
  })

  it('under reduced motion the swipe is reported at once, with no fly-out', () => {
    const { ref, onSwipe } = renderStack({ reducedMotion: true })
    act(() => ref.current?.swipeTop('pass'))
    expect(onSwipe).toHaveBeenCalledWith(CARDS[0], 'pass')
    expect(topCard().style.transform).toBe('')
  })

  it('the next card is a new element, so the card that flew out is never pulled back', () => {
    vi.useFakeTimers()
    const { ref, rerender } = renderStack()
    const first = topCard()
    act(() => ref.current?.swipeTop('pass'))
    act(() => {
      vi.advanceTimersByTime(FLY_MS)
    })
    rerender({ cards: [CARDS[1]] })
    expect(topCard()).not.toBe(first)
    expect(topCard().style.transform).toBe('')
  })

  it('with no cards it draws nothing', () => {
    renderStack({ cards: [] })
    expect(screen.queryByTestId('partner-stack')).toBeNull()
  })
})

describe('PartnerCardStack — dragging', () => {
  it('a drag past the line likes the top card, and the click that follows does not open it', () => {
    vi.useFakeTimers()
    const { onSwipe, onOpen } = renderStack()
    dragTo(topCard(), 20, 60, LINE + 10)
    fireEvent.click(topCard())
    act(() => {
      vi.advanceTimersByTime(FLY_MS)
    })
    expect(onSwipe).toHaveBeenCalledWith(CARDS[0], 'like')
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('a drag past the line to the left passes', () => {
    vi.useFakeTimers()
    const { onSwipe } = renderStack()
    dragTo(topCard(), -20, -(LINE + 10))
    act(() => {
      vi.advanceTimersByTime(FLY_MS)
    })
    expect(onSwipe).toHaveBeenCalledWith(CARDS[0], 'pass')
  })

  it('short of the line, slowly, it springs back and records nothing; the click after it is swallowed', () => {
    vi.useFakeTimers()
    const { onSwipe, onOpen } = renderStack()
    dragTo(topCard(), 20, 60)
    fireEvent.click(topCard())
    act(() => {
      vi.advanceTimersByTime(FLY_MS * 2)
    })
    expect(onSwipe).not.toHaveBeenCalled()
    expect(onOpen).not.toHaveBeenCalled()
    expect(topCard().style.transform).toContain('translate(0px')
  })

  it('a fast flick counts before the line', () => {
    vi.useFakeTimers()
    let now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    const { onSwipe } = renderStack()
    down(topCard())
    move(topCard(), 10)
    now = 20
    move(topCard(), 30)
    now = 40
    move(topCard(), 50)
    up(topCard(), 50) // 40 px in 40 ms: 1 px/ms
    act(() => {
      vi.advanceTimersByTime(FLY_MS)
    })
    expect(onSwipe).toHaveBeenCalledWith(CARDS[0], 'like')
  })

  it('a press that moves less than 8 px is a click, not a drag', () => {
    const { onOpen } = renderStack()
    down(topCard())
    move(topCard(), 6)
    up(topCard(), 6)
    fireEvent.click(topCard())
    expect(onOpen).toHaveBeenCalledWith(CARDS[0])
  })

  it('a vertical move gives the gesture to the page: nothing follows', () => {
    const { onSwipe } = renderStack()
    down(topCard())
    move(topCard(), 0, 30)
    move(topCard(), LINE + 10, 30)
    up(topCard(), LINE + 10, 30)
    expect(topCard().style.transform).toBe('')
    expect(onSwipe).not.toHaveBeenCalled()
  })

  it('if another card is restored on top mid-drag, the release records nothing', () => {
    vi.useFakeTimers()
    const { onSwipe, rerender } = renderStack()
    down(topCard())
    move(topCard(), LINE + 10)
    rerender({ cards: [CARDS[1], CARDS[0]] })
    up(topCard(), LINE + 10)
    act(() => {
      vi.advanceTimersByTime(FLY_MS)
    })
    expect(onSwipe).not.toHaveBeenCalled()
  })

  it('a cancelled pointer leaves no drag behind for a later release', () => {
    const { onSwipe } = renderStack()
    down(topCard())
    move(topCard(), LINE + 10)
    fireEvent.pointerCancel(topCard(), { pointerId: 1 })
    up(topCard(), LINE + 10)
    expect(onSwipe).not.toHaveBeenCalled()
    expect(topCard().style.transform).toContain('translate(0px')
  })

  it('ticks once as the drag crosses into like or pass, not on every move inside it', () => {
    renderStack()
    down(topCard())
    move(topCard(), LINE - 5) // not yet
    move(topCard(), LINE + 5) // across into like: tick
    move(topCard(), LINE + 60) // deeper in: no tick
    move(topCard(), 0) // back to the middle: no tick
    move(topCard(), -(LINE + 5)) // across into pass: tick
    expect(tick).toHaveBeenCalledTimes(2)
  })

  it('the stamps follow the drag: the like stamp is solid past the line', () => {
    renderStack()
    down(topCard())
    move(topCard(), LINE / 2)
    expect(screen.getByTestId('partner-stamp-like').style.opacity).toBe('0.5')
    move(topCard(), LINE + 40)
    expect(screen.getByTestId('partner-stamp-like').style.opacity).toBe('1')
    expect(screen.getByTestId('partner-stamp-pass').style.opacity).toBe('0')
  })
})

describe('PartnerCardStack — keys', () => {
  it('→ likes and ← passes, after the fly-out', () => {
    vi.useFakeTimers()
    const { onSwipe, rerender } = renderStack()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    act(() => {
      vi.advanceTimersByTime(FLY_MS)
    })
    expect(onSwipe).toHaveBeenLastCalledWith(CARDS[0], 'like')
    rerender({ cards: [CARDS[1]] })
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    act(() => {
      vi.advanceTimersByTime(FLY_MS)
    })
    expect(onSwipe).toHaveBeenLastCalledWith(CARDS[1], 'pass')
  })

  it('ignores the keys with a modifier, on auto-repeat, while typing, or when turned off', () => {
    const { onSwipe, rerender } = renderStack({ reducedMotion: true })
    fireEvent.keyDown(window, { key: 'ArrowRight', shiftKey: true })
    fireEvent.keyDown(window, { key: 'ArrowRight', metaKey: true })
    fireEvent.keyDown(window, { key: 'ArrowRight', repeat: true })
    const input = document.createElement('input')
    document.body.appendChild(input)
    fireEvent.keyDown(input, { key: 'ArrowLeft' })
    input.remove()
    rerender({ keysEnabled: false })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(onSwipe).not.toHaveBeenCalled()
  })
})

describe('PartnerCardStack — the first-time swipe hint', () => {
  interface FakeAnimation {
    keyframes: Keyframe[]
    options: KeyframeAnimationOptions
    cancel: ReturnType<typeof vi.fn>
    onfinish: (() => void) | null
  }

  /** Element.animate (jsdom has none) under the test's control. */
  function stubAnimate() {
    const anims: FakeAnimation[] = []
    const animate = vi.fn((keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      const anim: FakeAnimation = { keyframes, options, cancel: vi.fn(), onfinish: null }
      anims.push(anim)
      return anim
    })
    Object.defineProperty(Element.prototype, 'animate', { value: animate, configurable: true, writable: true })
    return { animate, anims, card: () => anims[0] }
  }

  it('leans the top card to like, back, to pass, back; playing through reports it done', () => {
    const stub = stubAnimate()
    const { onHintDone } = renderStack({ hint: true })
    expect(stub.animate).toHaveBeenCalledTimes(3) // the card and its two stamps
    const lean = W * HINT_FRACTION
    const transforms = stub.card().keyframes.map((k) => k.transform)
    expect(transforms).toContain(`translate(${lean}px, 0px) rotate(${(lean / W) * MAX_ROTATE_DEG}deg)`)
    expect(transforms).toContain(`translate(${-lean}px, 0px) rotate(${(-lean / W) * MAX_ROTATE_DEG}deg)`)
    expect(HINT_FRACTION).toBeLessThan(SWIPE_FRACTION) // the stamps show, but never go solid
    expect(onHintDone).not.toHaveBeenCalled()
    act(() => stub.card().onfinish?.())
    expect(onHintDone).toHaveBeenCalledTimes(1)
  })

  it('grabbing the card mid-hint stops it and counts as seen', () => {
    const stub = stubAnimate()
    const { onHintDone } = renderStack({ hint: true })
    down(topCard())
    move(topCard(), 30)
    expect(stub.card().cancel).toHaveBeenCalledTimes(1)
    expect(onHintDone).toHaveBeenCalledTimes(1)
  })

  it('covered mid-hint (hint off) it stops, without counting as seen', () => {
    const stub = stubAnimate()
    const { onHintDone, rerender } = renderStack({ hint: true })
    rerender({ hint: false })
    expect(stub.card().cancel).toHaveBeenCalledTimes(1)
    act(() => stub.card().onfinish?.()) // a late finish from the cancelled run is ignored
    expect(onHintDone).not.toHaveBeenCalled()
  })

  it('a button swipe mid-hint stops the hint before the card flies, and does not count as seen', () => {
    vi.useFakeTimers()
    const stub = stubAnimate()
    const { ref, onHintDone } = renderStack({ hint: true })
    act(() => ref.current?.swipeTop('like'))
    expect(stub.card().cancel).toHaveBeenCalledTimes(1)
    expect(topCard().style.transform).toContain(`translate(${W * 1.5}px`)
    expect(onHintDone).not.toHaveBeenCalled()
  })

  it('plays nothing when hint is off, or under reduced motion', () => {
    const stub = stubAnimate()
    renderStack({ hint: false })
    renderStack({ hint: true, reducedMotion: true })
    expect(stub.animate).not.toHaveBeenCalled()
  })
})
