import {
  GENERIC_FEMALE_URL, GENERIC_MALE_URL, genericAvatarUrl, playerPhotoUrl,
} from '@/lib/playerPortrait'
import { BALL_FELT_URL, LOGO_URL } from '../constants'
import type { GlobeGraph, GlobeNode } from '../types'

export const LOGO_IMAGE_KEY = '__logo'
export const FELT_IMAGE_KEY = '__felt'
/* The two stand-in portraits, always loaded: about half of a real population has never
   uploaded a photo, so this is the most-drawn face on the ball, not an edge case. */
export const GENERIC_MALE_KEY = '__generic_male'
export const GENERIC_FEMALE_KEY = '__generic_female'

/** The stand-in a node falls back to. Keyed, not URL'd, so one decode serves every node. */
export const genericKeyFor = (gender: string | null | undefined): string =>
  genericAvatarUrl(gender) === genericAvatarUrl('female') ? GENERIC_FEMALE_KEY : GENERIC_MALE_KEY

/** The URL a node's own photo is fetched from: the server-resized portrait (the same face at
    the texture's size, ~2 KB), else `playerPhotoUrl`'s cut-out-then-raw order — the fallback
    for an API that predates `portrait_url`. Null when the player has no photo at all. */
export const portraitSourceFor = (n: GlobeNode): string | null =>
  n.portraitUrl || playerPhotoUrl(n.avatarCleanUrl, n.avatarUrl)

/** The portrait a node should draw: its own photo, else its stand-in. */
export const portraitFor = (images: GlobeImages, node: GlobeNode): HTMLImageElement | null =>
  images.get(node.id) ?? images.get(genericKeyFor(node.gender)) ?? null

/** Resolves to null on error, so a missing asset degrades to its fallback. Remote images
    are requested anonymously: a canvas that draws a cross-origin image without CORS is
    tainted and cannot become a WebGL texture (Supabase storage answers `*`). */
/** A portrait that never answers must not hold the whole ball hostage: without this the page
    sits on `Promise.all` forever and the globe never appears, with nothing on screen to say why. */
export const PORTRAIT_TIMEOUT_MS = 6000

export const loadImage = (src: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const img = new Image()
    let settled = false
    const done = (value: HTMLImageElement | null): void => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      resolve(value)
    }
    const timer = window.setTimeout(() => done(null), PORTRAIT_TIMEOUT_MS)
    if (/^https?:\/\//.test(src)) img.crossOrigin = 'anonymous'
    img.onload = () => done(img)
    img.onerror = () => done(null)
    img.src = src
  })

export type GlobeImages = Map<string, HTMLImageElement | null>

/** Every raster the scene needs: one portrait per node that has one (keyed by node id),
    the two stand-ins, the logo tile and the felt photo. A node with no photo of its own
    draws the stand-in for its gender — see `portraitFor`. The server-resized portrait wins:
    the same face at the texture's own size, ~2 KB instead of up to 1 MB (255 of them were
    ~38 MB, and the ball waited for every one); `playerPhotoUrl` is the fallback for an API
    that predates `portrait_url`. */
export async function loadGlobeImages(graph: GlobeGraph): Promise<GlobeImages> {
  const pairs = await Promise.all([
    ...graph.nodes
      .map((n) => [n, portraitSourceFor(n)] as const)
      .filter(([, url]) => url)
      .map(([n, url]) => loadImage(url as string).then((img) => [n.id, img] as const)),
    loadImage(GENERIC_MALE_URL).then((img) => [GENERIC_MALE_KEY, img] as const),
    loadImage(GENERIC_FEMALE_URL).then((img) => [GENERIC_FEMALE_KEY, img] as const),
    loadImage(LOGO_URL).then((img) => [LOGO_IMAGE_KEY, img] as const),
    loadImage(BALL_FELT_URL).then((img) => [FELT_IMAGE_KEY, img] as const),
  ])
  return new Map(pairs)
}
