// Fills ONLY fields the API omits, so screens render fully for preview.
// Never overrides real API values (spec: keep mock data for visibility).
import type { TournamentDetail, Prize, Sponsor } from '@/types/api'

const MOCK_PRIZES: Prize[] = [
  { id: 'm1', title: '1st Place', description: '₪2,000 + Trophy', image_url: null },
  { id: 'm2', title: '2nd Place', description: '₪1,000', image_url: null },
  { id: 'm3', title: '3rd Place', description: '₪500', image_url: null },
]

const MOCK_SPONSORS: Sponsor[] = [
  { id: 's1', name: 'Rally', image_url: '', website_url: 'https://example.com' },
]

export function withMockFallback(detail: TournamentDetail): TournamentDetail {
  return {
    ...detail,
    description:
      detail.description && detail.description.trim().length > 0
        ? detail.description
        : 'A competitive padel tournament hosted at a premier club. Full details coming soon.',
    prizes: detail.prizes && detail.prizes.length > 0 ? detail.prizes : MOCK_PRIZES,
    sponsors:
      detail.sponsors && detail.sponsors.length > 0 ? detail.sponsors : MOCK_SPONSORS,
  }
}
