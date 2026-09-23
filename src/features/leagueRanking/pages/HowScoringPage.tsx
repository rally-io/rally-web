import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeagueBackdrop } from '../components/LeagueBackdrop';
import { Reveal } from '../components/Reveal';

/**
 * The public explanation of league scoring — the page behind the board's
 * "how the scoring works" link. Scoring is PER MATCH WON since 2026-09-17
 * (spec: rally-api docs/superpowers/specs/2026-09-17-ranking-points-per-win-design.md):
 * every win earns units by the stage it was won at, a unit is worth a
 * band-dependent amount, the draw-size multiplier scales the lot, and a loss
 * earns nothing. The six rules, the rolling four-quarter window and real ties
 * are unchanged from the original spec.
 *
 * The numbers in the tables are DISPLAY COPIES of the engine's constants
 * (`rally-api app/services/league/points.py`). If the engine's constants ever
 * change, this page must change with it — they are the same product fact.
 */

/** Units for winning a match at each stage — the final first. */
const STAGE_ROWS: Array<{ key: string; units: number }> = [
  { key: 'league.how.stageFinal', units: 5 },
  { key: 'league.how.stageSemi', units: 3 },
  { key: 'league.how.stageQuarter', units: 2 },
  { key: 'league.how.stageEarly', units: 1 },
  { key: 'league.how.stageGroup', units: 1 },
  { key: 'league.how.stageThird', units: 1 },
  { key: 'league.how.stageLeague', units: 1 },
  { key: 'league.how.stagePlate', units: 0 },
  { key: 'league.how.stageLoss', units: 0 },
];

/** Points per unit by band, and what ONE win pays at each stage in a 16–31-pair draw. */
const BAND_ROWS: Array<{ band: string; unit: number; values: number[] }> = [
  { band: 'A', unit: 23, values: [115, 69, 46, 23] },
  { band: 'B', unit: 12, values: [60, 36, 24, 12] },
  { band: 'C', unit: 6, values: [30, 18, 12, 6] },
  { band: 'D', unit: 3, values: [15, 9, 6, 3] },
];

const SIZE_TIERS: Array<{ range: string; mult: string; effect: string }> = [
  { range: '4–7', mult: '× 0.50', effect: '60 → 30' },
  { range: '8–15', mult: '× 0.75', effect: '60 → 45' },
  { range: '16–31', mult: '× 1.00', effect: '60 → 60' },
  { range: '32+', mult: '× 1.25', effect: '60 → 75' },
];

/**
 * The six rule cards' key pairs, literal — never templated (`rules${n}Title`)
 * — so a static i18n key scan and the `LEAGUE_KEYS` test both see every key
 * this page actually renders.
 */
const RULE_KEYS: Array<{ title: string; body: string }> = [
  { title: 'league.how.rules1Title', body: 'league.how.rules1Body' },
  { title: 'league.how.rules2Title', body: 'league.how.rules2Body' },
  { title: 'league.how.rules3Title', body: 'league.how.rules3Body' },
  { title: 'league.how.rules4Title', body: 'league.how.rules4Body' },
  { title: 'league.how.rules5Title', body: 'league.how.rules5Body' },
  { title: 'league.how.rules6Title', body: 'league.how.rules6Body' },
];

/**
 * The worked window's four quarters (Noa's example): the current quarter and
 * the three before it. Points here are a DISPLAY EXAMPLE under per-win
 * scoring — 156 is a B-band sixteen-pair title (13 units × 12), 117 the same
 * title in a 8–15-pair draw — chosen to match the s4Lede narrative (Q4 2025 =
 * 156, the quarter that rolls off) and to sum to the same 441 shown for Noa
 * in the section 5 table below.
 */
const WINDOW_QUARTERS: Array<{ n: number; year: number; events: number; points: number }> = [
  { n: 4, year: 2025, events: 2, points: 156 },
  { n: 1, year: 2026, events: 2, points: 117 },
  { n: 2, year: 2026, events: 2, points: 96 },
  { n: 3, year: 2026, events: 1, points: 72 },
];
const WINDOW_TOTAL = WINDOW_QUARTERS.reduce((sum, q) => sum + q.points, 0);

export default function HowScoringPage(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // The same two branches as `PlayerSeasonPage`, read once so the label can only
  // promise the ranking board on the branch that actually goes there.
  const hasInAppHistory: boolean = window.history.state?.idx > 0;

  const goBack = (): void => {
    if (hasInAppHistory) {
      navigate(-1);
    } else {
      navigate('/ranking');
    }
  };

  return (
    <main className="isolate overflow-x-clip pt-32 pb-24">
      <LeagueBackdrop />
      <div className="container relative mx-auto max-w-3xl px-4">
        <button
          type="button"
          onClick={goBack}
          className="hero-rise hero-rise-1 mb-4 inline-flex items-center gap-2 text-sm font-bold text-rally-text-2 transition-colors hover:text-rally-text focus-visible:outline-2 focus-visible:outline-rally-accent"
        >
          <ArrowLeft aria-hidden className="h-4 w-4 rtl:rotate-180" />
          {hasInAppHistory ? t('common.back') : t('league.player.back')}
        </button>

        <header className="hero-rise hero-rise-2 mb-8">
          <h1 className="font-display text-4xl font-black tracking-tight md:text-5xl">
            {t('league.how.title')}
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-rally-text-2">{t('league.how.subtitle')}</p>
        </header>

        {/* The formula, as one line the rest of the page unpacks. */}
        <div className="hero-rise hero-rise-3 mb-10 rounded-2xl border border-rally-accent/40 bg-gradient-to-b from-rally-accent/10 to-rally-surface p-5">
          <p className="font-display text-lg font-black sm:text-xl" dir="rtl">
            <span className="text-rally-accent">{t('league.how.formulaPoints')}</span>
            <span className="text-rally-text-muted"> = </span>
            {t('league.how.formulaUnits')}
            <span className="text-rally-text-muted"> × </span>
            {t('league.how.formulaUnit')}
            <span className="text-rally-text-muted"> × </span>
            {t('league.how.formulaSize')}
          </p>
          <p className="mt-2 max-w-2xl text-sm text-rally-text-2">{t('league.how.formulaNote')}</p>
        </div>

        <Reveal>
          <section className="mb-10">
            <div className="grid gap-3 sm:grid-cols-2">
              {RULE_KEYS.map((rule, i) => (
                <div
                  key={rule.title}
                  data-testid={`league-how-rule-${i + 1}`}
                  className="rounded-2xl border border-rally-border border-s-2 border-s-rally-accent bg-rally-surface p-4"
                >
                  <p className="font-display text-sm font-bold">{t(rule.title)}</p>
                  <p className="mt-1 text-sm text-rally-text-2">{t(rule.body)}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        <Section title={t('league.how.s1Title')} lede={t('league.how.s1Lede')}>
          <TableShell>
            <thead>
              <HeadRow cells={[t('league.how.colStage'), t('league.how.colUnits')]} />
            </thead>
            <tbody>
              {STAGE_ROWS.map(row => (
                <tr key={row.key} className="border-b border-rally-border-subtle last:border-b-0">
                  <td className="px-4 py-2.5 text-start text-sm font-bold text-rally-text">{t(row.key)}</td>
                  <td
                    className={cn(
                      'px-4 py-2.5 text-start text-sm tabular-nums',
                      row.units === 0 ? 'text-rally-text-muted' : 'font-black text-rally-accent',
                    )}
                  >
                    {row.units}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Section>

        <Section title={t('league.how.s2Title')} lede={t('league.how.s2Lede')}>
          <TableShell>
            <thead>
              <HeadRow
                cells={[
                  t('league.how.colBand'),
                  t('league.how.colUnit'),
                  t('league.how.stageFinal'),
                  t('league.how.stageSemi'),
                  t('league.how.stageQuarter'),
                  t('league.how.stageEarly'),
                ]}
              />
            </thead>
            <tbody>
              {BAND_ROWS.map(row => (
                <tr key={row.band} className="border-b border-rally-border-subtle last:border-b-0">
                  <td className="px-4 py-2.5 text-start">
                    <span className="rounded-full bg-rally-accent-dim px-2.5 py-0.5 text-[11px] font-black text-rally-accent">
                      {row.band}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-start text-sm font-bold tabular-nums text-rally-text">{row.unit}</td>
                  {row.values.map((v, i) => (
                    <td
                      key={i}
                      className={cn(
                        'px-4 py-2.5 text-start text-sm tabular-nums',
                        i === 0 ? 'font-black text-rally-accent' : 'text-rally-text-2',
                      )}
                    >
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </TableShell>
          {/*
            The declared band is a CAP, not the row itself: settlement takes
            `min(declared, realised)` on the A>B>C>D ladder, where `realised` is
            the band of the field's MEDIAN skill level
            (`rally-api-rating app/services/league/{settlement_service,points}.py`).
            Without this the table above reads as "the event's level picks the
            row", and a player paid at C out of an "A" event has no way to
            understand why.
          */}
          <div
            data-testid="league-how-band-cap"
            className="mt-4 rounded-2xl border border-rally-border border-s-2 border-s-rally-accent bg-rally-surface p-4"
          >
            <p className="font-display text-sm font-bold">{t('league.how.s2CapTitle')}</p>
            <p className="mt-1 text-sm text-rally-text-2">{t('league.how.s2CapBody')}</p>
          </div>
        </Section>

        <Section title={t('league.how.s3Title')} lede={t('league.how.s3Lede')}>
          <TableShell>
            <thead>
              <HeadRow
                cells={[t('league.how.colDraw'), t('league.how.colMult'), t('league.how.colEffect')]}
              />
            </thead>
            <tbody>
              {SIZE_TIERS.map(tier => (
                <tr key={tier.range} className="border-b border-rally-border-subtle last:border-b-0">
                  <td className="px-4 py-2.5 text-start text-sm font-bold text-rally-text">
                    {t('league.how.pairsRange', { range: tier.range })}
                  </td>
                  <td className="px-4 py-2.5 text-start text-sm tabular-nums text-rally-text-2">{tier.mult}</td>
                  <td className="px-4 py-2.5 text-start text-sm tabular-nums text-rally-text-muted" dir="ltr">{tier.effect}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <p className="mt-3 text-sm text-rally-text-muted">{t('league.how.s3Note')}</p>
        </Section>

        <Section title={t('league.how.s4Title')}>
          <div className="rounded-2xl border border-rally-border bg-rally-surface p-5">
            <div className="flex flex-col">
              {WINDOW_QUARTERS.map(q => (
                <LedgerRow
                  key={`${q.year}-${q.n}`}
                  what={t('league.how.s4Q', {
                    quarter: t('league.quarters.label', { n: q.n, year: q.year }),
                    // The count goes through the pluralised key rather than into
                    // a sentence that hardcodes "events": the newest quarter here
                    // holds exactly one, and "1 events" (Hebrew "1 אירועים") is
                    // what the flat string printed.
                    events: t('league.quarters.events', { count: q.events }),
                    points: q.points,
                  })}
                  calc={String(q.points)}
                />
              ))}
              <div className="mt-2 flex items-baseline justify-between gap-6 border-t border-rally-border pt-3">
                <span className="text-sm font-bold text-rally-text">{t('league.how.windowTotal')}</span>
                <span className="font-display text-xl font-black tabular-nums text-rally-accent">
                  {WINDOW_TOTAL}
                </span>
              </div>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm text-rally-text-2">{t('league.how.s4Lede')}</p>
        </Section>

        <Section title={t('league.how.s5Title')}>
          <TableShell>
            <thead>
              <HeadRow
                cells={['#', t('league.how.colPlayer'), t('league.how.colBest'), t('league.how.colPoints')]}
              />
            </thead>
            <tbody>
              {[
                ['1', 'נועה לוי', '156 + 117 + 96 + 72', '441', true],
                ['1', 'דנה כהן', '156 + 117 + 96 + 72', '441', true],
                ['3', 'יותם בר', '230 + 60 + 60 + 45', '395', false],
                ['4', 'מאיה אדלר', '156 + 84 + 60 + 48', '348', false],
              ].map(([rank, name2, best, pts, tied], i) => (
                <tr key={i} className="border-b border-rally-border-subtle last:border-b-0">
                  <td className="px-4 py-2.5 text-start text-base font-black tabular-nums text-rally-text">
                    {rank as string}
                  </td>
                  <td className="px-4 py-2.5 text-start text-sm font-semibold text-rally-text">
                    {name2 as string}
                  </td>
                  <td className="px-4 py-2.5 text-start text-sm tabular-nums text-rally-text-muted">
                    {best as string}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-2.5 text-start text-sm font-black tabular-nums',
                      tied ? 'text-rally-accent' : 'text-rally-text',
                    )}
                  >
                    {pts as string}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <p className="mt-3 max-w-2xl text-sm text-rally-text-2">{t('league.how.s5Tie')}</p>
          <p className="mt-2 max-w-2xl text-sm text-rally-text-2">{t('league.how.s5Bands')}</p>
        </Section>

        <footer className="border-t border-rally-border pt-5 text-sm text-rally-text-muted">
          <p className="max-w-2xl">{t('league.how.footerNote')}</p>
          <Link
            to="/level"
            className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-rally-accent hover:text-rally-accent-hover"
          >
            {t('league.how.levelsLink')}
          </Link>
        </footer>
      </div>
    </main>
  );
}

function Section({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <Reveal>
      <section className="mb-10">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        {lede ? <p className="mt-1.5 max-w-2xl text-sm text-rally-text-2">{lede}</p> : null}
        <div className="mt-4">{children}</div>
      </section>
    </Reveal>
  );
}

function TableShell({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-rally-border bg-rally-surface">
      <table className="w-full min-w-[30rem] border-collapse">{children}</table>
    </div>
  );
}

function HeadRow({ cells }: { cells: string[] }): ReactElement {
  return (
    <tr className="border-b border-rally-border bg-rally-surface-2 text-[11px] font-black uppercase tracking-wider text-rally-text-muted">
      {cells.map((cell, i) => (
        <th key={i} scope="col" className="px-4 py-2.5 text-start">
          {cell}
        </th>
      ))}
    </tr>
  );
}

function LedgerRow({ what, calc }: { what: string; calc: string }): ReactElement {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-rally-border-subtle py-2 last:border-b-0">
      <span className="text-sm text-rally-text-2">{what}</span>
      <span className="shrink-0 text-sm tabular-nums text-rally-text" dir="ltr">
        {calc}
      </span>
    </div>
  );
}
