import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { BAND_CODES, type BandCode } from '../types';

/**
 * Every frame the ranking UI can offer. `PUBLIC_FRAMES` in `types.ts` is the
 * narrower set the PUBLIC endpoint accepts — this one adds `circle`, which needs
 * a viewer and is therefore only ever offered to a signed-in one.
 *
 * The array stays module-private and only the type is exported: a value export
 * beside a component trips `react-refresh/only-export-components`
 * (`allowConstantExport` covers literals, not an `as const` array), and nothing
 * outside needs the list — callers hold a `LeagueFrame`, this file renders the
 * chips.
 */
const LEAGUE_FRAMES = ['global', 'band', 'circle'] as const;
export type LeagueFrame = (typeof LEAGUE_FRAMES)[number];

/**
 * A frame and, for `band`, which band.
 *
 * `band: null` under `frame: 'band'` is a real, valid, intermediate state: the
 * visitor has asked for a band table and has not said which. `usePublicStandings`
 * reads exactly this as `isAwaitingBand` and issues no request, which is why the
 * choice travels up to the caller instead of being hoarded in this component.
 */
export type FrameSelection = { frame: LeagueFrame; band: BandCode | null };

type FrameControlsProps = {
  value: FrameSelection;
  onChange: (next: FrameSelection) => void;
  className?: string;
};

/** Literal keys, never a template literal — see the note in RankCell.tsx. */
const FRAME_KEYS: Record<LeagueFrame, string> = {
  global: 'league.frame.global',
  band: 'league.frame.band',
  circle: 'league.frame.circle',
};

/**
 * The frame chips, plus the band picker the `band` frame requires.
 *
 * TWO PRODUCT RULES LIVE HERE, and both are about not lying to a visitor.
 *
 * 1. THE CIRCLE CHIP SHOWS FOR EVERYONE, but a logged-out visitor who selects
 *    it gets a sign-in CTA (rendered by the page), never a table: a circle is
 *    "players you have faced", so it needs a viewer. This REVERSES the launch
 *    rule that hid the chip when logged out (2026-09-02, product decision):
 *    the old rationale — "a chip with no way to earn the feature" — stopped
 *    holding once the CTA became exactly that way. The page guards the fetch,
 *    so no `frame=circle` request is ever fired without a session.
 *
 * 2. THE BAND FRAME NEVER DEFAULTS TO A BAND. Choosing `band` emits
 *    `{ frame: 'band', band: null }` and reveals the picker; nothing is requested
 *    until the visitor picks. Quietly starting at A would put a table under a
 *    heading that does not describe it, and being wrong about which population is
 *    ranked is exactly the failure this feature cannot afford. The picker shows
 *    for a signed-in visitor too: the table always reads the public endpoint,
 *    which cannot resolve "my band" from a session it never sees.
 *
 * Re-selecting what is already selected is a no-op, so a stray second click on
 * the band chip cannot throw away the band the visitor just chose.
 */
export function FrameControls({ value, onChange, className }: FrameControlsProps): ReactElement {
  const { t } = useTranslation();

  function selectFrame(frame: LeagueFrame): void {
    if (frame === value.frame) return;
    onChange({ frame, band: null });
  }

  function selectBand(band: BandCode): void {
    if (value.frame === 'band' && value.band === band) return;
    onChange({ frame: 'band', band });
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div
        role="group"
        aria-label={t('league.frame.legend')}
        className="flex flex-wrap items-center gap-2"
      >
        {LEAGUE_FRAMES.map(frame => (
          <button
            key={frame}
            type="button"
            data-frame={frame}
            data-testid={frame === 'circle' ? 'league-frame-circle' : undefined}
            aria-pressed={frame === value.frame}
            onClick={() => selectFrame(frame)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-bold transition-all',
              frame === value.frame
                ? 'bg-rally-accent text-rally-accent-text shadow-glow-electric'
                : 'border border-rally-border bg-rally-surface text-rally-text-2 hover:border-rally-border-strong hover:text-rally-text',
            )}
          >
            {t(FRAME_KEYS[frame])}
          </button>
        ))}
      </div>

      {value.frame === 'band' && (
        <div
          data-testid="band-picker"
          role="group"
          aria-label={t('league.band.legend')}
          className="flex flex-wrap items-center gap-2"
        >
          {BAND_CODES.map(band => (
            <button
              key={band}
              type="button"
              data-band={band}
              aria-pressed={value.band === band}
              onClick={() => selectBand(band)}
              className={cn(
                'min-w-10 rounded-lg px-3 py-1.5 text-sm font-black tabular-nums transition-all',
                value.band === band
                  ? 'bg-rally-accent text-rally-accent-text shadow-glow-electric'
                  : 'border border-rally-border bg-rally-surface text-rally-text-2 hover:border-rally-border-strong hover:text-rally-text',
              )}
            >
              {band}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
