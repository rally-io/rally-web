// src/types/api.ts
export interface ApiSuccess<T, M = unknown> {
  success: true
  data: T
  meta: M | null
  error: null
}

export interface ApiFailure {
  success: false
  error: {
    code: string
    message: string
    details: any
  }
}

export type ApiResponse<T, M = unknown> = ApiSuccess<T, M> | ApiFailure

export interface CursorMeta {
  next_cursor: string | null
}

// Clubs
export interface Club {
  id: string
  name: string
  city: string
  address_line1: string
  image_url: string | null
  thumb_url: string | null
  distance_km: number | null
  starts_from: number
  has_availability: boolean
  court_types: ('indoor' | 'outdoor')[]
  amenities: string[]
  description: string
  booking_ahead_limit: number
  setup_complete: boolean
  available_slots: TimeSlot[]
}

export interface TimeSlot {
  start_time: string
  end_time: string
  available: boolean
  price: number
  service_fee: number
  duration: number
  available_courts: { id: string; name: string; type: string }[]
}

// Tournaments
export interface Tournament {
  id: string
  name: string
  format: 'singles' | 'doubles' | 'mixed'
  start_date: string
  end_date: string
  registration_deadline: string
  skill_level_min: number
  skill_level_max: number
  skill_level: string
  entry_fee: number
  image_url: string | null
  thumb_url: string | null
  structure: string
  club_name: string
  registration_id: string | null
  registration_status: string | null
  available_seats: number
  description?: string
  max_participants?: number
  prizes?: Prize[]
  sponsors?: Sponsor[]
  my_registration?: any
}

export interface Prize {
  id: string
  title: string
  description: string
  image_url: string | null
}

export interface Sponsor {
  id: string
  name: string
  image_url: string
  website_url: string
}

// Onboarding
export interface OnboardingStatus {
  is_authenticated: boolean
  has_player_profile: boolean
  completion_percent: number
  completed_steps: string[]
  missing_steps: string[]
}

// Bookings
export interface BookingRequest {
  club_id: string
  court_id: string
  booking_date: string
  start_time: string
  end_time: string
  use_credits: boolean
}

export interface BookingResponse {
  id: string
  club_id: string
  court_id: string
  booking_date: string
  start_time: string
  end_time: string
  total_price: number
  service_fee: number
  credits_applied: number
  amount_to_pay: number
  status: string
  payment_status: string
  within_cancellation_window: boolean
  amount_credited: number | null
  club_name: string
  court_name: string
  court_type: string
  image_url: string
  club_timezone: string
}

// --- Tournament registration domain (mobile parity, spec §3) ---

export interface MyRegistration {
  id: string
  tournament_id: string
  player_1_id: string
  player_2_id?: string | null
  player_2_name?: string | null
  guest_player_2_id?: string | null
  guest_player_2_name?: string | null
  team_name?: string | null
  status: string
  payment_status?: string | null
}

export interface TournamentDetail extends Tournament {
  prizes: Prize[]
  sponsors: Sponsor[]
  my_registration: MyRegistration | null
}

export interface RegistrationDetail {
  id: string
  tournament_id: string
  status: string
  payment_status: string | null
  credits_applied: number
  service_fee: number
  amount_credited: number | null
  amount_to_pay: number
  entry_fee: number
  team_name: string | null
  image_url: string | null
  tournament_name: string
  tournament_club_name: string
  start_date?: string | null
  end_date?: string | null
  within_cancellation_window: boolean
  /** True ⇒ pre-auth (J4/J5 hold) entity: saved-card capture is forbidden, hosted checkout only. (gap spec §2.5) */
  requires_approval_event?: boolean
}

export interface PlayerSearchResult {
  id: string
  first_name: string
  last_name: string
  avatar_url: string | null
}

/** Partner selection payload. Note: use_credits is deferred to the payment phase. */
export type RegisterPayload =
  | { partner_type: 'none' }
  | { partner_type: 'existing'; partner_player_id: string }
  | {
      partner_type: 'invite'
      invite_first_name: string
      invite_last_name: string
      invite_country_code: string
      invite_phone: string
    }

export type SelectedPartner =
  | { type: 'existing'; id: string; displayName: string; avatarUrl?: string | null }
  | { type: 'invite'; firstName: string; lastName: string; countryCode: string; phone: string }

export type PartnerSelectionState =
  | { phase: 'idle' }
  | { phase: 'selected'; partner: SelectedPartner }

export interface TournamentRegistrationResponse {
  id: string
  tournament_id: string
  player_1_id: string
  player_2_id: string | null
  player_2_name: string | null
  guest_player_2_id: string | null
  guest_player_2_name: string | null
  team_name: string | null
  status: string
  payment_status: string | null
  credits_applied: number
  service_fee: number
  amount_to_pay: number
  amount_credited: number | null
  entry_fee: number
  tournament_name: string
  tournament_club_name: string
  image_url: string | null
  thumb_url: string | null
  start_date: string
  end_date: string
  within_cancellation_window: boolean
}

// Profile update
export interface ProfileUpdateRequest {
  first_name?: string
  last_name?: string
  contact_number?: string
  country_code?: string
  skill_level?: number
}

// PROFILE_FIELDS_REQUIRED error
export interface ProfileFieldsRequiredError {
  code: 'PROFILE_FIELDS_REQUIRED'
  details: {
    action: 'book_court' | 'register_tournament'
    missing_fields: { field: string; label: string; scope: string }[]
  }
}

// AUTH_SPEC §10 / WEB_AUTH_SPEC §6 — POST /rally/v1/players/ payload.
// Mobile-parity: slot_type uses the canonical 5 values, NOT WEB_AUTH_SPEC's "preferred" example.
export type SlotType = 'morning' | 'afternoon' | 'evening' | 'all_day' | 'specific_hours'
export type Gender = 'male' | 'female' | 'choose_not_to_answer'
export type BestHand = 'left' | 'right' | 'both_hands'
export type CourtSide = 'left_side' | 'right_side' | 'both_sides'
export type MatchType = 'competitive' | 'friendly' | 'both'

export interface PreferredTimeSlot {
  time_from: string  // 'HH:MM'
  time_to: string    // 'HH:MM'
  slot_type: SlotType
}

export interface PreferredTimeDay {
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6
  slots: PreferredTimeSlot[]
}

export interface PlayerCreatePayload {
  first_name: string
  last_name: string
  email: string
  contact_number: string
  country_code?: string            // ISO style — e.g. '+972'. Omit if no contact_number.
  gender: Gender
  date_of_birth?: string           // 'YYYY-MM-DD'
  skill_level?: number
  membership?: string
  best_hand?: BestHand
  court_side?: CourtSide
  match_type?: MatchType
  preferred_time?: PreferredTimeDay[]
  referrer_id?: string | null
  // appsflyer_id / device_id are mobile-only — omitted on web (AUTH_SPEC §10).
}

// Minimal subset of the MeResponse we use for the profile gate.
export interface PlayerMe {
  id: string
  first_name: string | null
  last_name: string | null
  contact_number: string | null
  email: string | null
  skill_level: number | null
  skill_tier?: 'bronze' | 'silver' | 'gold' | null
  avatar_url?: string | null
}

export interface SupabaseUserSummary {
  id: string
  email: string | null
  role: string
}

// --- Payments (PAYMENT_SPEC.md §3) ---

export type PaymentEntityType =
  | 'booking'
  | 'tournament_registration'
  | 'event_participation'

/**
 * Discriminator passed to initiatePayment / chargeSavedCard.
 * `use_credits` is only meaningful for tournament_registration (spec §3.2).
 */
export type PaymentEntity =
  | { type: 'booking'; id: string }
  | { type: 'tournament_registration'; id: string; use_credits?: boolean }
  | { type: 'event_participation'; id: string }

export type CardBrand =
  | 'Visa' | 'Mastercard' | 'Diners' | 'Amex' | 'Isracard' | 'Discover'

export interface SavedCard {
  id: string
  card_last4: string
  card_expiry: string        // 'MMYY'
  brand: CardBrand | null
  issuer: string | null      // Always null on Grow; HYP-legacy field, kept for response shape parity
  is_default: boolean
  created_at: string         // ISO 8601
  has_token: boolean         // false → must use hosted-checkout, not server-to-server
}

export interface InitiatePaymentResponse {
  payment_url: string        // Grow hosted-checkout URL
}

/**
 * Spec §3.2 / gap-spec §11 (G9): the three charge-saved-card endpoints normally
 * return { grow_asmachta, amount }. For a credits-cover-all tournament charge the
 * backend instead returns { confirmed, amount, credits_applied } with NO
 * grow_asmachta. Treat a missing grow_asmachta as a valid success — the
 * confirming screen already guards `asmachta && …` before rendering `#…`.
 */
export interface ChargeSavedCardResponse {
  grow_asmachta?: string
  amount: number
  confirmed?: boolean
  credits_applied?: number
}

/** Spec §3.1: save_card is only documented on the booking initiate endpoint. */
export interface InitiateBookingPaymentBody {
  save_card?: boolean
}