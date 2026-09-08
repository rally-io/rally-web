import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { useTournamentPartnerDraft } from './useTournamentPartnerDraft'

beforeEach(() => sessionStorage.clear())

it('restores a partner after a detour but never for a different player or tournament', () => {
  const first = renderHook(() => useTournamentPartnerDraft('t1', 'u1'))
  act(() => first.result.current[1]({ phase: 'selected', partner: { type: 'existing', id: 'p2', displayName: 'Dana' } }))
  first.unmount()
  const second = renderHook(({ owner, tournament }) => useTournamentPartnerDraft(tournament, owner), { initialProps: { owner: 'u1', tournament: 't1' } })
  expect(second.result.current[0].phase).toBe('selected')
  second.rerender({ owner: 'u2', tournament: 't1' })
  expect(second.result.current[0].phase).toBe('idle')
  second.rerender({ owner: 'u1', tournament: 't2' })
  expect(second.result.current[0].phase).toBe('idle')
})

it('ignores expired and malformed drafts', () => {
  sessionStorage.setItem('rally:tournament-partner', JSON.stringify({ owner: 'u1', tournament: 't1', expires: 0, partner: { type: 'existing', id: 'p2', displayName: 'Dana' } }))
  expect(renderHook(() => useTournamentPartnerDraft('t1', 'u1')).result.current[0].phase).toBe('idle')
  sessionStorage.setItem('rally:tournament-partner', '{broken')
  expect(renderHook(() => useTournamentPartnerDraft('t1', 'u1')).result.current[0].phase).toBe('idle')
})
