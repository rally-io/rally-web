import { CanvasTexture, LinearFilter } from 'three'

/** A player's node texture: a circular portrait — or their initials on a tinted disc when
    there is no photo — with a rim in the tier colour and a baked glow falloff. The portrait
    fills NODE_PORTRAIT_FRACTION of the canvas. */
export function avatarTexture(img: HTMLImageElement | null, ringColor: string, initials: string): CanvasTexture {
  const S = 224
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d canvas unavailable')
  const c = S / 2
  const r = S * 0.29 // portrait radius; the rest of the canvas is glow falloff

  /* Glow is baked into this texture rather than added as a second halo sprite — an extra
     sprite per node doubles the object count and the transparent overdraw, which is enough
     to stall the frame at this node count. */
  const glow = ctx.createRadialGradient(c, c, r * 0.98, c, c, r * 1.5)
  glow.addColorStop(0, `${ringColor}77`)
  glow.addColorStop(0.4, `${ringColor}22`)
  glow.addColorStop(1, `${ringColor}00`)
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, S, S)

  ctx.save()
  ctx.beginPath()
  ctx.arc(c, c, r, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  if (img) {
    /* Bloom will eat the portraits: at full brightness every face crosses the threshold and
       the whole sphere blows out into one blob. Faces sit below it; the rims still bloom. */
    ctx.filter = 'brightness(0.72) contrast(1.08) saturate(1.05)'
    const side = Math.min(img.naturalWidth, img.naturalHeight) || 1
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      c - r,
      c - r,
      r * 2,
      r * 2,
    )
    ctx.filter = 'none'
  } else {
    // the site's Avatar fallback, in the tier colour: a dark disc, a tinted wash, initials
    ctx.fillStyle = '#232328'
    ctx.fillRect(c - r, c - r, r * 2, r * 2)
    ctx.fillStyle = `${ringColor}33`
    ctx.fillRect(c - r, c - r, r * 2, r * 2)
    ctx.fillStyle = ringColor
    ctx.font = `700 ${Math.round(r * 0.9)}px Rubik, Heebo, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(initials, c, c + r * 0.04)
  }
  ctx.restore()

  ctx.beginPath()
  ctx.arc(c, c, r + 3, 0, Math.PI * 2)
  ctx.lineWidth = 6
  ctx.strokeStyle = ringColor
  ctx.stroke()

  const tex = new CanvasTexture(canvas)
  tex.minFilter = LinearFilter
  return tex
}
