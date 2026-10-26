import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { getMyVote, submitVote } from '@/services/api/elections'
import { getAttribution } from '@/lib/attribution'
import { ELECTION_ID } from './config'
import type { ElectionVote } from './types'

/** The signed-in user's recorded vote (null = not voted yet) and the submit mutation. */
export function useElectionVote() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id ?? null
  const queryKey = ['elections', ELECTION_ID, 'my-vote', userId]

  const myVote = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      const r = await getMyVote(ELECTION_ID, userId as string)
      if (!r.success) throw new Error(r.error.message ?? 'my-vote failed')
      return r.data
    },
    staleTime: 60 * 1000,
    retry: 1,
  })

  const submit = useMutation({
    mutationFn: async (vote: ElectionVote) => {
      if (!userId) throw new Error('NOT_SIGNED_IN')
      const attribution = getAttribution() as Record<string, string | undefined>
      const r = await submitVote(ELECTION_ID, userId, vote, attribution)
      if (!r.success) throw r.error
      return r.data
    },
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  })

  return { userId, myVote, submit }
}

/** True for the API's "this user already voted" rejection. */
export function isAlreadyVoted(err: unknown): boolean {
  const e = err as { status?: number; code?: string } | null
  return e?.code === 'ALREADY_VOTED' || e?.status === 409
}
