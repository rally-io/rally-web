import { useQuery } from '@tanstack/react-query'
import { getOrganizer } from '@/services/api/tournaments'

export function useOrganizer(slug: string) {
  return useQuery({
    queryKey: ['organizer', slug],
    queryFn: async () => {
      const res = await getOrganizer(slug)
      if (!res.success) throw new Error(res.error.message)
      return res.data
    },
    enabled: !!slug,
  })
}
