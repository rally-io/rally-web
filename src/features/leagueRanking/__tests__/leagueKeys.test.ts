import { describe, expect, it } from 'vitest';
import en from '@/i18n/locales/en.json';
import he from '@/i18n/locales/he.json';

/**
 * Every `league.*` key the feature renders, listed explicitly.
 *
 * Explicitly, because several families resolve through key maps at the call site
 * (frames, buckets, movement), so no static search for their own names would ever
 * find them all. That exact blind spot has already cost this project twice: once
 * on a Maestro selector list, once on a translation key list.
 */
const LEAGUE_KEYS = [
  'frame.legend',
  'frame.global',
  'frame.band',
  'frame.circle',
  'band.legend',
  'rank_change.up',
  'rank_change.down',
  'rank_change.same',
  'unranked',
  'shields.aria',
  'chase.next',
  'chase.gap',
  'chase.leading',
  'streak.current',
  'streak.best',
  'climber',
  'table.caption',
  'table.rank',
  'table.player',
  'table.band',
  'table.points',
  'table.empty',
  'page.title',
  'page.titleLead',
  'page.titleAccent',
  'page.subtitle',
  'page.chooseBand',
  'page.loading',
  'page.noSeason',
  'page.error',
  'page.seasonLine',
  'page.loadMore',
  'search.placeholder',
  'search.clear',
  // Pluralized — house style (see monthTournaments_*): all four CLDR forms in
  // both bundles, so the cross-locale set check holds.
  'search.count_one',
  'search.count_two',
  'search.count_many',
  'search.count_other',
  'search.empty',
  'circle.ctaTitle',
  'circle.ctaBody',
  'circle.ctaButton',
  'circle.emptyTitle',
  'circle.emptyBody',
  'circle.emptyButton',
  'page.howLevelsWork',
  'page.partner',
  'how.title',
  'how.subtitle',
  'how.formulaPoints',
  'how.formulaBand',
  'how.formulaBucket',
  'how.formulaSize',
  'how.formulaNote',
  'how.s1Title',
  'how.s1Lede',
  'how.colBucket',
  'how.colElim',
  'how.colRR',
  'how.colGroupKO',
  'how.cellWinner',
  'how.cellFinalist',
  'how.cellSemi',
  'how.cellQuarter',
  'how.cellR16',
  'how.cellR32',
  'how.cellT1',
  'how.cellT2',
  'how.cellT34',
  'how.cellT58',
  'how.cellT916',
  'how.cellT1732',
  'how.cellGroupOut',
  'how.s2Title',
  'how.s2Lede',
  'how.colBand',
  'how.s3Title',
  'how.s3Lede',
  'how.colDraw',
  'how.colMult',
  'how.colEffect',
  'how.pairsRange',
  'how.s3Note',
  'how.s4Title',
  'how.s4Lede',
  'how.s4Q',
  'how.windowTotal',
  'how.s5Title',
  'how.colPlayer',
  'how.colBest',
  'how.colPoints',
  'how.s5Tie',
  'how.s5Bands',
  'how.rules1Title',
  'how.rules1Body',
  'how.rules2Title',
  'how.rules2Body',
  'how.rules3Title',
  'how.rules3Body',
  'how.rules4Title',
  'how.rules4Body',
  'how.rules5Title',
  'how.rules5Body',
  'how.rules6Title',
  'how.rules6Body',
  'how.footerNote',
  'how.levelsLink',
  'cta.title',
  'cta.body',
  'cta.button',
  'bucket.first',
  'bucket.second',
  'bucket.top4',
  'bucket.top8',
  'bucket.top16',
  'bucket.top32',
  'provisional',
  'reason.played',
  'reason.levelChanged',
  'reason.quarterEnded',
  'quarters.label',
  'quarters.until',
  'quarters.dropsOn',
  'quarters.empty',
  // Pluralized — house style (see search.count_*): all four CLDR forms in
  // both bundles, so the cross-locale set check holds.
  'quarters.events_one',
  'quarters.events_two',
  'quarters.events_many',
  'quarters.events_other',
  'quarters.onOffer',
  'personal.aria',
  'personal.heading',
  'personal.headingNamed',
  'personal.inGlobal',
  'personal.inBand',
  'personal.inCircle',
  'personal.empty',
  'personal.points',
  'personal.levelRank',
  'personal.overallRank',
  'personal.career',
  'player.loading',
  'player.notFound',
  'player.error',
  'player.points',
  'player.noResults',
  'player.untitledTournament',
  'player.resultPoints',
  'player.rankLabel',
  'player.pointsLabel',
  'player.countedLabel',
  'player.drawSize',
  'player.modalTitle',
  'player.openFull',
  'player.back',
  'player.results',
  'player.career',
  'match.showMatches',
  'match.hideMatches',
  'match.error',
  'match.empty',
  'match.walkover',
  'stats.title',
  'stats.matches',
  'stats.winRate',
  'stats.streak',
  'stats.bestStreak',
  'stats.tournamentsWon',
  'stats.ofPlayed',
  'stats.wins',
  'stats.losses',
] as const;

type Bundle = Record<string, unknown>;

function resolve(bundle: Bundle, path: string): unknown {
  return path.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object' && part in (node as Bundle)) {
      return (node as Bundle)[part];
    }
    return undefined;
  }, bundle);
}

function flatten(node: unknown, prefix = ''): string[] {
  if (node === null || typeof node !== 'object') return [prefix];
  return Object.entries(node as Bundle).flatMap(([k, v]) =>
    flatten(v, prefix ? `${prefix}.${k}` : k),
  );
}

const LOCALES: Array<[string, Bundle]> = [
  ['en', en as Bundle],
  ['he', he as Bundle],
];

describe('league translations', () => {
  it.each(LOCALES)('%s defines every league key as a non-empty string', (_name, bundle) => {
    const missing = LEAGUE_KEYS.filter(key => {
      const value = resolve(bundle.league as Bundle, key);
      return typeof value !== 'string' || value.trim() === '';
    });
    expect(missing).toEqual([]);
  });

  it('has matching league key sets across locales', () => {
    // Scoped to `league.*` on purpose. A repo-wide comparison fails on correct data:
    // he.json legitimately carries five CLDR plural forms (_two, _many) that Hebrew
    // has and English does not.
    expect(flatten((he as Bundle).league).sort()).toEqual(
      flatten((en as Bundle).league).sort(),
    );
  });

  it('has real Hebrew, not English copied into the Hebrew file', () => {
    // The failure this catches is a copy-paste that leaves the Hebrew bundle holding
    // English strings — invisible to an English-speaking reviewer, and the default
    // language for every user of this app.
    const enTitle = resolve((en as Bundle).league as Bundle, 'page.title');
    const heTitle = resolve((he as Bundle).league as Bundle, 'page.title');
    expect(heTitle).not.toBe(enTitle);
    expect(String(heTitle)).toMatch(/[֐-׿]/);
  });

  it('has a Hebrew nav label for the ranking entry', () => {
    expect(((he as Bundle).nav as Bundle).ranking).toBeTruthy();
    expect(String(((he as Bundle).nav as Bundle).ranking)).toMatch(/[֐-׿]/);
    expect(((en as Bundle).nav as Bundle).ranking).toBeTruthy();
  });
});
