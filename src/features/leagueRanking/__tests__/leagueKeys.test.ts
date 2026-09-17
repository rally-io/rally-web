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
  'credit.line',
  'credit.long',
  'how.title',
  'how.subtitle',
  'how.formulaPoints',
  'how.formulaUnits',
  'how.formulaUnit',
  'how.formulaSize',
  'how.formulaNote',
  'how.s1Title',
  'how.s1Lede',
  'how.colStage',
  'how.colUnits',
  'how.stageFinal',
  'how.stageSemi',
  'how.stageQuarter',
  'how.stageEarly',
  'how.stageGroup',
  'how.stageThird',
  'how.stageLeague',
  'how.stagePlate',
  'how.stageLoss',
  'how.s2Title',
  'how.s2Lede',
  'how.colBand',
  'how.colUnit',
  'how.s2CapTitle',
  'how.s2CapBody',
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
  'bucket.group',
  'provisional',
  'levelNote.verified',
  'levelNote.unverified',
  'provisionalNote',
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
  'personal.points_one',
  'personal.points_two',
  'personal.points_many',
  'personal.points_other',
  'personal.levelRank',
  'personal.overallRank',
  'personal.career',
  'player.loading',
  'player.notFound',
  'player.error',
  'player.noResults',
  'player.untitledTournament',
  'player.resultPoints',
  'player.rankLabel',
  // `levelLine` takes a `count` and has NO `_one` variant on purpose: i18next falls
  // back to the base key when the plural form is absent, and a level board is only
  // ever a board of many. One leaf, in both bundles.
  'player.levelLine',
  'player.levelOnly',
  // The player page's own third-person wording. `league.reason.played` and
  // `league.reason.levelChanged` say "your", which is wrong on somebody else's page;
  // `league.reason.quarterEnded` is impersonal and is shared rather than duplicated.
  'player.reasonPlayed',
  'player.reasonLevelChanged',
  // The gap to the spot above, on the player's LEVEL board (rally-api computes it over
  // `level_board`, never the global one). Pluralized — house style (see search.count_*):
  // all four CLDR forms in both bundles, so the cross-locale set check holds. Hebrew's
  // three numeral forms are deliberately identical: `נק׳` is an abbreviation and does
  // not inflect, and only `_one` spells the word out.
  'player.gapAbove_one',
  'player.gapAbove_two',
  'player.gapAbove_many',
  'player.gapAbove_other',
  // The rolling-window block. `quartersEmpty` exists because `league.quarters.empty`
  // says "you did not play" — the viewer's own card speaking, wrong on somebody
  // else's page. Same third-person reason as `reasonPlayed` above.
  'player.quartersTitle',
  'player.quartersScope',
  'player.quartersEmpty',
  'player.pointsLabel',
  'player.countedLabel',
  'player.drawSize',
  'player.modalTitle',
  'player.openFull',
  'player.back',
  'player.results',
  'player.resultsScope',
  'match.win',
  'match.loss',
  'match.retry',
  'match.unknownPlayer',
  'stats.scope',
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

  it('has matching level.* key sets across locales', () => {
    // `level.*` (VerificationMark's labels/tooltips, the reliability line, the
    // declare/confirm sheet, LevelPage/EditProfilePage) is a SEPARATE top-level
    // namespace from `league.*`, shared across several features, and had ZERO
    // cross-locale sync coverage before this test: a key added to one bundle and
    // missed in the other would ship silently, in a product where half the users
    // read Hebrew and half English. Same reasoning and the same known-legitimate
    // exception (Hebrew's extra CLDR plural forms) as the `league.*` check above.
    expect(flatten((he as Bundle).level).sort()).toEqual(
      flatten((en as Bundle).level).sort(),
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

  it('never transliterates the brand: Rally is written in Latin, even in Hebrew', () => {
    // The brand is "Rally", never "ראלי". Five `league.*` strings carried the
    // transliteration (the hero title and its accent word, the subtitle, the CTA
    // body, the first scoring rule) and the owner asked for all of them in Latin.
    //
    // Scoped to `league.*` ON PURPOSE. `privacy.*` legitimately transliterates it
    // as part of the registered company name in legal text, which must stay
    // Hebrew, and `level_page.*` / `contact.*` / `tournament.*` are other pages
    // this request never covered. A repo-wide version of this assertion would
    // fail on correct copy.
    // Bounded on both sides, because a bare /ראלי/ is a substring of ordinary
    // Hebrew words and would fire on correct copy: ישראלי ("Israeli") ends with
    // it, ראלים ("rallies") begins with it. The optional one-letter prefix still
    // catches the glued forms a translator would actually write — לראלי, בראלי,
    // מראלי — which are transliterations and must be caught.
    const TRANSLITERATED_BRAND = /(?<![א-ת])[בלמהוכש]?ראלי(?![א-ת])/;
    const hebrewLeague = JSON.stringify((he as Bundle).league);
    expect(hebrewLeague).not.toMatch(TRANSLITERATED_BRAND);
    // The guard must be capable of failing, and must not fire on the two words
    // that made the unbounded version wrong.
    expect('טורנירי ראלי').toMatch(TRANSLITERATED_BRAND);
    expect('הצטרפו לראלי').toMatch(TRANSLITERATED_BRAND);
    expect('הפאדל הישראלי').not.toMatch(TRANSLITERATED_BRAND);
    expect('ראלים ארוכים').not.toMatch(TRANSLITERATED_BRAND);
  });

  /**
   * English words spelled in Hebrew letters, where a real Hebrew word exists and
   * this very file already uses it. `דראו` sat one string away from `גודל ההגרלה`;
   * `פרטנר` sat inside a sentence that already said `שני בני הזוג`. Each entry
   * carries the sample it must catch, so the guard proves it can fail — a regex
   * that matches nothing would pass this suite silently and let a future
   * translator put the transliteration straight back.
   *
   * `טורניר` and `פאדל` are deliberately absent: they are naturalised Hebrew, not
   * transliterations. `נוקאאוט` and `באג` are unresolved judgement calls (see the
   * task report) and are not guarded until someone rules on them.
   */
  const TRANSLITERATIONS: Array<{ word: RegExp; hebrew: string; sample: string }> = [
    { word: /דראו/, hebrew: 'הגרלה', sample: 'גודל הדראו' },
    { word: /רואונד/, hebrew: 'ליגה', sample: 'בליגת רואונד־רובין אין חצי גמר' },
    { word: /פרטנר/, hebrew: 'בן זוג', sample: 'החלפת פרטנר לא עולה לכם כלום' },
    { word: /פורמט/, hebrew: 'מבנה', sample: 'השלב אליו הגעתם — בכל פורמט' },
  ];

  describe('never transliterates an English word that has a Hebrew one', () => {
    const hebrewLeague = JSON.stringify((he as Bundle).league);

    it.each(TRANSLITERATIONS)(
      'league.* says $hebrew, never $word',
      ({ word, hebrew, sample }) => {
        // The guard must be capable of firing: if this assertion ever fails the
        // regex has been weakened and the one below is worthless.
        expect(sample, `${word} no longer matches its own bad sample`).toMatch(word);
        expect(
          hebrewLeague,
          `he.json league.* still transliterates ${word} — use ${hebrew}`,
        ).not.toMatch(word);
      },
    );
  });

  it('has a Hebrew nav label for the ranking entry', () => {
    expect(((he as Bundle).nav as Bundle).ranking).toBeTruthy();
    expect(String(((he as Bundle).nav as Bundle).ranking)).toMatch(/[֐-׿]/);
    expect(((en as Bundle).nav as Bundle).ranking).toBeTruthy();
  });

  describe('level/rank vocabulary never conflates', () => {
    // `is_provisional` is a RANKING fact — "has this player played the 4 rated
    // matches it takes to hold a settled place on the board?" It says nothing
    // about whether the LEVEL (the number/tier) is trustworthy; that's a
    // separate fact, `level_verified`. Shipped copy used to say "Provisional
    // level" / "רמה זמנית" ("temporary level"), which asserts something about
    // the LEVEL. It was reworded this branch to "Provisional rank" / "דירוג
    // זמני" — a claim about the RANK only.
    //
    // This guard pins the specific CONFLATING PHRASES, not the bare word
    // "level" / "הרמה". `how.rules5Body` legitimately contains that word —
    // "...you appear at the bottom of your level" / "...בתחתית הרמה שלכם" — a
    // reference to the level's board, not a trust claim about the level
    // itself. A naive "must not contain level/הרמה" assertion would fail on
    // that CORRECT copy, and the next author would "fix" the failure by
    // loosening the copy rather than the test — reintroducing the exact
    // conflation this guard exists to catch. So we match the phrase that
    // actually asserts the level is unsettled, in both its title form
    // ("Provisional level" / "רמה זמנית") and its sentence form ("level is
    // provisional" / the Hebrew equivalent).
    //
    // Hebrew grammatical-number note: `levelNote.*` addresses the player in
    // the singular ("הרמה שלך"), `rules5Body` in the plural ("הרמה שלכם") —
    // the pattern covers both so a translator can't dodge the guard by
    // picking the other form.
    const CONFLATION_PHRASES: Record<string, RegExp[]> = {
      en: [/provisional level/i, /level is provisional/i],
      he: [/רמה זמנית/, /הרמה של(ך|כם) זמנית/],
    };

    // Every string that carries the provisional-rank message, in both
    // locales: the public-page pill, the scoring explainer (title + body —
    // the original defect this copy fix was dispatched for), and the two
    // personal-card level notes.
    const CONFLATION_SITES = [
      'provisional',
      'how.rules5Title',
      'how.rules5Body',
      'levelNote.verified',
      'levelNote.unverified',
      'provisionalNote',
    ] as const;

    it.each(LOCALES)('%s never says the LEVEL (only the rank) is provisional', (name, bundle) => {
      const phrases = CONFLATION_PHRASES[name];
      for (const key of CONFLATION_SITES) {
        const value = String(resolve(bundle.league as Bundle, key) ?? '');
        for (const phrase of phrases) {
          expect(
            value,
            `league.${key} (${name}) = "${value}" matches conflation phrase ${phrase}`,
          ).not.toMatch(phrase);
        }
      }
    });
  });
});
