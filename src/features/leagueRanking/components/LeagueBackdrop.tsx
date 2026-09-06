import { useEffect, useRef, type CSSProperties, type ReactElement } from 'react';

/**
 * The league surfaces' ambient backdrop, now with real scroll parallax.
 *
 * Three depth layers ride a `--py` CSS variable (the page's scroll offset,
 * written once per animation frame): the far layer moves at 18% of scroll
 * speed, the mid at 35%, the near at 55%. Because each layer is seeded with
 * glows and oversized outline words all the way down its 3400px canvas, new
 * material keeps surfacing as the visitor scrolls the board — the deep page
 * is never flat black, and the speed difference between layers is what makes
 * it read as depth.
 *
 * The stadium glow stays pinned to the top of the viewport (the hero keeps
 * its floodlights), and everything degrades cleanly:
 * - `prefers-reduced-motion` → no scroll listener, layers hold still (the
 *   blob drift and watermark float are separately disabled in App.css);
 * - no `matchMedia` (jsdom) → treated as no preference, but the listener is
 *   harmless there anyway.
 */
export function LeagueBackdrop(): ReactElement {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const parallax = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let frame = 0;
    const update = (): void => {
      if (parallax) {
        node.style.setProperty('--py', `${window.scrollY}px`);
      }
      // The whole backdrop bows out before the page ends: fully present for
      // the top 55% of the scroll, gone by 80%, so the table's tail, the CTA
      // and the footer sit on clean dark. Applied even under reduced motion —
      // it is scroll-dependent visibility, not animation, and without it the
      // static backdrop would pin its elements over the bottom forever.
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const fraction = max > 60 ? window.scrollY / max : 0;
      node.style.opacity = String(Math.max(0, Math.min(1, (0.8 - fraction) / 0.25)));
      frame = 0;
    };
    const onScroll = (): void => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    // Positioned WITHOUT a negative z-index, deliberately: body carries an
    // opaque `bg-rally-bg`, and a negative-z layer paints BEHIND that
    // background — invisibly. As a positioned element it paints above body's
    // background, and the page containers (also positioned, later in the DOM)
    // paint above it.
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ '--py': '0px' } as CSSProperties}
    >
      {/* Pinned stadium glow — the hero's floodlights, unaffected by scroll. */}
      <div
        className="absolute inset-x-0 top-0 h-[52vh]"
        style={{
          background:
            'radial-gradient(ellipse 90% 100% at 50% 0%, rgba(204,255,0,0.16), rgba(204,255,0,0.05) 45%, transparent 75%)',
        }}
      />

      {/* FAR layer — outlined words and a big court fragment, at 18% of
          scroll speed. Court markings replaced the glow clouds: structure
          instead of fog, and a floor for the ball to roll across. */}
      <div
        className="absolute inset-x-0 top-0 h-[3400px] will-change-transform"
        style={{ transform: 'translate3d(0, calc(var(--py) * -0.18), 0)' }}
      >
        <div
          className="league-watermark absolute end-[-3rem] top-[560px] text-[10rem] leading-none md:text-[14rem]"
          style={{ animationDelay: '-6s' }}
        >
          PADEL
        </div>
        <div
          className="league-watermark absolute start-[-2rem] top-[1900px] text-[10rem] leading-none md:text-[15rem]"
          style={{ animationDelay: '-12s' }}
        >
          2026
        </div>
        <CourtLines
          className="absolute start-[-14rem] top-[120px] w-[1200px] rotate-[-7deg]"
          opacity={0.09}
        />
        <CourtLines
          className="absolute end-[-18rem] top-[2350px] w-[1300px] rotate-[6deg]"
          opacity={0.09}
        />
      </div>

      {/* MID layer — a nearer, slightly brighter court fragment: the speed
          difference against the far one is what reads as depth. */}
      <div
        className="absolute inset-x-0 top-0 h-[3400px] will-change-transform"
        style={{ transform: 'translate3d(0, calc(var(--py) * -0.35), 0)' }}
      >
        <CourtLines
          className="absolute end-[-10rem] top-[1150px] w-[900px] rotate-[4deg]"
          opacity={0.13}
        />
      </div>

      {/* The padel ball — a real one. Scrolling rolls it across the page
          (App.css: `.league-ball` travels, `.league-ball-spin` rotates in
          step, both off the same --py) — it slips behind the content column
          and re-emerges on the far side. It starts just outside the
          inline-start edge, so the very first scroll brings it on. */}
      <div className="league-ball absolute start-[-9rem] top-[58%] will-change-transform">
        <img
          src="/padel-ball.png"
          alt=""
          className="league-ball-spin h-28 w-28 md:h-36 md:w-36"
          style={{ filter: 'drop-shadow(0 14px 18px rgba(0,0,0,0.45))' }}
        />
      </div>
    </div>
  );
}

/**
 * A padel court drawn as its markings only: outline, net line across the
 * middle, the two service lines and the centre line joining them — the
 * T-geometry every racket player recognises at a glance. Stroke-only lime at
 * whisper opacity, so it reads as chalk on the night court behind the board.
 * 2:1 viewBox matches the real 20x10m footprint.
 */
function CourtLines({
  className,
  opacity,
}: {
  className?: string;
  opacity: number;
}): ReactElement {
  return (
    <svg
      viewBox="0 0 1000 500"
      className={className}
      aria-hidden
      style={{ opacity }}
      fill="none"
      stroke="#ccff00"
      strokeWidth="3"
    >
      <rect x="6" y="6" width="988" height="488" rx="2" />
      {/* Net across the middle — slightly heavier, it is the court's spine. */}
      <line x1="500" y1="6" x2="500" y2="494" strokeWidth="6" />
      {/* Service lines and the centre line joining them. */}
      <line x1="155" y1="6" x2="155" y2="494" />
      <line x1="845" y1="6" x2="845" y2="494" />
      <line x1="155" y1="250" x2="845" y2="250" />
    </svg>
  );
}
