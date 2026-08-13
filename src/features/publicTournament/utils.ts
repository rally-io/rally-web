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
        // A plate match is played on a real court exactly like a main-bracket one — omitting it
        // here starved courtSlots(), so a live plate match showed no tile on an unattended board
        // even though the court was genuinely occupied.
        ...bracket.plate_rounds.flatMap(r => r.matches),
        ...(bracket.groups ?? []).flatMap(g => g.matches),
        ...(bracket.third_place_match ? [bracket.third_place_match] : []),
    ];
}

export function liveMatches(bracket: PublicBracketData): PublicMatch[] {
    return collectMatches(bracket).filter(m => isLiveStatus(m.status));
}

export function activeRoundIndex(rounds: PublicRound[]): number {
    const idx = rounds.findIndex(r => r.matches.some(m => !isFinishedStatus(m.status)));
    return idx === -1 ? Math.max(rounds.length - 1, 0) : idx;
}

export function scoreSummary(match: PublicMatch): string {
    if (match.status === 'walkover') return 'W/O';
    return match.sets.map(s => `${s.team_a_score}-${s.team_b_score}`).join(' ');
}

export type MatchRound = { roundNumber: number; matches: PublicMatch[] };

/**
 * Split a group's matches into round-robin rounds for the lane's columns.
 *
 * Legacy draws arrive with every match on `round_number: 1` (or null) — they have no rounds at
 * all, and heading a single column "Round 1" would state something the data does not say. Fewer
 * than two distinct round numbers therefore collapses to ONE flat column, flagged by
 * `hasRealRounds: false` so the caller can hide the round axis.
 */
export function groupMatchesByRound(matches: PublicMatch[]): { rounds: MatchRound[]; hasRealRounds: boolean } {
    const distinct = new Set(matches.map(m => m.round_number).filter((n): n is number => n != null));
    if (distinct.size < 2) {
        return { rounds: [{ roundNumber: 1, matches: [...matches] }], hasRealRounds: false };
    }
    const byRound = new Map<number, PublicMatch[]>();
    matches.forEach(m => {
        // A null round among numbered ones is an incomplete row, not a round of its own: park it
        // at 0 so it sorts first and stays visible rather than being dropped.
        const key = m.round_number ?? 0;
        const bucket = byRound.get(key);
        if (bucket) bucket.push(m);
        else byRound.set(key, [m]);
    });
    const rounds = [...byRound.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([roundNumber, list]) => ({ roundNumber, matches: list }));
    return { rounds, hasRealRounds: true };
}

/**
 * The slice of rounds a lane shows when there are more than `max`.
 *
 * A 5- or 6-pair group produces 5 rounds, which would squeeze the columns past readability. Show a
 * window centred on the round being played rather than measuring and paging: the live round is the
 * one nobody may lose, and a slice needs no layout measurement to stay correct.
 */
export function visibleRoundWindow(roundNumbers: number[], activeRound: number, max = 4): number[] {
    if (roundNumbers.length <= max) return roundNumbers;
    const activeIdx = Math.max(roundNumbers.indexOf(activeRound), 0);
    const start = Math.min(
        Math.max(0, activeIdx - Math.floor((max - 1) / 2)),
        roundNumbers.length - max,
    );
    return roundNumbers.slice(start, start + max);
}

/** The round the day is on: the first with anything unfinished, else the last. */
export function activeRoundNumber(rounds: MatchRound[]): number {
    const live = rounds.find(r => r.matches.some(m => isLiveStatus(m.status)));
    if (live) return live.roundNumber;
    const next = rounds.find(r => r.matches.some(m => !isFinishedStatus(m.status)));
    return next?.roundNumber ?? rounds[rounds.length - 1]?.roundNumber ?? 1;
}

/** Anything carrying a pair: a match's team, or a standings row. */
export type PairSource = {
    player_1?: PublicPlayer | null;
    player_2?: PublicPlayer | null;
    team_name?: string | null;
    player_name?: string | null;
};

/** How many chip colours the palette holds. */
export const PAIR_CHIP_COUNT = 8;

/**
 * A stable key for a pair, identical whichever side of a match they are on and whatever their
 * current standings position is. Never from array position — see `pairChipIndex`.
 *
 * Each present player contributes one fragment (their id, or their name when the id is missing —
 * the schema `.catch('')`es ids, so empty is reachable), the fragments are sorted, then joined.
 * Sorting per-fragment (not just per-player) keeps this order-independent (team_a/team_b swap,
 * player_1/player_2 swap) while still using a real id whenever one exists. Using the id ONLY when
 * every present player has one — rather than joining whatever ids happen to exist — matters: two
 * different pairs that share one id'd player but differ in the id-less partner must not collapse
 * to the same key, or they'd get the same chip colour.
 */
export function pairIdentity(source: PairSource | null | undefined): string {
    if (!source) return '';
    const players = [source.player_1, source.player_2].filter((p): p is PublicPlayer => p != null);
    if (players.length > 0) {
        const allIdentified = players.every(p => Boolean(p.id));
        if (allIdentified) return players.map(p => p.id).sort().join('|');
        const fragments = players.map(p => p.id || playerFullName(p).trim().toLowerCase()).filter(Boolean);
        if (fragments.length > 0) return fragments.sort().join('|');
    }
    return (source.team_name ?? source.player_name ?? '').trim().toLowerCase();
}

/**
 * Chip colour slot for a pair. Deterministic from identity alone — never from array position, or
 * a pair would change colour the moment results reorder the table.
 */
export function pairChipIndex(identity: string): number {
    let hash = 0;
    for (let i = 0; i < identity.length; i++) {
        hash = (Math.imul(hash, 31) + identity.charCodeAt(i)) | 0;
    }
    return Math.abs(hash % PAIR_CHIP_COUNT);
}

/**
 * Two letters for the chip: one per player, else the first two of whatever name exists.
 *
 * The fallback must consider `second` too — guest players routinely lack names, and a pair whose
 * only named player is `player_2` (player_1 nameless) must still produce initials, not `''`.
 */
export function pairInitials(source: PairSource | null | undefined): string {
    const first = playerFullName(source?.player_1).trim();
    const second = playerFullName(source?.player_2).trim();
    if (first && second) return `${first[0]}${second[0]}`;
    const fallback = first || second || (source?.team_name ?? source?.player_name ?? '').trim();
    return fallback.slice(0, 2);
}

export type CourtSlot = { court: string; live: PublicMatch | null; next: PublicMatch | null };

/** Sorts by start time, pushing untimed matches last instead of letting '' sort them first. */
function byScheduledAt(a: PublicMatch, b: PublicMatch): number {
    return (a.scheduled_at ?? '￿').localeCompare(b.scheduled_at ?? '￿');
}

/**
 * What is on each court right now and what follows it — the rail that replaces the scrolling
 * ticker. Returns [] when nothing names a court, which the rail renders as a flat live list
 * rather than as an empty row of tiles.
 */
export function courtSlots(bracket: PublicBracketData): CourtSlot[] {
    // Type predicate (not an `as` cast) narrows court_name to `string` for everything downstream —
    // it's already been checked truthy here, so re-declaring it nullable would just re-open the
    // question this filter already answered.
    const named = collectMatches(bracket).filter(
        (m): m is PublicMatch & { court_name: string } => Boolean(m.court_name),
    );
    if (named.length === 0) return [];
    const courts = [...new Set(named.map(m => m.court_name))]
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return courts.map(court => {
        const mine = named.filter(m => m.court_name === court);
        return {
            court,
            live: mine.find(m => isLiveStatus(m.status)) ?? null,
            next: mine
                .filter(m => !isLiveStatus(m.status) && !isFinishedStatus(m.status))
                .sort(byScheduledAt)[0] ?? null,
        };
    });
}
