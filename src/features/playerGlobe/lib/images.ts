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

/** The rasters the scene needs before it can appear: the two stand-ins, the logo tile and
    the felt photo — all local, so this resolves in milliseconds. No portraits: the ball is
    built with every player wearing a stand-in, and `streamPortraits` swaps the real faces in
    behind it. (It used to await all ~255 portraits here, which held the ball for ~6 s.) */
export async function loadBaseImages(): Promise<GlobeImages> {
  const pairs = await Promise.all([
    loadImage(GENERIC_MALE_URL).then((img) => [GENERIC_MALE_KEY, img] as const),
    loadImage(GENERIC_FEMALE_URL).then((img) => [GENERIC_FEMALE_KEY, img] as const),
    loadImage(LOGO_URL).then((img) => [LOGO_IMAGE_KEY, img] as const),
    loadImage(BALL_FELT_URL).then((img) => [FELT_IMAGE_KEY, img] as const),
  ])
  return new Map(pairs)
}

/** How many portraits download at once. Browsers cap connections per host at about six; a
    little above that keeps the queue full without starving anything else the page fetches. */
export const PORTRAIT_CONCURRENCY = 8

/** The order faces land in: the viewer, then the viewer's direct connections, then everyone
    else in graph order. Players without a photo are not in the list at all — their stand-in
    is already on the ball. */
export function portraitLoadOrder(graph: GlobeGraph, viewerId: string | null): GlobeNode[] {
  const withPhoto = graph.nodes.filter((n) => portraitSourceFor(n) !== null)
  if (!viewerId) return withPhoto
  const near = new Set<string>()
  for (const l of graph.links) {
    if (l.source === viewerId) near.add(l.target)
    else if (l.target === viewerId) near.add(l.source)
  }
  const rank = (n: GlobeNode): number => (n.id === viewerId ? 0 : near.has(n.id) ? 1 : 2)
  return withPhoto
    .map((n, i) => [rank(n), i, n] as const)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .map(([, , n]) => n)
}

export interface PortraitStream {
  /** resolves once every portrait has loaded, failed, or been skipped after `stop()` */
  done: Promise<void>
  /** starts no further downloads (the scene is gone); in-flight ones finish and are dropped */
  stop(): void
}

/** Downloads every portrait in `portraitLoadOrder`, at most `concurrency` at a time, and hands
    each one that loads to `onPortrait` as it arrives — the scene swaps it onto the sprite.
    A portrait that fails or times out is simply never swapped in: the stand-in stays.
    `load` is injectable so the queue can be tested without an Image. */
export function streamPortraits(
  graph: GlobeGraph,
  viewerId: string | null,
  onPortrait: (id: string, img: HTMLImageElement) => void,
  opts: { concurrency?: number; load?: (src: string) => Promise<HTMLImageElement | null> } = {},
): PortraitStream {
  const queue = portraitLoadOrder(graph, viewerId)
  const load = opts.load ?? loadImage
  const width = Math.max(1, Math.min(opts.concurrency ?? PORTRAIT_CONCURRENCY, queue.length))
  let stopped = false
  let next = 0
  const worker = async (): Promise<void> => {
    while (!stopped && next < queue.length) {
      const node = queue[next++]
      const img = await load(portraitSourceFor(node) as string)
      if (!stopped && img) onPortrait(node.id, img)
    }
  }
  const done = Promise.all(Array.from({ length: width }, worker)).then(() => undefined)
  return { done, stop: () => { stopped = true } }
}
