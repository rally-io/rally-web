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

/**
 * Clubs whose photo exists under public/elections/photos/<id>.webp, cropped 16:9: the
 * club's own picture from its Rally profile, or (where that is only a logo) a photo
 * from the club's or its chain's site or a court directory's page for the club, which
 * Rally clears with the club before launch.
 * Clubs with neither borrow one from BORROWED below.
 */
const PHOTOS = new Set<string>([
  'a-padel-indoor-holon',
  'a-padel-savyon',
  'beer-sheva-padel-club',
  'future-padel-ness-ziona',
  'gt-padel-ganei-tikva',
  'house-padel-beit-berl',
  'house-padel-big-glilot',
  'house-padel-tlv',
  'neve-oz-sports-center-petah-tikva',
  'padel-center-rishon-lezion',
  'padel-club-ginosar',
  'padel-club-jerusalem-lev-talpiot',
  'padel-eilat-tennis-padel-academy',
  'padel-game-time-rehovot-faculty',
  'padel-israel-caesarea-business-park',
  'padel-israel-caesarea-settlement',
  'padel-israel-country-club-kfar-saba',
  'padel-israel-family-park-rishon-lezion',
  'padel-israel-kfar-hamaccabiah',
  'padel-israel-kfar-saba-park',
  'padel-israel-maccabi-rehovot',
  'padel-israel-petah-tikva',
  'padel-israel-tel-aviv-university',
  'padel-time-club-holon',
  'padel-time-club-raanana',
  'padel-time-club-tiberias',
  'padel-time-club-yavne',
  'padelia-ashdod',
  'padelir-ramat-gan-national-park',
  'padelnet-nesher',
  'padelnet-petah-tikva',
  'padelz-club-beer-sheva',
  'padelz-lehavim',
  'smash-padel-club-rishon-lezion',
  'smash-point-padel-bnei-zion-indoor',
  'tero-hadera',
  'tero-x-wilson-tel-aviv',
  'top-padel-herzliya',
  'top-padel-ir-yamim-netanya',
  'top-padel-jerusalem-lerner-center',
  'top-padel-poleg-netanya',
  'total-padel-sderot',
])

/**
 * The photo a club without its own shows: another branch of its chain, else one of four
 * CC0 padel photos from Wikimedia Commons (generic-N, no credit required), rotated in the
 * rail's order so neighbours differ. Never lent: Tiberias and Poleg (their town or sea is
 * in the shot), Tero Hadera (tennis courts) and Ra'anana (not yet confirmed with the club).
 * A-Padel Givat Ram and Tero Ma'ale Adumim sit between their only siblings on the rail,
 * so their borrowed photo is next to its source.
 */
const BORROWED: Record<string, string> = {
  'a-padel-givat-ram': 'a-padel-indoor-holon',
  'padel-time-club-givat-shmuel': 'padel-time-club-yavne',
  'padel-time-club-rehovot': 'padel-time-club-holon',
  'padel-time-club-tel-aviv': 'padel-time-club-yavne',
  'padelnet-ramat-efal': 'padelnet-nesher',
  'tero-x-wilson-maale-adumim': 'tero-x-wilson-tel-aviv',
  'top-padel-savyon': 'top-padel-herzliya',
  'green-padel-mevasseret': 'generic-1',
  'maccabim-padel-club': 'generic-2',
  'itec-beer-sheva': 'generic-3',
  'itec-haifa': 'generic-4',
  'itec-jerusalem': 'generic-1',
  'itec-kochav-yair': 'generic-2',
  'itec-migdal-haemek': 'generic-3',
  'itec-ramat-hasharon': 'generic-4',
  'padel-nes-ness-ziona-municipal': 'generic-1',
  'sol-padel-ofakim': 'generic-2',
  'padel-club-azor': 'generic-3',
  'padels-kibbutz-saar': 'generic-4',
}

export function photoFor(clubId: string): string | null {
  const id = PHOTOS.has(clubId) ? clubId : BORROWED[clubId]
  return id ? `/elections/photos/${id}.webp` : null
}

/**
 * Brands that run (or are building) a chain even with one branch today.
 * Padel Center: confirmed as a chain by Rally on 26.10.2026.
 */
const CHAIN_OVERRIDES = new Set<string>(['padel-center'])

export const CHAINS: ElectionBrand[] = BRANDS.filter(
  (b) => b.branches > 1 || CHAIN_OVERRIDES.has(b.id),
).sort((a, b) => b.branches - a.branches)

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
