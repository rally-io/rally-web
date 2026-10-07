import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { ROTATE_MS, useViewMode } from '../hooks/useViewMode';
import { getAmericanoRotationViews } from '../liveLayouts';
import { toLiveBoard } from '../americano';
import type { PublicBracketData } from '../types';
import { FINAL_BOARD, RAW_BOARD, americanoBracket } from './fixtures/americanoBoard';

/** The bracket as the hook receives it: parsed, then through usePublicBracket's `toLiveBoard`. */
const live = (board: unknown = RAW_BOARD): PublicBracketData => toLiveBoard(americanoBracket(board));

afterEach(() => vi.useRealTimers());

describe('getAmericanoRotationViews', () => {
    it('rotates the games and the table, then the final and the table', () => {
        expect(getAmericanoRotationViews(false)).toEqual(['games', 'standings']);
        expect(getAmericanoRotationViews(true)).toEqual(['final', 'standings']);
    });
});

describe('useViewMode for an Americano (owner 2026-10-03)', () => {
    it('parses the final round number, and null from an API without it', () => {
        expect(live(FINAL_BOARD).americano?.final_round_number).toBe(4);
        expect(live().americano?.final_round_number).toBeNull();
    });

    it('a phone opens on the table with tabs, and a picked tab sticks', () => {
        const { result } = renderHook(() => useViewMode(live(), false));
        expect(result.current.showTabs).toBe(true);
        expect(result.current.view).toBe('standings');
        act(() => result.current.selectView('games'));
        expect(result.current.view).toBe('games');
        act(() => result.current.selectView('final'));          // no final drawn yet
        expect(result.current.view).toBe('standings');
    });

    it('a venue TV rotates the games and the table', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useViewMode(live(), true));
        expect(result.current.canAutoRotate).toBe(true);
        expect(result.current.view).toBe('games');
        act(() => { vi.advanceTimersByTime(ROTATE_MS); });
        expect(result.current.view).toBe('standings');
    });

    it('once the final is drawn every screen jumps to it, even after a tab was picked', () => {
        const { result, rerender } = renderHook(({ b }) => useViewMode(b, false), { initialProps: { b: live() } });
        act(() => result.current.selectView('games'));
        expect(result.current.view).toBe('games');
        rerender({ b: live(FINAL_BOARD) });
        expect(result.current.view).toBe('final');
    });

    it('a TV rotates the final and the table once it is drawn', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useViewMode(live(FINAL_BOARD), true));
        expect(result.current.view).toBe('final');
        act(() => { vi.advanceTimersByTime(ROTATE_MS); });
        expect(result.current.view).toBe('standings');
    });

    it('after the jump to the final, a tab the viewer picks survives a later poll', () => {
        const { result, rerender } = renderHook(({ b }) => useViewMode(b, false), { initialProps: { b: live(FINAL_BOARD) } });
        expect(result.current.view).toBe('final');
        act(() => result.current.selectView('standings'));
        expect(result.current.view).toBe('standings');
        // A fresh object, same final_round_number — a later poll's response, not a new reference the
        // effect should mistake for the final being drawn again.
        rerender({ b: live(FINAL_BOARD) });
        expect(result.current.view).toBe('standings');
    });

    it('a TV picks Video, then toggling rotation back on leaves the picked tab, not stuck on Video', () => {
        vi.useFakeTimers();
        const withVideo: PublicBracketData = {
            ...live(),
            videos: [{ id: 'v1', label: null, provider: 'YouTube', embed_url: 'https://embed.example/v1', url: null, display_order: null }],
        };
        const { result } = renderHook(() => useViewMode(withVideo, true));
        expect(result.current.view).toBe('games');          // the rotation's own first view
        act(() => result.current.selectView('video'));
        expect(result.current.view).toBe('video');
        act(() => result.current.toggleAutoRotate());
        expect(result.current.isAutoRotate).toBe(true);
        // Rotation is back on: the view must follow it, not stay pinned to the picked Video tab —
        // the "lights up and rotates nothing" case `canAutoRotate` exists to prevent.
        expect(result.current.view).toBe('games');
    });

    it('a final whose every game is cancelled does not count as drawn — rotation never reaches it', () => {
        // `final_round_number` stays set (toLiveBoard passes the americano block through unchanged), but
        // `playableRounds` drops the round itself once every one of its matches is cancelled — a
        // fully-disqualified final is the real case. The hook must agree with the page about
        // whether the final is actually there to show, not just whether the field is set.
        vi.useFakeTimers();
        const cancelledFinal = {
            ...FINAL_BOARD,
            rounds: FINAL_BOARD.rounds.map(r => (r.round_number === 4
                ? { ...r, matches: r.matches.map(m => ({ ...m, status: 'cancelled' })) }
                : r)),
        };
        const board = live(cancelledFinal);
        const phone = renderHook(() => useViewMode(board, false));
        expect(phone.result.current.view).toBe('standings');
        const tv = renderHook(() => useViewMode(board, true));
        expect(tv.result.current.view).toBe('games');
        act(() => { vi.advanceTimersByTime(ROTATE_MS); });
        expect(tv.result.current.view).toBe('standings');
        act(() => { vi.advanceTimersByTime(ROTATE_MS); });
        expect(tv.result.current.view).toBe('games');            // games/standings only, never 'final'
    });

    it('before the schedule there are no tabs, and a league is unchanged', () => {
        const before = renderHook(() => useViewMode(live({ ...RAW_BOARD, rounds: [], resting: {} }), false));
        expect(before.result.current.showTabs).toBe(false);
        const league = renderHook(() => useViewMode({ ...live(), structure: 'round_robin_league', americano: null }, true));
        expect(league.result.current.showTabs).toBe(false);
        expect(league.result.current.canAutoRotate).toBe(false);
        expect(league.result.current.view).toBe('standings');
    });
});
