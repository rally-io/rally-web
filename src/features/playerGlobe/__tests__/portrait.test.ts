import { describe, expect, it } from 'vitest'
import { genericAvatarUrl, playerPhotoUrl } from '@/lib/playerPortrait'
import {
  GENERIC_FEMALE_KEY, GENERIC_MALE_KEY, genericKeyFor, portraitFor, portraitSourceFor,
} from '../lib/images'
import type { GlobeImages } from '../lib/images'
import type { GlobeNode } from '../types'

const node = (over: Partial<GlobeNode> = {}): GlobeNode => ({
  id: 'p1', name: 'Noa Levi', avatarUrl: null, avatarCleanUrl: null, portraitUrl: null, gender: null,
  skillLevel: null, skillTier: null, levelVerified: null, levelReliability: null,
  club: null, matches: 0, winRate: 0, since: 2024, ...over,
})

describe('which portrait a player wears', () => {
  it('downloads the server-resized portrait first, then the cut-out, then the raw upload', () => {
    // The resized one is the same face at the texture's own size — ~2 KB against up to 1 MB.
    // Measured on prod 2026-09-16: 255 full-size portraits were ~38 MB and the ball waited for
    // every one of them. The two fallbacks exist for an API that predates `portrait_url`.
    expect(portraitSourceFor(node({ portraitUrl: '/p.webp', avatarCleanUrl: '/c.png', avatarUrl: '/r.png' }))).toBe('/p.webp')
    expect(portraitSourceFor(node({ avatarCleanUrl: '/c.png', avatarUrl: '/r.png' }))).toBe('/c.png')
    expect(portraitSourceFor(node({ avatarUrl: '/r.png' }))).toBe('/r.png')
    expect(portraitSourceFor(node())).toBeNull()
  })

  it('prefers the cut-out over the raw upload — the same order the ranking shield uses', () => {
    expect(playerPhotoUrl('/clean.png', '/raw.png')).toBe('/clean.png')
    expect(playerPhotoUrl(null, '/raw.png')).toBe('/raw.png')
    expect(playerPhotoUrl(null, null)).toBeNull()
  })

  it('falls back to the stand-in for the gender, with the male portrait as the neutral default', () => {
    expect(genericAvatarUrl('female')).toContain('female')
    for (const g of ['male', 'choose_not_to_answer', null, undefined]) {
      expect(genericAvatarUrl(g)).toContain('male')
    }
  })

  it('keys the stand-in so one decoded image serves every node that needs it', () => {
    expect(genericKeyFor('female')).toBe(GENERIC_FEMALE_KEY)
    expect(genericKeyFor('choose_not_to_answer')).toBe(GENERIC_MALE_KEY)
    expect(genericKeyFor(null)).toBe(GENERIC_MALE_KEY)
  })

  it('draws a player their own photo, and the stand-in only when they have none', () => {
    const own = { id: 'own' } as unknown as HTMLImageElement
    const male = { id: 'male' } as unknown as HTMLImageElement
    const female = { id: 'female' } as unknown as HTMLImageElement
    const images: GlobeImages = new Map([
      ['p1', own], [GENERIC_MALE_KEY, male], [GENERIC_FEMALE_KEY, female],
    ])
    expect(portraitFor(images, node())).toBe(own)
    expect(portraitFor(images, node({ id: 'p2' }))).toBe(male)
    expect(portraitFor(images, node({ id: 'p2', gender: 'female' }))).toBe(female)
  })

  it('degrades to initials only when the stand-ins themselves failed to load', () => {
    // `loadImage` resolves null on error, so a missing asset must not blank the node.
    const images: GlobeImages = new Map([[GENERIC_MALE_KEY, null]])
    expect(portraitFor(images, node({ id: 'p2' }))).toBeNull()
  })
})
