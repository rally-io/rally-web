import { describe, expect, it } from 'vitest';
import { dropDayLabel, lastCountingDayLabel, quarterParts } from '../utils/quarterDates';

describe('quarterDates', () => {
  it('turns a summer drop instant into the Israel drop day and the last counting day', () => {
    expect(dropDayLabel('2026-09-30T21:00:00Z')).toBe('1.10.2026');
    expect(lastCountingDayLabel('2026-09-30T21:00:00Z')).toBe('30.9.2026');
  });
  it('does the same across a winter year end', () => {
    expect(dropDayLabel('2026-12-31T22:00:00Z')).toBe('1.1.2027');
    expect(lastCountingDayLabel('2026-12-31T22:00:00Z')).toBe('31.12.2026');
  });
  it('splits a quarter key', () => {
    expect(quarterParts('2026-Q3')).toEqual({ year: 2026, n: 3 });
    expect(quarterParts('nope')).toBeNull();
  });
});
