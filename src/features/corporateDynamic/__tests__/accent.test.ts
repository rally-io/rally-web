import { describe, expect, it } from 'vitest'
import { accentStyle, accentTheme, contrastRatio, parseHex, readableTextOn } from '../accent'

const rgb = (h: string) => parseHex(h)!

describe('accent theme', () => {
  it('keeps the default brand colour when there is no (or a malformed) accent', () => {
    expect(accentStyle(null)).toBeUndefined()
    expect(accentStyle(undefined)).toBeUndefined()
    expect(accentStyle('')).toBeUndefined()
    expect(accentStyle('orange')).toBeUndefined()
    expect(accentStyle('#fff')).toBeUndefined()
    expect(accentStyle('#ff660')).toBeUndefined()
  })

  it('overrides the theme variables every rally-accent utility reads', () => {
    const style = accentStyle('#ff6600') as Record<string, string>
    expect(style['--color-rally-accent']).toBe('#ff6600')
    expect(style['--color-electric-green']).toBe('#ff6600')
    expect(style['--color-rally-accent-dim']).toBe('rgba(255, 102, 0, 0.15)')
    expect(style['--shadow-glow-electric']).toBe('0 0 32px rgba(255, 102, 0, 0.3)')
    expect(style['--color-rally-accent-hover']).toMatch(/^#[0-9a-f]{6}$/)
    expect(style['--color-rally-accent-hover']).not.toBe('#ff6600')
  })

  it('picks black or white text for whichever contrasts more on the accent', () => {
    expect(readableTextOn(rgb('#ccff00'))).toBe('#000000') // the brand lime
    expect(readableTextOn(rgb('#ffff00'))).toBe('#000000')
    expect(readableTextOn(rgb('#ffffff'))).toBe('#000000')
    expect(readableTextOn(rgb('#0055ff'))).toBe('#ffffff')
    expect(readableTextOn(rgb('#7a1fa2'))).toBe('#ffffff')
    expect(accentTheme('#ffe600')!.text).toBe('#000000')
    expect(accentTheme('#7a1fa2')!.text).toBe('#ffffff')
  })

  it('always leaves readable text on the filled accent, across the colour wheel', () => {
    for (const h of ['#ff0000', '#00ff00', '#0000ff', '#ff6600', '#808080', '#123456', '#fedcba', '#000000', '#ffffff']) {
      const theme = accentTheme(h)!
      expect(contrastRatio(rgb(theme.accent), rgb(theme.text)), h).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('lightens an accent too dark to read as text on the dark page, and leaves a bright one alone', () => {
    expect(accentTheme('#ff6600')!.accent).toBe('#ff6600')
    const dark = accentTheme('#1a1a8c')!
    expect(dark.accent).not.toBe('#1a1a8c')
    expect(contrastRatio(rgb(dark.accent), rgb('#18181b'))).toBeGreaterThanOrEqual(3)
  })
})
