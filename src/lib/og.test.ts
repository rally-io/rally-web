import { describe, it, expect } from 'vitest'
import { injectOg, escapeHtml } from './og'

const HTML = `<head>
<title>Rally</title>
<meta property="og:title" content="Rally" />
<meta property="og:description" content="old" />
<meta property="og:image" content="/og-image.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="https://rallypadel.app" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Rally" />
<meta name="twitter:description" content="old" />
<meta name="twitter:image" content="/og-image.jpg" />
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

describe('og', () => {
  it('escapes HTML-significant characters', () => {
    expect(escapeHtml(`A & "B" <c>`)).toBe('A &amp; &quot;B&quot; &lt;c&gt;')
  })

  it('replaces title/description/image/url with entity values', () => {
    const out = injectOg(HTML, {
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

  it('rewrites the twitter card alongside the og tags', () => {
    const out = injectOg(HTML, {
      title: 'Summer Open',
      description: 'Doubles',
      image: 'https://cdn/t.jpg',
      url: 'https://rally/tournaments/t1',
    })
    expect(out).toContain('<meta name="twitter:title" content="Summer Open · Rally" />')
    expect(out).toContain('<meta name="twitter:description" content="Doubles" />')
    expect(out).toContain('<meta name="twitter:image" content="https://cdn/t.jpg" />')
    // The card type is not ours to rewrite.
    expect(out).toContain('<meta name="twitter:card" content="summary_large_image" />')
  })

  it('drops the default card dimensions when a real image is injected', () => {
    const out = injectOg(HTML, {
      title: 'X', description: 'y', image: 'https://cdn/a.jpg', url: 'u',
    })
    expect(out).not.toContain('og:image:width')
    expect(out).not.toContain('og:image:height')
  })

  it('keeps image and dimensions untouched when the entity has none', () => {
    const out = injectOg(HTML, { title: 'X', description: 'y', image: null, url: 'u' })
    expect(out).toContain('<meta property="og:image" content="/og-image.jpg" />')
    expect(out).toContain('<meta name="twitter:image" content="/og-image.jpg" />')
    expect(out).toContain('<meta property="og:image:width" content="1200" />')
  })

  it('rewrites a multi-line og:description block', () => {
    const out = injectOg(MULTILINE, {
      title: 'Padel Time', description: 'Great club', image: null, url: 'u',
    })
    expect(out).toContain('content="Great club"')
    expect(out).not.toContain('content="old desc"')
  })

  it('flattens newlines in a free-text description', () => {
    const out = injectOg(HTML, {
      title: 'X', description: 'line one\n\n  line two ', image: null, url: 'u',
    })
    expect(out).toContain('<meta property="og:description" content="line one line two" />')
  })

  it('treats $-sequences in entity text as literals, not backreferences', () => {
    // escapeHtml already neutralises `$&` (the `&` becomes `&amp;`), but `$1`
    // and `` $` `` reach String.replace intact and would be read as capture
    // group references if the replacement were a template string.
    const out = injectOg(HTML, {
      title: 'Win $500', description: 'Prize $1 for the $`top seed', image: null, url: 'u',
    })
    expect(out).toContain('<title>Win $500 · Rally</title>')
    expect(out).toContain('<meta property="og:title" content="Win $500 · Rally" />')
    expect(out).toContain(
      '<meta property="og:description" content="Prize $1 for the $`top seed" />',
    )
  })
})
