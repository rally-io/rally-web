import { describe, it, expect } from 'vitest'
import { injectOg, replaceMeta, upsertMeta, absoluteUrl, escapeHtml } from './og'
// The regexes exist to rewrite THIS file. Testing against a hand-written
// fixture would pass while the real shell silently didn't match. Imported via
// Vite's ?raw rather than node:fs, because tsconfig pins `types` to
// vitest/globals and src/ is deliberately compiled without Node types.
import REAL_SHELL from '../../index.html?raw'

describe('escapeHtml', () => {
  it('escapes the characters that would break an attribute', () => {
    expect(escapeHtml(`A & "B" <c>`)).toBe('A &amp; &quot;B&quot; &lt;c&gt;')
  })
})

describe('absoluteUrl', () => {
  it('leaves absolute URLs alone', () => {
    expect(absoluteUrl('https://cdn.example/x.jpg', 'https://rallypadel.app')).toBe(
      'https://cdn.example/x.jpg',
    )
  })
  it('absolutises a root-relative path', () => {
    expect(absoluteUrl('/cover.jpeg', 'https://rallypadel.app')).toBe(
      'https://rallypadel.app/cover.jpeg',
    )
  })
  it('does not double the slash', () => {
    expect(absoluteUrl('/cover.jpeg', 'https://rallypadel.app/')).toBe(
      'https://rallypadel.app/cover.jpeg',
    )
  })
})

describe('replaceMeta / upsertMeta', () => {
  it('replaces a property= tag', () => {
    const html = '<meta property="og:title" content="old" />'
    expect(replaceMeta(html, 'og:title', 'new')).toContain('content="new"')
  })

  it('replaces a name= tag when told to', () => {
    const html = '<meta name="twitter:title" content="old" />'
    expect(replaceMeta(html, 'twitter:title', 'new', 'name')).toContain('content="new"')
  })

  it('does not match a name= tag while looking for property=', () => {
    const html = '<meta name="og:title" content="old" />'
    expect(replaceMeta(html, 'og:title', 'new')).toBe(html)
  })

  it('is a no-op when the tag is absent', () => {
    expect(replaceMeta('<head></head>', 'og:title', 'x')).toBe('<head></head>')
  })

  it('upsert inserts a missing tag into <head>', () => {
    const out = upsertMeta('<head></head>', 'robots', 'noindex, nofollow', 'name')
    expect(out).toContain('<meta name="robots" content="noindex, nofollow" />')
  })

  it('upsert replaces rather than duplicating an existing tag', () => {
    const html = '<head><meta name="robots" content="all" /></head>'
    const out = upsertMeta(html, 'robots', 'noindex, nofollow', 'name')
    expect(out.match(/name="robots"/g)).toHaveLength(1)
    expect(out).toContain('content="noindex, nofollow"')
  })
})

describe('injectOg against the real index.html', () => {
  const out = injectOg(REAL_SHELL, {
    title: 'טורניר פאדל Samsung Galaxy Z Fold8 · Samsung',
    description: 'יום רביעי, 5 באוגוסט 2026 · 18:00–22:00 · A.Padel סביון',
    image: 'https://rallypadel.app/club-a-padel-cover.jpeg',
    url: 'https://rallypadel.app/join/samsung-fold8',
    noindex: true,
  })

  const content = (key: string, attr = 'property') =>
    out.match(new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`, 'i'))?.[1]

  it('rewrites the document title', () => {
    expect(out).toContain('<title>טורניר פאדל Samsung Galaxy Z Fold8 · Samsung</title>')
  })

  it('rewrites og:title, og:description and og:url', () => {
    expect(content('og:title')).toContain('Samsung Galaxy Z Fold8')
    expect(content('og:description')).toContain('A.Padel')
    expect(content('og:url')).toBe('https://rallypadel.app/join/samsung-fold8')
  })

  it('rewrites the og:image to the absolute club cover', () => {
    expect(content('og:image')).toBe('https://rallypadel.app/club-a-padel-cover.jpeg')
  })

  it('rewrites the twitter tags too, so a stale card cannot win', () => {
    expect(content('twitter:title', 'name')).toContain('Samsung Galaxy Z Fold8')
    expect(content('twitter:description', 'name')).toContain('A.Padel')
  })

  it('adds robots noindex', () => {
    expect(content('robots', 'name')).toBe('noindex, nofollow')
  })

  it('leaves no generic marketing copy in the preview tags', () => {
    for (const key of ['og:title', 'og:description']) {
      expect(content(key)).not.toContain('כל המגרשים הפנויים')
    }
  })

  it('does not alter the shell beyond the head', () => {
    expect(out).toContain('<div id="root">')
  })
})
