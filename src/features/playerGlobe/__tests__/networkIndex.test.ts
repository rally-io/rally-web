import { describe, expect, it } from 'vitest'
import { buildNetworkIndex } from '../lib/networkIndex'
import { initialsOf } from '../lib/initials'
import type { GlobeGraph, GlobeNode } from '../types'

const node = (id: string, name: string): GlobeNode => ({
  id, name, avatarUrl: null, skillLevel: null, skillTier: null, club: null, matches: 0, winRate: 0, since: 2024,
})

const graph: GlobeGraph = {
  generatedAt: 'now',
  nodes: [node('a', 'Ada'), node('b', 'Bob'), node('c', 'Cy')],
  links: [
    { source: 'a', target: 'b', type: 'partner', games: 3, lastPlayedAt: null },
    { source: 'c', target: 'a', type: 'partner', games: 7, lastPlayedAt: null },
    { source: 'a', target: 'c', type: 'opponent', games: 2, lastPlayedAt: null },
  ],
}

describe('buildNetworkIndex', () => {
  it('lists partners and rivals per player from both ends of a link, most games first', () => {
    const index = buildNetworkIndex(graph)
    expect(index.partnersOf.get('a')).toEqual([{ id: 'c', games: 7 }, { id: 'b', games: 3 }])
    expect(index.partnersOf.get('b')).toEqual([{ id: 'a', games: 3 }])
    expect(index.rivalsOf.get('a')).toEqual([{ id: 'c', games: 2 }])
    expect(index.rivalsOf.get('b')).toEqual([])
    expect(index.nodeById.get('c')?.name).toBe('Cy')
  })

  it('counts partners', () => {
    const index = buildNetworkIndex(graph)
    expect(index.partnerCount('a')).toBe(2)
    expect(index.partnerCount('zzz')).toBe(0)
  })
})

describe('initialsOf', () => {
  it('takes the first letter of the first two words', () => {
    expect(initialsOf('Yoav Ashkenazi')).toBe('YA')
    expect(initialsOf('יואב אשכנזי')).toBe('יא')
    expect(initialsOf('Madonna')).toBe('M')
    expect(initialsOf('   ')).toBe('?')
  })
})
