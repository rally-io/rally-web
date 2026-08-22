import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchPlayers } from '@/services/api/players'
import type { PlayerSearchResult } from '@/types/api'

const DEBOUNCE_MS = 300

export function usePlayerSearch(query: string) {
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setDebounced('')
      return
    }
    const handle = setTimeout(() => setDebounced(trimmed), DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [query])

  const { data, isFetching } = useQuery({
    queryKey: ['player-search', debounced],
    queryFn: async (): Promise<PlayerSearchResult[]> => {
      const result = await searchPlayers(debounced)
      return result.success ? result.data : []
    },
    enabled: debounced.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  return {
    results: data ?? [],
    isLoading: debounced.length > 0 && isFetching,
    isActive: debounced.length > 0,
  }
}
