import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { slotPlaceholderLabel } from '../utils';
import { PublicMatchSchema } from '../types';

const t = ((key: string, opts?: Record<string, unknown>) =>
    `${key}|${opts?.group ?? ''}|${opts?.position ?? ''}`) as unknown as TFunction;

describe('slotPlaceholderLabel', () => {
    it('labels group positions and lucky losers', () => {
        expect(slotPlaceholderLabel({ kind: 'group_position', group: 'C', position: 2 }, t)).toBe('public_bracket.slot.runner_up|C|');
        expect(slotPlaceholderLabel({ kind: 'group_position', group: 'A', position: 1 }, t)).toBe('public_bracket.slot.winner|A|');
        expect(slotPlaceholderLabel({ kind: 'lucky_loser' }, t)).toBe('public_bracket.slot.lucky_loser||');
        expect(slotPlaceholderLabel(null, t)).toBeNull();
    });
});

describe('PublicMatchSchema', () => {
    it('keeps a valid placeholder and drops a malformed one', () => {
        const parsed = PublicMatchSchema.parse({
            id: 'm1', sets: [], status: 'not_scheduled',
            team_a_placeholder: { kind: 'group_position', group: 'C', position: 2 },
            team_b_placeholder: { kind: 'nonsense' },
        });
        expect(parsed.team_a_placeholder).toEqual({ kind: 'group_position', group: 'C', position: 2 });
        expect(parsed.team_b_placeholder).toBeNull();
    });
});
