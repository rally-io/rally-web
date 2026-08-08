import { useCallback, useState } from 'react';
import { BRACKET_THEMES, type BracketTheme } from '../types';

const STORAGE_KEY = 'pb-theme';

function readStoredTheme(): BracketTheme {
    const stored = localStorage.getItem(STORAGE_KEY);
    // cast is safe: membership is checked against the canonical list first
    return stored && (BRACKET_THEMES as readonly string[]).includes(stored) ? (stored as BracketTheme) : 'light';
}

type UseThemeResult = { theme: BracketTheme; cycleTheme: () => void };

export function useTheme(): UseThemeResult {
    const [theme, setTheme] = useState<BracketTheme>(readStoredTheme);
    const cycleTheme = useCallback(() => {
        setTheme(prev => {
            const next = BRACKET_THEMES[(BRACKET_THEMES.indexOf(prev) + 1) % BRACKET_THEMES.length];
            localStorage.setItem(STORAGE_KEY, next);
            return next;
        });
    }, []);
    return { theme, cycleTheme };
}
