/** A court side the copy knows (`partners.side.*`), or null. */
export type CourtSide = 'left_side' | 'right_side' | 'both_sides' | null

const LINE = 'rgba(255, 255, 255, 0.16)'
const NET = 'rgba(255, 255, 255, 0.45)'
const SIDE_FILL = 'rgba(204, 255, 0, 0.10)'
const SIDE_FILL_BOTH = 'rgba(204, 255, 0, 0.06)'
const SIDE_EDGE = 'rgba(204, 255, 0, 0.45)'

/* Drawn in a 100 × 100 box stretched to the hero (preserveAspectRatio none), with strokes
   that keep their pixel width. The numbers are rally-mobile's CourtLines, as shares. */
const TOP = 8
const BOTTOM = 95
const BACK = 92
const NET_WIDTH = BACK * 0.68
const CX = 50
const widthAt = (y: number) => NET_WIDTH + (BACK - NET_WIDTH) * ((y - TOP) / (BOTTOM - TOP))
const leftAt = (y: number) => CX - widthAt(y) / 2
const rightAt = (y: number) => CX + widthAt(y) / 2
// The service line is 6.95 m from the net on a 10 m half; perspective pulls it a little up.
const SERVICE = TOP + (BOTTOM - TOP) * 0.62

const LEFT_HALF = `${leftAt(TOP)},${TOP} ${CX},${TOP} ${CX},${BOTTOM} ${leftAt(BOTTOM)},${BOTTOM}`
const RIGHT_HALF = `${CX},${TOP} ${rightAt(TOP)},${TOP} ${rightAt(BOTTOM)},${BOTTOM} ${CX},${BOTTOM}`
const OUTLINE = `${leftAt(TOP)},${TOP} ${rightAt(TOP)},${TOP} ${rightAt(BOTTOM)},${BOTTOM} ${leftAt(BOTTOM)},${BOTTOM}`

const STROKE = { vectorEffect: 'non-scaling-stroke' as const, strokeWidth: 1.5 }

/** Half a padel court in perspective: the net at the top, the back glass at the bottom, the
    player's half tinted. Physical: it never mirrors in Hebrew. */
export function PartnerCourt({ side }: { side: CourtSide }) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      data-testid="partner-court-lines"
    >
      {side === 'both_sides' && <polygon points={OUTLINE} fill={SIDE_FILL_BOTH} />}
      {side === 'left_side' && <polygon points={LEFT_HALF} fill={SIDE_FILL} stroke={SIDE_EDGE} {...STROKE} />}
      {side === 'right_side' && <polygon points={RIGHT_HALF} fill={SIDE_FILL} stroke={SIDE_EDGE} {...STROKE} />}
      <polygon points={OUTLINE} fill="none" stroke={LINE} {...STROKE} />
      <line x1={leftAt(SERVICE)} y1={SERVICE} x2={rightAt(SERVICE)} y2={SERVICE} stroke={LINE} {...STROKE} />
      <line x1={CX} y1={TOP} x2={CX} y2={SERVICE} stroke={LINE} {...STROKE} />
      <line
        x1={leftAt(TOP) - 2}
        y1={TOP}
        x2={rightAt(TOP) + 2}
        y2={TOP}
        stroke={NET}
        strokeWidth={3}
        strokeDasharray="2 3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
