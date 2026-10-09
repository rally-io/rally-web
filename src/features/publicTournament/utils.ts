import type { TFunction } from 'i18next';
import type { PublicBracketData, PublicMatch, PublicPlayer, PublicRound, PublicTeam, SetScore, SlotPlaceholder } from './types';

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

/**
 * A pair label ("Dan Levi / Gal Cohen") whose only break point is between the two players. Inside
 * each player's name, spaces become non-breaking spaces, hyphens become non-breaking hyphens
 * (U+2011: "Ben-Ami", the double-barrelled surnames common in Israel), and a Hebrew maqaf (U+05BE)
 * gets a word joiner (U+2060) after it. For `FitText`'s `wrapAtFloor` — a pair too long for one
 * line wraps after the slash, never inside someone's name. `plainNames` is its inverse (FitText's
 * tooltip shows the name as typed).
 */
export function keepNamesWhole(label: string): string {
    return label
        .split(' / ')
        .map(name => name.replace(/ /g, '\u00A0').replace(/-/g, '\u2011').replace(/\u05BE/g, '\u05BE\u2060'))
        .join(' / ');
}

/**
 * `keepNamesWhole`'s inverse: the non-breaking space back to a plain one, the non-breaking
 * hyphen back to a plain one, and the word joiner removed. The maqaf itself (U+05BE) is never
 * touched by either direction, so it needs no mapping here. `FitText`'s `title` uses this
 * instead of keeping its own copy of the same three replacements.
 */
export function plainNames(text: string): string {
    return text.replace(/\u00A0/g, ' ').replace(/\u2011/g, '-').replace(/\u2060/g, '');
}

/** The backend emits English labels ("Match #31"); translate at display time. */
export function localizeMatchLabel(label: string | number | null | undefined, t: TFunction): string {
    if (label == null) return '';
    const matched = /^match\s*#?\s*(\d+)$/i.exec(String(label).trim());
    if (matched) return t('public_bracket.match_label', { num: matched[1], defaultValue: `Match #${matched[1]}` });
    return String(label);
}

/**
 * The bracket's own name for a slot the earlier rounds have not filled: "Winner of Match #3",
 * "Loser of Match #3". ONE pattern, shared by the two things that care — the display path that
 * translates it and `isDecidedTeam` below, which keeps it off the footer queue. They were two
 * separate regexes until a placeholder reached a venue board as a queued "next match"; a copy
 * that drifts from its twin puts it straight back.
 */
const PLACEHOLDER_TEAM_NAME = /^(winner|loser)\s+of\s+match\s*#?\s*(\d+)$/i;

/** Backend placeholder team names, translated at display time. */
export function localizeTeamPlaceholder(name: string, t: TFunction): string {
    const matched = PLACEHOLDER_TEAM_NAME.exec(name.trim());
    if (!matched) return name;
    const num = matched[2];
    return matched[1].toLowerCase() === 'winner'
        ? t('public_bracket.winner_of_match', { num, defaultValue: `Winner of Match #${num}` })
        : t('public_bracket.loser_of_match', { num, defaultValue: `Loser of Match #${num}` });
}

/** "Runner-up Group C" / "Lucky loser" for an empty knockout side, or null. */
export function slotPlaceholderLabel(placeholder: SlotPlaceholder | null | undefined, t: TFunction): string | null {
    if (!placeholder) return null;
    if (placeholder.kind === 'lucky_loser') return t('public_bracket.slot.lucky_loser', { defaultValue: 'Lucky loser' });
    const group = placeholder.group ?? '';
    if (placeholder.position === 1) return t('public_bracket.slot.winner', { group, defaultValue: `Winner Group ${group}` });
    if (placeholder.position === 2) return t('public_bracket.slot.runner_up', { group, defaultValue: `Runner-up Group ${group}` });
    return t('public_bracket.slot.position', { group, position: placeholder.position, defaultValue: `#${placeholder.position} Group ${group}` });
}

/**
 * Can the board put a name on this side yet?
 *
 * Real players always can. A `team_name` usually can too — but NOT when it is a bracket
 * placeholder, which names nobody: a knockout match drawn before the groups finish arrives as
 * "Winner of Match #49" vs "Winner of Match #50". That reads as a real fixture to anything
 * checking only that the label is non-empty, which is exactly how it reached a venue footer.
 */
export function isDecidedTeam(team: PublicTeam | null | undefined): boolean {
    if (!team) return false;
    if (team.player_1) return true;
    const name = (team.team_name ?? '').trim();
    return name !== '' && !PLACEHOLDER_TEAM_NAME.test(name);
}

/**
 * Structures drawn with the league's layout: the table beside the round-by-round games. An
 * Americano is one (owner rule 2026-10-01: one view per concept — `toLiveBoard` in ./americano.ts
 * puts its rounds and table where a league keeps them).
 */
export function usesLeagueLayout(structure: string): boolean {
    return structure === 'round_robin_league' || structure === 'americano';
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
    // A league's or an Americano's plain "Round N", any N. First, before the '16'/'32' checks
    // below: a long league's "Round 16" is its 16th round, not the knockout's round of 16.
    const numbered = /^round\s+(\d+)$/i.exec(name.trim());
    if (numbered) return t('public_bracket.rounds.round_n', { num: numbered[1], defaultValue: name });
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
    const next = matches.findIndex(m => !isFinishedStatus(m.status) && !isVoidedStatus(m.status));
    return next === -1 ? 0 : next;
}

export function isLiveStatus(status: string): boolean {
    return status === 'in_progress' || status === 'live';
}

export function isFinishedStatus(status: string): boolean {
    return status === 'completed' || status === 'walkover';
}

/**
 * A fixture a disqualification voided: rally-api's `cascade_disqualification` cancels the pair's
 * unplayed group fixtures but leaves both registrations in their slots, so nothing else about the
 * row says it is dead. It has no result and will never be played, so it is neither "finished"
 * (there is no score to print) nor "pending" (there is nothing to announce) — which is why it is
 * kept apart from `isFinishedStatus` above rather than folded into it: that one gates score
 * rendering, and widening it would paint an empty scoreline on the venue board. The one place in
 * this feature that knows the status string; everything else asks here.
 */
export function isVoidedStatus(status: string): boolean {
    return status === 'cancelled';
}

/**
 * A finished game with level scores and no winner. Only an Americano game ends this way: its
 * winner is derived from the points, and equal points name nobody. Every other format requires a
 * winner, so no valid regular match satisfies this.
 */
export function isTieMatch(match: PublicMatch): boolean {
    return match.status === 'completed'
        && match.winner_team == null
        && match.sets.length > 0
        && match.sets.every(s => s.team_a_score === s.team_b_score);
}

/** How a round reads on the venue screen. Whether a not-yet-played round is the one called next is the caller's call. */
export type RoundState = 'done' | 'live' | 'upcoming';

/**
 * On court now if any game is live; done once every game is finished or voided; otherwise still
 * to come. A voided game counts towards done because a round a disqualification emptied is over —
 * read as unfinished it pinned the games axis and the phone round stepper to that round for the
 * rest of the evening, neither of which works out completeness of its own.
 */
export function roundStateOf(matches: PublicMatch[]): RoundState {
    if (matches.some(m => isLiveStatus(m.status))) return 'live';
    if (matches.length > 0 && matches.every(m => isFinishedStatus(m.status) || isVoidedStatus(m.status))) return 'done';
    return 'upcoming';
}

/**
 * The one round the hall is waiting for, by index, or -1. With a game live: the first round after
 * the last live one that is not done. With nothing live: the first round not done. Only one round
 * is ever called next — the lane card's rule.
 */
export function upNextRoundIndex(states: RoundState[]): number {
    for (let i = states.lastIndexOf('live') + 1; i < states.length; i++) {
        if (states[i] !== 'done') return i;
    }
    return -1;
}

/**
 * The word a round's state reads on the venue screen. `LanesView`'s round axis and
 * `AmericanoRoundsBoard`'s round cards each kept their own copy of this live/done/next mapping
 * (2026-10-04 review, Minor 4) — same keys, same defaults, so one function now serves both.
 * `upcoming` has no word; neither view ever showed one for it.
 */
export function roundStateLabel(state: RoundState | 'next', t: TFunction): string {
    switch (state) {
        case 'live': return t('public_bracket.round_live', 'In progress');
        case 'next': return t('public_bracket.up_next', 'Up next');
        case 'done': return t('public_bracket.round_done', 'Finished');
        default: return '';
    }
}

/** How one side's score reads. */
export type ScoreTone = 'live' | 'winner' | 'tie' | 'loser' | 'neutral';

/**
 * The one decision behind every score colour on the page. With `set`, a per-set score: the
 * winning side's lost set reads as a loser's (the lane card colours each set on its own).
 */
export function scoreTone(match: PublicMatch, side: 'team_a' | 'team_b', set?: SetScore): ScoreTone {
    if (isLiveStatus(match.status)) return 'live';
    if (isTieMatch(match)) return 'tie';
    const winner = match.winner_team ?? null;
    if (winner === null) return 'neutral';
    if (winner !== side) return 'loser';
    if (set) {
        const mine = side === 'team_a' ? set.team_a_score : set.team_b_score;
        const other = side === 'team_a' ? set.team_b_score : set.team_a_score;
        if (mine <= other) return 'loser';
    }
    return 'winner';
}

/**
 * The colour of each tone. A tie is in the regular text colour on both sides: the faint loser
 * colour on both reads as "both lost" from across a hall. A card that marks a live game with its
 * own frame (MatchCard) reads `live` as `neutral`.
 */
export const SCORE_TONE_CLASS: Record<ScoreTone, string> = {
    live: 'text-(--pb-live)',
    winner: 'text-(--pb-highlight)',
    tie: 'text-(--pb-text)',
    loser: 'text-(--pb-text-faint)',
    neutral: 'text-(--pb-text-faint)',
};

/** How a side's NAME reads — the sibling of `ScoreTone`, but only three states: a name is never
 *  painted "live" or "tie" the way a score is, so this is never routed through `scoreTone`. */
export type NameTone = 'winner' | 'loser' | 'neutral';

/**
 * A side's name weight-and-colour, from the match's recorded winner alone. `LaneMatchCard` and
 * `GameLine` each repeated this exact winner/loser/neutral ternary (2026-10-04 review, Minor 5) —
 * checked byte-identical in every state before unifying. Built from `winner_team` directly, not
 * `scoreTone`: `scoreTone` reads a live or tied game as its own tone, and if the API ever sent a
 * `winner_team` on a still-live match, routing through it would flip that name's weight — a
 * silent visible change on LaneMatchCard, a regular (non-Americano) view.
 */
export function nameTone(match: PublicMatch, side: 'team_a' | 'team_b'): NameTone {
    const winner = match.winner_team ?? null;
    if (winner === side) return 'winner';
    if (winner !== null) return 'loser';
    return 'neutral';
}

/** The class each `NameTone` paints, identical in `LaneMatchCard` and `GameLine`. */
export const NAME_TONE_CLASS: Record<NameTone, string> = {
    winner: 'font-extrabold text-(--pb-text)',
    loser: 'font-semibold text-(--pb-text-muted)',
    neutral: 'font-bold text-(--pb-text)',
};

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
    const idx = rounds.findIndex(r => r.matches.some(m => !isFinishedStatus(m.status) && !isVoidedStatus(m.status)));
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

export type CourtTier = 'few' | 'several' | 'many';

/**
 * How many courts a round or the final spreads over, in the TV's three layouts: up to 4, 5–8,
 * 9–16 (the API's maximum). The rounds board and the final both lay out by it (2026-10-04 review)
 * — one rule instead of each keeping its own `<= 4` / `<= 8` ternary, which let a breakpoint
 * changed in one view leave the other's untouched.
 */
export function courtTier(courts: number): CourtTier {
    if (courts <= 4) return 'few';
    if (courts <= 8) return 'several';
    return 'many';
}

/** A window's start, kept inside `[0, length - max]` — the one clamp both window flavours share. */
function clampWindowStart(start: number, length: number, max: number): number {
    return Math.min(Math.max(start, 0), length - max);
}

/** The `max`-long slice of `roundNumbers` starting at `start`, or the whole list if it already fits. */
function sliceWindow(roundNumbers: number[], start: number, max: number): number[] {
    if (roundNumbers.length <= max) return roundNumbers;
    return roundNumbers.slice(start, start + max);
}

/**
 * The slice of rounds a lane shows when there are more than `max`.
 *
 * A 5- or 6-pair group produces 5 rounds, which would squeeze the columns past readability. Show a
 * window centred on the round being played rather than measuring and paging: the live round is the
 * one nobody may lose, and a slice needs no layout measurement to stay correct.
 */
export function visibleRoundWindow(roundNumbers: number[], activeRound: number, max = 4): number[] {
    const activeIdx = Math.max(roundNumbers.indexOf(activeRound), 0);
    const start = clampWindowStart(activeIdx - Math.floor((max - 1) / 2), roundNumbers.length, max);
    return sliceWindow(roundNumbers, start, max);
}

/**
 * The window once a round is called "next" (`next`, an index into `roundNumbers`/`states`): the
 * `max`-long span starting at the first live round — or, with nothing live, at `next` itself —
 * then clamped to the list exactly like `visibleRoundWindow`'s own clamp. The live rounds win over
 * "next": the module's rule is that a live round is the one nobody may lose (see the comment above
 * `visibleRoundWindow`), so the window never starts later than the first live round, whatever that
 * costs `next`.
 *
 * This reproduces the window you'd get by pulling left towards `next` in every case where the live
 * rounds plus `next` all fit inside `max` — the two rules agree exactly when
 * `next - firstLive + 1 <= max`. Past that point they diverge: `next` drops off the right edge
 * rather than ever bumping a live round off the left. (If there are MORE live rounds than `max`
 * itself, only the earliest `max` of them show; a later live round and `next` both drop, because
 * nothing here picks one live round over another — a shape no real evening takes outside a test.)
 *
 * Pass `next = -1` (nothing is called next — everything's played, or the evening's last round is
 * the one still live) and use `visibleRoundWindow` instead: this function only knows how to centre
 * a NEXT round, not a live-but-not-next one.
 */
export function nextRoundWindow(roundNumbers: number[], states: RoundState[], next: number, max = 4): number[] {
    const firstLive = states.indexOf('live');
    const start = clampWindowStart(firstLive === -1 ? next : firstLive, roundNumbers.length, max);
    return sliceWindow(roundNumbers, start, max);
}

/** The round the day is on: the first with anything unfinished, else the last. */
export function activeRoundNumber(rounds: MatchRound[]): number {
    const live = rounds.find(r => r.matches.some(m => isLiveStatus(m.status)));
    if (live) return live.roundNumber;
    const next = rounds.find(r => r.matches.some(m => !isFinishedStatus(m.status) && !isVoidedStatus(m.status)));
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

/** Sorts by start time, pushing untimed matches last instead of letting '' sort them first. */
function byScheduledAt(a: PublicMatch, b: PublicMatch): number {
    return (a.scheduled_at ?? '￿').localeCompare(b.scheduled_at ?? '￿');
}

/** How many matches the footer queue holds. At ~5s per tile this is a ~50s loop. */
export const UP_NEXT_MAX = 10;

/**
 * The queue a spectator is actually waiting on: everything live, then everything still to come,
 * earliest first.
 *
 * Deliberately NOT one entry per court, which is what this replaced. A per-court board shows each
 * court's immediate next match and nothing behind it, so a round of twelve matches across two
 * courts rendered two tiles and the other ten had nowhere to appear — including every match with
 * no court assigned yet, which never reached the footer at all.
 *
 * Untimed matches sort last rather than first (see `byScheduledAt`) and still appear, because a
 * draw without a schedule is a normal state for a club that seeds courts on the night.
 *
 * Capped, because the loop has to stay short enough to be worth waiting for: this is the exact
 * failure that retired the original scrolling ticker, where a player stood and watched a marquee
 * cycle the whole tournament to find one match.
 */
export function upNextMatches(bracket: PublicBracketData, max = UP_NEXT_MAX): PublicMatch[] {
    // Both sides must be DECIDED, not merely labelled. A group_then_knockout bracket carries its
    // knockout matches from the draw onward: sometimes with both teams null, sometimes with the
    // placeholder names "Winner of Match #49" vs "Winner of Match #50". Both are unfinished and
    // unscheduled, and both reached the footer — the first as blank tiles, the second as tiles
    // announcing a fixture between two matches. A tile a spectator cannot act on is worse than
    // no tile.
    const playable = (m: PublicMatch): boolean => isDecidedTeam(m.team_a) && isDecidedTeam(m.team_b);
    // A voided fixture passes `playable()` — a disqualification leaves both registrations in their
    // slots — so without this the court rail announced to the hall a game nobody would play.
    const unfinished = collectMatches(bracket)
        .filter(m => !isFinishedStatus(m.status) && !isVoidedStatus(m.status) && playable(m));
    const live = unfinished.filter(m => isLiveStatus(m.status));
    const upcoming = unfinished.filter(m => !isLiveStatus(m.status)).sort(byScheduledAt);
    return [...live, ...upcoming].slice(0, max);
}

