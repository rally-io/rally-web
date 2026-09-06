import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { biggestClimb, findChaseTarget } from '../components/boardInsights';
import { CircleEmptyState, CircleLoginCta } from '../components/CircleStates';
import { FrameControls, type FrameSelection } from '../components/FrameControls';
import { PlayerSearch } from '../components/PlayerSearch';
import { LeagueBackdrop } from '../components/LeagueBackdrop';
import { PersonalCard } from '../components/PersonalCard';
import { PlayerSeasonModal } from '../components/PlayerSeasonModal';
import { StandingsTable } from '../components/StandingsTable';
import { TopRanks } from '../components/TopRanks';
import { useCircleStandings } from '../hooks/useCircleStandings';
import { useMyLeagueCard } from '../hooks/useMyLeagueCard';
import { usePublicStandings } from '../hooks/usePublicStandings';
import { useAuth } from '@/hooks/useAuth';
import type { MyLeagueCard, StandingsRow } from '../types';

/**
 * The public league table.
 *
 * THE POINT OF THIS PAGE IS THAT IT WORKS LOGGED OUT. It is the acquisition surface:
 * an anonymous visitor must get the full table with no sign-in wall, no error and no
 * empty state. Signing in adds the personal card and the circle frame; it does not
 * unlock the page.
 *
 * Two data sources, picked by frame. `global` and `band` come from the public,
 * unauthenticated endpoint. `circle` — the players you have actually faced — is only
 * meaningful relative to a viewer, so the public endpoint rejects it with a 400 and it
 * comes from the authed one instead. Both hooks return the same shape, so everything
 * below this line is frame-agnostic.
 *
 * Ranks are never derived here. Rows go to the featured column and the table in
 * server order with server ranks, so a tie repeats a number (1, 1, 3) and page two
 * opens at 51.
 */
export default function RankingPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selection, setSelection] = useState<FrameSelection>({ frame: 'global', band: null });
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null);

  // The search box's live text and its debounced echo. Only the echo reaches
  // the wire, and only at 2+ characters — the API's own minimum.
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const isCircle = selection.frame === 'circle';
  const trimmedSearch = debouncedSearch.trim();
  // The circle has no search: the authed endpoint doesn't take `q`, and a
  // circle is small enough to scan. The input is hidden there too.
  const activeSearch = !isCircle && trimmedSearch.length >= 2 ? trimmedSearch : undefined;

  // A frame change clears the search immediately (no debounce lag): carrying
  // a filter into a frame whose input no longer shows it would silently
  // narrow the new board.
  function changeFrame(next: FrameSelection): void {
    setSelection(next);
    setSearchInput('');
    setDebouncedSearch('');
  }

  // Both hooks are always called — hooks cannot be conditional — but each is enabled
  // only for the frame it serves, so exactly one request is ever in flight.
  //
  // The public endpoint has no `circle`, and its param type says so. When the circle
  // frame is selected we park this hook on `band` with no band chosen, which leaves
  // its query disabled and idle rather than firing a request that would 400.
  const myCard = useMyLeagueCard();

  // "By level" opens on the viewer's own level. The picker state keeps `band`
  // null until a chip is pressed; the DEFAULT is derived here and never written
  // back, so leaving the frame and returning lands on the player's level again,
  // and an explicit pick always wins. Logged out (no card) nothing is assumed:
  // the picker waits for a choice, exactly as before.
  const myBand = myCard.card?.band_code ?? null;
  const effectiveSelection: FrameSelection =
    selection.frame === 'band' && selection.band === null && myBand !== null
      ? { frame: 'band', band: myBand }
      : selection;

  const publicStandings = usePublicStandings({
    frame: effectiveSelection.frame === 'circle' ? 'band' : effectiveSelection.frame,
    band: isCircle ? undefined : (effectiveSelection.band ?? undefined),
    q: activeSearch,
  });
  const circleStandings = useCircleStandings({ enabled: isCircle });

  const standings = isCircle ? circleStandings : publicStandings;
  const frameLabel = t(FRAME_HEADING_KEYS[selection.frame]);

  // The display name lives in Supabase user metadata; the league API carries none.
  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    typeof metadata.full_name === 'string' && metadata.full_name.trim()
      ? metadata.full_name
      : typeof metadata.name === 'string' && metadata.name.trim()
        ? metadata.name
        : null;

  return (
    // `isolate` keeps the page's composited layers (parallax, watermark
    // float, filtered title) in one stacking group — without it Chromium
    // intermittently sorts them above the backdrop-blur navbar mid-scroll.
    <main className="isolate overflow-x-clip pt-32 pb-24">
      <LeagueBackdrop />
      <div className="container relative mx-auto max-w-5xl px-4">
        {/* Oversized outlined brand mark floating behind the hero — the
            broadcast-graphics touch. Latin on purpose: it reads as the logo,
            not as a second copy of the Hebrew title. */}
        <span
          aria-hidden
          className="league-watermark pointer-events-none absolute end-[-4rem] top-[-5rem] text-[11rem] leading-none md:text-[16rem]"
        >
          RALLY
        </span>

        <header className="hero-rise hero-rise-1 relative mb-10">
          <h1 className="font-display text-5xl font-black tracking-tight md:text-7xl">
            {t('league.page.titleLead')}{' '}
            <span
              className="bg-gradient-to-b from-rally-accent to-[#8fb300] bg-clip-text text-transparent"
              style={{ filter: 'drop-shadow(0 0 22px rgba(204,255,0,0.35))' }}
            >
              {t('league.page.titleAccent')}
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-rally-text-2">{t('league.page.subtitle')}</p>
          {/* The bands this table is scaled by are documented on /level, and only
              there — cross-linked rather than re-explained here. */}
          <Link
            to="/ranking/how"
            className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-rally-accent hover:text-rally-accent-hover"
          >
            {t('league.page.howLevelsWork')}
          </Link>

          {/* Partner stage — a real "powered by" lockup, not a footnote: the
              logo at card size in its own white plate (it keeps its navy-on-
              white brand on our dark ground), with the community named. */}
          <div className="mt-6 flex w-fit items-center gap-4 rounded-2xl border border-rally-border bg-rally-surface py-3 ps-4 pe-6">
            <span className="inline-flex items-center rounded-xl bg-white px-4 py-2.5">
              <img src="/tom-bakshi.jpg" alt="Tom Bakshi Padel Community" className="h-11 w-auto" />
            </span>
            <span className="leading-tight">
              <span className="block text-[11px] font-bold uppercase tracking-widest text-rally-accent">
                {t('league.page.partner')}
              </span>
              <span className="block font-display text-base font-bold text-rally-text">
                Tom Bakshi
              </span>
            </span>
          </div>
        </header>

        <FrameControls value={effectiveSelection} onChange={changeFrame} className="hero-rise hero-rise-2 mb-4" />

        {!isCircle ? (
          <PlayerSearch
            value={searchInput}
            onChange={setSearchInput}
            className="hero-rise hero-rise-3 mb-6 max-w-sm"
          />
        ) : null}

        {/* Only for signed-in visitors, and never a gate on the table below.
            The chase target only exists on the global frame: the card's rank
            is the GLOBAL rank, and pointing it at a band-ranked row would
            compare numbers from two different races. It is then narrowed again
            to the viewer's own block — see `chaseInsideBlock`. */}
        {myCard.isSignedIn && myCard.card ? (
          <PersonalCard
            card={myCard.card}
            name={displayName}
            frameLabel={frameLabel}
            frame={selection.frame}
            band={effectiveSelection.band ?? null}
            chaseTarget={
              // Never during a search: the rows are name-filtered, so "the row
              // above you" may not be the player actually above you.
              selection.frame === 'global' && !activeSearch
                ? chaseInsideBlock(
                    findChaseTarget(standings.rows, myCard.card.global_rank),
                    myCard.card,
                  )
                : null
            }
            className="mb-8"
          />
        ) : null}

        {/* A circle needs a viewer: logged out, the frame's answer is a door,
            not a table — and the guarded hook never fires the request. */}
        {isCircle && !myCard.isSignedIn ? (
          <CircleLoginCta />
        ) : (
          <StandingsSection
            standings={standings}
            isCircle={isCircle}
            isSearching={activeSearch !== undefined}
            onSelectPlayer={row => setOpenPlayerId(row.player_id)}
          />
        )}

        {/* The acquisition nudge, for visitors only — signed-in players already
            have their card above. Under the table, never in front of it. */}
        {!myCard.isSignedIn ? (
          <aside
            data-testid="league-cta"
            className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rally-border bg-rally-surface p-5"
          >
            <div>
              <p className="font-display text-lg font-bold">{t('league.cta.title')}</p>
              <p className="mt-1 text-sm text-rally-text-2">{t('league.cta.body')}</p>
            </div>
            <Link
              to="/download"
              className="rounded-full bg-rally-accent px-6 py-2.5 font-display text-sm font-black text-rally-accent-text shadow-glow-electric transition-all hover:bg-rally-accent-hover active:scale-[0.98]"
            >
              {t('league.cta.button')}
            </Link>
          </aside>
        ) : null}
      </div>

      {/* One modal for the whole board: browsing players never costs the visitor
          their scroll position or their chosen frame. */}
      <PlayerSeasonModal playerId={openPlayerId} onClose={() => setOpenPlayerId(null)} />
    </main>
  );
}

/**
 * The chase target, kept only when it sits in the viewer's OWN block — same
 * level, same settledness.
 *
 * The global board is ordered level-first, so the row directly above a rank is
 * not always a rival the viewer can actually pass. For the top settled player of
 * every level below A it is the bottom row of the level above; for every
 * provisional player it is the weakest settled player of their own level. Rule 4
 * makes the first gap closable only by a level change and rule 5 the second only
 * by four rated matches — so "you are N points behind" would invite a player to
 * run at a wall no number of points moves.
 *
 * Row `band_code` is `.nullish()` (an absent key stays `undefined`) while the
 * card's is `.nullable()` (absent degrades to `null`), so the row side is
 * normalised with `?? null` before the comparison.
 */
function chaseInsideBlock(target: StandingsRow | null, card: MyLeagueCard): StandingsRow | null {
  if (target === null) return null;
  const sameBlock =
    (target.band_code ?? null) === card.band_code && target.is_provisional === card.is_provisional;
  return sameBlock ? target : null;
}

/**
 * The personal card's frame phrase, as prose rather than the chip label: the
 * chips say "לפי רמה", but "המקום שלך בלפי רמה" is not a sentence. Literal keys
 * in a map, never a template literal — see the note in RankCell.tsx.
 */
const FRAME_HEADING_KEYS: Record<FrameSelection['frame'], string> = {
  global: 'league.personal.inGlobal',
  band: 'league.personal.inBand',
  circle: 'league.personal.inCircle',
};

/**
 * The board splits in two whenever there is a top to feature: from three rows up,
 * the first ten (or all of them, on a smaller board) become the featured column
 * and the table carries on with the rest. One or two rows stay a plain table — a
 * ladder of one is not a ladder. When every row is featured the table is not
 * rendered at all, so the empty-table sentence ("nobody is ranked") can never sit
 * directly beneath ranked players. The `rank === 1` guard keeps a page that opens
 * at 51 (or any later page) as pure table: the featured column is the top of a
 * frame, and only page one contains it.
 *
 * This is a DISPLAY split of the same server page — nothing is dropped,
 * reordered or renumbered, and each row's rank travels with it into whichever
 * half it lands in.
 */
const FEATURED_COUNT = 10;
const FEATURED_MIN_ROWS = 3;

function splitForDisplay(rows: StandingsRow[]): {
  featured: StandingsRow[];
  tableRows: StandingsRow[];
} {
  const hasFeatured = rows.length >= FEATURED_MIN_ROWS && rows[0]?.rank === 1;
  return hasFeatured
    ? { featured: rows.slice(0, FEATURED_COUNT), tableRows: rows.slice(FEATURED_COUNT) }
    : { featured: [], tableRows: rows };
}

type StandingsSectionProps = {
  standings: ReturnType<typeof usePublicStandings>;
  /** The circle frame swaps the generic empty table for the go-play invitation. */
  isCircle: boolean;
  /**
   * A name search is active: the rows are a filtered slice of the frame, so
   * the featured column (the top of the frame), the climber crown (biggest
   * climb on the board) and the season line all step aside — each would be a
   * claim about the whole board made from a fragment of it.
   */
  isSearching: boolean;
  onSelectPlayer: (row: StandingsRow) => void;
};

/**
 * The five states this section can be in are genuinely different answers and are kept
 * apart on purpose:
 *
 * - awaiting a band  → the visitor has not chosen yet; nothing is wrong, nothing loads
 * - no active season → a valid 200 answer meaning the season has not started
 * - error            → the request failed; NOT "nobody is ranked"
 * - empty            → a successful response with zero rows
 * - rows             → the featured column and the table
 *
 * Collapsing error into empty is the specific mistake worth avoiding: it tells a
 * visitor the league has no players when in fact the site could not reach the server.
 */
function StandingsSection({ standings, isCircle, isSearching, onSelectPlayer }: StandingsSectionProps) {
  const { t } = useTranslation();

  if (standings.isAwaitingBand) {
    return <StateCard testId="league-awaiting-band" message={t('league.page.chooseBand')} />;
  }

  if (standings.isLoading) {
    return (
      <div
        data-testid="league-loading"
        aria-label={t('league.page.loading')}
        className="overflow-hidden rounded-2xl border border-rally-border bg-rally-surface"
      >
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="flex animate-pulse items-center gap-4 border-b border-rally-border-subtle px-4 py-3 last:border-b-0"
          >
            <span className="h-4 w-6 rounded bg-rally-surface-2" />
            <span className="h-8 w-8 rounded-full bg-rally-surface-2" />
            <span className="h-4 w-40 rounded bg-rally-surface-2" />
            <span className="ms-auto h-4 w-10 rounded bg-rally-surface-2" />
          </div>
        ))}
      </div>
    );
  }

  if (standings.noActiveSeason) {
    return <StateCard testId="league-no-season" message={t('league.page.noSeason')} />;
  }

  if (standings.error) {
    return <StateCard testId="league-error" message={t('league.page.error')} />;
  }

  // A successful, genuinely empty circle: a real answer ("you haven't faced
  // anyone yet"), so it gets the go-play invitation, not the generic table.
  if (isCircle && standings.isEmpty) {
    return <CircleEmptyState />;
  }

  // Nobody matched the name — say exactly that, not "nobody is ranked".
  if (isSearching && standings.isEmpty) {
    return <StateCard testId="league-search-empty" message={t('league.search.empty')} />;
  }

  // During a search everything stays a plain table with true frame ranks: the
  // featured ladder is the top of the FRAME, and a result set is not that.
  const { featured, tableRows } = isSearching
    ? { featured: [], tableRows: standings.rows }
    : splitForDisplay(standings.rows);
  // The week's biggest climb across the WHOLE page — the crown must not
  // depend on which half of the display split a row landed in. Suppressed
  // during a search, where "the whole page" is a name-filtered fragment.
  const climb = isSearching ? null : biggestClimb(standings.rows);

  return (
    <>
      {isSearching ? (
        <p
          data-testid="league-search-count"
          className="mb-4 text-xs font-bold uppercase tracking-widest text-rally-text-muted"
        >
          {t('league.search.count', { count: standings.totalPlayers ?? 0 })}
        </p>
      ) : standings.season ? (
        <p
          data-testid="league-season"
          className="mb-4 text-xs font-bold uppercase tracking-widest text-rally-text-muted"
        >
          {t('league.page.seasonLine', {
            season: standings.season.name,
            total: standings.totalPlayers ?? 0,
          })}
        </p>
      ) : null}

      {featured.length > 0 ? (
        <TopRanks rows={featured} onSelect={onSelectPlayer} climbOfTheWeek={climb} className="mb-8" />
      ) : null}

      {/* Everything featured: no table, so its empty sentence never contradicts
          the ladder right above it. */}
      {tableRows.length > 0 || featured.length === 0 ? (
        <StandingsTable rows={tableRows} onSelectPlayer={onSelectPlayer} climbOfTheWeek={climb} />
      ) : null}

      {/* The rest of the board, one server page at a time. Only rendered while
          the server says more rows exist — its absence is the "you have seen
          everyone" signal, so it must never linger after the last page. */}
      {standings.hasMore ? (
        <button
          type="button"
          data-testid="league-load-more"
          onClick={standings.loadMore}
          disabled={standings.isLoadingMore}
          className="mt-4 block w-full rounded-2xl border border-rally-border bg-rally-surface px-4 py-3.5 text-sm font-bold text-rally-text-2 transition-colors hover:border-rally-accent/40 hover:text-rally-accent disabled:cursor-default disabled:opacity-60"
        >
          {standings.isLoadingMore ? t('league.page.loading') : t('league.page.loadMore')}
        </button>
      ) : null}
    </>
  );
}

function StateCard({ testId, message }: { testId: string; message: string }) {
  return (
    <p
      data-testid={testId}
      className="rounded-2xl border border-rally-border bg-rally-surface px-4 py-12 text-center text-sm font-semibold text-rally-text-2"
    >
      {message}
    </p>
  );
}
