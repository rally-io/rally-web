import type { CustomQuestion, LandingConfig, PublicCategory, PublicCorporateEvent } from '../types'

export const DOUBLES: PublicCategory = {
  tournament_id: '11111111-1111-1111-1111-111111111111',
  name: 'Open doubles', format: 'doubles', structure: 'group_then_knockout',
  level_label: '3.0–3.5', max_participants: 16, confirmed_count: 4, is_full: false, waitlist_count: 0,
  participants_per_registration: 2,
}
export const AMERICANO: PublicCategory = {
  tournament_id: '22222222-2222-2222-2222-222222222222',
  name: 'Americano', format: 'singles', structure: 'americano',
  level_label: null, max_participants: 8, confirmed_count: 8, is_full: true, waitlist_count: 2,
  participants_per_registration: 1,
}

export const Q_TEXT: CustomQuestion = { id: 'q_aaaaaa11', label: 'Department', type: 'text', required: true, options: [], per_participant: false, archived: false }
export const Q_SIZE: CustomQuestion = { id: 'q_bbbbbb22', label: 'Shirt size', type: 'select', required: true, options: ['S', 'M', 'L'], per_participant: true, archived: false }
export const Q_FOOD: CustomQuestion = { id: 'q_cccccc33', label: 'Dietary', type: 'multiselect', required: false, options: ['Vegan', 'Kosher'], per_participant: false, archived: false }
export const Q_OLD: CustomQuestion = { id: 'q_dddddd44', label: 'Archived', type: 'text', required: true, options: [], per_participant: false, archived: true }

export function config(over: Partial<LandingConfig> = {}): LandingConfig {
  return {
    version: 1, locale: 'en', accent: null, success_message_md: '', require_phone: true, require_email: true,
    questions: [],
    components: [
      { type: 'hero', enabled: true, title: 'Acme Padel Day', subtitle: 'Bring a colleague', company_logo_url: null, image_url: null },
      { type: 'intro', enabled: true, body_md: 'Welcome **all**.' },
      { type: 'details', enabled: true, date_label: 'Thursday 12 Nov', time_label: '17:00–21:00', venue_label: 'Padel TLV, Tel Aviv' },
      { type: 'terms', enabled: true, title: 'Rules', body_md: '- Be nice\n- Have fun', consent_label: 'I accept the rules', required: true },
      { type: 'evidence', enabled: false, instructions_md: '', required: false, per_participant: true, max_files: 2 },
      { type: 'registration', enabled: true, ask_level: true, level_options: [], ask_preferred_day: false, day_options: [] },
    ],
    ...over,
  }
}

export function eventFixture(over: Partial<PublicCorporateEvent> = {}): PublicCorporateEvent {
  return {
    event_id: '99999999-9999-9999-9999-999999999999',
    slug: 'acme-day', customer_name: 'Acme', name: 'Acme Padel Day', state: 'open',
    start_at: '2026-11-12T15:00:00Z', end_at: '2026-11-12T19:00:00Z',
    club_name: 'Padel TLV', club_address: 'Tel Aviv', registration_closes_at: null,
    email_domain_restricted: false,
    landing_config: config(), categories: [DOUBLES],
    ...over,
  }
}
