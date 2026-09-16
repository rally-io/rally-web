import { describe, expect, it, vi } from 'vitest'
import { PORTRAIT_CONCURRENCY, portraitLoadOrder, streamPortraits } from '../lib/images'
import type { GlobeGraph, GlobeNode } from '../types'

/* The ball used to wait for every portrait before it could appear (~6 s on a good
   connection, faces silently becoming initials on LTE). It is now built at once with the
   stand-ins, and the faces stream in behind it: the viewer's first, a few at a time. These
   pin the queue's order and its width without touching an Image. */

const node = (id: string, over: Partial<GlobeNode> = {}): GlobeNode => ({
  id, name: id, avatarUrl: null, avatarCleanUrl: null, portraitUrl: `/${id}.webp`, gender: null,
  skillLevel: null, skillTier: null, levelVerified: null, levelReliability: null,
  club: null, matches: 0, winRate: 0, since: 2024, ...over,
})

const graph: GlobeGraph = {
  generatedAt: 'now',
  nodes: [node('a'), node('b'), node('me'), node('c'), node('d', { portraitUrl: null }), node('e')],
  links: [
    { source: 'me', target: 'c', type: 'partner', games: 3, lastPlayedAt: null },
    { source: 'e', target: 'me', type: 'opponent', games: 1, lastPlayedAt: null },
  ],
}

const fakeImage = (src: string): HTMLImageElement => ({ src }) as unknown as HTMLImageElement

describe('portraitLoadOrder', () => {
  it('puts the viewer first, then their connections, then everyone else in graph order', () => {
    expect(portraitLoadOrder(graph, 'me').map((n) => n.id)).toEqual(['me', 'c', 'e', 'a', 'b'])
  })

  it('leaves players without a photo out — their stand-in is already on the ball', () => {
    expect(portraitLoadOrder(graph, null).map((n) => n.id)).toEqual(['a', 'b', 'me', 'c', 'e'])
  })
})

describe('streamPortraits', () => {
  it('hands each loaded portrait over in load order and skips the ones that fail', async () => {
    const seen: string[] = []
    const load = vi.fn(async (src: string) => (src === '/b.webp' ? null : fakeImage(src)))
    await streamPortraits(graph, 'me', (id) => seen.push(id), { load, concurrency: 1 }).done
    expect(seen).toEqual(['me', 'c', 'e', 'a'])
    expect(load).toHaveBeenCalledTimes(5)
  })

  it('never has more than `concurrency` downloads in flight', async () => {
    let inFlight = 0
    let peak = 0
    const load = async (src: string): Promise<HTMLImageElement> => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await new Promise((r) => setTimeout(r, 1))
      inFlight -= 1
      return fakeImage(src)
    }
    await streamPortraits(graph, null, () => {}, { load, concurrency: 2 }).done
    expect(peak).toBe(2)
    expect(PORTRAIT_CONCURRENCY).toBeGreaterThanOrEqual(6) // at least the browser's per-host cap
  })

  it('stop() starts no further downloads and drops the ones already in flight', async () => {
    const seen: string[] = []
    const started: string[] = []
    let release: (() => void) | null = null
    const gate = new Promise<void>((r) => { release = r })
    const load = async (src: string): Promise<HTMLImageElement> => {
      started.push(src)
      await gate
      return fakeImage(src)
    }
    const stream = streamPortraits(graph, null, (id) => seen.push(id), { load, concurrency: 1 })
    await Promise.resolve() // the first worker has picked up 'a' and is waiting on the gate
    stream.stop()
    release?.()
    await stream.done
    expect(started).toEqual(['/a.webp'])
    // 'a' finished loading after stop() — it is dropped, not swapped onto a disposed scene
    expect(seen).toEqual([])
  })
})
