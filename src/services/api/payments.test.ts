import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

import client from './client'
import * as payments from './payments'
import type { SavedCard } from '@/types/api'

const mockClient = vi.mocked(client)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getSavedCards', () => {
  it('GETs /rally/v1/payments/saved-cards', async () => {
    const sample: SavedCard = {
      id: 'card-1',
      card_last4: '4242',
      card_expiry: '0526',
      brand: 'Visa',
      issuer: null,
      is_default: true,
      created_at: '2026-01-01T00:00:00Z',
      has_token: true,
    }
    mockClient.get.mockResolvedValue({ success: true, data: [sample], meta: null, error: null })

    const result = await payments.getSavedCards()

    expect(mockClient.get).toHaveBeenCalledWith('/rally/v1/payments/saved-cards')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual([sample])
  })
})

describe('deleteSavedCard', () => {
  it('DELETEs /rally/v1/payments/saved-cards/{id}', async () => {
    mockClient.delete.mockResolvedValue({ success: true, data: null, meta: null, error: null })

    await payments.deleteSavedCard('card-1')

    expect(mockClient.delete).toHaveBeenCalledWith('/rally/v1/payments/saved-cards/card-1')
  })
})

describe('initiatePayment', () => {
  beforeEach(() => {
    mockClient.post.mockResolvedValue({
      success: true,
      data: { payment_url: 'https://meshulam.co.il/...' },
      meta: null,
      error: null,
    })
  })

  it('booking — POSTs the booking initiate URL', async () => {
    await payments.initiatePayment({ type: 'booking', id: 'b-1' })
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rally/v1/payments/booking/b-1/initiate',
      {},
    )
  })

  it('booking — forwards save_card when provided', async () => {
    await payments.initiatePayment({ type: 'booking', id: 'b-1' }, { save_card: true })
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rally/v1/payments/booking/b-1/initiate',
      { save_card: true },
    )
  })

  it('tournament_registration — uses dashed path segment, empty body', async () => {
    await payments.initiatePayment({ type: 'tournament_registration', id: 'r-1' })
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rally/v1/payments/tournament-registration/r-1/initiate',
      {},
    )
  })

  it('tournament_registration — does NOT forward save_card (booking-only flag)', async () => {
    await payments.initiatePayment(
      { type: 'tournament_registration', id: 'r-1' },
      { save_card: true },
    )
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rally/v1/payments/tournament-registration/r-1/initiate',
      {},
    )
  })

  it('event_participation — uses dashed path segment, empty body', async () => {
    await payments.initiatePayment({ type: 'event_participation', id: 'p-1' })
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rally/v1/payments/event-participation/p-1/initiate',
      {},
    )
  })

  it('tournament_registration — forwards use_credits=true', async () => {
    await payments.initiatePayment({ type: 'tournament_registration', id: 'r-1', use_credits: true })
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rally/v1/payments/tournament-registration/r-1/initiate',
      { use_credits: true },
    )
  })

  it('tournament_registration — forwards use_credits=false when explicitly set', async () => {
    await payments.initiatePayment({ type: 'tournament_registration', id: 'r-1', use_credits: false })
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rally/v1/payments/tournament-registration/r-1/initiate',
      { use_credits: false },
    )
  })
})

describe('chargeSavedCard', () => {
  beforeEach(() => {
    mockClient.post.mockResolvedValue({
      success: true,
      data: { grow_asmachta: 'A123', amount: 80 },
      meta: null,
      error: null,
    })
  })

  it('booking — POSTs charge-saved-card with card_id only', async () => {
    await payments.chargeSavedCard({ type: 'booking', id: 'b-1' }, 'card-1')
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rally/v1/payments/booking/b-1/charge-saved-card',
      { card_id: 'card-1' },
    )
  })

  it('tournament_registration — forwards use_credits when set', async () => {
    await payments.chargeSavedCard(
      { type: 'tournament_registration', id: 'r-1', use_credits: true },
      'card-1',
    )
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rally/v1/payments/tournament-registration/r-1/charge-saved-card',
      { card_id: 'card-1', use_credits: true },
    )
  })

  it('tournament_registration — omits use_credits when not provided', async () => {
    await payments.chargeSavedCard(
      { type: 'tournament_registration', id: 'r-1' },
      'card-1',
    )
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rally/v1/payments/tournament-registration/r-1/charge-saved-card',
      { card_id: 'card-1' },
    )
  })

  it('event_participation — POSTs with card_id only (no use_credits ever)', async () => {
    await payments.chargeSavedCard({ type: 'event_participation', id: 'p-1' }, 'card-1')
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rally/v1/payments/event-participation/p-1/charge-saved-card',
      { card_id: 'card-1' },
    )
  })

  it('returns the grow_asmachta / amount response shape', async () => {
    const result = await payments.chargeSavedCard({ type: 'booking', id: 'b-1' }, 'card-1')
    if (result.success) {
      expect(result.data.grow_asmachta).toBe('A123')
      expect(result.data.amount).toBe(80)
    }
  })

  it('tournament credits-only — returns confirmed without grow_asmachta', async () => {
    mockClient.post.mockResolvedValue({
      success: true,
      data: { confirmed: true, amount: 0, credits_applied: 50 },
      meta: null,
      error: null,
    })
    const result = await payments.chargeSavedCard(
      { type: 'tournament_registration', id: 'r-1', use_credits: true },
      'card-1',
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.confirmed).toBe(true)
      expect(result.data.grow_asmachta).toBeUndefined()
      expect(result.data.amount).toBe(0)
    }
  })
})