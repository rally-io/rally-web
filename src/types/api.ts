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
  // Detail-only, optional (feature-detected — absent on the list payload and
  // on clubs whose data isn't filled in yet):
  images?: string[]
  contact_number?: string | null
  opening_time?: string | null
  closing_time?: string | null
  latitude?: number | null
  longitude?: number | null
  website_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
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
  /**
   * Lifecycle status (`registration_open | in_progress | completed | …`).
   * Feature-detected: absent on API builds predating the field, so never
   * branch on it without a date-based fallback.
   */
  status?: string
  /**
   * Public spectator token. Live results live at `/live/<share_token>` on this
   * site — the same URL the CRM hands out. Null when the tournament has no
   * token, absent on API builds predating the field.
   */
  share_token?: string | null
  description?: string
  max_participants?: number
  prizes?: Prize[]
  sponsors?: Sponsor[]
  my_registration?: any
}

export interface Prize {
  id: string
  // Finishing place this prize is awarded for. Not contiguous — a club can
  // define prizes for places 1, 2 and 5 — so never infer it from list order.
  // Optional: servers predating the field omit it.
  position?: number
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

// Club events / classes (rally-api MobileEventListItem)
export interface EventParticipantPreview {
  player_id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  rating: number | null
}

export interface ClubEvent {
  id: string
  club_id: string
  club_name: string
  type: string
  name: string
  coach_name: string | null
  start_at: string
  end_at: string
  price: number
  seats_left: number
  max_participants: number
  skill_level_min: number | null
  skill_level_max: number | null
  image_url: string | null
  thumb_url: string | null
  joined: boolean
  participants_preview: EventParticipantPreview[]
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

export interface TournamentParticipantPlayer {
  id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  skill_level: number | null
  skill_tier?: string | null
  is_guest: boolean
}

export interface TournamentParticipantPair {
  registration_id: string
  team_name: string | null
  player_1: TournamentParticipantPlayer
  player_2: TournamentParticipantPlayer | null
}

export interface TournamentParticipants {
  tournament_id: string
  format: string
  /** Registrations (pairs/teams), not individuals. */
  confirmed_count: number
  items: TournamentParticipantPair[]
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
  /** Null for player_2/guest, who never pays a tournament registration. */
  my_payment?: MyPayment | null
}

// --- Payment breakdown for the current viewer (mirrors rally-mobile's MyPayment) ---

export interface MyPaymentRefund {
  /** 'pending_choice' ⇒ money hasn't moved yet; 'resolved' ⇒ it has. */
  status: string
  mode_chosen: string | null
  deadline: string | null
  card_refunded: number | null
  credit_refunded: number | null
}

export interface MyPayment {
  base_amount: number
  fee_portion: number
  gross_amount: number
  credits_applied: number
  card_charged: number
  auto_charged_amount: number
  payment_status: string | null
  refund?: MyPaymentRefund | null
}

// --- Withdraw / cancel registration ---

export interface TournamentWithdrawResult {
  id: string
  tournament_id: string
  status: string
  credits_applied: number
  tournament_name: string | null
  my_payment: MyPayment | null
}

// --- Tournament registration request ---

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

export interface TournamentRegistrationResult {
  id: string
  tournament_id: string
  status: string
  payment_status: string | null
  credits_applied: number
  service_fee: number
  amount_to_pay: number | null
  entry_fee: number | null
}

// --- Player search (partner selection) ---

export interface PlayerSearchResult {
  id: string
  first_name: string
  last_name: string
  avatar_url: string | null
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

// --- Payments ---

export type PaymentEntityType =
  | 'booking'
  | 'tournament_registration'
  | 'event_participation'

export interface InitiatePaymentResponse {
  payment_url: string | null
}