import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { DEFAULT_BACKGROUND } from '../constants'
import { loadGlobeImages } from '../lib/images'
import { GlobeScene } from '../scene/GlobeScene'
import type { GlobeGraph } from '../types'

declare global {
  interface Window {
    /** dev-only: the live scene, for stepping frames and inspecting state from the console */
    __playerGlobe?: GlobeScene
  }
}

export interface PlayerGlobeHandle {
  /** pin a player: solid arcs, ball turns to face them, camera dollies in */
  focusPlayer: (id: string) => void
  clearSelection: () => void
  /** frame the whole ball again */
  resetView: () => void
}

export interface UsePlayerGlobeOptions {
  graph: GlobeGraph
  background?: string
  showRivals?: boolean
  spinning?: boolean
  onHover?: (id: string | null) => void
  onSelect?: (id: string | null) => void
  onBackgroundClick?: () => void
}

export interface UsePlayerGlobeResult {
  /** images are loaded and the scene is mounted in the container */
  ready: boolean
  handle: PlayerGlobeHandle
}

/** Owns one `GlobeScene` for the lifetime of the container. The scene is created only once
    every raster has loaded, is resized from a ResizeObserver, and is fully disposed on
    cleanup — so a StrictMode double-mount builds it twice and leaks nothing. Callbacks are
    read through a ref, so a parent re-render never rebuilds the scene. */
export function usePlayerGlobe(
  containerRef: RefObject<HTMLElement>,
  options: UsePlayerGlobeOptions,
): UsePlayerGlobeResult {
  const { graph, background = DEFAULT_BACKGROUND, showRivals = false, spinning = true } = options
  const sceneRef = useRef<GlobeScene | null>(null)
  /* Search picks and "find me" are live as soon as the graph is, which is long before the
     rasters are — a focus asked for in that window waits here instead of being dropped. */
  const pendingFocusRef = useRef<string | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined
    let alive = true
    let scene: GlobeScene | null = null
    let observer: ResizeObserver | null = null

    void (async () => {
      const images = await loadGlobeImages(graph)
      if (!alive) return
      /* Initials are rasterised into a texture once, at construction, and never redrawn — so
         a scene built before the webfont lands bakes the fallback face in permanently. */
      if (typeof document !== 'undefined' && document.fonts?.ready) await document.fonts.ready
      if (!alive) return
      /* Read the size directly first. Relying on the observer alone can leave size at 0 — and
         at 0 nothing renders, so the page looks silently empty. */
      const rect = el.getBoundingClientRect()
      scene = new GlobeScene(el, {
        graph,
        images,
        background,
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
        callbacks: {
          onHover: (id) => optionsRef.current.onHover?.(id),
          onSelect: (id) => optionsRef.current.onSelect?.(id),
          onBackgroundClick: () => optionsRef.current.onBackgroundClick?.(),
        },
      })
      const current = optionsRef.current
      scene.setShowRivals(current.showRivals ?? false)
      scene.setSpinning(current.spinning ?? true)
      sceneRef.current = scene
      if (pendingFocusRef.current) {
        scene.focusPlayer(pendingFocusRef.current)
        pendingFocusRef.current = null
      }
      if (import.meta.env.DEV) window.__playerGlobe = scene
      observer = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) scene?.resize(Math.round(width), Math.round(height))
      })
      observer.observe(el)
      setReady(true)
    })()

    return () => {
      alive = false
      observer?.disconnect()
      scene?.dispose()
      sceneRef.current = null
      if (import.meta.env.DEV && window.__playerGlobe === scene) delete window.__playerGlobe
      setReady(false)
    }
  }, [containerRef, graph, background])

  useEffect(() => {
    sceneRef.current?.setShowRivals(showRivals)
  }, [showRivals, ready])
  useEffect(() => {
    sceneRef.current?.setSpinning(spinning)
  }, [spinning, ready])

  const handle = useMemo<PlayerGlobeHandle>(
    () => ({
      focusPlayer: (id) => {
        const scene = sceneRef.current
        if (scene) scene.focusPlayer(id)
        else pendingFocusRef.current = id
      },
      clearSelection: () => {
        pendingFocusRef.current = null
        sceneRef.current?.clearSelection()
      },
      resetView: () => sceneRef.current?.resetView(),
    }),
    [],
  )

  return { ready, handle }
}
