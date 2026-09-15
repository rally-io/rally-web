import { describe, expect, it } from 'vitest'
import { fullPlayerStatsSchema, publicPlayerStatsSchema } from '../api/playerStats'

const career = {
  matches_played: 12, matches_won: 7, matches_lost: 5, win_rate: 58,
  current_streak: 2, best_streak: 4, tournaments_played: 3, tournaments_won: 1,
}

describe('player stats schemas', () => {
  it('accepts the public career block and rejects a missing field', () => {
    expect(publicPlayerStatsSchema.parse(career)).toEqual(career)
    expect(() => publicPlayerStatsSchema.parse({ ...career, win_rate: undefined })).toThrow()
  })

  it('accepts the full block with history, partners and clubs', () => {
    const full = fullPlayerStatsSchema.parse({
      ...career,
      skill_history: [{ skill_level: 3.2, recorded_at: '2026-08-01T10:00:00Z' }],
      top_partners: [{ player_id: 'p', display_name: 'Dana', avatar_url: null, matches_played: 4 }],
      top_clubs: [{ club_id: 'c', name: 'Rally TLV', logo_url: null, matches_played: 9 }],
    })
    expect(full.skill_history[0].skill_level).toBe(3.2)
    expect(full.top_clubs[0].name).toBe('Rally TLV')
  })
})
