/** Israeli local number: digits only, drop the trunk 0, cap at 9. */
export function normalizeIsraeliLocal(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, 9)
}

/** 8–9 local digits (after `normalizeIsraeliLocal`). */
export function isValidIsraeliLocal(local: string): boolean {
  return local.length >= 8 && local.length <= 9
}
