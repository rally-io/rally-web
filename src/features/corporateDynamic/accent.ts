import type { CSSProperties } from 'react'

/**
 * A per-event accent (`landing_config.accent`, "#rrggbb") as a CSS-variable override for the page
 * root. The site's theme lives in `@theme` tokens that every `rally-accent` utility resolves at
 * use time, so setting them on one element re-colours buttons, links, focus rings, chips, selected
 * states and the glow underneath it — without touching any component.
 *
 * Two readability rules, computed rather than hoped for:
 *  - text ON the accent (a filled button) is black or white, whichever contrasts more;
 *  - the accent is also used as TEXT on the dark page, so a too-dark colour is lightened until it
 *    reaches 3:1 (large-text AA) against the page background.
 * `null`, or anything that is not a 6-digit hex, returns undefined: the default lime stays.
 */

const PAGE_BG = '#18181b' // --color-rally-bg
const HEX = /^#[0-9a-f]{6}$/i

type Rgb = [number, number, number]

export function parseHex(hex: string): Rgb | null {
  if (!HEX.test(hex)) return null
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb
}

export function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`
}

/** WCAG relative luminance. */
export function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as Rgb

/** Black or white, whichever reads better on `bg`. */
export function readableTextOn(bg: Rgb): '#000000' | '#ffffff' {
  return contrastRatio(bg, [0, 0, 0]) >= contrastRatio(bg, [255, 255, 255]) ? '#000000' : '#ffffff'
}

/** The accent, lightened toward white just enough to be legible as text on the dark page. */
export function legibleOnDark(rgb: Rgb): Rgb {
  const bg = parseHex(PAGE_BG)!
  let out = rgb
  for (let step = 1; step <= 10 && contrastRatio(out, bg) < 3; step++) out = mix(rgb, [255, 255, 255], step / 10)
  return out
}

export interface AccentTheme {
  accent: string
  hover: string
  dim: string
  text: string
  glow: string
}

export function accentTheme(accent: string | null | undefined): AccentTheme | null {
  const parsed = accent ? parseHex(accent.trim()) : null
  if (!parsed) return null
  const rgb = legibleOnDark(parsed)
  // Hover moves away from the page: a light accent darkens, a dark one lightens.
  const hover = luminance(rgb) > 0.4 ? mix(rgb, [0, 0, 0], 0.12) : mix(rgb, [255, 255, 255], 0.15)
  const [r, g, b] = rgb.map(Math.round)
  return {
    accent: toHex(rgb),
    hover: toHex(hover),
    dim: `rgba(${r}, ${g}, ${b}, 0.15)`,
    text: readableTextOn(rgb),
    glow: `0 0 32px rgba(${r}, ${g}, ${b}, 0.3)`,
  }
}

/** The page root's `style`, or undefined for the default brand colour. */
export function accentStyle(accent: string | null | undefined): CSSProperties | undefined {
  const theme = accentTheme(accent)
  if (!theme) return undefined
  return {
    '--color-rally-accent': theme.accent,
    '--color-electric-green': theme.accent,
    '--color-rally-accent-hover': theme.hover,
    '--color-rally-accent-dim': theme.dim,
    '--color-rally-accent-text': theme.text,
    '--shadow-glow-electric': theme.glow,
  } as CSSProperties
}
