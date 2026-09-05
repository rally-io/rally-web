/**
 * Geometry for the player shield card, VERBATIM from rally-mobile
 * `src/constants/shieldGeometry.ts`. The shield's proportions are part of the
 * product's visual identity: the profile card, the mobile ranking board and this
 * web board all draw the same shape. If mobile changes these values, change them
 * here too — they are duplicated only because the repos don't share code.
 *
 * Design space is 280x434.
 */

export const SVG_W = 280;
export const SVG_H = 434;
export const SHIELD_PATH =
  'M140 0C110 0 100 20 70 20C40 20 30 10 0 25V358C0 392 68 424 140 424C212 424 280 392 280 358V25C250 10 240 20 210 20C180 20 170 0 140 0Z';
