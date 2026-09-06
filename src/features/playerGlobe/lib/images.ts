import { BALL_FELT_URL, LOGO_URL } from '../constants'
import type { GlobeGraph } from '../types'

export const LOGO_IMAGE_KEY = '__logo'
export const FELT_IMAGE_KEY = '__felt'

/** Resolves to null on error, so a missing asset degrades to its fallback. Remote images
    are requested anonymously: a canvas that draws a cross-origin image without CORS is
    tainted and cannot become a WebGL texture (Supabase storage answers `*`). */
export const loadImage = (src: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const img = new Image()
    if (/^https?:\/\//.test(src)) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })

export type GlobeImages = Map<string, HTMLImageElement | null>

/** Every raster the scene needs: one portrait per node that has one (keyed by node id),
    the logo tile and the felt photo. Nodes without an avatar get no entry and draw initials. */
export async function loadGlobeImages(graph: GlobeGraph): Promise<GlobeImages> {
  const pairs = await Promise.all([
    ...graph.nodes
      .filter((n) => n.avatarUrl)
      .map((n) => loadImage(n.avatarUrl as string).then((img) => [n.id, img] as const)),
    loadImage(LOGO_URL).then((img) => [LOGO_IMAGE_KEY, img] as const),
    loadImage(BALL_FELT_URL).then((img) => [FELT_IMAGE_KEY, img] as const),
  ])
  return new Map(pairs)
}
