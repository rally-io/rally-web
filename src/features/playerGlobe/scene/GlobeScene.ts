import {
  AmbientLight, Box3, Color, DirectionalLight, PCFShadowMap, PerspectiveCamera, Raycaster, Scene, Sprite,
  SpriteMaterial, Vector2, Vector3, WebGLRenderer,
} from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  forceCenter, forceCollide, forceLink, forceManyBody, forceRadial, forceSimulation, type Simulation,
} from 'd3-force-3d'
import {
  AMBIENT_DIM, AMBIENT_RIVAL_AMP, BALL_RADIUS, BLOOM_RADIUS, BLOOM_STRENGTH, BLOOM_THRESHOLD,
  CAMERA_DISTANCE_PER_CBRT_NODE, CAMERA_FAR, COOLDOWN_TICKS, CORE_RADIUS, DIM, FIT_FILL, FIT_MS,
  FIT_PADDING_PX, FOCUS_FILL, FOCUS_MS, HOVER_LEVEL, LINK_DISTANCE, LINK_STRENGTH, NO_TIER_COLOR,
  OCCLUDE_FEATHER, PINNED_PARTNER, PINNED_RIVAL, TIER_COLOR,
} from '../constants'
import { avatarTexture } from '../lib/avatarTexture'
import { FELT_IMAGE_KEY, LOGO_IMAGE_KEY, type GlobeImages } from '../lib/images'
import { initialsOf } from '../lib/initials'
import { collideRadius, nodeSizeFactor, spriteScale } from '../lib/nodeSize'
import { makePicker, type Picker } from '../lib/pulses'
import {
  buildViewerBadge, buildViewerHalo, haloOpacity, HALO_SCALE, layoutViewerBadge,
} from '../lib/viewerMarker'
import type { GlobeGraph, SimLink, SimNode } from '../types'
import { ArcLayer } from './ArcLayer'
import { buildBall, buildKeyLight, type BallBuild } from './buildBall'
import { buildStars, type StarField } from './buildStars'
import { SpinController } from './SpinController'

export interface GlobeSceneCallbacks {
  onHover: (id: string | null) => void
  onSelect: (id: string | null) => void
  onBackgroundClick: () => void
}

export interface GlobeSceneOptions {
  graph: GlobeGraph
  images: GlobeImages
  /** renderer clear colour */
  background: string
  width: number
  height: number
  /** the signed-in player, if they are on the ball — their node gets the halo and the badge */
  viewerId?: string | null
  /** what the badge under that node reads, already translated ("You" / "אתם"). No badge
      without one — the scene has no i18n of its own and must not invent a word. */
  viewerLabel?: string | null
  callbacks: GlobeSceneCallbacks
}

/** A link as handed to d3: string ids that forceLink replaces with node objects in place. */
interface RawLink {
  source: SimNode | string
  target: SimNode | string
  games: number
  type: SimLink['type']
}

interface CameraTween {
  from: Vector3
  to: Vector3
  t0: number
  dur: number
}

interface AmbientPool {
  pick: Picker | null
  allowed: Set<number>
}

const resolvedLink = (l: RawLink): SimLink => {
  if (typeof l.source === 'string' || typeof l.target === 'string') throw new Error('link endpoints unresolved')
  // forceLink has swapped the ids for node objects, so the guard above makes this exact
  return l as SimLink
}

/** How far a press may travel and still count as a tap, in CSS px. A mouse can be held
    perfectly still; a finger never is, so exact equality means no touch ever selects anyone —
    and this stage is laid out to fill a phone screen. */
const TAP_SLOP_PX = 10

/* scratch */
const vA = new Vector3()
const vB = new Vector3()
const vP = new Vector3()

/** The whole imperative three.js side of the player globe: renderer, ball, players, arcs,
    layout, spin and pointer interaction. One instance per mounted canvas; `dispose()` tears
    everything down, so a React StrictMode double-mount simply builds it twice. */
export class GlobeScene {
  private readonly container: HTMLElement
  private readonly graph: GlobeGraph
  private readonly callbacks: GlobeSceneCallbacks
  private readonly nodes: SimNode[]
  private readonly links: SimLink[]
  private readonly nodeById: Map<string, SimNode>
  /* link INDICES per node — `links` is a 1:1 ordered copy of `graph.links`, so an index into
     one is valid for the other, and `graph.links` keeps plain string ids after the force
     engine has replaced `links[i].source` with node objects */
  private readonly linkIdxByNode: Map<string, number[]>

  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera: PerspectiveCamera
  private readonly composer: EffectComposer
  private readonly renderPass: RenderPass
  private readonly bloom: UnrealBloomPass
  private readonly controls: OrbitControls
  private readonly spin = new SpinController()
  private readonly ball: BallBuild
  private readonly stars: StarField
  private readonly keyLight: DirectionalLight
  private readonly sceneLights: [AmbientLight, DirectionalLight]
  private readonly arcs: ArcLayer
  private readonly sprites = new Map<string, Sprite>()
  private readonly spriteList: Sprite[]
  /** occlusion visibility per node, 0..1, from the last frame */
  private readonly spriteVis = new Map<string, number>()
  /** dim level per node: 1, or DIM when outside the active neighbourhood / region */
  private readonly dim = new Map<string, number>()
  private readonly raycaster = new Raycaster()

  /** every node grows or shrinks with the population — see nodeSizeFactor */
  readonly sizeFactor: number
  private readonly sim: Simulation<SimNode>
  private ticks = 0
  private simRunning = true

  private selectedId: string | null = null
  /** a focus asked for while the layout is still running, replayed once it settles */
  private pendingFocusId: string | null = null
  private hoverId: string | null = null
  private showRivals = false
  private wantSpin = true
  private staticLevels = new Map<number, number>()
  private ambientPool: AmbientPool
  /** the opponent links, picked from at their own (much lower) rate — built once, since unlike
      the ambient pool it does not depend on `showRivals` */
  private readonly rivalPick: Picker | null
  private focusPick: Picker | null = null
  private appliedPoolKey = ''
  private appliedSelected: string | null = null

  private cameraTween: CameraTween | null = null
  private readonly ndc = new Vector2()
  private pointerDirty = false
  private downX = 0
  private downY = 0
  private width: number
  private height: number
  private raf = 0
  private disposed = false
  /** where the camera was last framed. `fitDistance()` drifts a few percent as the ball turns
      (the sprite quads' bounding box is not perfectly rotation-invariant), so anchoring the
      focus dolly to a fresh call made the same FOCUS_FILL mean a different zoom every time. */
  private framedDistance: number | null = null
  private viewerId: string | null = null
  private viewerLabel: string | null = null
  private viewerHalo: Sprite | null = null
  private viewerBadge: Sprite | null = null

  constructor(container: HTMLElement, opts: GlobeSceneOptions) {
    this.container = container
    this.graph = opts.graph
    this.callbacks = opts.callbacks
    this.width = opts.width
    this.height = opts.height

    /* ---------- layout ---------- */
    const partnerCount = new Map<string, number>()
    for (const l of opts.graph.links) {
      if (l.type !== 'partner') continue
      partnerCount.set(l.source, (partnerCount.get(l.source) ?? 0) + 1)
      partnerCount.set(l.target, (partnerCount.get(l.target) ?? 0) + 1)
    }
    this.nodes = opts.graph.nodes.map((n) => ({ ...n, connections: partnerCount.get(n.id) ?? 0 }))
    this.sizeFactor = nodeSizeFactor(this.nodes.length)
    const sizeFactor = this.sizeFactor
    const playerCount = this.nodes.length
    const rawLinks: RawLink[] = opts.graph.links.map((l) => ({ ...l }))
    /* d3's simulation starts its own timer on creation; stop it at once and tick by hand, one
       tick per frame, so the layout is bounded by frames rather than wall-clock. Forces are
       attached up front — there is no library digest to wait for here. */
    this.sim = forceSimulation<SimNode>(this.nodes, 3)
      .stop()
      .force(
        'link',
        forceLink<SimNode, RawLink>(rawLinks)
          .id((d) => d.id)
          .distance(LINK_DISTANCE)
          .strength(LINK_STRENGTH),
      )
      .force('charge', forceManyBody<SimNode>().strength(-26).distanceMax(240))
      .force('center', forceCenter<SimNode>())
      .force('radial', forceRadial<SimNode>(BALL_RADIUS, 0, 0, 0).strength(1))
      /* Spacing follows the BALL, not the portrait: an even share of the shell per player,
         floored at what the portrait itself needs. See collideRadius / NODE_SPACING_FILL. */
      .force('collide', forceCollide<SimNode>((n) => collideRadius(n, sizeFactor, playerCount)))
    this.links = rawLinks.map(resolvedLink)
    this.nodeById = new Map(this.nodes.map((n) => [n.id, n]))
    this.linkIdxByNode = new Map(this.nodes.map((n) => [n.id, [] as number[]]))
    opts.graph.links.forEach((l, i) => {
      this.linkIdxByNode.get(l.source)?.push(i)
      this.linkIdxByNode.get(l.target)?.push(i)
    })

    /* ---------- renderer, camera, composer ---------- */
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    this.renderer.setSize(this.width, this.height)
    this.renderer.setClearColor(new Color(opts.background), 1)
    // the coins cast the key light's shadow onto the felt (PCFSoft is deprecated in three
    // 0.185 and silently maps to PCF, so PCF is named directly — same output)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFShadowMap
    this.renderer.domElement.style.display = 'block'
    container.appendChild(this.renderer.domElement)

    this.camera = new PerspectiveCamera(50, this.width / this.height, 0.1, CAMERA_FAR)
    this.camera.position.set(0, 0, Math.cbrt(this.nodes.length) * CAMERA_DISTANCE_PER_CBRT_NODE)
    this.keyLight = buildKeyLight()
    this.camera.add(this.keyLight)
    this.scene.add(this.camera)

    this.sceneLights = [new AmbientLight(0xcccccc, Math.PI), new DirectionalLight(0xffffff, 0.6 * Math.PI)]
    this.sceneLights.forEach((l) => this.scene.add(l))

    /* Bloom is what turns the bright streaks and rims into light. No output pass on purpose:
       the bloom pass's own screen copy applies the sRGB transfer, and every brightness
       constant in this feature was tuned against that exact pipeline. */
    this.composer = new EffectComposer(this.renderer)
    this.renderPass = new RenderPass(this.scene, this.camera)
    this.composer.addPass(this.renderPass)
    this.bloom = new UnrealBloomPass(
      new Vector2(this.width / 2, this.height / 2),
      BLOOM_STRENGTH,
      BLOOM_RADIUS,
      BLOOM_THRESHOLD,
    )
    this.composer.addPass(this.bloom)

    /* On a scrolling page a plain wheel over the ball must scroll the page, not zoom it.
       OrbitControls preventDefaults every wheel, so this capture-phase gate stops the event
       from reaching it unless ⌘ / Ctrl is held — which is also what a trackpad pinch sends. */
    this.renderer.domElement.addEventListener('wheel', this.onWheelGate, { capture: true, passive: true })

    // the camera never orbits — the ball turns instead (SpinController). Wheel zoom stays.
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableRotate = false
    this.controls.enablePan = false
    this.controls.autoRotate = false
    this.controls.target.set(0, 0, 0)
    this.controls.update()
    /* OrbitControls sets touchAction 'none' on the canvas, which on a phone leaves the page
       with no way to scroll past a full-height ball. 'pan-y' gives vertical swipes back to
       the browser; a horizontal drag still spins the ball, and a pinch still reaches the
       controls, because neither is a vertical pan. Must follow the constructor. */
    this.renderer.domElement.style.touchAction = 'pan-y'

    /* ---------- the ball and everything that turns with it ---------- */
    this.scene.add(this.spin.group)
    this.ball = buildBall(opts.images.get(LOGO_IMAGE_KEY) ?? null, opts.images.get(FELT_IMAGE_KEY) ?? null)
    this.ball.objects.forEach((o) => this.spin.group.add(o))
    this.stars = buildStars()
    this.scene.add(this.stars.points)

    for (const node of this.nodes) {
      const img = opts.images.get(node.id) ?? null
      const color = node.skillTier ? TIER_COLOR[node.skillTier] : NO_TIER_COLOR
      // depthTest off: see OCCLUDE_FEATHER — the ball would otherwise cut into rim portraits
      const material = new SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false })
      material.map = avatarTexture(img, color, initialsOf(node.name))
      const sprite = new Sprite(material)
      const s = spriteScale(node, this.sizeFactor)
      sprite.scale.set(s, s, 1)
      sprite.position.set(node.x ?? 0, node.y ?? 0, node.z ?? 0)
      sprite.userData.id = node.id
      this.spin.group.add(sprite)
      this.sprites.set(node.id, sprite)
      this.dim.set(node.id, 1)
    }
    this.spriteList = [...this.sprites.values()]

    this.viewerId = opts.viewerId ?? null
    this.viewerLabel = opts.viewerLabel ?? null
    this.buildViewerMarker()

    this.arcs = new ArcLayer(this.links, this.sizeFactor)
    this.arcs.setResolution(this.width, this.height)
    this.spin.group.add(this.arcs.mesh) // arcs turn with the ball
    this.arcs.writeArcs()

    this.ambientPool = this.computeAmbientPool()
    this.rivalPick = this.computeRivalPicker()
    this.appliedPoolKey = this.poolKey()
    this.refreshHighlights()

    container.addEventListener('pointerdown', this.onPointerDown)
    container.addEventListener('pointermove', this.onPointerMove)
    container.addEventListener('pointerup', this.onPointerUp)
    container.addEventListener('pointercancel', this.onPointerLeave)
    container.addEventListener('pointerleave', this.onPointerLeave)

    this.raf = requestAnimationFrame(this.frame)
  }

  /* ---------- public API ---------- */

  resize(width: number, height: number): void {
    if (this.disposed || (width === this.width && height === this.height)) return
    this.width = width
    this.height = height
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
    this.composer.setSize(width, height)
    this.arcs.setResolution(width, height)
  }

  /** Who the "you" marker belongs to. Settable after construction on purpose: the signed-in
      user is resolved asynchronously and can easily land AFTER the graph, in which case a
      marker fixed at construction would simply never appear. Rebuilding just the two sprites
      is cheap — the alternative, re-running the whole scene, would replay the 120-tick layout
      and visibly throw the ball. */
  setViewer(id: string | null, label: string | null): void {
    if (this.disposed || (id === this.viewerId && label === this.viewerLabel)) return
    this.viewerId = id
    this.viewerLabel = label
    this.buildViewerMarker()
  }

  private disposeViewerMarker(): void {
    for (const sprite of [this.viewerHalo, this.viewerBadge]) {
      if (!sprite) continue
      this.spin.group.remove(sprite)
      sprite.material.map?.dispose()
      sprite.material.dispose()
    }
    this.viewerHalo = null
    this.viewerBadge = null
  }

  private buildViewerMarker(): void {
    this.disposeViewerMarker()
    const sprite = this.viewerId ? this.sprites.get(this.viewerId) : undefined
    if (!sprite) return // signed out, or on the ball's roster but not this graph
    const halo = buildViewerHalo()
    halo.scale.copy(sprite.scale).multiplyScalar(HALO_SCALE)
    halo.position.copy(sprite.position)
    this.spin.group.add(halo) // turns with the ball, like the face it belongs to
    this.viewerHalo = halo
    if (!this.viewerLabel) return
    const badge = buildViewerBadge(this.viewerLabel)
    layoutViewerBadge(badge, sprite.scale.x)
    badge.position.copy(sprite.position)
    this.spin.group.add(badge)
    this.viewerBadge = badge
  }

  setShowRivals(show: boolean): void {
    if (this.showRivals === show) return
    this.showRivals = show
    this.refreshHighlights()
  }

  setSpinning(spinning: boolean): void {
    this.wantSpin = spinning
    this.applySpin()
  }

  /** The ball only turns on its own when nobody has asked it to hold still. Pinning a player
      counts: someone is reading that face and its arcs, and having it drift out from under them
      is the opposite of helpful. It resumes the moment they unpin. */
  private applySpin(): void {
    this.spin.spinning = this.wantSpin && this.selectedId === null
  }

  /** Hover driven from outside the canvas (a list of names, say). Same path as the pointer. */
  setHover(id: string | null): void {
    this.applyHover(id)
  }

  /** Pin a player: their arcs go solid, the ball turns so they face the camera, and the camera
      dollies in. The camera never leaves its axis. */
  focusPlayer(id: string): void {
    this.select(id)
    /* Before the layout settles the node has no final position, and the settle's zoomToFit
       would overwrite the tween anyway — so remember the request and replay it there. The
       selection itself is applied now, so the highlight state is right in the meantime. */
    if (this.simRunning) {
      this.pendingFocusId = id
      return
    }
    const node = this.nodeById.get(id)
    if (!node || node.x == null) return
    const camDir = this.camera.position.clone().normalize()
    const world = new Vector3(node.x, node.y ?? 0, node.z ?? 0).normalize().applyQuaternion(this.spin.group.quaternion)
    this.spin.animateTo(world, camDir, FOCUS_MS)
    const framed = this.framedDistance ?? this.fitDistance()
    if (framed !== null) this.tweenCamera(camDir.multiplyScalar(framed * FOCUS_FILL), FOCUS_MS)
  }

  /** Unpin, and give the whole ball back. Leaving the camera where the focus put it stranded
      the viewer inside one player with no way out but a wheel scroll. */
  clearSelection(): void {
    this.pendingFocusId = null
    this.select(null)
    this.zoomToFit(FIT_MS)
  }

  resetView(): void {
    this.zoomToFit(FIT_MS)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.sim.stop()
    const c = this.container
    c.removeEventListener('pointerdown', this.onPointerDown)
    c.removeEventListener('pointermove', this.onPointerMove)
    c.removeEventListener('pointerup', this.onPointerUp)
    c.removeEventListener('pointercancel', this.onPointerLeave)
    c.removeEventListener('pointerleave', this.onPointerLeave)
    this.renderer.domElement.removeEventListener('wheel', this.onWheelGate, { capture: true })
    this.controls.dispose()
    this.bloom.dispose()
    this.renderPass.dispose()
    this.composer.dispose()
    this.arcs.dispose()
    this.ball.dispose()
    this.stars.dispose()
    this.keyLight.dispose()
    this.sceneLights.forEach((l) => l.dispose())
    this.sprites.forEach((sprite) => {
      sprite.material.map?.dispose()
      sprite.material.dispose()
    })
    this.disposeViewerMarker()
    this.scene.clear()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.renderer.domElement.remove()
  }

  /* ---------- frame ---------- */

  /** One frame. Public so a dev tool can step the scene while the browser has the tab hidden
      (Chrome freezes requestAnimationFrame there); scheduling is idempotent, so a manual call
      never starts a second loop. */
  readonly frame = (now: number): void => {
    if (this.disposed) return
    cancelAnimationFrame(this.raf)
    this.spin.step(now)
    if (this.simRunning) {
      this.sim.tick()
      this.ticks += 1
      for (const node of this.nodes) {
        this.sprites.get(node.id)?.position.set(node.x ?? 0, node.y ?? 0, node.z ?? 0)
      }
      this.arcs.writeArcs()
      if (this.ticks >= COOLDOWN_TICKS) {
        /* Frame once the layout has SETTLED, not on first spread. Early in the simulation the
           nodes fly far apart before the radial force contracts them onto the shell — fitting
           then parks the camera for a graph several times the final size. */
        this.simRunning = false
        this.sim.stop()
        /* simRunning is already false, so this focus runs for real instead of re-queuing
           itself — and it replaces the fit, which would otherwise undo the dolly-in. */
        if (this.pendingFocusId) {
          const id = this.pendingFocusId
          this.pendingFocusId = null
          this.focusPlayer(id)
        } else {
          this.zoomToFit(FIT_MS)
        }
      }
    }
    this.stepCamera(now)
    this.arcs.writeColors(now / 1000, {
      staticLevels: this.staticLevels,
      ambientPick: this.ambientPool.pick,
      focusPick: this.focusPick,
      ambientAmp: this.selectedId ? AMBIENT_DIM : 1,
      rivalPick: this.rivalPick,
      // rivalries fade back with everything else while a player is pinned
      rivalAmp: AMBIENT_RIVAL_AMP * (this.selectedId ? AMBIENT_DIM : 1),
      focusDir: this.selectedId ? this.focusDir : null,
    })
    this.occludeSprites()
    this.stepViewerMarker(now)
    this.controls.update()
    this.composer.render()
    // after the render, so the raycast sees this frame's matrices
    if (this.pointerDirty) {
      this.pointerDirty = false
      this.applyHover(this.pickAt(this.ndc))
    }
    this.raf = requestAnimationFrame(this.frame)
  }

  /** Keep the viewer's halo and badge on their face — the layout moves the node every tick
      until it settles — and breathe the halo. Both fade with the face; the badge goes entirely
      once it is more than half hidden, because a label floating over the ball's silhouette with
      no face under it is just litter. */
  private stepViewerMarker(now: number): void {
    const halo = this.viewerHalo
    if (!halo || !this.viewerId) return
    const sprite = this.sprites.get(this.viewerId)
    if (!sprite) return
    const vis = this.spriteVis.get(this.viewerId) ?? 0
    halo.position.copy(sprite.position)
    halo.scale.copy(sprite.scale).multiplyScalar(HALO_SCALE)
    halo.visible = vis > 0.01
    halo.material.opacity = haloOpacity(now / 1000, vis)
    const badge = this.viewerBadge
    if (badge) {
      badge.position.copy(sprite.position)
      layoutViewerBadge(badge, sprite.scale.x)
      badge.visible = vis > 0.5
      badge.material.opacity = vis
    }
  }

  /* Hide the sprites the ball is in front of. With depthTest off, this is the ONLY thing that
     keeps far-hemisphere players from showing through the ball. A sprite is occluded when the
     segment camera->node passes inside the ball: closest approach of that segment to the
     origin vs the ball radius, feathered so the crossing at the silhouette fades instead of
     popping. Perspective-exact, unlike a fixed "behind the equator" angle. */
  private occludeSprites(): void {
    const cam = this.camera.position
    this.sprites.forEach((sprite, id) => {
      sprite.getWorldPosition(vP)
      vA.copy(vP).sub(cam) // d = P - C
      const dd = vA.lengthSq() || 1
      const t = Math.min(1, Math.max(0, -cam.dot(vA) / dd))
      vB.copy(cam).addScaledVector(vA, t) // closest point on the segment to the origin
      const gap = vB.length() - CORE_RADIUS
      const vis = Math.min(1, Math.max(0, (gap + OCCLUDE_FEATHER) / (2 * OCCLUDE_FEATHER)))
      sprite.visible = vis > 0.01
      sprite.material.opacity = (this.dim.get(id) ?? 1) * vis
      this.spriteVis.set(id, vis)
    })
  }

  /* ---------- camera ---------- */

  private tweenCamera(to: Vector3, dur: number): void {
    this.cameraTween = { from: this.camera.position.clone(), to, t0: performance.now(), dur }
  }

  /** quadratic ease-out, as the reference pipeline's camera tween */
  private stepCamera(now: number): void {
    const tw = this.cameraTween
    if (!tw) return
    const k = Math.min(1, (now - tw.t0) / tw.dur)
    this.camera.position.lerpVectors(tw.from, tw.to, k * (2 - k))
    if (k >= 1) this.cameraTween = null
  }

  /** The camera distance at which the whole ball is framed, or null before there is anything to
      frame. Every other camera distance is expressed as a fraction of this, so the framing means
      the same thing whatever shape the stage is. */
  private fitDistance(): number | null {
    this.spin.group.updateMatrixWorld(true)
    const box = new Box3()
    for (const sprite of this.spriteList) box.expandByObject(sprite)
    if (box.isEmpty()) return null
    const reach = Math.max(
      Math.abs(box.min.x), Math.abs(box.max.x),
      Math.abs(box.min.y), Math.abs(box.max.y),
      Math.abs(box.min.z), Math.abs(box.max.z),
    )
    /* Distance at which `reach` exactly meets the frame edge, per axis: at distance d a
       perspective camera shows a half-height of d*tan(fov/2), and a half-width of that times the
       aspect. The whole ball fits when BOTH are covered, so the larger distance wins.

       This used to be a heuristic (`maxBoxSide / atan(fovRadians)`) that overshoots by about a
       quarter — a little air on a wide stage, but on a portrait one the width binds and the
       overshoot compounds with the aspect, leaving the ball at ~60% of the width. FIT_FILL then
       fills deliberately, and only when the width binds: see the constant. */
    const padded = Math.max(0.2, 1 - (FIT_PADDING_PX * 2) / Math.min(this.width, this.height))
    const halfHeight = Math.tan((this.camera.fov * Math.PI) / 360) * padded
    const halfWidth = halfHeight * this.camera.aspect
    const widthBinds = halfWidth < halfHeight
    const distance = reach / Math.min(halfHeight, halfWidth) / (widthBinds ? FIT_FILL : 1)
    return Number.isFinite(distance) && distance > 0 ? distance : null
  }

  /** Dolly so the players' bounding box fits the viewport with `FIT_PADDING_PX` to spare. */
  private zoomToFit(dur: number): void {
    const distance = this.fitDistance()
    if (distance === null) return
    this.framedDistance = distance
    this.tweenCamera(this.camera.position.clone().normalize().multiplyScalar(distance), dur)
  }

  /* ---------- highlight state ---------- */

  private poolKey(): string {
    return String(this.showRivals)
  }

  /* Ambient pool candidates: every partnership (rivalries only when toggled on). Spawn
     weight = games, so busy pairs pulse more. */
  /** Resting traffic on the rivalries. The ambient pool leaves opponent links out entirely, so
      without this the violet half of the palette never moves unless a player is pinned. */
  private computeRivalPicker(): Picker | null {
    const idx: number[] = []
    const w: number[] = []
    this.graph.links.forEach((l, i) => {
      if (l.type !== 'opponent') return
      idx.push(i)
      w.push(l.games)
    })
    return makePicker(idx, w)
  }

  private computeAmbientPool(): AmbientPool {
    const idx: number[] = []
    const w: number[] = []
    this.graph.links.forEach((l, i) => {
      if (l.type === 'opponent' && !this.showRivals) return
      idx.push(i)
      w.push(l.games)
    })
    return { pick: makePicker(idx, w), allowed: new Set(idx) }
  }

  /* Node dimming: a pinned or hovered player wins (their neighbourhood stays lit, the rest
     dims); otherwise nothing is dimmed. */
  private computeActiveIds(): Set<string> | null {
    const { selectedId, hoverId } = this
    if (selectedId || hoverId) {
      const set = new Set<string>()
      for (const id of [selectedId, hoverId]) {
        if (!id) continue
        set.add(id)
        this.linkIdxByNode.get(id)?.forEach((li) => {
          set.add(this.graph.links[li].source)
          set.add(this.graph.links[li].target)
        })
      }
      return set
    }
    return null
  }

  /* Solid arcs: pinned player's edges at full level, hovered player's edges lighter, merged as
     max-per-edge so hovering never REMOVES a pinned arc. Map of link index -> level. */
  private computeStaticLevels(): Map<number, number> {
    const map = new Map<number, number>()
    const add = (id: string, partnerLv: number, rivalLv: number): void => {
      this.linkIdxByNode.get(id)?.forEach((li) => {
        const lv = this.graph.links[li].type === 'opponent' ? rivalLv : partnerLv
        if ((map.get(li) ?? 0) < lv) map.set(li, lv)
      })
    }
    if (this.selectedId) add(this.selectedId, PINNED_PARTNER, PINNED_RIVAL)
    if (this.hoverId && this.hoverId !== this.selectedId) add(this.hoverId, HOVER_LEVEL, HOVER_LEVEL * 0.85)
    return map
  }

  /** focus streaks leave FROM the pinned player, so the eye reads "their reach" */
  private readonly focusDir = (li: number): 1 | -1 =>
    this.graph.links[li].source === this.selectedId ? 1 : -1

  /** Recompute everything derived from selection / hover / filters, with the two side effects
      the pulse pools need: cut ambient streaks that left the candidate set, and relaunch the
      focus streaks when the pinned player changes. */
  private refreshHighlights(): void {
    const key = this.poolKey()
    if (key !== this.appliedPoolKey) {
      this.appliedPoolKey = key
      this.ambientPool = this.computeAmbientPool()
      this.arcs.cutAmbientOutside(this.ambientPool.allowed)
    }
    if (this.selectedId !== this.appliedSelected) {
      this.appliedSelected = this.selectedId
      this.arcs.resetFocus()
      /* Focus pool candidates: the pinned player's own edges, both kinds, always. */
      const idx = this.selectedId ? (this.linkIdxByNode.get(this.selectedId) ?? []) : []
      this.focusPick = makePicker(idx, idx.map((li) => this.graph.links[li].games))
    }
    this.staticLevels = this.computeStaticLevels()
    const active = this.computeActiveIds()
    this.nodes.forEach((n) => this.dim.set(n.id, !active || active.has(n.id) ? 1 : DIM))
  }

  private select(id: string | null): void {
    this.selectedId = id
    this.applySpin()
    this.refreshHighlights()
    this.callbacks.onSelect(id)
  }

  private applyHover(id: string | null): void {
    if (this.hoverId === id) return
    this.hoverId = id
    this.refreshHighlights()
    this.callbacks.onHover(id)
  }

  /* ---------- pointer ---------- */

  private updateNdc(e: PointerEvent): void {
    const rect = this.container.getBoundingClientRect()
    this.ndc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    )
  }

  /** The visible sprite under a viewport point, nearest first; null on empty space. */
  private pickAt(ndc: Vector2): string | null {
    this.raycaster.setFromCamera(ndc, this.camera)
    const hits = this.raycaster.intersectObjects(this.spriteList, false)
    for (const hit of hits) {
      const id: unknown = hit.object.userData.id
      if (typeof id !== 'string') continue
      if ((this.spriteVis.get(id) ?? 0) > 0.5) return id
    }
    return null
  }

  private readonly onWheelGate = (e: WheelEvent): void => {
    if (!e.ctrlKey && !e.metaKey) e.stopImmediatePropagation()
  }

  private readonly onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0 || !e.isPrimary) return
    this.downX = e.clientX
    this.downY = e.clientY
    this.spin.pointerDown(e.clientX, e.clientY)
  }

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (!e.isPrimary) return
    /* A finger has no hover: every touch-move is a drag, and resolving hover along it would
       light up whatever the finger passes over. Only a real cursor hovers. */
    if (e.pointerType !== 'touch') {
      this.updateNdc(e)
      this.pointerDirty = true
    }
    this.spin.pointerMove(e.clientX, e.clientY, this.camera)
  }

  /* A press that travelled is a rotate-drag, not a click, and must not select the face it ends
     on. The test is a few pixels of slop rather than exact equality, which no touch would ever
     pass — and this stage is meant to fill a phone screen. */
  private readonly onPointerUp = (e: PointerEvent): void => {
    if (!e.isPrimary) return
    const wasDown = this.spin.isDragging
    this.spin.pointerUp()
    if (!wasDown || e.button !== 0) return
    if (Math.hypot(e.clientX - this.downX, e.clientY - this.downY) > TAP_SLOP_PX) return
    this.updateNdc(e)
    const id = this.pickAt(this.ndc)
    if (id) this.focusPlayer(id)
    else {
      // clearSelection, not select(null): clicking away from a pinned player pulls back out too
      this.clearSelection()
      this.callbacks.onBackgroundClick()
    }
  }

  private readonly onPointerLeave = (): void => {
    this.spin.pointerUp()
    this.pointerDirty = false
    this.applyHover(null)
  }
}
