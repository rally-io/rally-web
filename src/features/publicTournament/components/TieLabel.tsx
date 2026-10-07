import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * The "Tie" mark for a level, completed Americano game. `MatchCard` (the phone path) drew a bare
 * label; `GameLine` (the venue path) drew its own chip. The spec calls for GameLine to match
 * MatchCard, so this is MatchCard's look, verbatim — both already set the same `text-[10px]`, so
 * there is no size to scale between them.
 */
export function TieLabel(): React.ReactElement {
    const { t } = useTranslation();
    return (
        <span data-testid="tie-label" className="shrink-0 text-[10px] font-black uppercase tracking-widest text-(--pb-text-muted)">
            {t('public_bracket.tie', 'Tie')}
        </span>
    );
}
