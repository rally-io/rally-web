// src/types/api.ts
export interface ApiSuccess<T> {
  success: true
  data: T
  meta: any
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

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

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

// Tournament Registration
export interface TournamentRegistrationRequest {
  partner_type: 'none' | 'existing' | 'invite'
  partner_player_id?: string | null
  invite_first_name?: string | null
  invite_last_name?: string | null
  invite_phone?: string | null
  invite_country_code?: string | null
  use_credits: boolean
}

// Profile update
export interface ProfileUpdateRequest {
  contact_number?: string
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