import { describe, it, expect } from 'vitest'
import { injectClubOg, escapeHtml } from './clubOg'

const HTML = `<head>
<title>Rally</title>
<meta property="og:title" content="Rally" />
<meta property="og:description" content="old" />
<meta property="og:image" content="/og-image.jpg" />
<meta property="og:url" content="https://rallypadel.app" />
</head>`

const MULTILINE = `<head>
<title>Rally</title>
<meta property="og:title" content="Rally" />
<meta
  property="og:description"
  content="old desc"
/>
<meta property="og:image" content="/og-image.jpg" />
<meta property="og:url" content="https://rallypadel.app" />
</head>`

describe('clubOg', () => {
  it('escapes HTML-significant characters', () => {
    expect(escapeHtml(`A & "B" <c>`)).toBe('A &amp; &quot;B&quot; &lt;c&gt;')
  })

  it('replaces title/description/image/url with club values', () => {
    const out = injectClubOg(HTML, {
      title: 'Padel Time',
      description: 'Great club',
      image: 'https://cdn/a.jpg',
      url: 'https://rally/clubs/c1',
    })
    expect(out).toContain('<title>Padel Time · Rally</title>')
    expect(out).toContain('<meta property="og:title" content="Padel Time · Rally" />')
    expect(out).toContain('<meta property="og:description" content="Great club" />')
    expect(out).toContain('<meta property="og:image" content="https://cdn/a.jpg" />')
    expect(out).toContain('<meta property="og:url" content="https://rally/clubs/c1" />')
  })

  it('leaves image untouched when the club has none', () => {
    const out = injectClubOg(HTML, { title: 'X', description: 'y', image: null, url: 'u' })
    expect(out).toContain('<meta property="og:image" content="/og-image.jpg" />')
  })

  it('rewrites a multi-line og:description block', () => {
    const out = injectClubOg(MULTILINE, {
      title: 'Padel Time', description: 'Great club', image: null, url: 'u',
    })
    expect(out).toContain('content="Great club"')
    expect(out).not.toContain('content="old desc"')
  })
})
