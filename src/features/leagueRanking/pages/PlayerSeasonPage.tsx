import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { BallLink } from '../components/BallLink';
import { LeagueBackdrop } from '../components/LeagueBackdrop';
import { PlayerSeasonContent } from '../components/PlayerSeasonContent';

/**
 * One player's season at its own URL — the page a player SHARES. Day-to-day
 * browsing from the board happens in `PlayerSeasonModal`; both render
 * `PlayerSeasonContent`, so this shell only supplies the route param, the page
 * frame and the way back.
 *
 * Note this page cannot verify its own share preview. rally-web is a plain Vite
 * SPA with one static set of OG tags, and social crawlers do not execute
 * JavaScript, so nothing React writes at runtime reaches them. Share cards need
 * the server-side handler; see the plan's Task 10.
 */
export default function PlayerSeasonPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // A player's id IS the auth uid, so a viewer on their own page gets "find yourself".
  const { session } = useAuth();
  const viewerId = session?.user?.id ?? null;

  // Arrived from inside the app → real history back, which restores the
  // board's scroll and chosen frame. Arrived cold on a shared link → there is
  // no in-app history to go back to, so "back" means the ranking board.
  //
  // Read ONCE, for both the label and the click: a history back can land on the
  // globe, the network page, anywhere, so only the fallback branch may promise
  // the ranking board. Deciding the label separately from the destination is
  // exactly how the two drifted apart in the first place.
  const hasInAppHistory: boolean = window.history.state?.idx > 0;

  const goBack = (): void => {
    if (hasInAppHistory) {
      navigate(-1);
    } else {
      navigate('/ranking');
    }
  };

  return (
    <main className="isolate pt-32 pb-24">
      <LeagueBackdrop />
      {/* `relative` is load-bearing: it lifts the content above the backdrop
          layer, which paints over body's background. */}
      <div className="container relative mx-auto max-w-3xl px-4">
        {/* The way back and the way onward share one row: the board behind, the ball ahead. */}
        <div className="hero-rise hero-rise-1 mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 text-sm font-bold text-rally-text-2 transition-colors hover:text-rally-text focus-visible:outline-2 focus-visible:outline-rally-accent"
          >
            <ArrowLeft aria-hidden className="h-4 w-4 rtl:rotate-180" />
            {hasInAppHistory ? t('common.back') : t('league.player.back')}
          </button>
          {id ? <BallLink playerId={id} isSelf={id === viewerId} source="player_page" withLabel /> : null}
        </div>

        <div className="hero-rise hero-rise-2">
          <PlayerSeasonContent playerId={id} variant="page" />
        </div>
      </div>
    </main>
  );
}
