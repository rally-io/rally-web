import { describe, expect, it } from 'vitest';
import { dropDayLabel, lastCountingDayLabel, quarterParts, resultDayLabel } from '../utils/quarterDates';

describe('quarterDates', () => {
  it('turns a summer drop instant into the Israel drop day and the last counting day', () => {
    expect(dropDayLabel('2026-09-30T21:00:00Z')).toBe('1.10.2026');
    expect(lastCountingDayLabel('2026-09-30T21:00:00Z')).toBe('30.9.2026');
  });
  it('does the same across a winter year end', () => {
    expect(dropDayLabel('2026-12-31T22:00:00Z')).toBe('1.1.2027');
    expect(lastCountingDayLabel('2026-12-31T22:00:00Z')).toBe('31.12.2026');
  });
  it('reads an award instant as its Israel calendar day, evening instants included', () => {
    // Both instants fall on the LATER UTC day than the twelve-hour trick used for
    // `drops_at` would give (2.8 and 16.1), which is exactly why they are the cases:
    // 20:00Z in summer is 23:00 the same day in Israel, 22:30Z in winter is already
    // 00:30 the next day.
    expect(resultDayLabel('2026-08-01T20:00:00Z')).toBe('1.8.2026');
    expect(resultDayLabel('2026-01-15T22:30:00Z')).toBe('16.1.2026');
    expect(resultDayLabel('2026-08-01T00:00:00Z')).toBe('1.8.2026');
  });
  it('answers an unreadable timestamp with nothing, never with NaN', () => {
    expect(resultDayLabel('not-a-date')).toBe('');
    expect(resultDayLabel('')).toBe('');
  });
  it('splits a quarter key', () => {
    expect(quarterParts('2026-Q3')).toEqual({ year: 2026, n: 3 });
    expect(quarterParts('nope')).toBeNull();
  });
});
