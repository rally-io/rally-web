import type { PartnerMatch } from '@/types/partnerPool'

/* Ported from rally-mobile src/lib/partners/matchActions.ts; logic unchanged. */

/** register = both still free to register; already = registered as this pair; none = one of
    them registered with someone else, or registration closed. */
export type RegisterState = 'register' | 'already' | 'none'

export function registerStateOf(
  match: Pick<PartnerMatch, 'can_register_together' | 'registered_together'>,
): RegisterState {
  if (match.can_register_together) return 'register'
  if (match.registered_together) return 'already'
  return 'none'
}

/** The API sends the bare wa.me link; the site adds its own localized opening line. */
export function buildWhatsAppLink(url: string, text: string): string {
  return `${url}?text=${encodeURIComponent(text)}`
}
