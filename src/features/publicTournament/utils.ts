import type { TFunction } from 'i18next';
import type { PublicBracketData, PublicMatch, PublicPlayer, PublicRound, PublicTeam } from './types';

export function playerFullName(p: Pick<PublicPlayer, 'first_name' | 'last_name'> | null | undefined): string {
    return [p?.first_name, p?.last_name].filter(Boolean).join(' ');
}

export function teamLabel(team: PublicTeam | null | undefined): string {
    if (!team) return '';
    if (team.team_name) return team.team_name;
    const p1 = playerFullName(team.player_1);
    const p2 = team.player_2 ? playerFullName(team.player_2) : '';
    return p2 ? `${p1} / ${p2}` : p1;
}

/** The backend emits English labels ("Match #31"); translate at display time. */
export function localizeMatchLabel(label: string | number | null | undefined, t: TFunction): string {
    if (label == null) return '';
    const matched = /^match\s*#?\s*(\d+)$/i.exec(String(label).trim());
    if (matched) return t('public_bracket.match_label', { num: matched[1], defaultValue: `Match #${matched[1]}` });
    return String(label);
}

/** Backend placeholder team names ("Winner of Match #3" / "Loser of Match #3"), translated at display time. */
export function localizeTeamPlaceholder(name: string, t: TFunction): string {
    const winner = /^winner of match\s*#?\s*(\d+)$/i.exec(name.trim());
    if (winner) return t('public_bracket.winner_of_match', { num: winner[1], defaultValue: `Winner of Match #${winner[1]}` });
    const loser = /^loser of match\s*#?\s*(\d+)$/i.exec(name.trim());
    if (loser) return t('public_bracket.loser_of_match', { num: loser[1], defaultValue: `Loser of Match #${loser[1]}` });
    return name;
}

export function containsHebrew(text: string): boolean {
    return /[֐-׿]/.test(text);
}

export function detectDir(bracket: PublicBracketData): 'rtl' | 'ltr' {
    if (containsHebrew(bracket.tournament_name)) return 'rtl';
    const sampleMatch =
        bracket.knockout_rounds[0]?.matches[0] ??
        bracket.groups?.[0]?.matches[0] ??
        null;
    if (sampleMatch && containsHebrew(teamLabel(sampleMatch.team_a) + teamLabel(sampleMatch.team_b))) return 'rtl';
    const sampleStanding = bracket.league_standings?.[0] ?? bracket.groups?.[0]?.standings[0];
    if (sampleStanding) {
        const label =
            sampleStanding.player_name ??
            teamLabel({ team_name: sampleStanding.team_name, player_1: sampleStanding.player_1, player_2: sampleStanding.player_2 });
        if (containsHebrew(label)) return 'rtl';
    }
    return 'ltr';
}

export function getRoundName(name: string, t: TFunction): string {
    if (!name) return '';
    const lower = name.toLowerCase();
    // Plate branch first: "Plate Semifinal"/"Plate Quarterfinal" contain the
    // substring "final", so they must be tested before the main-bracket
    // "final" check below, or they'd render as plain "Final". Anything that
    // isn't final/semi/quarter (e.g. "Plate Round 1" at 9+ groups) falls
    // through to the raw backend name rather than being mislabelled.
    if (lower.includes('plate')) {
        if (lower.includes('semi')) return t('public_bracket.rounds.plate_semi_final', { defaultValue: name });
        if (lower.includes('quarter')) return t('public_bracket.rounds.plate_quarter_final', { defaultValue: name });
        if (lower.includes('final')) return t('public_bracket.rounds.plate_final', { defaultValue: name });
        return name;
    }
    if (lower.includes('final') && !lower.includes('semi') && !lower.includes('quarter')) return t('public_bracket.rounds.final', { defaultValue: name });
    if (lower.includes('semi')) return t('public_bracket.rounds.semi_final', { defaultValue: name });
    if (lower.includes('quarter')) return t('public_bracket.rounds.quarter_final', { defaultValue: name });
    if (lower.includes('16')) return t('public_bracket.rounds.round_of_16', { defaultValue: name });
    if (lower.includes('32')) return t('public_bracket.rounds.round_of_32', { defaultValue: name });
    if (lower.includes('3rd') || lower.includes('third')) return t('public_bracket.rounds.3rd_place', { defaultValue: name });
    return name;
}

/** Backend group names are English ("Group A"); translate at display time. */
export function localizeGroupName(name: string, t: TFunction): string {
    const matched = /^group\s+(.+)$/i.exec(name.trim());
    if (matched) return t('public_bracket.group_title', { letter: matched[1], defaultValue: `Group ${matched[1]}` });
    return name;
}

/** Short trailing token ("Group A" → "A") for the big display glyph; null when the name has no obvious letter. */
export function groupGlyph(name: string): string | null {
    const matched = /(?:^|\s)(\S{1,2})$/.exec(name.trim());
    return matched ? matched[1].toUpperCase() : null;
}

/**
 * Pack measured row heights into pages that fit `budget`. The live screen is unattended, so
 * anything that doesn't fit has to be paged into view over time — it can never be scrolled to.
 *
 * A row taller than the whole budget is still placed rather than dropped: it clips, but a page
 * that can never be reached would lose it entirely. A non-positive budget means the card has not
 * been laid out yet — treat that as one page so nothing paginates off a phantom measurement.
 */
export function planPages(heights: number[], budget: number, gap: number): number[][] {
    if (heights.length === 0) return [[]];
    if (budget <= 0) return [heights.map((_, i) => i)];
    const pages: number[][] = [];
    let page: number[] = [];
    let used = 0;
    heights.forEach((height, i) => {
        const cost = (page.length > 0 ? gap : 0) + height;
        if (page.length > 0 && used + cost > budget) {
            pages.push(page);
            page = [i];
            used = height;
            return;
        }
        page.push(i);
        used += cost;
    });
    pages.push(page);
    return pages;
}

/**
 * Same pages as `planPages`, but filled evenly instead of front-loaded. Greedy packing crams the
 * early pages and strands a couple of games on the last one, which reads as the dead space the
 * board is meant to avoid. Squeezing the budget down to the tightest value that still needs the
 * same number of pages spreads the games across them without ever adding a page.
 */
export function planBalancedPages(heights: number[], budget: number, gap: number): number[][] {
    const greedy = planPages(heights, budget, gap);
    if (greedy.length <= 1) return greedy;
    let low = 0;
    let high = budget;
    let best = greedy;
    for (let i = 0; i < 20; i++) {
        const mid = (low + high) / 2;
        // A non-positive budget makes planPages return a single un-paged page — never accept it
        // as a "fit", or the search would collapse every game onto one overflowing page.
        const attempt = mid > 0 ? planPages(heights, mid, gap) : null;
        if (attempt && attempt.length <= greedy.length) {
            best = attempt;
            high = mid;
        } else {
            low = mid;
        }
    }
    return best;
}

/** The game a viewer most likely cares about: the live one, else the next unplayed. */
export function activeMatchIndex(matches: PublicMatch[]): number {
    const live = matches.findIndex(m => isLiveStatus(m.status));
    if (live !== -1) return live;
    const next = matches.findIndex(m => !isFinishedStatus(m.status));
    return next === -1 ? 0 : next;
}

export function isLiveStatus(status: string): boolean {
    return status === 'in_progress' || status === 'live';
}

export function isFinishedStatus(status: string): boolean {
    return status === 'completed' || status === 'walkover';
}

export function collectMatches(bracket: PublicBracketData): PublicMatch[] {
    return [
        ...bracket.knockout_rounds.flatMap(r => r.matches),
        ...(bracket.groups ?? []).flatMap(g => g.matches),
        ...(bracket.third_place_match ? [bracket.third_place_match] : []),
    ];
}

export function liveMatches(bracket: PublicBracketData): PublicMatch[] {
    return collectMatches(bracket).filter(m => isLiveStatus(m.status));
}

export function upcomingMatches(bracket: PublicBracketData, limit: number): PublicMatch[] {
    return collectMatches(bracket)
        .filter(m => !isLiveStatus(m.status) && !isFinishedStatus(m.status) && (m.team_a?.player_1 || m.team_b?.player_1))
        .slice(0, limit);
}

export function activeRoundIndex(rounds: PublicRound[]): number {
    const idx = rounds.findIndex(r => r.matches.some(m => !isFinishedStatus(m.status)));
    return idx === -1 ? Math.max(rounds.length - 1, 0) : idx;
}

export function scoreSummary(match: PublicMatch): string {
    if (match.status === 'walkover') return 'W/O';
    return match.sets.map(s => `${s.team_a_score}-${s.team_b_score}`).join(' ');
}
