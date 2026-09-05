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

export function quarterParts(key: string): { year: number; n: number } | null {
  const m = /^(\d{4})-Q([1-4])$/.exec(key);
  return m ? { year: Number(m[1]), n: Number(m[2]) } : null;
}
