import { SEAM_A, SEAM_TILT_X, SEAM_TILT_Y } from '../constants'

export type Vec3 = [number, number, number]

/* The real tennis / padel seam is ONE closed curve, not two sine waves:
     x = a cos t + b cos 3t,  y = a sin t - b sin 3t,  z = 2 sqrt(ab) sin 2t
   which lies exactly on the unit sphere when a + b = 1 (x^2 + y^2 + z^2 = (a + b)^2). */
export function seamPoints(n: number): Vec3[] {
  const a = SEAM_A
  const b = 1 - a
  const c = 2 * Math.sqrt(a * b)
  const cx = Math.cos(SEAM_TILT_X)
  const sx = Math.sin(SEAM_TILT_X)
  const cy = Math.cos(SEAM_TILT_Y)
  const sy = Math.sin(SEAM_TILT_Y)
  const pts: Vec3[] = []
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2
    const x0 = a * Math.cos(t) + b * Math.cos(3 * t)
    const z0 = a * Math.sin(t) - b * Math.sin(3 * t)
    const y0 = c * Math.sin(2 * t)
    // rotate about x, then about y
    const y1 = y0 * cx - z0 * sx
    const z1 = y0 * sx + z0 * cx
    const x2 = x0 * cy + z1 * sy
    const z2 = -x0 * sy + z1 * cy
    pts.push([x2, y1, z2])
  }
  return pts
}

/** Stroke the seam onto an equirectangular canvas, compensating width for the pole stretch. */
export function strokeSeam(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  pts: Vec3[],
  widthPx: number,
  style: string,
): void {
  ctx.strokeStyle = style
  ctx.lineCap = 'round'
  const toPx = ([x, y, z]: Vec3): Vec3 => {
    const theta = Math.acos(Math.max(-1, Math.min(1, y)))
    const phi = Math.atan2(z, -x)
    const u = (phi / (Math.PI * 2) + 1) % 1
    return [u * W, (theta / Math.PI) * H, Math.sin(theta)]
  }
  let prev = toPx(pts[0])
  for (let i = 1; i < pts.length; i++) {
    const cur = toPx(pts[i])
    let du = cur[0] - prev[0]
    const dv = cur[1] - prev[1]
    // take the short way round the u wrap
    if (du > W / 2) du -= W
    else if (du < -W / 2) du += W
    const len = Math.hypot(du, dv) || 1
    const sinT = (prev[2] + cur[2]) / 2
    /* the stroke's perpendicular is (-dv, du) in px; its world length per px is
       proportional to sqrt((dv sinT)^2 + du^2), so widen by the inverse */
    ctx.lineWidth = widthPx / Math.max(Math.hypot((dv / len) * sinT, du / len), 0.12)
    /* The canvas does not wrap, so any stroke whose body or round cap reaches past an edge
       is drawn again shifted by +-W — not only the segment that crosses the wrap. Skipping
       this leaves a notch in the seam at u = 0 exactly one cap-radius wide. */
    const half = ctx.lineWidth / 2 + 2
    const shifts = [0]
    if (Math.min(prev[0], prev[0] + du) - half < 0) shifts.push(W)
    if (Math.max(prev[0], prev[0] + du) + half > W) shifts.push(-W)
    for (const s of shifts) {
      ctx.beginPath()
      ctx.moveTo(prev[0] + s, prev[1])
      ctx.lineTo(prev[0] + s + du, prev[1] + dv)
      ctx.stroke()
    }
    prev = cur
  }
}
