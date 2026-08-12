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
import { GROUP_ACCENTS } from './features/publicTournament/components/GroupsView';
import { PublicHeader } from './features/publicTournament/components/PublicHeader';
import { ViewTabs } from './features/publicTournament/components/ViewTabs';
import { QrPanel } from './features/publicTournament/components/QrPanel';
import { SponsorStrip } from './features/publicTournament/components/SponsorStrip';
import type { BracketTheme, PublicGroup, PublicMatch, PublicStanding } from './features/publicTournament/types';

const q = new URLSearchParams(location.search);
const theme = (q.get('theme') ?? 'dark') as BracketTheme;
const groupCount = Number(q.get('groups') ?? 4);
const pairCount = Number(q.get('pairs') ?? 4);
const withDq = q.get('dq') === '1';
const longNames = q.get('long') !== '0';
const lang = q.get('lang') ?? 'he';
const colsParam = q.get('cols');
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

function grp(name: string, n: number, dqIndex: number): PublicGroup {
    const src = longNames ? LONG : SHORT;
    return {
        group_name: name,
        matches: Array.from({ length: (n * (n - 1)) / 2 }, (_, i) =>
            mk({ sets: i < Math.ceil((n * (n - 1)) / 4) ? [{ team_a_score: 6, team_b_score: 3, is_tiebreak: null }] : [] })),
        standings: Array.from({ length: n }, (_, i) => {
            const [f1, l1, f2, l2] = src[i % src.length];
            return standing({
                position: i + 1,
                player_1: player(`${name}-${i}-a`, f1, l1),
                player_2: player(`${name}-${i}-b`, f2, l2),
                wins: n - 1 - i, losses: i,
                games_won: 20 - i * 2, games_lost: 7 + i * 2,
                is_disqualified: i === dqIndex,
            });
        }),
    };
}

const groups: PublicGroup[] = Array.from({ length: groupCount }, (_, gi) =>
    grp(`Group ${String.fromCharCode(65 + gi)}`, pairCount, gi === 0 && withDq ? Math.min(3, pairCount - 1) : -1));

/** Mirrors GroupsView.tvGridCols, with a `cols` override so layouts can be compared side by side. */
function gridCols(count: number): string {
    if (colsParam) return `grid-cols-${colsParam}`;
    if (count <= 1) return 'mx-auto w-full max-w-2xl grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count === 4) return 'grid-cols-2';
    return 'grid-cols-3';
}

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
            {[2, 3, 4, 5, 6].map(v => (
                <button key={v} className={btn(groupCount === v)} onClick={() => set('groups', String(v))}>{v}</button>
            ))}
            <span className="px-1 text-[10px] font-black uppercase text-white/50">pairs</span>
            {[3, 4, 5, 6].map(v => (
                <button key={v} className={btn(pairCount === v)} onClick={() => set('pairs', String(v))}>{v}</button>
            ))}
            <span className="px-1 text-[10px] font-black uppercase text-white/50">cols</span>
            {['auto', '2', '3', '4'].map(v => (
                <button key={v} className={btn((colsParam ?? 'auto') === v)} onClick={() => set('cols', v === 'auto' ? '' : v)}>{v}</button>
            ))}
            <button className={btn(withDq)} onClick={() => set('dq', withDq ? '0' : '1')}>dq</button>
            <button className={btn(longNames)} onClick={() => set('long', longNames ? '0' : '1')}>long names</button>
            <button className={btn(lang === 'he')} onClick={() => set('lang', lang === 'he' ? 'en' : 'he')}>{lang}</button>
        </div>
    );
}

function Preview(): React.ReactElement {
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
                            view="groups" onSelect={() => {}} isAutoRotate={false}
                            onToggleAutoRotate={() => {}} showAutoRotate
                            tabs={['groups', 'games', 'knockout']} rotateMs={20000}
                        />
                    </div>
                    <main className="min-h-0 flex-1 overflow-hidden">
                        <div className={cn('grid h-full items-stretch gap-5 px-8 pb-6', gridCols(groups.length))}>
                            {groups.map((g, i) => (
                                <GroupBoardCard key={g.group_name} group={g} accentClass={GROUP_ACCENTS[i % GROUP_ACCENTS.length]} qualifyCount={2} />
                            ))}
                        </div>
                    </main>
                    <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-(--pb-border) bg-(--pb-card-header) px-8 pb-3 pt-2">
                        <QrPanel />
                        <div className="flex-1" />
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
