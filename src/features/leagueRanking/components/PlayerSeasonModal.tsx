import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { PlayerSeasonContent } from './PlayerSeasonContent';

type PlayerSeasonModalProps = {
  /** The player to show, or null for closed. */
  playerId: string | null;
  onClose: () => void;
};

/**
 * A player picked from the board opens here, in place — the board stays behind
 * the overlay, so browsing players never costs the visitor their scroll position
 * or their chosen frame. The full page at `/ranking/player/:id` still exists;
 * it is the SHARE target (a modal has no URL), and the footer link hands it out.
 */
export function PlayerSeasonModal({ playerId, onClose }: PlayerSeasonModalProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Dialog open={playerId !== null} onOpenChange={open => (open ? undefined : onClose())}>
      <DialogContent
        data-testid="player-season-modal"
        aria-describedby={undefined}
        className="max-h-[85vh] max-w-xl overflow-y-auto rounded-3xl border-rally-border bg-rally-bg p-5 text-rally-text sm:p-6"
      >
        <DialogTitle className="sr-only">{t('league.player.modalTitle')}</DialogTitle>
        {playerId !== null ? (
          <>
            <PlayerSeasonContent playerId={playerId} variant="modal" />
            <Link
              to={`/ranking/player/${playerId}`}
              onClick={onClose}
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-rally-accent hover:text-rally-accent-hover"
            >
              {t('league.player.openFull')}
            </Link>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
