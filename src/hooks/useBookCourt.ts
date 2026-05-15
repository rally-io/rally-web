// src/hooks/useBookCourt.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bookCourt } from '@/services/api/bookings'

export function useBookCourt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: bookCourt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs'] })
    },
  })
}
