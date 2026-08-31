import { usePastTournaments } from './usePastTournaments'

export function useClubPastTournaments(clubId: string, enabled: boolean) {
  return usePastTournaments({ club_id: clubId }, !!clubId && enabled)
}
