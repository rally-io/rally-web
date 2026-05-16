import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchPlayers } from '@/services/api/tournaments'
import type { PlayerSearchResult } from '@/types/api'

export function usePlayerSearch(query: string) {
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const h = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(h)
  }, [query])

  return useQuery({
    queryKey: ['player-search', debounced],
    queryFn: async (): Promise<PlayerSearchResult[]> => {
      const result = await searchPlayers(debounced)
      return result.success ? result.data : []
    },
    enabled: debounced.length >= 2,
  })
}
