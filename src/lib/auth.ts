// Regex from AUTH_SPEC §4 — must match mobile exactly.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

export function isValidNewPassword(password: string): boolean {
  return PASSWORD_REGEX.test(password)
}

// AUTH_SPEC §8: any of these substrings in an error message means we should force sign-out.
const AUTH_ERROR_SUBSTRINGS = [
  'could not validate credentials',
  'unauthorized',
  'not authenticated',
  'invalid token',
  'token expired',
  'refresh token',
  'jwt expired',
]

export function isAuthError(message: string | null | undefined): boolean {
  if (!message) return false
  const lower = message.toLowerCase()
  return AUTH_ERROR_SUBSTRINGS.some((s) => lower.includes(s))
}

// AUTH_SPEC §8: profileService.isProfileComplete logic.
export interface ProfileCompleteCheck {
  first_name?: string | null
  last_name?: string | null
  contact_number?: string | null
}

export function isProfileComplete(profile: ProfileCompleteCheck | null | undefined): boolean {
  if (!profile) return false
  return Boolean(profile.first_name || profile.last_name || profile.contact_number)
}
