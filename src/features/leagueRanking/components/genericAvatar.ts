/**
 * The generic stand-in portraits for players with no uploaded photo — matched
 * 3D-cartoon padel players in the same style as the real avatar cut-outs, so a
 * board where half the players never uploaded a photo still reads as a board
 * of players rather than a board of initials.
 *
 * The male portrait doubles as the neutral default: `gender` is optional and
 * 'choose_not_to_answer' is a real value, and both still deserve a person on
 * the card.
 */
export function genericAvatarUrl(gender: string | null | undefined): string {
  return gender === 'female' ? '/avatar-generic-female.png' : '/avatar-generic-male.png';
}
