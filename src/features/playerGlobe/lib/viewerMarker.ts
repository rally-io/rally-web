import { AdditiveBlending, CanvasTexture, LinearFilter, Sprite, SpriteMaterial } from 'three'

/** How much wider than the portrait the halo reaches. */
export const HALO_SCALE = 2.1
/** Radians per second of the breath — one slow pulse, not a blink. */
export const HALO_SPEED = 2.4
/** Badge width as a fraction of the player's sprite, and the pill's own aspect. */
export const BADGE_WIDTH = 0.78
export const BADGE_ASPECT = 2.6
/** How far below the node's centre the badge hangs, as a fraction of the sprite. The portrait
    fills ~0.29 of its sprite (see avatarTexture) and its rim and glow sit just outside that, so
    anything under ~0.4 lands the pill on the face rather than beneath it. */
export const BADGE_DROP = 0.42

/** A soft lime ring, transparent in the middle so the portrait shows through it. Drawn as a
    gradient rather than a stroke so the edge has no hard line to alias. */
function haloTexture(): CanvasTexture {
  const S = 192
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d canvas unavailable')
  const c = S / 2
  /* The portrait occupies the middle 0.29 of its own sprite (see avatarTexture); scaled up by
     HALO_SCALE that lands at ~0.14 here, so the ring starts just outside the rim. */
  const gradient = ctx.createRadialGradient(c, c, S * 0.15, c, c, S * 0.5)
  gradient.addColorStop(0, 'rgba(204,255,0,0)')
  gradient.addColorStop(0.28, 'rgba(204,255,0,0.55)')
  gradient.addColorStop(0.55, 'rgba(204,255,0,0.16)')
  gradient.addColorStop(1, 'rgba(204,255,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, S, S)
  const tex = new CanvasTexture(canvas)
  tex.minFilter = LinearFilter
  return tex
}

/** The "you" pill: a dark lozenge with a lime edge and lime text. Dark, not lime-filled — a
    lime pill on lime felt is exactly the problem the halo alone had. */
function badgeTexture(label: string): CanvasTexture {
  const W = 260
  const H = Math.round(W / BADGE_ASPECT)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d canvas unavailable')
  const pad = 6
  const r = (H - pad * 2) / 2
  ctx.beginPath()
  // a lozenge inset by `pad`, so the stroke has room and the texture edge stays transparent
  ctx.moveTo(pad + r, pad)
  ctx.lineTo(W - pad - r, pad)
  ctx.arcTo(W - pad, pad, W - pad, pad + r, r)
  ctx.arcTo(W - pad, H - pad, W - pad - r, H - pad, r)
  ctx.lineTo(pad + r, H - pad)
  ctx.arcTo(pad, H - pad, pad, H - pad - r, r)
  ctx.arcTo(pad, pad, pad + r, pad, r)
  ctx.closePath()
  ctx.fillStyle = 'rgba(4,7,13,0.92)'
  ctx.fill()
  ctx.lineWidth = 5
  ctx.strokeStyle = '#ccff00'
  ctx.stroke()
  ctx.fillStyle = '#ccff00'
  ctx.font = `800 ${Math.round(H * 0.5)}px Rubik, Heebo, system-ui, -apple-system, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, W / 2, H / 2 + H * 0.02)
  const tex = new CanvasTexture(canvas)
  tex.minFilter = LinearFilter
  return tex
}

/** The viewer's own node wears a lime halo that breathes, so they can find themselves on a ball
    of a hundred faces. Additive and behind the portrait: it lights the space around the face
    without touching the face itself. */
export function buildViewerHalo(): Sprite {
  const material = new SpriteMaterial({
    map: haloTexture(),
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const sprite = new Sprite(material)
  sprite.renderOrder = -1 // under the portraits, which draw with depthTest off too
  return sprite
}

/** The label under that node. The halo alone says "look here" but never says why; this says it
    in a word. `center` is set so the pill hangs BELOW the node's position in screen space —
    sprites billboard, so a fixed world offset would not stay under the face as the ball turns. */
export function buildViewerBadge(label: string): Sprite {
  const material = new SpriteMaterial({
    map: badgeTexture(label),
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
  const sprite = new Sprite(material)
  sprite.renderOrder = 2 // over the portraits, so a crowded rim cannot bury it
  return sprite
}

/** Size and hang the badge under a player's sprite of side `spriteSide` (world units). */
export function layoutViewerBadge(badge: Sprite, spriteSide: number): void {
  const width = spriteSide * BADGE_WIDTH
  const height = width / BADGE_ASPECT
  badge.scale.set(width, height, 1)
  // anchor at the pill's top edge, pushed down past the portrait's rim
  badge.center.set(0.5, 1 + (spriteSide * BADGE_DROP) / height)
}

/** The halo's opacity this frame: a slow breath, scaled by how visible its player is. Calmer
    than it was now that the badge carries the meaning. */
export function haloOpacity(seconds: number, visibility: number): number {
  return (0.45 + 0.35 * Math.sin(seconds * HALO_SPEED)) * visibility
}
