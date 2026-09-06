import { CanvasTexture, SRGBColorSpace } from 'three'
import {
  BALL_TEX_H, BALL_TEX_SEED, BALL_TEX_W, FELT_BUMP_MIX, FELT_DARK, FELT_LIGHT, FELT_TILES, FELT_TINT,
  SEAM_PX,
} from '../constants'
import { mulberry32, valueNoise } from './random'
import { seamPoints, strokeSeam } from './seam'
import { paintLogos, type LogoMask } from './logoCoin'

export interface BallTextures {
  map: CanvasTexture
  bump: CanvasTexture
  fur: CanvasTexture
}

const context2d = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d canvas unavailable')
  return ctx
}

/** Felt colour map + bump map + hair mask for the ball. `feltImg` is the optional
    photographic felt tile; without it the felt is procedural. ~350ms on an M-series Mac. */
export function padelBallTextures(logoMaskData: LogoMask | null, feltImg: HTMLImageElement | null): BallTextures {
  const W = BALL_TEX_W
  const H = BALL_TEX_H
  const rand = mulberry32(BALL_TEX_SEED)

  const map = document.createElement('canvas')
  map.width = W
  map.height = H
  const mc = context2d(map)
  const bump = document.createElement('canvas')
  bump.width = W
  bump.height = H
  const bc = context2d(bump)
  let img: ImageData
  let bimg: ImageData

  if (feltImg) {
    /* Photo felt: tile the photo across the map, tint it, and take its luminance (compressed
       around mid-grey) as the bump grain. */
    const [tx, ty] = FELT_TILES
    const tw = W / tx
    const th = H / ty
    for (let j = 0; j < Math.ceil(ty); j++) {
      for (let i = 0; i < tx; i++) mc.drawImage(feltImg, i * tw, j * th, tw, th)
    }
    mc.globalCompositeOperation = 'multiply'
    mc.fillStyle = FELT_TINT
    mc.fillRect(0, 0, W, H)
    mc.globalCompositeOperation = 'source-over'
    bc.fillStyle = '#8a8a8a'
    bc.fillRect(0, 0, W, H)
    bc.globalAlpha = FELT_BUMP_MIX
    for (let j = 0; j < Math.ceil(ty); j++) {
      for (let i = 0; i < tx; i++) bc.drawImage(feltImg, i * tw, j * th, tw, th)
    }
    bc.globalAlpha = 1
    img = mc.getImageData(0, 0, W, H)
    bimg = bc.getImageData(0, 0, W, H)
  } else {
    const noise = valueNoise(
      W,
      H,
      [
        { cell: 256, weight: 0.3 },
        { cell: 64, weight: 0.28 },
        { cell: 16, weight: 0.24 },
        { cell: 4, weight: 0.18 },
      ],
      rand,
    )
    img = mc.createImageData(W, H)
    bimg = bc.createImageData(W, H)
    const px = img.data
    const bpx = bimg.data
    for (let i = 0; i < W * H; i++) {
      const k = noise[i]
      px[i * 4] = FELT_DARK[0] + (FELT_LIGHT[0] - FELT_DARK[0]) * k
      px[i * 4 + 1] = FELT_DARK[1] + (FELT_LIGHT[1] - FELT_DARK[1]) * k
      px[i * 4 + 2] = FELT_DARK[2] + (FELT_LIGHT[2] - FELT_DARK[2]) * k
      px[i * 4 + 3] = 255
      // felt grain kept low in the bump so the larger bumpScale (for the logo bevel) doesn't
      // turn the fuzz into gravel
      const v = 122 + k * 36
      bpx[i * 4] = v
      bpx[i * 4 + 1] = v
      bpx[i * 4 + 2] = v
      bpx[i * 4 + 3] = 255
    }
  }
  if (logoMaskData) paintLogos(img.data, bimg.data, W, H, logoMaskData)
  mc.putImageData(img, 0, 0)
  bc.putImageData(bimg, 0, 0)
  if (!feltImg) {
    // fibre speckle on top of the procedural grain — short, slightly directional
    for (let i = 0; i < 40000; i++) {
      const light = rand() < 0.5
      mc.fillStyle = light ? 'rgba(214,232,140,0.10)' : 'rgba(24,30,6,0.14)'
      mc.fillRect(rand() * W, rand() * H, 1, 1 + rand() * 3)
    }
  }

  const seam = seamPoints(3000)
  // colour: soft shadow, then the darker groove edges, then the cream strip over them
  strokeSeam(mc, W, H, seam, SEAM_PX * 1.9, 'rgba(26,32,8,0.32)')
  strokeSeam(mc, W, H, seam, SEAM_PX * 1.22, 'rgba(70,74,46,0.85)')
  /* the strip reads white on the lit side ONLY because the lights push it there; its albedo
     must stay well under the bloom threshold or the whole seam turns into a white streak */
  strokeSeam(mc, W, H, seam, SEAM_PX, '#c4c3aa')
  // bump: a lip either side, and the strip itself slightly recessed
  strokeSeam(bc, W, H, seam, SEAM_PX * 1.3, 'rgb(172,172,172)')
  strokeSeam(bc, W, H, seam, SEAM_PX, 'rgb(118,118,118)')

  const mapTex = new CanvasTexture(map)
  mapTex.colorSpace = SRGBColorSpace
  mapTex.anisotropy = 4
  const bumpTex = new CanvasTexture(bump)
  bumpTex.anisotropy = 4

  /* Hair mask for the fur shells: per-texel random density, so a rising alpha test thins the
     layers toward the tips; clumped a little by the felt photo's own mottling when present.
     Black on the seam — the rubber strip has no hair. */
  const fur = document.createElement('canvas')
  fur.width = W
  fur.height = H
  const fc = context2d(fur)
  const fimg = fc.createImageData(W, H)
  const fpx = fimg.data
  const src = feltImg ? mc.getImageData(0, 0, W, H).data : null
  for (let i = 0; i < W * H; i++) {
    let d = rand()
    if (src) d = d * 0.7 + (src[i * 4 + 1] / 255) * 0.3
    const v = Math.round(d * 255)
    fpx[i * 4] = v
    fpx[i * 4 + 1] = v
    fpx[i * 4 + 2] = v
    fpx[i * 4 + 3] = 255
  }
  fc.putImageData(fimg, 0, 0)
  strokeSeam(fc, W, H, seam, SEAM_PX * 2.1, '#000') // wider than the groove: no hair over the dark edge
  const furTex = new CanvasTexture(fur)
  furTex.anisotropy = 4
  return { map: mapTex, bump: bumpTex, fur: furTex }
}
