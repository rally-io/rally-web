import type { CourtViewer } from '@/components/partners/PartnerCard'
import type { PlayerMe } from '@/types/api'

/** You, on each card's court: your side, your name and your frameless avatar. Undefined until
    the profile loads, so the cards draw no marker rather than a nameless one. */
export function courtViewerOf(profile: PlayerMe | null): CourtViewer | undefined {
  if (!profile) return undefined
  return {
    side: profile.player_preferences?.court_side ?? null,
    name: `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim(),
    avatarUrl: profile.avatar_clean_url ?? profile.avatar_url ?? null,
  }
}
