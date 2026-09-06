import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeagueBackdrop } from '../components/LeagueBackdrop';
import { Reveal } from '../components/Reveal';

/**
 * The public explanation of league scoring — the page behind the board's
 * "how the scoring works" link. Content mirrors the reviewed scoring spec
 * (the six rules, band row × size multiplier, the bucket ladder, the rolling
 * four-quarter window, real ties), minus its internal open-questions section:
 * this page explains the system to a player, it doesn't draft it.
 *
 * The numbers in the tables are DISPLAY COPIES of the engine's constants
 * (`rally-api app/services/league/points.py`). If the engine's table ever
 * changes, this page must change with it — they are the same product fact.
 */

const BAND_ROWS: Array<{ band: string; values: number[] }> = [
  { band: 'A', values: [300, 180, 90, 50, 25, 14] },
  { band: 'B', values: [150, 90, 50, 25, 14, 8] },
  { band: 'C', values: [80, 45, 25, 14, 8, 5] },
  { band: 'D', values: [40, 22, 14, 8, 5, 3] },
];

const SIZE_TIERS: Array<{ range: string; mult: string; effect: string }> = [
  { range: '4–7', mult: '× 0.50', effect: '150 → 75' },
  { range: '8–15', mult: '× 0.75', effect: '150 → 113' },
  { range: '16–31', mult: '× 1.00', effect: '150 → 150' },
  { range: '32+', mult: '× 1.25', effect: '150 → 188' },
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
 * the three before it. Points here are a DISPLAY EXAMPLE, chosen to match
 * the s4Lede narrative (Q4 2025 = 150, the quarter that rolls off) and to sum
 * to the same 421 shown for Noa in the section 5 table below.
 */
const WINDOW_QUARTERS: Array<{ n: number; year: number; events: number; points: number }> = [
  { n: 4, year: 2025, events: 2, points: 150 },
  { n: 1, year: 2026, events: 2, points: 113 },
  { n: 2, year: 2026, events: 2, points: 90 },
  { n: 3, year: 2026, events: 1, points: 68 },
];
const WINDOW_TOTAL = WINDOW_QUARTERS.reduce((sum, q) => sum + q.points, 0);

export default function HowScoringPage(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const goBack = (): void => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate('/ranking');
    }
  };

  const bucketCells: Array<[string, string, string, string]> = [
    [t('league.bucket.first'), t('league.how.cellWinner'), t('league.how.cellT1'), t('league.how.cellWinner')],
    [t('league.bucket.second'), t('league.how.cellFinalist'), t('league.how.cellT2'), t('league.how.cellFinalist')],
    [t('league.bucket.top4'), t('league.how.cellSemi'), t('league.how.cellT34'), t('league.how.cellSemi')],
    [t('league.bucket.top8'), t('league.how.cellQuarter'), t('league.how.cellT58'), t('league.how.cellQuarter')],
    [t('league.bucket.top16'), t('league.how.cellR16'), t('league.how.cellT916'), t('league.how.cellGroupOut')],
    [t('league.bucket.top32'), t('league.how.cellR32'), t('league.how.cellT1732'), '—'],
  ];

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
          {t('league.player.back')}
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
            {t('league.how.formulaBand')}
            <span className="text-rally-text-muted">[</span>
            {t('league.how.formulaBucket')}
            <span className="text-rally-text-muted">]</span>
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
              <HeadRow
                cells={[
                  t('league.how.colBucket'),
                  t('league.how.colElim'),
                  t('league.how.colRR'),
                  t('league.how.colGroupKO'),
                ]}
              />
            </thead>
            <tbody>
              {bucketCells.map(([bucket, elim, rr, gko]) => (
                <tr key={bucket} className="border-b border-rally-border-subtle last:border-b-0">
                  <td className="px-4 py-2.5 text-start text-sm font-bold text-rally-text">{bucket}</td>
                  <td className="px-4 py-2.5 text-start text-sm text-rally-text-2">{elim}</td>
                  <td className="px-4 py-2.5 text-start text-sm text-rally-text-2">{rr}</td>
                  <td className="px-4 py-2.5 text-start text-sm text-rally-text-2">{gko}</td>
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
                  t('league.bucket.first'),
                  t('league.bucket.second'),
                  t('league.bucket.top4'),
                  t('league.bucket.top8'),
                  t('league.bucket.top16'),
                  t('league.bucket.top32'),
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
                ['1', 'נועה לוי', '150 + 113 + 90 + 68', '421', true],
                ['1', 'דנה כהן', '150 + 113 + 90 + 68', '421', true],
                ['3', 'יותם בר', '225 + 50 + 50 + 38', '363', false],
                ['4', 'מאיה אדלר', '150 + 80 + 60 + 50', '340', false],
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
