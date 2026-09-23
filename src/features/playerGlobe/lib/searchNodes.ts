import type { GlobeNode } from '../types'
import type { NetworkIndex } from './networkIndex'

export interface SearchResult {
  node: GlobeNode
  partners: number
}

const MARKS = /\p{M}+/gu // combining marks: Latin diacritics, Hebrew niqqud and cantillation
const NOT_WORD = /[^\p{L}\p{N}]+/gu

/** Lowercase, strip diacritics and niqqud, and turn any punctuation into single spaces. */
export function normalizeName(name: string): string {
  return name.normalize('NFKD').replace(MARKS, '').toLowerCase().replace(NOT_WORD, ' ').trim()
}

/** Client-side player search: a word-prefix match ranks first, a substring match second,
    ties break on partner count then name. At most `limit` results; none for a blank query. */
export function searchNodes(index: NetworkIndex, query: string, limit = 8): SearchResult[] {
  const q = normalizeName(query)
  if (!q) return []
  const ranked: { rank: number; partners: number; node: GlobeNode }[] = []
  index.nodeById.forEach((node) => {
    const norm = normalizeName(node.name)
    if (!norm.includes(q)) return
    const prefix = norm.startsWith(q) || norm.split(' ').some((w) => w.startsWith(q))
    ranked.push({ rank: prefix ? 0 : 1, partners: index.partnerCount(node.id), node })
  })
  ranked.sort((a, b) => a.rank - b.rank || b.partners - a.partners || a.node.name.localeCompare(b.node.name))
  return ranked.slice(0, limit).map(({ node, partners }) => ({ node, partners }))
}
