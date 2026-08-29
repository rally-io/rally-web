import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { acknowledgeMessage, dismissMessage } from '../api/messages'

// Mirrors the useMutation idiom in src/pages/EditProfilePage.tsx: throw inside
// mutationFn on a failed ApiResponse. In practice that branch never fires —
// the axios response interceptor (services/api/client.ts) already rejects on
// any HTTP error status, so the promise from acknowledgeMessage/dismissMessage
// rejects before `result` is ever assigned. It's harmless defense-in-depth,
// kept for a hypothetical 200 with `success: false`.
//
// The real error path is the interceptor rejection, which is a FLAT object —
// `{code, message}`, not `err.response.data.error.code` and not an `Error`
// instance. onError below reads `err.code` directly. ScreenMessageCard reads
// `.error` off these mutations to render an inline failure note; onError's
// only extra job is the MESSAGE_VERSION_STALE side effect (re-fetch the list
// so a stale accept/dismiss doesn't keep 409ing until the 5-minute cache
// expires).

interface MessageActionInput {
  messageId: string
  version: number
}

/** The interceptor's rejection shape. Not an Error instance. */
export interface FlatApiError {
  code?: string
  message?: string
  status?: number
}

function invalidateOnStaleVersion(err: FlatApiError, queryClient: QueryClient) {
  if (err?.code === 'MESSAGE_VERSION_STALE') {
    void queryClient.invalidateQueries({ queryKey: ['screenMessages'] })
  }
}

export function useAcknowledgeMessage() {
  const queryClient = useQueryClient()
  return useMutation<{ acknowledged: boolean }, FlatApiError, MessageActionInput>({
    mutationFn: async ({ messageId, version }: MessageActionInput) => {
      const result = await acknowledgeMessage(messageId, version)
      if (!result.success) {
        throw new Error(result.error.message ?? 'Failed to acknowledge message')
      }
      return result.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['screenMessages'] })
    },
    onError: (err) => invalidateOnStaleVersion(err, queryClient),
  })
}

export function useDismissMessage() {
  const queryClient = useQueryClient()
  return useMutation<{ dismissed: boolean }, FlatApiError, MessageActionInput>({
    mutationFn: async ({ messageId, version }: MessageActionInput) => {
      const result = await dismissMessage(messageId, version)
      if (!result.success) {
        throw new Error(result.error.message ?? 'Failed to dismiss message')
      }
      return result.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['screenMessages'] })
    },
    onError: (err) => invalidateOnStaleVersion(err, queryClient),
  })
}
