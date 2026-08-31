import { usePastTournaments } from './usePastTournaments'

export function useOrganizerPastTournaments(organizerSlug: string, enabled: boolean) {
  return usePastTournaments({ manager_slug: organizerSlug }, !!organizerSlug && enabled)
}
