/**
 * Which portrait a player wears, for every surface that draws one.
 *
 * Shared rather than duplicated: the ranking's shield card and the ball must never draw
 * different faces for the same player, and two copies of a three-branch rule is exactly
 * how that drift starts. The order is the product rule — the background-removed cut-out
 * first, the raw upload next, and a gender-matched stand-in for the roughly half of
 * players who never uploaded anything.
 *
 * The male portrait doubles as the neutral default: `gender` is optional and
 * 'choose_not_to_answer' is a real value, and both still deserve a person rather than
 * a pair of initials.
 */
export const GENERIC_MALE_URL = '/avatar-generic-male.png';
export const GENERIC_FEMALE_URL = '/avatar-generic-female.png';

export function genericAvatarUrl(gender: string | null | undefined): string {
  return gender === 'female' ? GENERIC_FEMALE_URL : GENERIC_MALE_URL;
}

/** The real photo when there is one: the cut-out is preferred because it carries no
    background, which is what keeps a portrait readable once it is small. */
export function playerPhotoUrl(
  cleanUrl: string | null | undefined,
  rawUrl: string | null | undefined,
): string | null {
  return cleanUrl || rawUrl || null;
}
