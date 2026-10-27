export type ElectionRegion =
  'tlv' | 'sharon' | 'shfela' | 'center' | 'jerusalem' | 'haifa' | 'north' | 'south'

/** A padel brand. Brands with more than one branch are the "chain" ballot. */
export interface ElectionBrand {
  id: string
  name: string
  nameEn: string
  branches: number
}

/** One physical location, the "club" ballot. */
export interface ElectionClub {
  id: string
  brand: string
  name: string
  city: string
  region: ElectionRegion
  /** Present when the venue exists in the Rally clubs API. */
  rallyClubId?: string
}

export interface ElectionVote {
  club_id: string
  /** null when the voter skipped the chain ballot. */
  chain_id: string | null
}
