import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import i18n from '@/i18n';

import { KnockoutMobile } from '../components/KnockoutMobile';
import { toLiveBoard } from '../americano';
import { activeRoundIndex, getRoundName } from '../utils';
import { RAW_BOARD, americanoBracket, rawGame } from './fixtures/americanoBoard';

/**
 * The fixture's evening played out, then the final round by ranking (rally-api 2026-10-03): round 3
 * scored and a round named "Final" on court, with the board fields the API now adds — which the
 * page's schema must tolerate.
 */
const finalBoard = {
    ...RAW_BOARD,
    final_round_enabled: true,
    final_round_number: 4,
    final_round_ready: false,
    final_round_editable: true,
    rounds: [
        ...RAW_BOARD.rounds.slice(0, 2),
        {
            round_number: 3, round_name: 'Round 3', matches: [
                rawGame('r3c1', 3, 1, ['Noa', 'Dan', 'Gal', 'Maya'], { status: 'completed', score: [14, 9], winner: 'team_a' }),
                rawGame('r3c2', 3, 2, ['Ido', 'Roi', 'Tom', 'Lior'], { status: 'completed', score: [11, 11] }),
            ],
        },
        {
            round_number: 4, round_name: 'Final', matches: [
                { ...rawGame('f1', 4, 1, ['Noa', 'Roi', 'Ido', 'Tom']), round_name: 'Final' },
                { ...rawGame('f2', 4, 2, ['Maya', 'Gal', 'Lior', 'Dan']), round_name: 'Final' },
            ],
        },
    ],
    resting: { ...RAW_BOARD.resting, '3': [], '4': [] },
};

describe('an Americano with its final round', () => {
    const rounds = toLiveBoard(americanoBracket(finalBoard)).knockout_rounds;

    it('keeps the round named Final and its games through the adapter', () => {
        const last = rounds[rounds.length - 1];
        expect(last.round_name).toBe('Final');
        expect(last.matches.map(m => m.id)).toEqual(['f1', 'f2']);
    });

    it('the final is the round on screen while it is played, and its step reads Final', () => {
        expect(activeRoundIndex(rounds)).toBe(rounds.length - 1);
        render(<KnockoutMobile rounds={rounds} dir="ltr" />);
        expect(screen.getByRole('button', { name: /Final/ })).toBeInTheDocument();
    });

    it('reads גמר in Hebrew', () => {
        expect(getRoundName('Final', i18n.getFixedT('he'))).toBe('גמר');
    });
});
