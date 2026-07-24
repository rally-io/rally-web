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
// Web no longer initiates payments (all transactional flows live in the mobile
// app); this type survives only for the grace-period return/confirming pages.

export type PaymentEntityType =
  | 'booking'
  | 'tournament_registration'
  | 'event_participation'