/**
 * Wire types for corporate events. Mirrors rally-api `app/schemas/corporate.py`, the single
 * source of truth — read its module docstring for every endpoint. Snake_case on purpose: these
 * are the API's own shapes, not view models.
 */

export type PublicEventState = 'not_open' | 'open' | 'paused' | 'closed' | 'cancelled'

export interface HeroComponent {
  type: 'hero'
  enabled: boolean
  title: string
  subtitle: string
  company_logo_url?: string | null
  image_url?: string | null
}
export interface IntroComponent { type: 'intro'; enabled: boolean; body_md: string }
export interface DetailsComponent {
  type: 'details'
  enabled: boolean
  date_label: string
  time_label: string
  venue_label: string
}
export interface TermsComponent {
  type: 'terms'
  enabled: boolean
  title: string
  body_md: string
  consent_label: string
  required: boolean
}
export interface EvidenceComponent {
  type: 'evidence'
  enabled: boolean
  instructions_md: string
  required: boolean
  per_participant: boolean
  max_files: number
}
export interface RegistrationComponent {
  type: 'registration'
  enabled: boolean
  ask_level: boolean
  level_options: string[]
  ask_preferred_day: boolean
  day_options: string[]
}
export type LandingComponent =
  | HeroComponent | IntroComponent | DetailsComponent
  | TermsComponent | EvidenceComponent | RegistrationComponent

export type QuestionType = 'text' | 'textarea' | 'select' | 'multiselect' | 'checkbox'

export interface CustomQuestion {
  id: string
  label: string
  type: QuestionType
  required: boolean
  options: string[]
  per_participant: boolean
  archived: boolean
}

export interface LandingConfig {
  version: 1
  locale: 'he' | 'en'
  accent?: string | null
  components: LandingComponent[]
  questions: CustomQuestion[]
  success_message_md: string
  /** Must the PUBLIC form collect these? Absent = true (the API default). */
  require_phone?: boolean
  require_email?: boolean
}

export interface PublicCategory {
  tournament_id: string
  name: string
  format: string
  structure: string
  level_label?: string | null
  /** null = unlimited. */
  max_participants?: number | null
  confirmed_count: number
  is_full: boolean
  waitlist_count: number
  /** Americano (and any singles format) registers one person; doubles two. */
  participants_per_registration: 1 | 2
}

export interface PublicCorporateEvent {
  event_id: string
  slug: string
  customer_name: string
  name: string
  state: PublicEventState
  start_at?: string | null
  end_at?: string | null
  club_name: string
  club_address: string
  registration_closes_at?: string | null
  /** The allowlist itself is never sent. */
  email_domain_restricted: boolean
  landing_config: LandingConfig
  categories: PublicCategory[]
}

export interface ParticipantInput {
  first_name: string
  last_name: string
  country_code: string
  phone: string
  email: string
  skill_level?: number | null
}

export interface PublicRegistrationRequest {
  tournament_id: string
  participants: ParticipantInput[]
  requested_level?: string | null
  preferred_day?: string | null
  answers: Record<string, unknown>
  terms_accepted: boolean
  website?: string | null
  started_at_ms?: number | null
}

export interface PublicRegistrationResult {
  registration_id: string
  status: 'confirmed' | 'waitlisted'
  waitlist_position?: number | null
  /** Returned once; the browser keeps it. */
  access_token: string
}

export interface PublicRegistrationStatus {
  registration_id: string
  tournament_id: string
  category_name: string
  status: 'confirmed' | 'waitlisted' | 'removed' | 'cancelled'
  waitlist_position?: number | null
  participants: { slot: 1 | 2; first_name: string; last_name: string }[]
  /** "1"/"2" -> files uploaded. */
  evidence_counts: Record<string, number>
  evidence_required: boolean
}

export interface RosterRow {
  category: string
  status: 'confirmed' | 'waitlisted'
  first_name: string
  last_name: string
  phone: string
  email?: string | null
  skill_level?: number | null
  partner_name?: string | null
  answers: Record<string, unknown>
  has_documents: boolean
  registered_at: string
}

export interface PublicRoster {
  customer_name: string
  event_name: string
  generated_at: string
  questions: CustomQuestion[]
  rows: RosterRow[]
}

/** The shape every failed call is normalised to (matches the shared client's rejection). */
export interface ApiFailure {
  status: number | null
  code: string
  message: string
  details?: Record<string, unknown>
}

/** Lookup helpers over the landing config's component list. */
export function findComponent<T extends LandingComponent['type']>(
  config: LandingConfig,
  type: T,
): Extract<LandingComponent, { type: T }> | null {
  const found = config.components.find((c) => c.type === type)
  return (found as Extract<LandingComponent, { type: T }> | undefined) ?? null
}
