import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { getScreenMessages } from '../api/messages'
import type { ScreenMessage, ScreenMessagesQuery } from '../types'

export function useScreenMessages(query: ScreenMessagesQuery) {
  const { user } = useAuth()

  return useQuery({
    // The viewer's id is part of the key, and that is load-bearing: this
    // response is PER PLAYER — `is_acknowledged`/`acknowledged_at` are theirs,
    // and messages they dismissed are filtered out server-side. Global
    // `staleTime` is 5 minutes and an ordinary sign-out does not clear this
    // cache (AppSessionContext removes only two other keys; `queryClient.clear()`
    // runs solely on the forced-401 path), so without the id, signing in as
    // someone else in the same tab showed THEIR state as yours — a green
    // "Accepted" on a message you never accepted, and anything the previous
    // viewer dismissed silently hidden from you.
    //
    // Anonymous readers share the `null` bucket, which is correct: the response
    // for a signed-out visitor carries no per-player state at all.
    queryKey: ['screenMessages', user?.id ?? null, query.scope, query.id ?? null],
    queryFn: async (): Promise<ScreenMessage[]> => {
      const result = await getScreenMessages(query)
      if (!result.success) return []
      return result.data
    },
    // The global scope needs no id; every other scope does.
    enabled: query.scope === 'global' || !!query.id,
  })
}
