import { Group, Quaternion, Vector3, type Camera } from 'three'
import { DRAG_RAD_PER_PX, IDLE_SPIN, SPIN_FRICTION } from '../constants'

/* ---------- the ball spins, the camera stays ----------
   Everything that belongs to the ball (felt, fur, coins, glow, players, arcs) lives under one
   group that the user turns like a trackball and the idle spin turns slowly; the camera is
   pinned on its axis and only dollies. That is what makes it read as a ball turning in place
   rather than a camera flying round it: the stars and the lighting hold still. */

interface FocusAnim {
  from: Quaternion
  to: Quaternion
  t0: number
  dur: number
}

const vS = new Vector3()
const qTmp = new Quaternion()
const Y_AXIS = new Vector3(0, 1, 0)

export class SpinController {
  readonly group = new Group()
  /** idle rotation about world up when nobody is touching the ball */
  spinning = true

  private readonly vel = new Vector3()
  private dragging = false
  private lastX = 0
  private lastY = 0
  private lastT = 0
  private lastFrame = 0
  private anim: FocusAnim | null = null

  constructor() {
    this.group.name = 'spin'
  }

  get isDragging(): boolean {
    return this.dragging
  }

  pointerDown(x: number, y: number): void {
    this.dragging = true
    this.lastX = x
    this.lastY = y
    this.lastT = performance.now()
    this.anim = null
    this.vel.set(0, 0, 0)
  }

  pointerMove(x: number, y: number, camera: Camera): void {
    if (!this.dragging) return
    const dx = x - this.lastX
    const dy = y - this.lastY
    if (!dx && !dy) return
    const now = performance.now()
    /* drag right turns the ball about the view's up axis, drag down about its right axis: the
       axis is (dy, dx, 0) in view space, carried into world space by the camera's rotation */
    vS.set(dy, dx, 0).normalize().applyQuaternion(camera.quaternion)
    const angle = Math.hypot(dx, dy) * DRAG_RAD_PER_PX
    this.group.quaternion.premultiply(qTmp.setFromAxisAngle(vS, angle))
    const dt = Math.max(1 / 120, (now - this.lastT) / 1000)
    this.vel.copy(vS).multiplyScalar(angle / dt)
    this.lastX = x
    this.lastY = y
    this.lastT = now
  }

  pointerUp(): void {
    if (!this.dragging) return
    this.dragging = false
    // a fling only if the pointer was still moving on release; held still, it stops dead
    if (performance.now() - this.lastT > 80) this.vel.set(0, 0, 0)
  }

  /** Turn the ball so `worldDir` (a unit vector in the group's local frame, already carried to
      world) ends up on `camDir` — the shortest arc from where it is now. */
  animateTo(worldDir: Vector3, camDir: Vector3, dur: number): void {
    const to = new Quaternion().setFromUnitVectors(worldDir, camDir).multiply(this.group.quaternion)
    this.anim = { from: this.group.quaternion.clone(), to, t0: performance.now(), dur }
    this.vel.set(0, 0, 0)
  }

  /** per frame: a focus animation if one is playing, else fling inertia, else the idle spin */
  step(now: number): void {
    const dt = Math.min(0.05, (now - (this.lastFrame || now)) / 1000)
    this.lastFrame = now
    if (this.anim) {
      const k = Math.min(1, (now - this.anim.t0) / this.anim.dur)
      this.group.quaternion.slerpQuaternions(this.anim.from, this.anim.to, 1 - (1 - k) ** 3)
      if (k >= 1) this.anim = null
      return
    }
    if (this.dragging) return
    const speed = this.vel.length()
    if (speed > 0.002) {
      this.group.quaternion.premultiply(qTmp.setFromAxisAngle(vS.copy(this.vel).normalize(), speed * dt))
      this.vel.multiplyScalar(SPIN_FRICTION ** dt)
    } else {
      this.vel.set(0, 0, 0)
      if (this.spinning) this.group.quaternion.premultiply(qTmp.setFromAxisAngle(Y_AXIS, IDLE_SPIN * dt))
    }
  }
}
