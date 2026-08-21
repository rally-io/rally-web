/**
 * Local-only visual harness for the public live board — NOT routed, never linked from the app,
 * and never emitted into `dist` (it is a second HTML entry, and `vite build` only follows
 * index.html). Reachable at /preview.html on the dev server and nowhere else.
 *
 * WHY THIS EXISTS. Two blind spots it covers, both of which have hidden real defects:
 *
 *  1. The test suite runs in jsdom, which does no layout at all — `scrollWidth` and
 *     `clientWidth` are always 0. Clipping, overflow, and a name that shrank to its floor and
 *     then cut off mid-word are all structurally invisible to CI. A green suite says nothing
 *     about whether this screen is readable.
 *  2. /live/:token needs the rally-api backend plus a real share token, and no tournament in
 *     the database has more than four pairs in a group — so the dense five/six-pair layout,
 *     the case most likely to overflow, cannot be reached with real data at all.
 *
 * It renders the real components inside the real TV shell at the real 1600×900 canvas, so what
 * you see here is what a club screen shows. To check a layout change, open it at the shape you
 * care about and measure rather than eyeball:
 *
 *     document.querySelectorAll('[data-testid="standings-list"]')
 *       .forEach(l => console.log(l.scrollHeight - l.clientHeight))   // 0 = fits
 *
 * /preview.html?theme=dark|light|gradient&groups=N&pairs=N&dq=1&long=0&lang=en&cols=2
 *              &played=0&phone=1&view=games
 *
 * `view=games` swaps the standings grid for the «משחקים» lanes — the other TV screen the group
 * phase rotates through, which has the same no-scroll constraint and its own way of running out
 * of height (one lane per group, so eight groups is eight lanes).
 *
 * `played=0` is the pre-start board — draw made, nothing scored. It is the state a venue screen
 * spends the whole first hour in and the hardest one to reach with real data, since a tournament
 * only passes through it once. `phone=1` swaps the TV canvas for the phone layout, which renders
 * a different component (StandingsTable, not GroupBoardCard) for the same group.
 */
/* eslint-disable react-refresh/only-export-components -- an entry point like main.tsx, not a
   module anything imports; fast refresh has nothing to preserve here. */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import i18n from './i18n';
import './App.css';
import './features/publicTournament/themes.css';
import { cn } from '@/lib/utils';
import { TvCanvas } from './features/publicTournament/components/TvCanvas';
import { GroupBoardCard } from './features/publicTournament/components/GroupBoardCard';
import { GroupsView, GROUP_ACCENTS, tvGridCols } from './features/publicTournament/components/GroupsView';
import { LanesView } from './features/publicTournament/components/LanesView';
import { getRotationViews } from './features/publicTournament/hooks/useViewMode';
import { PublicHeader } from './features/publicTournament/components/PublicHeader';
import { ViewTabs } from './features/publicTournament/components/ViewTabs';
import { QrPanel } from './features/publicTournament/components/QrPanel';
import { SponsorStrip } from './features/publicTournament/components/SponsorStrip';
import { CourtRail } from './features/publicTournament/components/CourtRail';
import type { BracketTheme, PublicBracketData, PublicGroup, PublicMatch, PublicStanding } from './features/publicTournament/types';

const q = new URLSearchParams(location.search);
const theme = (q.get('theme') ?? 'dark') as BracketTheme;
const groupCount = Number(q.get('groups') ?? 4);
const pairCount = Number(q.get('pairs') ?? 4);
const withDq = q.get('dq') === '1';
const longNames = q.get('long') !== '0';
const lang = q.get('lang') ?? 'he';
const colsParam = q.get('cols');
const played = q.get('played') !== '0';
const phone = q.get('phone') === '1';
const tvView = q.get('view') === 'games' ? 'games' : 'groups';
void i18n.changeLanguage(lang);

const player = (id: string, first: string, last: string) => ({
    id, first_name: first, last_name: last, skill_level: null, is_guest: null,
});
const standing = (o: Partial<PublicStanding> & { position: number }): PublicStanding => ({
    player_name: null, team_name: null, player_1: null, player_2: null,
    matches_played: 0, wins: 0, losses: 0, sets_won: 0, sets_lost: 0,
    games_won: 0, games_lost: 0, points: 0, is_disqualified: false, ...o,
});
const mk = (o: Partial<PublicMatch>): PublicMatch => ({
    id: Math.random().toString(36).slice(2), match_label: null, round_number: 1,
    team_a: null, team_b: null, sets: [], winner_team: null, next_match_id: null,
    status: 'scheduled', court_name: null, scheduled_at: null, ...o,
});

/** Index 2 is deliberately the longest realistic Hebrew pair name — the stress case. */
const LONG: Array<[string, string, string, string]> = [
    ['עומר', 'דהן', 'דנה', 'ברק'],
    ['יובל', 'גבאי', 'רותם', 'פרץ'],
    ['אלכסנדר', 'קונסטנטינוב', 'מיכאל', 'אברמוביץ׳'],
    ['אסף', 'כהן', 'גלי', 'שפירא'],
    ['רועי', 'ביטון', 'ליאור', 'אזולאי'],
    ['ניר', 'פרידמן', 'סיון', 'רוזן'],
];
const SHORT: Array<[string, string, string, string]> = LONG.map((p, i) =>
    (i === 2 ? ['גיא', 'מזרחי', 'טליה', 'שפירא'] : p) as [string, string, string, string]);

/** Circle-method round robin: every pair meets every other once, `n - 1` rounds for even `n`. */
function roundRobin(n: number): Array<Array<[number, number]>> {
    const ids = Array.from({ length: n }, (_, i) => i);
    if (ids.length % 2 === 1) ids.push(-1);
    const m = ids.length;
    return Array.from({ length: m - 1 }, (_, r) => {
        const rotated = [ids[0], ...ids.slice(1).map((_, i, arr) => arr[(i + r) % arr.length])];
        return Array.from({ length: m / 2 }, (_, i): [number, number] => [rotated[i], rotated[m - 1 - i]])
            .filter(([a, b]) => a !== -1 && b !== -1);
    });
}

function grp(name: string, n: number, dqIndex: number): PublicGroup {
    const src = longNames ? LONG : SHORT;
    const pair = (i: number) => {
        const [f1, l1, f2, l2] = src[i % src.length];
        return { player_1: player(`${name}-${i}-a`, f1, l1), player_2: player(`${name}-${i}-b`, f2, l2) };
    };
    const rounds = roundRobin(n);
    // Played = every round before the last is final and the last is on court, so the lanes show
    // all three card states at once; pre-start = every card scheduled, nothing on court.
    const matches = rounds.flatMap((pairs, r) => pairs.map(([a, b]) => {
        const done = played && r < rounds.length - 1;
        const live = played && r === rounds.length - 1;
        return mk({
            round_number: r + 1,
            team_a: { team_name: null, is_lucky_loser: null, ...pair(a) },
            team_b: { team_name: null, is_lucky_loser: null, ...pair(b) },
            sets: done ? [{ team_a_score: 6, team_b_score: 3, is_tiebreak: null }, { team_a_score: 6, team_b_score: 4, is_tiebreak: null }]
                : live ? [{ team_a_score: 4, team_b_score: 2, is_tiebreak: null }] : [],
            winner_team: done ? 'team_a' : null,
            status: done ? 'completed' : live ? 'in_progress' : 'scheduled',
            court_name: live ? `מגרש ${(a % 4) + 1}` : null,
        });
    }));
    return {
        group_name: name,
        matches,
        standings: Array.from({ length: n }, (_, i) => standing({
            position: i + 1,
            ...pair(i),
            wins: played ? n - 1 - i : 0,
            losses: played ? i : 0,
            games_won: played ? 20 - i * 2 : 0,
            games_lost: played ? 7 + i * 2 : 0,
            is_disqualified: i === dqIndex,
        })),
    };
}

const groups: PublicGroup[] = Array.from({ length: groupCount }, (_, gi) =>
    grp(`Group ${String.fromCharCode(65 + gi)}`, pairCount, gi === 0 && withDq ? Math.min(3, pairCount - 1) : -1));

/** The real footer measures `CourtRail` against `QrPanel`, so the board's height here must be
 *  what the page actually leaves it — a rail of the same fixtures, not an empty spacer. */
const bracket: PublicBracketData = {
    tournament_id: 'preview', tournament_name: 'גביע הערב — משחקים חיים', structure: 'group_then_knockout',
    club_name: 'Rally Club', club_logo_url: null, sponsors: [], videos: [],
    knockout_rounds: [], plate_rounds: [], league_standings: null, groups, third_place_match: null,
};

/**
 * `cols=N` forces a column count via inline style so layouts can be compared side by side. It
 * has to be a style, not `grid-cols-${N}`: Tailwind v4 only emits classes it finds written out
 * in source, so a class assembled at runtime is silently absent and the grid fell to one column.
 */
const forcedCols = colsParam ? { gridTemplateColumns: `repeat(${colsParam}, minmax(0, 1fr))` } : undefined;

function set(k: string, v: string): void {
    const p = new URLSearchParams(location.search);
    p.set(k, v);
    location.search = p.toString();
}

function Controls(): React.ReactElement {
    const btn = (active: boolean): string =>
        `px-2 py-0.5 rounded text-[11px] font-bold border ${active ? 'bg-white text-black border-white' : 'bg-black/60 text-white/70 border-white/25'}`;
    return (
        <div dir="ltr" className="fixed left-2 top-2 z-50 flex flex-wrap items-center gap-1 rounded-lg bg-black/75 p-1.5 font-sans backdrop-blur">
            {(['dark', 'light', 'gradient'] as const).map(v => (
                <button key={v} className={btn(theme === v)} onClick={() => set('theme', v)}>{v}</button>
            ))}
            <span className="px-1 text-[10px] font-black uppercase text-white/50">groups</span>
            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map(v => (
                <button key={v} className={btn(groupCount === v)} onClick={() => set('groups', String(v))}>{v}</button>
            ))}
            <span className="px-1 text-[10px] font-black uppercase text-white/50">pairs</span>
            {[3, 4, 5, 6].map(v => (
                <button key={v} className={btn(pairCount === v)} onClick={() => set('pairs', String(v))}>{v}</button>
            ))}
            <span className="px-1 text-[10px] font-black uppercase text-white/50">cols</span>
            {['auto', '2', '3', '4', '5'].map(v => (
                <button key={v} className={btn((colsParam ?? 'auto') === v)} onClick={() => set('cols', v === 'auto' ? '' : v)}>{v}</button>
            ))}
            <button className={btn(withDq)} onClick={() => set('dq', withDq ? '0' : '1')}>dq</button>
            <button className={btn(longNames)} onClick={() => set('long', longNames ? '0' : '1')}>long names</button>
            <button className={btn(played)} onClick={() => set('played', played ? '0' : '1')}>{played ? 'played' : 'pre-start'}</button>
            <button className={btn(phone)} onClick={() => set('phone', phone ? '0' : '1')}>{phone ? 'phone' : 'tv'}</button>
            <button className={btn(tvView === 'games')} onClick={() => set('view', tvView === 'games' ? 'groups' : 'games')}>{tvView === 'games' ? 'games' : 'groups'}</button>
            <button className={btn(lang === 'he')} onClick={() => set('lang', lang === 'he' ? 'en' : 'he')}>{lang}</button>
        </div>
    );
}

function Preview(): React.ReactElement {
    // The real gate, not a hardcoded true: `showAutoRotate` is what decides whether the venue
    // screen offers the toggle at all, so the harness has to ask the same function the page does.
    const showAutoRotate = getRotationViews('group', false, groups.length > 0).length > 1;

    if (phone) {
        return (
            <>
                <Controls />
                <div
                    dir={lang === 'he' ? 'rtl' : 'ltr'}
                    data-bracket-theme={theme}
                    className="min-h-screen text-(--pb-text) [background:var(--pb-surface)]"
                >
                    {/* A phone-width column, since the phone layout is the one that has to survive
                        a ~390px viewport. Everything inside is the real component tree. */}
                    <div className="mx-auto w-[390px] pt-16">
                        <GroupsView groups={groups} view="standings" isBigScreen={false} qualifyCount={2} />
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Controls />
            <div
                dir={lang === 'he' ? 'rtl' : 'ltr'}
                data-bracket-theme={theme}
                className="h-screen overflow-hidden text-(--pb-text) [background:var(--pb-surface)]"
            >
                <TvCanvas>
                    <PublicHeader
                        tournamentName="גביע הערב — משחקים חיים"
                        isReconnecting={false}
                        updatedAt={new Date()}
                        theme={theme}
                        onCycleTheme={() => set('theme', theme === 'dark' ? 'light' : theme === 'light' ? 'gradient' : 'dark')}
                        isBigScreen
                        clubLogoUrl={null}
                        clubName="Rally Club"
                    />
                    <div className="mx-auto w-full max-w-md shrink-0 px-4 py-1">
                        <ViewTabs
                            view={tvView} onSelect={() => {}} isAutoRotate
                            onToggleAutoRotate={() => {}} showAutoRotate={showAutoRotate}
                            tabs={['groups', 'games', 'knockout']} rotateMs={20000}
                        />
                    </div>
                    <main className="min-h-0 flex-1 overflow-hidden">
                        {tvView === 'games' ? (
                            <LanesView groups={groups} accents={GROUP_ACCENTS} />
                        ) : (
                            <div className={cn('grid h-full items-stretch gap-5 px-8 pb-6', tvGridCols(groups.length))} style={forcedCols}>
                                {groups.map((g, i) => (
                                    <GroupBoardCard key={g.group_name} group={g} accentClass={GROUP_ACCENTS[i % GROUP_ACCENTS.length]} qualifyCount={2} />
                                ))}
                            </div>
                        )}
                    </main>
                    <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-(--pb-border) bg-(--pb-card-header) px-8 pb-3 pt-2">
                        <QrPanel />
                        <CourtRail bracket={bracket} />
                        <SponsorStrip sponsors={[]} />
                    </footer>
                </TvCanvas>
            </div>
        </>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <BrowserRouter><Preview /></BrowserRouter>,
);
