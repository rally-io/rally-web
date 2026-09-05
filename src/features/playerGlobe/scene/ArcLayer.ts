import { AdditiveBlending, InterleavedBufferAttribute, Vector3, type InterleavedBuffer } from 'three'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import {
  AMBIENT_PULSES, ARC_LIFT_K, ARC_LIFT_MAX, ARC_LINE_WIDTH_PX, ARC_SEG, BALL_RADIUS, FOCUS_PULSES,
  PARTNER_RGB, PULSE_DUR_MAX, PULSE_DUR_MIN, PULSE_GAIN, PULSE_GAP_MAX, PULSE_GAP_MIN, PULSE_TAIL,
  PULSE_UNITS_PER_SEC, RIVAL_RGB,
} from '../constants'
import { nodeRadius } from '../lib/nodeSize'
import { makeSlots, pulseGain, type Picker, type PulseSlot } from '../lib/pulses'
import type { SimLink } from '../types'

/** What the colour writer needs per frame. Static levels are the solid pinned/hover arcs
    (link index -> brightness); the pickers feed the two pulse pools. */
export interface ArcColorPass {
  staticLevels: ReadonlyMap<number, number>
  ambientPick: Picker | null
  focusPick: Picker | null
  /** ambient traffic fades back while a player is pinned */
  ambientAmp: number
  /** direction for focus streaks: they leave FROM the pinned player */
  focusDir: ((li: number) => 1 | -1) | null
}

/* scratch vectors — the arc writer runs per link per frame while the layout is hot */
const vA = new Vector3()
const vB = new Vector3()
const vP = new Vector3()

const interleaved = (attr: unknown): { buffer: InterleavedBuffer; array: Float32Array } => {
  if (!(attr instanceof InterleavedBufferAttribute)) throw new Error('expected an interleaved attribute')
  const array = attr.data.array
  if (!(array instanceof Float32Array)) throw new Error('expected a Float32Array buffer')
  return { buffer: attr.data, array }
}

/* ---------- arced glowing links, in ONE merged geometry ----------
   One Line object per link means one GPU buffer upload per link per frame; at 800+ links
   that pegs the main thread and the tab freezes outright. Everything is packed into a
   single LineSegments instead: one position buffer, one colour buffer, one upload. Additive
   blending means brightness lives in the colour, so a hidden link is simply black.

   Fat-line arcs: plain WebGL lines are 1px hairlines — aliased, kink-y, and below the bloom
   threshold, which is why they read as thin vector scratches instead of light ribbons.
   LineSegments2 draws real screen-space-width ribbons, still as ONE object/draw call. */
export class ArcLayer {
  readonly mesh: LineSegments2

  private readonly geometry: LineSegmentsGeometry
  private readonly material: LineMaterial
  private readonly pos: Float32Array
  private readonly col: Float32Array
  private readonly posBuffer: InterleavedBuffer
  private readonly colBuffer: InterleavedBuffer
  /* Live pulse state. A slot with li < 0 is idle: it respawns once time >= at, and at < 0
     means "stagger from the first frame" so the pool doesn't launch everything at once. */
  private readonly ambient: PulseSlot[] = makeSlots(AMBIENT_PULSES)
  private readonly focus: PulseSlot[] = makeSlots(FOCUS_PULSES)

  constructor(
    private readonly links: SimLink[],
    /** population size factor, see nodeSizeFactor */
    private readonly sizeFactor = 1,
  ) {
    const segCount = links.length * ARC_SEG
    this.geometry = new LineSegmentsGeometry()
    /* MUST be two separate arrays: setPositions/setColors adopt a Float32Array DIRECTLY
       (no copy — the opposite of Float32BufferAttribute). Seeding both from one array makes
       positions and colors share a buffer, so every color write destroys the geometry. */
    this.geometry.setPositions(new Float32Array(segCount * 6))
    this.geometry.setColors(new Float32Array(segCount * 6))
    this.material = new LineMaterial({
      linewidth: ARC_LINE_WIDTH_PX, // px
      vertexColors: true,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    })
    this.material.resolution.set(1, 1) // real value set by setResolution
    this.mesh = new LineSegments2(this.geometry, this.material)
    this.mesh.frustumCulled = false
    /* write into the geometry's own interleaved buffers — never into a local copy
       (Float32BufferAttribute-style constructors copy, and orphaned writes draw nothing) */
    const p = interleaved(this.geometry.attributes.instanceStart)
    const c = interleaved(this.geometry.attributes.instanceColorStart)
    this.pos = p.array
    this.posBuffer = p.buffer
    this.col = c.array
    this.colBuffer = c.buffer
  }

  /** LineMaterial rasterises width in screen space, so it must know the canvas size */
  setResolution(width: number, height: number): void {
    this.material.resolution.set(width, height)
  }

  /** Arc geometry from the current node positions. Only needed while the layout is running. */
  writeArcs(): void {
    const { pos, links } = this
    let v = 0
    for (let li = 0; li < links.length; li++) {
      const link = links[li]
      const a = link.source
      const b = link.target
      if (a.x == null || b.x == null) {
        for (let i = 0; i < ARC_SEG * 2; i++) {
          pos[v * 3] = 0
          pos[v * 3 + 1] = 0
          pos[v * 3 + 2] = 0
          v++
        }
        continue
      }
      vA.set(a.x, a.y || 0, a.z || 0)
      vB.set(b.x, b.y || 0, b.z || 0)
      const chord = vA.distanceTo(vB)
      const ra = vA.length() || BALL_RADIUS
      const rb = vB.length() || BALL_RADIUS
      const lift = Math.min(chord * ARC_LIFT_K, ARC_LIFT_MAX)
      const t0 = Math.min((nodeRadius(a, this.sizeFactor) + 1.5) / (chord || 1), 0.34)
      const t1 = 1 - Math.min((nodeRadius(b, this.sizeFactor) + 1.5) / (chord || 1), 0.34)
      let px = 0
      let py = 0
      let pz = 0
      for (let seg = 0; seg <= ARC_SEG; seg++) {
        const t = t0 + (t1 - t0) * (seg / ARC_SEG)
        vP.copy(vA).lerp(vB, t)
        const len = vP.length() || 1
        // renormalising onto the shell keeps the arc outside the ball; lift bows it above
        vP.multiplyScalar((ra + (rb - ra) * t + lift * Math.sin(Math.PI * t)) / len)
        if (seg > 0) {
          pos[v * 3] = px
          pos[v * 3 + 1] = py
          pos[v * 3 + 2] = pz
          v++
          pos[v * 3] = vP.x
          pos[v * 3 + 1] = vP.y
          pos[v * 3 + 2] = vP.z
          v++
        }
        px = vP.x
        py = vP.y
        pz = vP.z
      }
    }
    this.posBuffer.needsUpdate = true
  }

  /** Every frame: clear, lay down the solid (pinned + hover) arcs, then add the live pulses on
      top. Additive blending means an untouched arc is black, i.e. invisible — so at rest, with
      nothing pinned, the only things drawn are the dozen or so streaks in flight. */
  writeColors(time: number, pass: ArcColorPass): void {
    const { col, links } = this
    col.fill(0)

    pass.staticLevels.forEach((level, li) => {
      const base = links[li].type === 'opponent' ? RIVAL_RGB : PARTNER_RGB
      let v = li * ARC_SEG * 2
      for (let seg = 0; seg < ARC_SEG; seg++, v += 2) {
        const segT = (seg + 0.5) / ARC_SEG
        // fade hard toward the endpoints: 25 arcs converge on a busy player and stack additively,
        // so the ends must be near-black or the node disappears in a white blob
        const lv = level * (0.08 + 0.92 * Math.sin(Math.PI * segT) ** 0.8)
        const r = base[0] * lv
        const g = base[1] * lv
        const b = base[2] * lv
        col[v * 3] = r
        col[v * 3 + 1] = g
        col[v * 3 + 2] = b
        col[v * 3 + 3] = r
        col[v * 3 + 4] = g
        col[v * 3 + 5] = b
      }
    })

    this.stepPool(this.ambient, pass.ambientPick, time, pass.ambientAmp, null)
    this.stepPool(this.focus, pass.focusPick, time, 1, pass.focusDir)
    this.colBuffer.needsUpdate = true
  }

  /** When the candidate set shrinks (rivalries toggled off, region filter applied) a live
      pulse on a now-invalid edge is cut rather than left to finish on an edge that should be
      hidden. */
  cutAmbientOutside(allowed: ReadonlySet<number>): void {
    this.ambient.forEach((s) => {
      if (s.li >= 0 && !allowed.has(s.li)) {
        s.li = -1
        s.at = 0
      }
    })
  }

  /** Re-pinning drops the old player's focus streaks; at = 0 makes the new set launch
      together, which reads as a "ping" from the freshly pinned player. */
  resetFocus(): void {
    this.focus.forEach((s) => {
      s.li = -1
      s.at = 0
    })
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }

  private spawn(s: PulseSlot, li: number, time: number, dir: 1 | -1): void {
    const link = this.links[li]
    const a = link.source
    const b = link.target
    let dur = (PULSE_DUR_MIN + PULSE_DUR_MAX) / 2
    if (a.x != null && b.x != null) {
      const chord = Math.hypot(a.x - b.x, (a.y || 0) - (b.y || 0), (a.z || 0) - (b.z || 0))
      // arc length is a little over the chord; clamp so tiny hops still register and long
      // haul arcs don't crawl
      dur = Math.min(PULSE_DUR_MAX, Math.max(PULSE_DUR_MIN, (chord * 1.15) / PULSE_UNITS_PER_SEC))
    }
    s.li = li
    s.dir = dir
    s.t0 = time
    s.dur = dur
  }

  /** A comet head with a fading tail. The head advances past the far end so the tail can catch
      up and shrink into the target node — that is the launch / land shape the reference streaks
      have, and it needs no separate fade envelope. Colour is ADDED so a pulse riding a solid
      pinned arc brightens it instead of replacing it. */
  private paintPulse(s: PulseSlot, p: number, amp: number): void {
    const { col } = this
    const link = this.links[s.li]
    const base = link.type === 'opponent' ? RIVAL_RGB : PARTNER_RGB
    const gain = pulseGain(link.games) * amp
    const hd = p * (1 + PULSE_TAIL)
    const head = Math.min(hd, 1)
    const tail = hd - PULSE_TAIL
    let v = s.li * ARC_SEG * 2
    for (let seg = 0; seg < ARC_SEG; seg++, v += 2) {
      const segT = (seg + 0.5) / ARC_SEG
      const u = s.dir > 0 ? segT : 1 - segT // distance along the direction of travel
      if (u < tail || u > head) continue
      const k = (u - tail) / PULSE_TAIL // 0 at the tail end, 1 at the head
      const b = k * k * k * gain
      // heads run white-hot, so the moving front reads brighter than its own colour
      const white = Math.min(b / PULSE_GAIN, 1) * 0.7
      const r = (base[0] + (1 - base[0]) * white) * b
      const g = (base[1] + (1 - base[1]) * white) * b
      const bl = (base[2] + (1 - base[2]) * white) * b
      col[v * 3] += r
      col[v * 3 + 1] += g
      col[v * 3 + 2] += bl
      col[v * 3 + 3] += r
      col[v * 3 + 4] += g
      col[v * 3 + 5] += bl
    }
  }

  private stepPool(
    slots: PulseSlot[],
    pick: Picker | null,
    time: number,
    amp: number,
    dirFor: ((li: number) => 1 | -1) | null,
  ): void {
    for (const s of slots) {
      if (s.li < 0) {
        if (!pick) continue
        if (s.at < 0) {
          s.at = time + Math.random() * 2.5
          continue
        }
        if (time < s.at) continue
        const li = pick()
        this.spawn(s, li, time, dirFor ? dirFor(li) : Math.random() < 0.5 ? 1 : -1)
      }
      const p = (time - s.t0) / s.dur
      if (p >= 1) {
        s.li = -1
        s.at = time + PULSE_GAP_MIN + Math.random() * (PULSE_GAP_MAX - PULSE_GAP_MIN)
        continue
      }
      this.paintPulse(s, p, amp)
    }
  }
}
