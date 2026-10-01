import { describe, it, expect } from 'vitest'
import { structureLabelKey } from './tournamentTheme'

describe('structureLabelKey', () => {
  it('maps americano to its own label, not the single-elimination default', () => {
    expect(structureLabelKey('americano')).toBe('tournament.tournamentStructureAmericano')
  })

  it('maps group_then_knockout to its label', () => {
    expect(structureLabelKey('group_then_knockout')).toBe('tournament.tournamentStructureGroupThenKnockout')
  })

  it('maps round_robin_league to its label', () => {
    expect(structureLabelKey('round_robin_league')).toBe('tournament.tournamentStructureRoundRobinLeague')
  })

  it('falls back to single elimination for an unknown or missing structure', () => {
    expect(structureLabelKey('single_elimination')).toBe('tournament.tournamentStructureSingleElimination')
    expect(structureLabelKey(undefined)).toBe('tournament.tournamentStructureSingleElimination')
    expect(structureLabelKey(null)).toBe('tournament.tournamentStructureSingleElimination')
    expect(structureLabelKey('something-new')).toBe('tournament.tournamentStructureSingleElimination')
  })
})
