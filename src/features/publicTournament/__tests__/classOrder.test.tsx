import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { AmericanoFinalStage } from '../components/AmericanoFinalStage';
import { toLiveBoard } from '../americano';
import { FINAL_BOARD, americanoBracket } from './fixtures/americanoBoard';

/**
 * tailwind-merge drops a `leading-*` that comes BEFORE a font-size class in the same `cn()`:
 * Tailwind's font sizes carry their own line-height, and twMerge mirrors the cascade. This module
 * has shipped that mistake three times. The audit reads every `cn(...)` call in the module's
 * sources and fails on a `leading-*` followed anywhere later in the same call by a size —
 * `text-[52px]` or a named size like `text-xl`. A colour such as `text-(--pb-text)` is not a size
 * to twMerge 2.x, so it does not count.
 *
 * Sources come in through `import.meta.glob`, never `fs`: tsconfig's `"types": ["vitest/globals"]`
 * makes a `node:fs` import break `tsc -b` (see src/i18n/__tests__/literalKeys.test.ts).
 */
const SOURCES = import.meta.glob(
    ['/src/features/publicTournament/**/*.{ts,tsx}', '!/src/features/publicTournament/**/__tests__/**'],
    { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

const SIZE = /^text-(\[\d+(\.\d+)?(px|rem|em)\]|xs|sm|base|lg|xl|[2-9]xl)$/;

/**
 * The text of every `cn(...)` call in a source, comments left out, matched paren for paren —
 * parens inside strings (`text-(--pb-text)`) and quotes inside comments ("the card's") don't count.
 */
function cnCalls(source: string): string[] {
    const calls: string[] = [];
    const start = /(^|[^\w.])cn\(/g;
    for (let m = start.exec(source); m; m = start.exec(source)) {
        let i = m.index + m[0].length;
        let depth = 1;
        let quote: string | null = null;
        let text = '';
        while (i < source.length) {
            const c = source[i];
            if (quote) {
                if (c === '\\') { text += c + source[i + 1]; i += 2; continue; }
                if (c === quote) quote = null;
            } else if (c === '/' && source[i + 1] === '/') {
                i = source.indexOf('\n', i);
                if (i === -1) break;
                continue;
            } else if (c === '/' && source[i + 1] === '*') {
                i = source.indexOf('*/', i) + 2;
                continue;
            } else if (c === "'" || c === '"' || c === '`') quote = c;
            else if (c === '(') depth += 1;
            else if (c === ')' && --depth === 0) break;
            text += c;
            i += 1;
        }
        calls.push(text);
    }
    return calls;
}

/** The class tokens of a call's string literals, in order. */
function classTokens(call: string): string[] {
    const tokens: string[] = [];
    for (const m of call.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)) {
        tokens.push(...(m[1] ?? m[2] ?? m[3] ?? '').split(/\s+/).filter(Boolean));
    }
    return tokens;
}

/** Each call in which a `leading-*` comes before a size. */
function leadingBeforeSize(source: string): string[] {
    return cnCalls(source).filter(call => {
        const tokens = classTokens(call);
        const first = tokens.findIndex(t => t.startsWith('leading-'));
        return first !== -1 && tokens.slice(first + 1).some(t => SIZE.test(t));
    });
}

describe('class order in cn() (W-h)', () => {
    it('can fail: it flags the shape the Final title had, and nothing else', () => {
        expect(leadingBeforeSize("cn('pb-display leading-none text-(--pb-highlight)', compact ? 'text-[34px]' : 'text-[52px]')")).toHaveLength(1);
        expect(leadingBeforeSize("cn('w-6 text-2xl', dense && 'text-xl', 'leading-none')")).toHaveLength(0);
        expect(leadingBeforeSize("cn('leading-none text-(--pb-text)', 'font-bold')")).toHaveLength(0);
        expect(leadingBeforeSize("cn('min-w-0 leading-tight', isWinner ? 'font-extrabold' : 'font-bold')")).toHaveLength(0);
    });

    it('sees the module: a scan that finds no cn() calls is blind, not clean', () => {
        const calls = Object.values(SOURCES).flatMap(cnCalls);
        expect(calls.length).toBeGreaterThan(50);
    });

    it('no cn() call in the module puts a leading-* before a font size', () => {
        const found = Object.entries(SOURCES).flatMap(([file, source]) => leadingBeforeSize(source).map(call => `${file}: cn(${call.slice(0, 80)}…)`));
        expect(found).toEqual([]);
    });

    it('the Final title keeps leading-none', () => {
        const board = toLiveBoard(americanoBracket(FINAL_BOARD));
        render(<AmericanoFinalStage rounds={board.knockout_rounds.filter(r => r.round_number === 4)} standings={board.league_standings ?? []} compact={false} />);
        const title = screen.getByRole('heading', { name: 'The Final' });
        expect(title.className).toContain('leading-none');
        expect(title.className).toContain('text-[52px]');
    });
});
