import type { GlobeNode, SkillTier } from '@/features/playerGlobe/types'
import type { PartnerCard } from '@/types/partnerPool'

const GLOBE_TIERS: readonly string[] = ['bronze', 'silver', 'gold']

/** The ring colour. Read from `globe_tier`: `skill_tier` is a tier CODE ("B1"), not a colour. */
export function globeTierOf(card: Pick<PartnerCard, 'globe_tier'>): SkillTier | null {
  return card.globe_tier && GLOBE_TIERS.includes(card.globe_tier) ? (card.globe_tier as SkillTier) : null
}

/** The one place a deck card becomes the globe's node, so the deck can open the globe's
    player card (src/features/playerGlobe/components/PlayerCard.tsx). */
export function toGlobeNode(card: PartnerCard): GlobeNode {
  return {
    id: card.player_id,
    name: card.name,
    avatarUrl: card.avatar_url,
    avatarCleanUrl: card.avatar_clean_url,
    portraitUrl: card.portrait_url,
    gender: card.gender,
    skillLevel: card.skill_level,
    skillTier: globeTierOf(card),
    levelVerified: card.level_verified,
    levelReliability: card.level_reliability,
    club: card.club,
    matches: card.matches_played,
    winRate: card.win_rate ?? 0,
    since: card.since,
  }
}
