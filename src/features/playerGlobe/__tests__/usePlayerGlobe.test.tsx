import { useRef } from 'react'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { act, render } from '@testing-library/react'
import { usePlayerGlobe, type PlayerGlobeHandle } from '../hooks/usePlayerGlobe'
import type { GlobeGraph } from '../types'

interface SceneStub {
  focusPlayer: Mock
  clearSelection: Mock
  resetView: Mock
  setShowRivals: Mock
  setSpinning: Mock
  resize: Mock
  dispose: Mock
}

/* jsdom has no WebGL, so the scene is a recording stub; what is under test is the hook's
   own bookkeeping — the window between "the graph is here, so search works" and "the
   rasters are here, so the scene exists". */
const scenes = vi.hoisted(() => ({ instances: [] as SceneStub[] }))
const images = vi.hoisted(() => ({ resolve: null as ((v: Map<string, unknown>) => void) | null }))

vi.mock('../scene/GlobeScene', () => ({
  GlobeScene: class {
    focusPlayer = vi.fn()
    clearSelection = vi.fn()
    resetView = vi.fn()
    setShowRivals = vi.fn()
    setSpinning = vi.fn()
    resize = vi.fn()
    dispose = vi.fn()
    constructor() {
      scenes.instances.push(this as unknown as SceneStub)
    }
  },
}))

vi.mock('../lib/images', () => ({
  LOGO_IMAGE_KEY: '__logo',
  FELT_IMAGE_KEY: '__felt',
  loadGlobeImages: () =>
    new Promise<Map<string, unknown>>((resolve) => {
      images.resolve = resolve
    }),
}))

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver

const graph: GlobeGraph = {
  generatedAt: 'now',
  nodes: [
    { id: 'p1', name: 'Omer Levi', avatarUrl: null, skillLevel: null, skillTier: null, club: null, matches: 0, winRate: 0, since: 2024 },
  ],
  links: [],
}

let handle: PlayerGlobeHandle | null = null

function Harness() {
  const containerRef = useRef<HTMLDivElement>(null)
  handle = usePlayerGlobe(containerRef, { graph }).handle
  return <div ref={containerRef} />
}

/** Resolve the image promise and let the hook's `.then` and its setState land. */
async function loadImages(): Promise<void> {
  await act(async () => {
    images.resolve?.(new Map())
  })
}

describe('usePlayerGlobe', () => {
  beforeEach(() => {
    scenes.instances.length = 0
    images.resolve = null
    handle = null
  })

  it('replays a focus requested before the scene exists, exactly once', async () => {
    render(<Harness />)
    expect(scenes.instances).toHaveLength(0)

    act(() => handle?.focusPlayer('p1'))
    await loadImages()

    expect(scenes.instances).toHaveLength(1)
    expect(scenes.instances[0].focusPlayer).toHaveBeenCalledTimes(1)
    expect(scenes.instances[0].focusPlayer).toHaveBeenCalledWith('p1')
  })

  it('drops a pending focus that was cleared before the scene existed', async () => {
    render(<Harness />)

    act(() => handle?.focusPlayer('p1'))
    act(() => handle?.clearSelection())
    await loadImages()

    expect(scenes.instances[0].focusPlayer).not.toHaveBeenCalled()
  })
})
