import { describe, expect, it } from 'vitest'
import type { PlayerMe } from '@/types/api'
import { courtViewerOf } from './viewer'

const ME: PlayerMe = {
  player_id: 'me',
  first_name: 'Dana',
  last_name: 'Levi',
  contact_number: null,
  skill_level: 3.5,
  avatar_url: 'https://cdn/a.jpg',
  avatar_clean_url: 'https://cdn/a-clean.jpg',
  player_preferences: { court_side: 'left_side' },
}

describe('courtViewerOf', () => {
  it('your side, name and frameless avatar', () => {
    expect(courtViewerOf(ME)).toEqual({ side: 'left_side', name: 'Dana Levi', avatarUrl: 'https://cdn/a-clean.jpg' })
  })

  it('falls back to the framed avatar, then none; no side or preferences is no side', () => {
    expect(courtViewerOf({ ...ME, avatar_clean_url: null, player_preferences: null })).toEqual({
      side: null,
      name: 'Dana Levi',
      avatarUrl: 'https://cdn/a.jpg',
    })
    expect(courtViewerOf({ ...ME, avatar_clean_url: undefined, avatar_url: undefined })?.avatarUrl).toBeNull()
  })

  it('a missing name part leaves no stray space', () => {
    expect(courtViewerOf({ ...ME, last_name: null })?.name).toBe('Dana')
  })

  it('no profile yet: no viewer', () => {
    expect(courtViewerOf(null)).toBeUndefined()
  })
})
