import { describe, it, expect, beforeEach } from 'vitest'
import { pendingPayment } from './usePendingPayment'

beforeEach(() => {
  sessionStorage.clear()
})

describe('pendingPayment', () => {
  it('round-trips a typical descriptor through set / get', () => {
    pendingPayment.set({
      type: 'tournament_registration',
      entityId: 'r-1',
      tournamentId: 't-1',
      amount: 150,
      useCredits: true,
    })
    expect(pendingPayment.get()).toEqual({
      type: 'tournament_registration',
      entityId: 'r-1',
      tournamentId: 't-1',
      amount: 150,
      useCredits: true,
    })
  })

  it('returns null when nothing is stored', () => {
    expect(pendingPayment.get()).toBeNull()
  })

  it('clear() removes the entry', () => {
    pendingPayment.set({ type: 'booking', entityId: 'b-1', amount: 80 })
    pendingPayment.clear()
    expect(pendingPayment.get()).toBeNull()
  })

  it('returns null when the stored value is not valid JSON', () => {
    sessionStorage.setItem('rally.pendingPayment', '{not json')
    expect(pendingPayment.get()).toBeNull()
  })

  it('returns null when the stored value is missing required fields', () => {
    sessionStorage.setItem('rally.pendingPayment', JSON.stringify({ amount: 80 }))
    expect(pendingPayment.get()).toBeNull()
  })
})