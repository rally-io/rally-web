import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BouncingBall } from './BouncingBall';

/**
 * The circle frame's two non-table answers. They are separate components with
 * separate testids because they answer different visitors:
 *
 * - `CircleLoginCta` — logged out. A circle needs a viewer, so instead of a
 *   table there is a door: sign in (the /login page carries signup too, so one
 *   honest button covers both). The page renders this INSTEAD of the standings
 *   section, so no `frame=circle` request is ever fired without a session.
 *
 * - `CircleEmptyState` — signed in, zero opponents. This is a real, successful
 *   answer ("you haven't faced anyone yet"), and it gets the product's
 *   bouncing ball and an invitation to go play, not a bare "empty" sentence.
 */
export function CircleLoginCta(): ReactElement {
  const { t } = useTranslation();
  return (
    <section
      data-testid="league-circle-cta"
      className="rounded-2xl border border-rally-border bg-rally-surface px-6 py-12 text-center"
    >
      <h2 className="font-display text-xl font-bold text-rally-text">
        {t('league.circle.ctaTitle')}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-rally-text-2">
        {t('league.circle.ctaBody')}
      </p>
      <Link
        to="/login?next=/ranking"
        className="mt-6 inline-block rounded-full bg-rally-accent px-6 py-2.5 font-display text-sm font-black text-rally-accent-text shadow-glow-electric transition-all hover:bg-rally-accent-hover active:scale-[0.98]"
      >
        {t('league.circle.ctaButton')}
      </Link>
    </section>
  );
}

export function CircleEmptyState(): ReactElement {
  const { t } = useTranslation();
  return (
    <section
      data-testid="league-circle-empty"
      className="rounded-2xl border border-rally-border bg-rally-surface px-6 py-12 text-center"
    >
      <BouncingBall />
      <h2 className="mt-5 font-display text-xl font-bold text-rally-text">
        {t('league.circle.emptyTitle')}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-rally-text-2">
        {t('league.circle.emptyBody')}
      </p>
      <Link
        to="/tournaments"
        className="mt-6 inline-block rounded-full bg-rally-accent px-6 py-2.5 font-display text-sm font-black text-rally-accent-text shadow-glow-electric transition-all hover:bg-rally-accent-hover active:scale-[0.98]"
      >
        {t('league.circle.emptyButton')}
      </Link>
    </section>
  );
}
