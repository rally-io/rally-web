import React from 'react';
import { useTranslation } from 'react-i18next';
import { Moon, Sun, Palette } from 'lucide-react';
import type { BracketTheme } from '../types';

const THEME_ICONS: Record<BracketTheme, React.ReactElement> = {
    dark: <Moon size={14} />,
    light: <Sun size={14} />,
    gradient: <Palette size={14} />,
};

type ThemeSwitcherProps = { theme: BracketTheme; onCycle: () => void };

export function ThemeSwitcher({ theme, onCycle }: ThemeSwitcherProps): React.ReactElement {
    const { t } = useTranslation();
    return (
        <button
            onClick={onCycle}
            aria-label={t('public_bracket.theme_switch', 'Switch theme')}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-(--pb-border) bg-(--pb-card) text-(--pb-text-muted) transition-colors hover:text-(--pb-text)"
        >
            {THEME_ICONS[theme]}
        </button>
    );
}
