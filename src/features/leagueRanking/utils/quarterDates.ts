/**
 * Israel calendar dates for the ranking window, without time-zone APIs.
 *
 * `drops_at` is midnight Asia/Jerusalem sent in UTC — 21:00Z the previous evening in
 * summer, 22:00Z in winter. Adding twelve hours lands inside the Israel day whatever the
 * offset, so the UTC date of that shifted instant IS the Israel date. Same arithmetic as
 * the mobile app, so both clients print the same day.
 */
const DAY_MS = 86_400_000;
const HALF_DAY_MS = 43_200_000;

function israelDate(iso: string): Date {
  const shifted = new Date(Date.parse(iso) + HALF_DAY_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
}

const label = (d: Date): string => `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}`;

/** The Israel date on which the quarter leaves the window. */
export const dropDayLabel = (dropsAt: string): string => label(israelDate(dropsAt));

/** The last Israel date on which the quarter still counts. */
export const lastCountingDayLabel = (dropsAt: string): string =>
  label(new Date(israelDate(dropsAt).getTime() - DAY_MS));

/**
 * The Israel calendar day of an ARBITRARY instant, as `d.M.yyyy`.
 *
 * Deliberately NOT the twelve-hour trick above: that one is only sound for the
 * midnight-Israel instants `drops_at` carries. A tournament is awarded at any hour,
 * and a 20:00Z award (23:00 Israel, same day) would come back a day late under it.
 * Browsers ship ICU, so ask the platform for the real zone.
 *
 * The try/catch is not defensive noise: an environment without the Asia/Jerusalem
 * zone throws a RangeError, and a thrown formatter would take the whole player page
 * down over a date caption. Falling back to the UTC day is off by at most one day.
 *
 * An unparseable timestamp answers with the EMPTY STRING, and the caller renders no
 * date at all — same as a row that carries none. `Intl` would print "Invalid Date"
 * and the UTC fallback "NaN.NaN.NaN", both of which read as a broken page rather
 * than as the one missing fact they actually are.
 */
export function resultDayLabel(iso: string): string {
  const at = new Date(Date.parse(iso));
  if (Number.isNaN(at.getTime())) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jerusalem',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    }).formatToParts(at);
    const part = (type: string): string => parts.find(p => p.type === type)?.value ?? '';
    const [day, month, year] = [part('day'), part('month'), part('year')];
    if (day && month && year) return `${Number(day)}.${Number(month)}.${Number(year)}`;
  } catch {
    // Falls through to the UTC reading below.
  }
  return `${at.getUTCDate()}.${at.getUTCMonth() + 1}.${at.getUTCFullYear()}`;
}

export function quarterParts(key: string): { year: number; n: number } | null {
  const m = /^(\d{4})-Q([1-4])$/.exec(key);
  return m ? { year: Number(m[1]), n: Number(m[2]) } : null;
}
