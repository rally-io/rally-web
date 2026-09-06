import {
  BufferGeometry, CanvasTexture, ExtrudeGeometry, Float32BufferAttribute, RepeatWrapping, Shape,
  SRGBColorSpace,
} from 'three'
import {
  CORE_RADIUS, LOGO_BEVEL, LOGO_BEVEL_PX, LOGO_DISC, LOGO_DISC_COLOR, LOGO_HALF_ANGLE, LOGO_LIFT,
  LOGO_MARK_SCALE, LOGO_MAX_EDGE_PX, LOGO_SHADOW_DARK, LOGO_SHADOW_OFFSET, LOGO_SHADOW_PX, LOGO_SPOTS,
  LOGO_THICKNESS, LOGO_TILE_PX, SEAM_TILT_X, SEAM_TILT_Y,
} from '../constants'
import type { Vec3 } from './seam'

/** The coin's footprint and baked contact shadow, in the logo tile's raster. */
export interface LogoMask {
  /** 0 tile/background, 1 inside the disc */
  cls: Uint8Array
  /** contact-shadow strength per texel, 0..255 */
  shade: Uint8Array
  S: number
  x0: number
  y0: number
  w: number
  h: number
}

export interface SpotFrame {
  c: Vec3
  up: Vec3
  right: Vec3
}

/** 3-4 chamfer distance transform on an S x S grid from the seed pixels; units of 3 per px. */
export function chamfer(S: number, isSeed: (i: number) => boolean): Float32Array {
  const dist = new Float32Array(S * S)
  for (let i = 0; i < S * S; i++) dist[i] = isSeed(i) ? 0 : 1e9
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x
      let v = dist[i]
      if (x > 0) v = Math.min(v, dist[i - 1] + 3)
      if (y > 0) {
        v = Math.min(v, dist[i - S] + 3)
        if (x > 0) v = Math.min(v, dist[i - S - 1] + 4)
        if (x < S - 1) v = Math.min(v, dist[i - S + 1] + 4)
      }
      dist[i] = v
    }
  }
  for (let y = S - 1; y >= 0; y--) {
    for (let x = S - 1; x >= 0; x--) {
      const i = y * S + x
      let v = dist[i]
      if (x < S - 1) v = Math.min(v, dist[i + 1] + 3)
      if (y < S - 1) {
        v = Math.min(v, dist[i + S] + 3)
        if (x < S - 1) v = Math.min(v, dist[i + S + 1] + 4)
        if (x > 0) v = Math.min(v, dist[i + S - 1] + 4)
      }
      dist[i] = v
    }
  }
  return dist
}

/** The coin's footprint (a disc) and its baked contact shadow, in the tile's 1024-px raster.
    The box covers the whole tile, so the gnomonic mapping of tile px onto the sphere is the
    same for the shadow, the coin geometry and the lid texture. */
export function logoMask(): LogoMask {
  const S = LOGO_TILE_PX
  const cls = new Uint8Array(S * S)
  const c = (S - 1) / 2
  const r = (LOGO_DISC * S) / 2
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) if (Math.hypot(x - c, y - c) <= r) cls[y * S + x] = 1
  }

  /* Contact shadow: the felt darkens near the disc's footprint shifted down-right, so it falls
     on the side away from the key light and vanishes under the lit edge. */
  const [ox, oy] = LOGO_SHADOW_OFFSET
  const sh = chamfer(S, (i) => {
    const x = (i % S) - ox
    const y = ((i / S) | 0) - oy
    return x >= 0 && y >= 0 && x < S && y < S && cls[y * S + x] > 0
  })
  const shadow = LOGO_SHADOW_PX * 3
  const shade = new Uint8Array(S * S)
  for (let i = 0; i < S * S; i++) {
    if (cls[i] || sh[i] >= shadow) continue
    const t = 1 - sh[i] / shadow
    shade[i] = Math.round(t * t * 255)
  }
  return { cls, shade, S, x0: 0, y0: 0, w: S, h: S }
}

/** The frame of one logo spot in the seam's coordinates: centre, and the print's up / right. */
export function spotFrame([azDeg, elDeg]: readonly [number, number]): SpotFrame {
  const cx = Math.cos(SEAM_TILT_X)
  const sx = Math.sin(SEAM_TILT_X)
  /* The print's "up" is WORLD up (the axis the ball spins about), not the seam frame's tilted
     pole — so the R stays upright to the viewer as the ball turns instead of sitting askew. */
  const worldUp: Vec3 = [0, cx, -sx] // world +y expressed in the seam frame
  const az = (azDeg * Math.PI) / 180
  const el = (elDeg * Math.PI) / 180
  const c: Vec3 = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)]
  const d = worldUp[0] * c[0] + worldUp[1] * c[1] + worldUp[2] * c[2]
  const u: Vec3 = [worldUp[0] - d * c[0], worldUp[1] - d * c[1], worldUp[2] - d * c[2]]
  const ul = Math.hypot(u[0], u[1], u[2]) || 1
  const up: Vec3 = [u[0] / ul, u[1] / ul, u[2] / ul]
  // right = up x c, so that right x up faces OUT of the sphere; otherwise the print reads
  // mirrored from outside
  const right: Vec3 = [
    up[1] * c[2] - up[2] * c[1],
    up[2] * c[0] - up[0] * c[2],
    up[0] * c[1] - up[1] * c[0],
  ]
  return { c, up, right }
}

/* ---------- logo plate geometry ---------- */

/** The coin's outline: a disc centred on the tile, in shape coordinates (x, -y). */
export function discShape(mask: LogoMask): Shape {
  const c = (mask.S - 1) / 2
  const shape = new Shape()
  shape.absarc(c, -c, (LOGO_DISC * mask.S) / 2 - 1, 0, Math.PI * 2, false)
  return shape
}

/** Top-face texture for the coin: the tile's blue under the real icon artwork, shrunk about
    the centre so the R sits inside the disc with margin (its rounded corners fall outside the
    disc and never show). ExtrudeGeometry's lid UVs are the shape coordinates themselves
    (x, -y), so the texture repeats at 1/S per unit and the canvas row is the tile row. */
export function logoLidTexture(img: HTMLImageElement, S: number): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d canvas unavailable')
  ctx.fillStyle = `#${LOGO_DISC_COLOR.toString(16).padStart(6, '0')}`
  ctx.fillRect(0, 0, S, S)
  const k = LOGO_MARK_SCALE
  ctx.drawImage(img, (S - S * k) / 2, (S - S * k) / 2, S * k, S * k)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.repeat.set(1 / S, 1 / S)
  tex.anisotropy = 4
  return tex
}

type Tri = [Vec3, Vec3, Vec3]

/** Rebuild an extrusion with its lid triangles subdivided until no edge exceeds maxEdge, so
    the flat lids can follow the sphere once bent. Walls are thin strips along the contour and
    are kept as they are. Lid UVs stay the shape coordinates, as ExtrudeGeometry makes them. */
export function subdivideLids(src: BufferGeometry, maxEdge: number): BufferGeometry {
  const pos = src.attributes.position.array
  const lidTris: number[][] = []
  const wallTris: number[][] = []
  for (const g of src.groups) {
    const dst = g.materialIndex === 0 ? lidTris : wallTris
    for (let i = g.start; i < g.start + g.count; i += 3) dst.push(Array.from(pos.subarray(i * 3, i * 3 + 9)))
  }
  const out: number[] = []
  const mid = (p: Vec3, q: Vec3): Vec3 => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2]
  const split = (a: Vec3, b: Vec3, c: Vec3): void => {
    const longest = Math.max(
      Math.hypot(a[0] - b[0], a[1] - b[1]),
      Math.hypot(b[0] - c[0], b[1] - c[1]),
      Math.hypot(c[0] - a[0], c[1] - a[1]),
    )
    if (longest <= maxEdge) {
      out.push(...a, ...b, ...c)
      return
    }
    const ab = mid(a, b)
    const bc = mid(b, c)
    const ca = mid(c, a)
    split(a, ab, ca)
    split(ab, b, bc)
    split(ca, bc, c)
    split(ab, bc, ca)
  }
  for (const t of lidTris) {
    const tri: Tri = [[t[0], t[1], t[2]], [t[3], t[4], t[5]], [t[6], t[7], t[8]]]
    split(tri[0], tri[1], tri[2])
  }
  const lidVerts = out.length / 3
  const wallFlat = wallTris.flat()
  const positions = new Float32Array(out.length + wallFlat.length)
  positions.set(out, 0)
  positions.set(wallFlat, out.length)
  const uv = new Float32Array((positions.length / 3) * 2)
  for (let i = 0; i < positions.length / 3; i++) {
    uv[i * 2] = positions[i * 3]
    uv[i * 2 + 1] = positions[i * 3 + 1]
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  geo.addGroup(0, lidVerts, 0)
  geo.addGroup(lidVerts, wallFlat.length / 3, 1)
  return geo
}

/** Extrude the mark and bend it onto the sphere at one spot. Uses the SAME gnomonic mapping
    as the baked shadow, so plate and shadow line up. Group 0 = lids, group 1 = walls + bevel. */
export function buildLogoPlate(mask: LogoMask, shapes: Shape[], spot: readonly [number, number]): BufferGeometry {
  const extruded = new ExtrudeGeometry(shapes, {
    depth: LOGO_THICKNESS,
    bevelEnabled: true,
    bevelThickness: LOGO_BEVEL,
    bevelSize: LOGO_BEVEL_PX,
    bevelSegments: 2,
    curveSegments: 96, // the disc's outline
    steps: 1,
  })
  const geo = subdivideLids(extruded, LOGO_MAX_EDGE_PX)
  extruded.dispose()
  const T = Math.tan(LOGO_HALF_ANGLE)
  const aspect = mask.h / mask.w
  const { c, up, right } = spotFrame(spot)
  const cx = Math.cos(SEAM_TILT_X)
  const sx = Math.sin(SEAM_TILT_X)
  const cy = Math.cos(SEAM_TILT_Y)
  const sy = Math.sin(SEAM_TILT_Y)
  const pos = geo.attributes.position
  // the extrusion's z runs from -bevel (underside) to thickness + bevel (top)
  const base = CORE_RADIUS + LOGO_LIFT + LOGO_BEVEL
  for (let i = 0; i < pos.count; i++) {
    const lx = ((pos.getX(i) - mask.x0) / (mask.w - 1)) * 2 - 1
    const ly = 1 - ((-pos.getY(i) - mask.y0) / (mask.h - 1)) * 2
    const qx = lx * T
    const qy = ly * T * aspect
    let dx = c[0] + qx * right[0] + qy * up[0]
    let dy = c[1] + qx * right[1] + qy * up[1]
    let dz = c[2] + qx * right[2] + qy * up[2]
    const dl = Math.hypot(dx, dy, dz)
    dx /= dl
    dy /= dl
    dz /= dl
    // seam frame -> world: Rx(tiltX) then Ry(tiltY), exactly as the seam itself
    const y1 = dy * cx - dz * sx
    const z1 = dy * sx + dz * cx
    const wx = dx * cy + z1 * sy
    const wz = -dx * sy + z1 * cy
    const r = base + pos.getZ(i)
    pos.setXYZ(i, wx * r, y1 * r, wz * r)
  }
  geo.computeVertexNormals()
  // lids get the sphere's radial normal, so the bent top reads smooth rather than faceted
  const nrm = geo.attributes.normal
  for (const g of geo.groups) {
    if (g.materialIndex !== 0) continue
    for (let i = g.start; i < g.start + g.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      const l = Math.hypot(x, y, z) || 1
      nrm.setXYZ(i, x / l, y / l, z / l)
    }
  }
  return geo
}

/* Bake the plates' contact shadow into the felt, per texel, through a gnomonic projection about
   each spot — the same mapping the plate geometry uses, so the shadow sits under the plate. */
export function paintLogos(
  px: Uint8ClampedArray,
  bpx: Uint8ClampedArray,
  W: number,
  H: number,
  mask: LogoMask,
): void {
  const T = Math.tan(LOGO_HALF_ANGLE)
  const aspect = mask.h / mask.w
  const cosCoarse = Math.cos(LOGO_HALF_ANGLE * 1.6) // generous: the mark's corners reach ~1.35x
  const cx = Math.cos(SEAM_TILT_X)
  const sx = Math.sin(SEAM_TILT_X)
  const cy = Math.cos(SEAM_TILT_Y)
  const sy = Math.sin(SEAM_TILT_Y)
  const spots = LOGO_SPOTS.map(spotFrame)
  /* texel (x, y) -> world direction in three's SphereGeometry convention -> the seam's frame
     (undo Ry(tiltY), then Rx(tiltX)); returns the raster index hit at that direction,
     -1 when inside a spot's cone but outside the mark's box, -2 when nowhere near a spot */
  const indexAt = (theta: number, phi: number): number => {
    const st = Math.sin(theta)
    const wx = -Math.cos(phi) * st
    const wy = Math.cos(theta)
    const wz = Math.sin(phi) * st
    const dx = wx * cy - wz * sy
    const z1 = wx * sy + wz * cy
    const dy = wy * cx + z1 * sx
    const dz = -wy * sx + z1 * cx
    for (const s of spots) {
      const dot = dx * s.c[0] + dy * s.c[1] + dz * s.c[2]
      if (dot < cosCoarse) continue
      const qx = dx / dot - s.c[0]
      const qy = dy / dot - s.c[1]
      const qz = dz / dot - s.c[2]
      const lx = (qx * s.right[0] + qy * s.right[1] + qz * s.right[2]) / T
      const ly = (qx * s.up[0] + qy * s.up[1] + qz * s.up[2]) / (T * aspect)
      if (lx < -1 || lx > 1 || ly < -1 || ly > 1) return -1
      const mx = mask.x0 + ((lx + 1) / 2) * (mask.w - 1)
      const my = mask.y0 + ((1 - ly) / 2) * (mask.h - 1)
      return Math.round(my) * mask.S + Math.round(mx)
    }
    return -2
  }
  for (let y = 0; y < H; y++) {
    const theta = ((y + 0.5) / H) * Math.PI
    for (let x = 0; x < W; x++) {
      const phi = ((x + 0.5) / W) * Math.PI * 2
      if (indexAt(theta, phi) === -2) continue
      let fs = 0 // contact shadow on the felt, 2x2 supersampled
      for (let j = 0; j < 4; j++) {
        const idx = indexAt(
          ((y + 0.25 + (j >> 1) * 0.5) / H) * Math.PI,
          ((x + 0.25 + (j & 1) * 0.5) / W) * Math.PI * 2,
        )
        if (idx >= 0 && !mask.cls[idx]) fs += mask.shade[idx] / 1020 // /255 /4
      }
      if (!fs) continue
      const i = (y * W + x) * 4
      const keep = 1 - LOGO_SHADOW_DARK * fs
      px[i] *= keep
      px[i + 1] *= keep
      px[i + 2] *= keep
      // the felt under the shadow pressed slightly down
      const bv = bpx[i] * (1 - fs) + 112 * fs
      bpx[i] = bv
      bpx[i + 1] = bv
      bpx[i + 2] = bv
    }
  }
}
