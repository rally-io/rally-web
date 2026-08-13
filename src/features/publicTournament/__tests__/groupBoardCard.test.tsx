import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import { GroupBoardCard } from '../components/GroupBoardCard';
import type { PublicGroup, PublicMatch, PublicPlayer, PublicStanding } from '../types';

const player = (id: string, first: string, last: string): PublicPlayer => ({
    id, first_name: first, last_name: last, skill_level: null, is_guest: null,
});

const match = (over: Partial<PublicMatch>): PublicMatch => ({
    id: 'm1',
    match_label: null,
    round_number: 1,
    team_a: null,
    team_b: null,
    sets: [],
    winner_team: null,
    next_match_id: null,
    status: 'scheduled',
    court_name: null,
    scheduled_at: null,
    ...over,
});

const standing = (over: Partial<PublicStanding> & { position: number }): PublicStanding => ({
    player_name: null,
    team_name: 'Team',
    player_1: null,
    player_2: null,
    matches_played: 0,
    wins: 0,
    losses: 0,
    sets_won: 0,
    sets_lost: 0,
    games_won: 0,
    games_lost: 0,
    points: 0,
    is_disqualified: false,
    ...over,
});

const group = (over: Partial<PublicGroup>): PublicGroup => ({
    group_name: 'Group A',
    matches: [],
    standings: [],
    ...over,
});

/** The row wrapper carries the pair's name and every stat cell for that row. */
function rowFor(container: HTMLElement, name: string): HTMLElement {
    const label = within(container).getByText(name);
    const row = label.closest('.rounded-xl');
    if (!row) throw new Error(`no row found for "${name}"`);
    // closest() is typed as Element; every node in this tree is an HTMLElement in jsdom.
    return row as HTMLElement;
}

/**
 * The inline backgroundColor PairChip sets. FitText also carries an inline style
 * (font-size), so the chip is the styled element WITH a backgroundColor — `[style]`
 * alone no longer singles it out.
 */
function chipColorFor(container: HTMLElement, name: string): string {
    const styled = Array.from(rowFor(container, name).querySelectorAll('[style]')) as HTMLElement[];
    const chip = styled.find(el => el.style.backgroundColor);
    if (!chip) throw new Error(`no chip found for "${name}"`);
    return chip.style.backgroundColor;
}

describe('GroupBoardCard', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('shows no place numerals or stat columns before the first result, but still shows names', () => {
        const g = group({
            matches: [match({ id: 'm1', sets: [], status: 'scheduled' })],
            standings: [
                standing({ position: 1, team_name: 'Solo Alpha' }),
                standing({ position: 2, team_name: 'Solo Beta' }),
            ],
        });
        const { container } = render(<GroupBoardCard group={g} qualifyCount={1} />);

        expect(screen.getByText('Solo Alpha')).toBeInTheDocument();
        expect(screen.getByText('Solo Beta')).toBeInTheDocument();

        // The columns are up from the draw onward, reading 0 — not withheld until a result.
        // Held back, the board was emptier before the tournament than during it, and the card
        // changed shape under the hall the moment the first score landed.
        const rankSpans = container.querySelectorAll('.text-2xl');
        expect(rankSpans.length).toBeGreaterThan(0);
        expect(Array.from(rankSpans).map(s => s.textContent)).toEqual(['1', '2']);
        expect(container.querySelectorAll('.tabular-nums').length).toBeGreaterThan(0);
        expect(screen.getByText('Games')).toBeInTheDocument();

        // The qualifying tint is the exception: it names two specific pairs as through, and
        // pre-start the only thing putting them on top is the draw order.
        expect(container.querySelector('.bg-\\(--pb-winner-bg\\)')).toBeNull();
    });

    it('tints the qualifying rows as soon as the group has a result', () => {
        // The other direction, so the gate above cannot be satisfied by never tinting at all.
        const g = group({
            matches: [match({ id: 'm1', sets: [{ team_a_score: 6, team_b_score: 2, is_tiebreak: null }] })],
            standings: [
                standing({ position: 1, team_name: 'Winner', wins: 1, losses: 0 }),
                standing({ position: 2, team_name: 'Loser', wins: 0, losses: 1 }),
            ],
        });
        const { container } = render(<GroupBoardCard group={g} qualifyCount={1} />);
        expect(container.querySelectorAll('.bg-\\(--pb-winner-bg\\)')).toHaveLength(1);
    });

    it('shows matches-played, wins, the games distribution and the signed diff once results exist', () => {
        const g = group({
            matches: [match({ id: 'm1', sets: [{ team_a_score: 6, team_b_score: 2, is_tiebreak: null }] })],
            standings: [
                standing({ position: 1, team_name: 'Leaders', wins: 3, losses: 1, games_won: 10, games_lost: 6 }),
                standing({ position: 2, team_name: 'Trailers', wins: 1, losses: 2, games_won: 5, games_lost: 9 }),
            ],
        });
        const { container } = render(<GroupBoardCard group={g} />);

        const leaders = rowFor(container, 'Leaders');
        // Selected by `.tabular-nums` rather than by column width: every numeric cell carries it,
        // in column order (MP, W, games, +/-), so the assertion survives a width tweak instead of
        // silently matching the wrong cell when one column is re-sized.
        const leaderCells = leaders.querySelectorAll('.tabular-nums');
        expect(leaderCells[0].textContent).toBe('4'); // 3 wins + 1 loss
        expect(leaderCells[1].textContent).toBe('3'); // wins
        // Distribution: own games always green, opponents' always red — on every row.
        expect(within(leaders).getByText('10').className).toContain('text-(--pb-won)');
        expect(within(leaders).getByText('6').className).toContain('text-(--pb-lost)');
        expect(within(leaders).getByText('+4').className).toContain('text-(--pb-won)');

        const trailers = rowFor(container, 'Trailers');
        expect(within(trailers).getByText('5').className).toContain('text-(--pb-won)');
        expect(within(trailers).getByText('9').className).toContain('text-(--pb-lost)');
        expect(within(trailers).getByText('-4').className).toContain('text-(--pb-lost)');
    });

    it('renders the distribution as separate elements in a dir="ltr" container, never a joined string', () => {
        const g = group({
            matches: [match({ id: 'm1', sets: [{ team_a_score: 6, team_b_score: 2, is_tiebreak: null }] })],
            standings: [standing({ position: 1, team_name: 'Leaders', wins: 1, losses: 0, games_won: 10, games_lost: 6 })],
        });
        const { container } = render(<GroupBoardCard group={g} />);

        const dist = rowFor(container, 'Leaders').querySelectorAll('.tabular-nums')[2];
        expect(dist).not.toBeNull();
        expect(dist!.getAttribute('dir')).toBe('ltr');
        // The dash is a bidi joiner: a pre-joined string would mirror in RTL.
        expect(screen.queryByText('10–6')).toBeNull();
        expect(screen.queryByText('10-6')).toBeNull();
    });

    it('colors a zero diff as muted, not green or red', () => {
        const g = group({
            matches: [match({ id: 'm1', sets: [{ team_a_score: 6, team_b_score: 6, is_tiebreak: null }] })],
            standings: [standing({ position: 1, team_name: 'Level', wins: 1, losses: 1, games_won: 8, games_lost: 8 })],
        });
        const { container } = render(<GroupBoardCard group={g} />);

        const diffCell = within(rowFor(container, 'Level')).getByText('0');
        expect(diffCell.className).toContain('text-(--pb-text-muted)');
        expect(diffCell.className).not.toContain('text-(--pb-won)');
        expect(diffCell.className).not.toContain('text-(--pb-lost)');
    });

    it('shows the games column header once results exist', () => {
        const g = group({
            matches: [match({ id: 'm1', sets: [{ team_a_score: 6, team_b_score: 2, is_tiebreak: null }] })],
            standings: [standing({ position: 1, team_name: 'Leaders', wins: 1, losses: 0, games_won: 6, games_lost: 2 })],
        });
        render(<GroupBoardCard group={g} />);
        // Test setup forces English; the he.json value is "משחקונים".
        expect(screen.getByText('Games')).toBeInTheDocument();
    });

    it('places the cutoff line between the last qualifying row and the first that misses out', () => {
        const g = group({
            matches: [match({ id: 'm1', sets: [{ team_a_score: 6, team_b_score: 1, is_tiebreak: null }] })],
            standings: [
                standing({ position: 1, team_name: 'Row0', wins: 3, losses: 0 }),
                standing({ position: 2, team_name: 'Row1', wins: 2, losses: 1 }),
                standing({ position: 3, team_name: 'Row2', wins: 1, losses: 2 }),
                standing({ position: 4, team_name: 'Row3', wins: 0, losses: 3 }),
            ],
        });
        const { container } = render(<GroupBoardCard group={g} qualifyCount={2} />);

        // A layout class is not an identity: rows and the distribution cell carry justify-*
        // utilities too, so selecting the list that way silently retargets the moment one of
        // them changes. The testid names the element this assertion is actually about.
        const list = container.querySelector('[data-testid="standings-list"]');
        if (!list) throw new Error('standings list container not found');
        const children = Array.from(list.children);

        // 4 rows + 1 cutoff line = 5 direct children, and the cutoff sits at index 2: right after
        // Row1 (the second and last qualifier) and before Row2 (the first that misses out).
        expect(children).toHaveLength(5);
        expect(children[0].textContent).toContain('Row0');
        expect(children[1].textContent).toContain('Row1');
        expect(children[2].tagName).toBe('P');
        expect(children[2].textContent).toContain('Top 2');
        expect(children[3].textContent).toContain('Row2');
        expect(children[4].textContent).toContain('Row3');
    });

    it('renders em-dashes for a disqualified row and never highlights it as qualifying', () => {
        const g = group({
            matches: [match({ id: 'm1', sets: [{ team_a_score: 6, team_b_score: 1, is_tiebreak: null }] })],
            standings: [
                standing({ position: 1, team_name: 'Clean Leader', wins: 3, losses: 0 }),
                // Disqualified but numerically still inside qualifyCount=2 — must not be highlighted.
                standing({ position: 2, team_name: 'DQ Team', wins: 2, losses: 1, is_disqualified: true }),
                standing({ position: 3, team_name: 'Missed Cut', wins: 0, losses: 3 }),
            ],
        });
        const { container } = render(<GroupBoardCard group={g} qualifyCount={2} />);

        const leaderRow = rowFor(container, 'Clean Leader');
        expect(leaderRow.className).toContain('bg-(--pb-winner-bg)');

        const dqRow = rowFor(container, 'DQ Team');
        expect(dqRow.className).not.toContain('bg-(--pb-winner-bg)');
        expect(within(dqRow).getByText('Disqualified')).toBeInTheDocument();
        // MP, W, distribution, diff — all four numeric cells dashed.
        const dqStats = dqRow.querySelectorAll('.tabular-nums');
        expect(dqStats).toHaveLength(4);
        dqStats.forEach(cell => expect(cell.textContent).toBe('—'));
    });

    it('shows each player of a pair on their own full line, never joined or truncated', () => {
        const g = group({
            matches: [match({ id: 'm1', sets: [{ team_a_score: 6, team_b_score: 3, is_tiebreak: null }] })],
            standings: [standing({
                position: 1,
                team_name: null,
                player_1: player('p1', 'Alexander', 'Konstantinov'),
                player_2: player('p2', 'Michael', 'Abramovich'),
                wins: 1, losses: 0,
            })],
        });
        render(<GroupBoardCard group={g} />);

        const first = screen.getByText('Alexander Konstantinov');
        const second = screen.getByText('Michael Abramovich');
        // Two separate lines, not one joined label.
        expect(screen.queryByText('Alexander Konstantinov / Michael Abramovich')).toBeNull();
        // Never ellipsized: no truncate class, and the full text doubles as the title.
        expect(first.className).not.toContain('truncate');
        expect(second.className).not.toContain('truncate');
        expect(first.title).toBe('Alexander Konstantinov');
        expect(second.title).toBe('Michael Abramovich');
    });

    it('keeps a pair\'s chip colour stable when the standings array reorders around it', () => {
        const alpha = standing({
            position: 1,
            team_name: null,
            player_1: player('p1', 'Gal', 'Cohen'),
            player_2: player('p2', 'Noa', 'Levi'),
            wins: 2, losses: 0,
        });
        const beta = standing({
            position: 2,
            team_name: null,
            player_1: player('p3', 'Adi', 'Shani'),
            player_2: player('p4', 'Lian', 'Katz'),
            wins: 0, losses: 2,
        });

        // Names are stacked now — the row is found by its first player's line.
        const first = render(<GroupBoardCard group={group({ standings: [alpha, beta] })} />);
        const colorFirst = chipColorFor(first.container, 'Gal Cohen');
        first.unmount();

        // Same pair, now at index 1 instead of index 0 — an index-derived colour would change here.
        const second = render(<GroupBoardCard group={group({ standings: [beta, alpha] })} />);
        const colorSecond = chipColorFor(second.container, 'Gal Cohen');

        expect(colorFirst).toBeTruthy();
        expect(colorFirst).toBe(colorSecond);
    });

    it('drops no pairs from a 6-pair group (dense mode)', () => {
        const names = ['Ana', 'Bar', 'Cor', 'Dov', 'Eli', 'Fay'];
        const g = group({
            matches: [match({ id: 'm1', sets: [{ team_a_score: 6, team_b_score: 3, is_tiebreak: null }] })],
            standings: names.map((n, i) => standing({ position: i + 1, team_name: n, wins: 6 - i, losses: i })),
        });
        render(<GroupBoardCard group={g} qualifyCount={2} />);

        names.forEach(n => expect(screen.getByText(n)).toBeInTheDocument());
    });

    it('renders dense rows with different classes than non-dense rows', () => {
        // Same shape, only the pair count differs: 4 standings (non-dense) vs 6 (dense). The
        // target row carries neither the qualify highlight nor is_disqualified, so its classes
        // reduce to exactly base-vs-base-plus-dense with nothing else mixed in.
        const shaped = (count: number) => group({
            matches: [match({ id: 'm1', sets: [{ team_a_score: 6, team_b_score: 3, is_tiebreak: null }] })],
            standings: Array.from({ length: count }, (_, i) =>
                standing({ position: i + 1, team_name: i === 0 ? 'Focus Pair' : `Filler ${i}`, wins: 2, losses: 1 }),
            ),
        });

        const nonDense = render(<GroupBoardCard group={shaped(4)} />);
        const nonDenseRow = rowFor(nonDense.container, 'Focus Pair');
        const nonDenseName = within(nonDenseRow).getByText('Focus Pair');
        expect(nonDenseRow.className).toBe('flex items-center gap-1.5 rounded-xl px-3 py-1');
        expect(nonDenseName.style.fontSize).toBe('15px');
        // Rank glyph: non-dense keeps text-2xl.
        expect(nonDenseRow.querySelector('.text-2xl')).not.toBeNull();
        expect(nonDenseRow.querySelector('.text-xl')).toBeNull();
        const nonDenseWins = nonDenseRow.querySelectorAll('.tabular-nums')[1];
        expect(nonDenseWins.className).toContain('text-[15px]');
        expect(nonDenseWins.className).not.toContain('text-[13px]');
        nonDense.unmount();

        const dense = render(<GroupBoardCard group={shaped(6)} />);
        const denseRow = rowFor(dense.container, 'Focus Pair');
        const denseName = within(denseRow).getByText('Focus Pair');
        // Dense is what keeps a six-pair group inside a card that a 3-across grid halves the
        // height of: measured in the browser, six rows plus the cutoff line need every pixel
        // these three overrides give back. Loosen any of them and the last row clips away.
        expect(denseRow.className).toBe('flex items-center gap-1.5 rounded-xl px-3 py-px');
        expect(denseName.style.fontSize).toBe('12px');
        // Dense shrinks text-2xl -> text-xl and must keep leading-none (a regression here
        // previously reintroduced Tailwind's default line-height on text-xl, silently making
        // the "denser" row taller instead of shorter).
        expect(denseRow.querySelector('.text-2xl')).toBeNull();
        expect(denseRow.querySelector('.text-xl.leading-none')).not.toBeNull();
        const denseWins = denseRow.querySelectorAll('.tabular-nums')[1];
        expect(denseWins.className).toContain('text-[13px]');
        expect(denseWins.className).not.toContain('text-[15px]');
    });

    it('renders a pair of nameless guests as two lines with distinct keys', () => {
        // PublicPlayerSchema allows both name fields to be null, and playerFullName then
        // returns '' — so a pair of unnamed guests hands React two children with the same
        // key unless the index is part of it. Each line owns FitText state, so a duplicate
        // key is not just a warning: it makes reconciliation of that state unstable.
        const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
        const nameless = (id: string): PublicPlayer => ({
            id, first_name: null, last_name: null, skill_level: null, is_guest: true,
        });
        const g = group({
            standings: [standing({
                position: 1,
                team_name: null,
                player_1: nameless('p1'),
                player_2: nameless('p2'),
            })],
        });

        const { container } = render(<GroupBoardCard group={g} />);

        // Both lines are really there — otherwise "no warning" would be free.
        expect(container.querySelectorAll('span[title=""]')).toHaveLength(2);
        expect(errors).not.toHaveBeenCalled();
    });
});
