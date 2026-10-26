import { BRANDS, CLUBS } from './ballotData'
import type { ElectionBrand, ElectionClub } from './types'

export const ELECTION_ID = '2026'

/** Voting closes at the end of 14.11.2026, Israel time (UTC+2 in November). */
export const ELECTION_CLOSES_AT = new Date('2026-11-14T23:59:59+02:00')

/** Raffle draw + results reveal, announced in the WhatsApp community. */
export const ELECTION_WINNER_DATE = '15.11'

/** Rally WhatsApp community ("Rally app | קהילת הפאדל"). */
export const WHATSAPP_COMMUNITY_URL = 'https://chat.whatsapp.com/GRk5wPjKPxOBKQqZw9uvuQ'

/**
 * Brands whose logo file exists under public/elections/logos/<id>.webp.
 * Anything missing renders a lettermark tile instead of a broken image.
 */
const LOGOS = new Set<string>([
  'a-padel',
  'azor',
  'b7-padel',
  'future-padel',
  'game-time',
  'ginosar',
  'green-padel',
  'gt-padel',
  'house-padel',
  'itec',
  'maccabim',
  'moadon-padel-jlm',
  'neve-oz',
  'padel-center',
  'padel-eilat',
  'padel-israel',
  'padel-time',
  'padelir',
  'padelnet',
  'padels',
  'padelz',
  'smash-padel-club',
  'smash-point',
  'sol-padel',
  'tero',
  'top-padel',
  'total-padel',
])

export function logoFor(brandId: string): string | null {
  return LOGOS.has(brandId) ? `/elections/logos/${brandId}.webp` : null
}

export const CHAINS: ElectionBrand[] = BRANDS.filter((b) => b.branches > 1).sort(
  (a, b) => b.branches - a.branches,
)

const brandById = new Map(BRANDS.map((b) => [b.id, b]))
const clubById = new Map(CLUBS.map((c) => [c.id, c]))

export function getBrand(id: string | null | undefined): ElectionBrand | undefined {
  return id ? brandById.get(id) : undefined
}

export function getClub(id: string | null | undefined): ElectionClub | undefined {
  return id ? clubById.get(id) : undefined
}

export function isVotingOpen(now = new Date()): boolean {
  return now < ELECTION_CLOSES_AT
}
