import { useId } from 'react'

type BallMarkProps = { size?: number; className?: string }

/**
 * The globe's mark, ported from the app's `GlobeBallMark`: a lit padel ball with two seams,
 * three player dots and their links. Decorative — the text beside it carries the meaning.
 * Each mount gets its own gradient id: two marks on one page sharing an id paint one black.
 * Strokes and dots are one step heavier than the app's, so the mark survives 16 px.
 */
export function BallMark({ size = 16, className }: BallMarkProps) {
  const felt = `${useId()}-felt`
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden="true" className={className}>
      <defs>
        <radialGradient id={felt} cx="38%" cy="34%" r="70%">
          <stop offset="0" stopColor="#e6ff5c" />
          <stop offset="0.6" stopColor="#9db326" />
          <stop offset="1" stopColor="#3f4b10" />
        </radialGradient>
      </defs>
      <circle cx="36" cy="36" r="30" fill={`url(#${felt})`} />
      <path data-part="seam" d="M14 22 C 30 30, 42 42, 58 50" stroke="#e9e7cf" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path data-part="seam" d="M20 54 C 28 40, 44 32, 52 18" stroke="#e9e7cf" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle data-part="dot" cx="26" cy="30" r="4" fill="#ccff00" />
      <circle data-part="dot" cx="46" cy="44" r="4" fill="#f2d16b" />
      <circle data-part="dot" cx="42" cy="24" r="3.4" fill="#b8c4d6" />
      <path d="M26 30 Q 36 22 42 24" stroke="#ccff00" strokeWidth="1.8" fill="none" opacity="0.85" />
      <path d="M26 30 Q 34 44 46 44" stroke="#ccff00" strokeWidth="1.8" fill="none" opacity="0.85" />
    </svg>
  )
}
