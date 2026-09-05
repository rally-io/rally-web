import { useMemo } from 'react'
import type { NetworkIndex } from '../lib/networkIndex'
import { searchNodes, type SearchResult } from '../lib/searchNodes'

export function useNodeSearch(index: NetworkIndex | null, query: string): SearchResult[] {
  return useMemo(() => (index ? searchNodes(index, query) : []), [index, query])
}
