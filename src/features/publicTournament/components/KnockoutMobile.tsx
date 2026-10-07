import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MatchCard } from './MatchCard';
import { ChampionBar } from './ChampionBar';
import { RoundStepper } from './RoundStepper';
import { activeRoundIndex } from '../utils';
import type { PublicMatch, PublicRound } from '../types';

const SWIPE_THRESHOLD_PX = 60;

type KnockoutMobileProps = {
    rounds: PublicRound[];
    thirdPlaceMatch?: PublicMatch | null;
    dir: 'rtl' | 'ltr';
    /** Show the champion bar on the last round. Leave off for league schedules, where the last round is not a final. */
    showChampion?: boolean;
    /**
     * One line above the games of the round on screen — an Americano's "Resting: …". Return null
     * or '' for no line. Knockouts and leagues pass nothing.
     */
    roundNote?: (round: PublicRound) => string | null;
};

export function KnockoutMobile({ rounds, thirdPlaceMatch, dir, showChampion, roundNote }: KnockoutMobileProps): React.ReactElement {
    const { t } = useTranslation();
    const active = activeRoundIndex(rounds);
    const [index, setIndex] = useState(active);
    // Follow the evening: when the round being played changes (a poll brings the next one), move
    // to it — a TV left open from round 1 would otherwise show round 1 all night. Only on a CHANGE,
    // so a viewer who stepped back to an earlier round stays there until the next round starts.
    const lastActive = useRef(active);
    useEffect(() => {
        if (lastActive.current !== active) {
            lastActive.current = active;
            setIndex(active);
        }
    }, [active]);
    const touchStartX = useRef<number | null>(null);

    const clamped = Math.min(index, Math.max(rounds.length - 1, 0));
    const round = rounds[clamped];
    const isLastRound = clamped === rounds.length - 1;
    const note = round && roundNote ? roundNote(round) : null;

    function onTouchStart(e: React.TouchEvent): void {
        touchStartX.current = e.touches[0].clientX;
    }
    function onTouchEnd(e: React.TouchEvent): void {
        if (touchStartX.current === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
        // physical left-swipe advances in LTR; mirrored in RTL
        const forward = dir === 'rtl' ? delta > 0 : delta < 0;
        setIndex(i => Math.max(0, Math.min(rounds.length - 1, forward ? i + 1 : i - 1)));
    }

    return (
        <div className="px-4 pb-8">
            <RoundStepper rounds={rounds} activeIndex={clamped} onSelect={setIndex} />
            <div className="mt-3 flex flex-col gap-2.5" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                {note ? <p data-testid="round-note" className="text-xs font-bold text-(--pb-text-muted)">{note}</p> : null}
                {round?.matches.map(m => <MatchCard key={m.id} match={m} />)}
                {isLastRound && showChampion && round?.matches.length === 1 && (
                    <ChampionBar match={round.matches[0]} className="mt-1" />
                )}
                {isLastRound && thirdPlaceMatch && (
                    <>
                        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-(--pb-text-faint)">
                            {t('public_bracket.third_place', '3rd Place')}
                        </p>
                        <MatchCard match={thirdPlaceMatch} />
                    </>
                )}
            </div>
        </div>
    );
}
