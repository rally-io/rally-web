import { findComponent, type PublicCorporateEvent } from './types'
import type { FormRules } from './form'

/** The landing config flattened into what validation and the request builder need. */
export function rulesFor(event: PublicCorporateEvent): FormRules {
  const cfg = event.landing_config
  const reg = findComponent(cfg, 'registration')
  const terms = findComponent(cfg, 'terms')
  const evidence = findComponent(cfg, 'evidence')
  return {
    categories: event.categories,
    requirePhone: cfg.require_phone !== false,
    requireEmail: cfg.require_email !== false,
    askLevel: reg?.enabled ? reg.ask_level : false,
    levelOptions: reg?.enabled ? reg.level_options : [],
    askPreferredDay: reg?.enabled ? reg.ask_preferred_day : false,
    dayOptions: reg?.enabled && reg.ask_preferred_day ? reg.day_options : [],
    questions: cfg.questions.filter((q) => !q.archived),
    termsShown: Boolean(terms?.enabled),
    termsRequired: Boolean(terms?.enabled && terms.required),
    evidenceRequired: Boolean(evidence?.enabled && evidence.required),
    evidencePerParticipant: evidence?.per_participant ?? true,
  }
}

/** The weekday codes the API stores; the page translates them (`corporate.dyn.day.*`). */
export const WEEKDAY_CODES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
