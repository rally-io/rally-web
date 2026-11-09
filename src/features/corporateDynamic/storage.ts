/**
 * The registration this browser made, so a reload shows "you're registered" instead of an empty
 * form. Every access is wrapped: private windows, blocked site data and quota errors all throw,
 * and the page must work without storage (the user simply sees the form again).
 */
export interface StoredRegistration {
  registration_id: string
  access_token: string
}

export const storageKey = (slug: string) => `rally:corp:${slug}`

export function readStoredRegistration(slug: string): StoredRegistration | null {
  try {
    const raw = localStorage.getItem(storageKey(slug))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredRegistration> | null
    if (typeof parsed?.registration_id === 'string' && typeof parsed?.access_token === 'string') {
      return { registration_id: parsed.registration_id, access_token: parsed.access_token }
    }
    return null
  } catch {
    return null
  }
}

export function writeStoredRegistration(slug: string, value: StoredRegistration): boolean {
  try {
    localStorage.setItem(storageKey(slug), JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function clearStoredRegistration(slug: string): void {
  try {
    localStorage.removeItem(storageKey(slug))
  } catch {
    /* nothing to clear */
  }
}
