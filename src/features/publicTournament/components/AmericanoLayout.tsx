import React from 'react';
import { useTranslation } from 'react-i18next';
import { StandingsTable } from './StandingsTable';
import { KnockoutMobile } from './KnockoutMobile';
import { AmericanoLeaderboardTV } from './AmericanoLeaderboardTV';
import { AmericanoRoundsBoard } from './AmericanoRoundsBoard';
import { AmericanoFinalStage } from './AmericanoFinalStage';
import { getFinalRoundNumber, restingNames } from '../americano';
import type { ViewMode } from '../liveLayouts';
import type { PublicBracketData, PublicRound } from '../types';

type AmericanoLayoutProps = {
    view: ViewMode;
    bracket: PublicBracketData;
    isBigScreen: boolean;
    dir: 'rtl' | 'ltr';
};

/**
 * A live Americano: Standings, Matches and, once drawn, Final as tabs (owner 2026-10-03). The
 * venue screen gets the tournament module's TV idiom (group-card table, every round on screen like
 * the group grid, the final staged like the knockout final); the phone keeps the scrollable table
 * and the round stepper.
 *
 * The final round sits in `knockout_rounds` with the others; the Matches tab leaves it out because
 * it has its own.
 */
export function AmericanoLayout({ view, bracket, isBigScreen, dir }: AmericanoLayoutProps): React.ReactElement {
    const { t } = useTranslation();
    const standings = bracket.league_standings ?? [];
    const finalRoundNumber = getFinalRoundNumber(bracket);
    const regularRounds = bracket.knockout_rounds.filter(r => r.round_number !== finalRoundNumber);
    const finalRounds = bracket.knockout_rounds.filter(r => r.round_number === finalRoundNumber);

    // Who sits the round on screen out. Unescaped on purpose: the line is rendered as a React text
    // node, which escapes it already — i18next's default HTML escaping would put a literal "&#39;"
    // in "O'Neil" or a geresh name on screen.
    const restingLine = (round: PublicRound): string | null => {
        const names = restingNames(bracket.americano, round.round_number);
        return names
            ? t('public_bracket.resting', { names, defaultValue: 'Resting: {{names}}', interpolation: { escapeValue: false } })
            : null;
    };

    if (view === 'final' && finalRounds.length > 0) {
        return <AmericanoFinalStage rounds={finalRounds} standings={standings} compact={!isBigScreen} roundNote={restingLine} />;
    }
    if (view === 'games') {
        return isBigScreen ? (
            <AmericanoRoundsBoard rounds={regularRounds} roundNote={restingLine} />
        ) : (
            <div className="pb-8">
                <KnockoutMobile rounds={regularRounds} dir={dir} roundNote={restingLine} />
            </div>
        );
    }
    return isBigScreen ? (
        <AmericanoLeaderboardTV
            standings={standings}
            finalBands={bracket.americano?.final_round_enabled === true && finalRoundNumber == null}
        />
    ) : (
        <div className="px-4 pb-8">
            <StandingsTable title={t('public_bracket.standings', 'Standings')} standings={standings} mode="points" />
        </div>
    );
}
