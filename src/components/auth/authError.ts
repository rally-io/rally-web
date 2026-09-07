export function authErrorKey(error: unknown): string {
  const e = error as { code?: string; message?: string; status?: number }
  const text = (typeof error === 'string' ? error : `${e?.code ?? ''} ${e?.message ?? ''}`).toLowerCase()
  if (e?.status === 429 || /rate.limit|too.many|over_.*rate/.test(text)) return 'auth.errors.rate_limit'
  if (/email.not.confirmed|email_not_confirmed/.test(text)) return 'auth.errors.unconfirmed'
  if (/provider|identity|oauth/.test(text)) return 'auth.errors.provider'
  if (/network|fetch|connection/.test(text)) return 'auth.errors.network'
  if (/invalid.*code|expired.*code|otp/.test(text)) return 'auth.errors.invalid_code'
  if (/invalid.*login|invalid.*credentials/.test(text)) return 'auth.errors.invalid_credentials'
  if (/already.*registered|user_already_exists/.test(text)) return 'auth.errors.already_registered'
  return 'auth.errors.generic'
}
