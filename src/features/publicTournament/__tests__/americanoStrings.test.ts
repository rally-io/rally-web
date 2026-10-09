import { describe, expect, it } from 'vitest';
import en from '@/i18n/locales/en.json';
import he from '@/i18n/locales/he.json';

/**
 * The live page's Americano strings. `src/i18n/__tests__/literalKeys.test.ts` already fails when a
 * key used in code is missing from either file; this adds what it cannot see — that the Hebrew
 * entry is Hebrew (Hebrew is the default language, and an English string pasted into he.json
 * passes the presence check), and that the interpolation slot survived translation.
 */
const KEYS = ['tie', 'col_ties', 'col_points', 'resting', 'not_in_final', 'final_friendly'].map(k => `public_bracket.${k}`);

const read = (bundle: unknown, path: string): string =>
    String(path.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], bundle) ?? '');

describe('americano live-page strings', () => {
    it.each(KEYS)('%s exists in English and in real Hebrew', key => {
        expect(read(en, key).trim()).not.toBe('');
        expect(read(he, key)).toMatch(/[֐-׿]/);
    });

    it('keeps the {{names}} slot in both languages', () => {
        expect(read(en, 'public_bracket.resting')).toContain('{{names}}');
        expect(read(he, 'public_bracket.resting')).toContain('{{names}}');
    });
});

describe('live-page strings, one per meaning', () => {
    /** Every leaf key under a node, dotted. */
    const leaves = (node: unknown, prefix = ''): string[] =>
        Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
            value !== null && typeof value === 'object' ? leaves(value, `${prefix}${key}.`) : [`${prefix}${key}`]);

    it('has the same keys in both languages', () => {
        expect(leaves(he.public_bracket).sort()).toEqual(leaves(en.public_bracket).sort());
    });

    it('says "Round N" with one key, and in Hebrew with סיבוב', () => {
        expect(read(he, 'public_bracket.round_label')).toBe('');
        expect(read(en, 'public_bracket.round_label')).toBe('');
        expect(read(he, 'public_bracket.rounds.round_1')).toBe('');
        expect(read(he, 'public_bracket.rounds.round_n')).toBe('סיבוב {{num}}');
        expect(JSON.stringify(he.public_bracket)).not.toContain('סבב');
    });
});
