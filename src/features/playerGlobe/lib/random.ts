/** Seeded PRNG, so the procedural felt and the hair mask are identical on every load. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface NoiseOctave {
  cell: number
  weight: number
}

/** Multi-octave value noise in [0,1] that tiles horizontally. Every cell size must divide W. */
export function valueNoise(W: number, H: number, octaves: NoiseOctave[], rand: () => number): Float32Array {
  const out = new Float32Array(W * H)
  let wsum = 0
  for (const { cell, weight } of octaves) {
    const gw = W / cell
    const gh = Math.ceil(H / cell) + 1
    const grid = new Float32Array(gw * gh)
    for (let i = 0; i < grid.length; i++) grid[i] = rand()
    for (let y = 0; y < H; y++) {
      const gy = y / cell
      const y0 = Math.floor(gy)
      const fy = gy - y0
      const sy = fy * fy * (3 - 2 * fy)
      const y1 = Math.min(y0 + 1, gh - 1)
      for (let x = 0; x < W; x++) {
        const gx = x / cell
        const x0 = Math.floor(gx)
        const fx = gx - x0
        const sx = fx * fx * (3 - 2 * fx)
        const x1 = (x0 + 1) % gw
        const top = grid[y0 * gw + x0] + (grid[y0 * gw + x1] - grid[y0 * gw + x0]) * sx
        const bot = grid[y1 * gw + x0] + (grid[y1 * gw + x1] - grid[y1 * gw + x0]) * sx
        out[y * W + x] += (top + (bot - top) * sy) * weight
      }
    }
    wsum += weight
  }
  for (let i = 0; i < out.length; i++) out[i] /= wsum
  return out
}
