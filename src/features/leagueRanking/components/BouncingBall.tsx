import type { ReactElement } from 'react';

const BALL = 34;
const TRAVEL = 20;

/**
 * The product's bouncing padel ball, ported keyframe-for-keyframe from
 * rally-mobile `src/components/home/BouncingBall.tsx` (keep the two in step):
 * same 1240ms loop, same squash/stretch poses, same per-segment easing —
 * one timing function per bounce segment, because a single easing across the
 * loop decelerates into the floor and reads as a stall. The keyframes and
 * curves live in App.css (`league-ball-bounce` / `league-ball-shadow`).
 *
 * The translateY values bake in the mobile port's centre-scaling correction,
 * pinning the ball's BOTTOM to the floor through the deformation. Reduced
 * motion rests at the undeformed pose (App.css) — frame 0 is the contact
 * squash, and freezing there would leave a permanently flattened ball.
 */
export function BouncingBall(): ReactElement {
  return (
    <div aria-hidden className="relative mx-auto" style={{ width: BALL + 8, height: BALL + TRAVEL }}>
      {/* Black, not accent: a lime ellipse on a dark card reads as a second
          glowing object, not a shadow — verified on device by the mobile team. */}
      <span className="league-bounce-shadow absolute bottom-0 inset-x-0 mx-auto h-[5px] w-[26px] rounded-[3px] bg-black" />
      <span
        className="league-bounce-ball absolute top-0 inset-x-0 mx-auto block"
        style={{ width: BALL, height: BALL }}
      >
        <svg width={BALL} height={BALL} viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="17" fill="#ccff00" />
          <path
            d="M7 8 Q15 20 7 32"
            fill="none"
            stroke="rgba(0,0,0,0.34)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M33 8 Q25 20 33 32"
            fill="none"
            stroke="rgba(0,0,0,0.34)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </div>
  );
}
