// src/hooks/useBookCourt.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bookCourt } from '@/services/api/bookings'
import { useAppSession } from '@/hooks/useAppSession'

export function useBookCourt() {
  const queryClient = useQueryClient()
  const { ensurePlayerProfile } = useAppSession()
  return useMutation({
    mutationFn: async (input: Parameters<typeof bookCourt>[0]) => {
      await ensurePlayerProfile()
      return bookCourt(input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs'] })
    },
  })
}
