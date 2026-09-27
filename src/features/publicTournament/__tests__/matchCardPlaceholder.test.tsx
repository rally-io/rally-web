import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MatchCard } from '../components/MatchCard';
import type { PublicMatch } from '../types';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (_k: string, o?: string | { defaultValue?: string }) =>
            typeof o === 'string' ? o : o?.defaultValue ?? _k,
    }),
}));

const base: PublicMatch = {
    id: 'm1', match_label: null, round_number: 101, team_a: null, team_b: null, sets: [],
    winner_team: null, next_match_id: null, status: 'not_scheduled', court_name: null, scheduled_at: null,
    team_a_placeholder: null, team_b_placeholder: null,
};

describe('MatchCard placeholder', () => {
    it('names the empty sides from the placeholder', () => {
        render(<MatchCard match={{
            ...base,
            team_a_placeholder: { kind: 'group_position', group: 'C', position: 2 },
            team_b_placeholder: { kind: 'lucky_loser' },
        }} />);
        expect(screen.getByText('Runner-up Group C')).toBeTruthy();
        expect(screen.getByText('Lucky loser')).toBeTruthy();
    });

    it('falls back to TBD without a placeholder', () => {
        render(<MatchCard match={base} />);
        expect(screen.getAllByText('TBD')).toHaveLength(2);
    });
});
