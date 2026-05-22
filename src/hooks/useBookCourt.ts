// src/hooks/useBookCourt.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bookCourt } from '@/services/api/bookings'

export function useBookCourt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Parameters<typeof bookCourt>[0]) => {
      return bookCourt(input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs'] })
    },
  })
}
