import { describe, expect, it } from 'vitest'
import { buildNetworkIndex } from '../lib/networkIndex'
import { normalizeName, searchNodes } from '../lib/searchNodes'
import type { GlobeGraph, GlobeNode } from '../types'

const node = (id: string, name: string): GlobeNode => ({
  id, name, avatarUrl: null, skillLevel: null, skillTier: null, club: null, matches: 0, winRate: 0, since: 2024,
})

const graph: GlobeGraph = {
  generatedAt: 'now',
  nodes: [
    node('1', 'Dana Levi'), node('2', 'Levi Eshkol'), node('3', 'Omer Dana'), node('4', 'Adán Dàná'),
    node('5', 'דנה כהן'), ...Array.from({ length: 10 }, (_, i) => node(`x${i}`, `Danaë ${i}`)),
  ],
  links: [
    { source: '2', target: '1', type: 'partner', games: 1, lastPlayedAt: null },
    { source: '2', target: '3', type: 'partner', games: 1, lastPlayedAt: null },
  ],
}
const index = buildNetworkIndex(graph)

describe('normalizeName', () => {
  it('lowercases, strips diacritics and niqqud, collapses punctuation and spaces', () => {
    expect(normalizeName('  Adán  Dàná ')).toBe('adan dana')
    expect(normalizeName('דָּנָה')).toBe('דנה')
    expect(normalizeName("O'Brien-Smith")).toBe('o brien smith')
    expect(normalizeName('Мария Иванова')).toBe('мария иванова')
    expect(normalizeName('בן־גוריון')).toBe('בן גוריון')
  })
})

describe('searchNodes', () => {
  it('returns nothing for an empty query', () => {
    expect(searchNodes(index, '   ')).toEqual([])
  })

  it('ranks word-prefix matches before substring matches, then by partner count', () => {
    const ids = searchNodes(index, 'lev').map((r) => r.node.id)
    // "Levi Eshkol" (prefix, 2 partners) before "Dana Levi" (prefix, 1 partner); nothing else contains "lev"
    expect(ids).toEqual(['2', '1'])
    const dana = searchNodes(index, 'dana', 20).map((r) => r.node.id)
    expect(dana.slice(0, 3)).toEqual(['1', '3', '4'])
    expect(dana).not.toContain('5')
  })

  it('matches Hebrew and caps the list', () => {
    expect(searchNodes(index, 'דנה').map((r) => r.node.id)).toEqual(['5'])
    expect(searchNodes(index, 'dan').length).toBe(8)
  })

  it('carries the partner count on each result', () => {
    expect(searchNodes(index, 'eshkol')[0]).toEqual({ node: graph.nodes[1], partners: 2 })
  })
})
