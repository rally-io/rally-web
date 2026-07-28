import { describe, it, expect } from 'vitest'
import { injectOg, escapeHtml, absoluteUrl } from './og'
import REAL_SHELL from '../../index.html?raw'

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

// --- additions for the unlisted /join/:slug previews ---

describe('absoluteUrl', () => {
  it('leaves an absolute URL alone', () => {
    expect(absoluteUrl('https://cdn.example/x.jpg', 'https://rallypadel.app')).toBe(
      'https://cdn.example/x.jpg',
    )
  })

  it('absolutises a root-relative path from public/', () => {
    expect(absoluteUrl('/cover.jpeg', 'https://rallypadel.app')).toBe(
      'https://rallypadel.app/cover.jpeg',
    )
  })

  it('does not double the slash when the origin has a trailing one', () => {
    expect(absoluteUrl('/cover.jpeg', 'https://rallypadel.app/')).toBe(
      'https://rallypadel.app/cover.jpeg',
    )
  })
})

describe('injectOg noindex', () => {
  it('inserts a robots tag when the shell has none', () => {
    const out = injectOg(HTML, {
      title: 'X', description: 'y', image: null, url: 'u', noindex: true,
    })
    expect(out).toContain('<meta name="robots" content="noindex, nofollow" />')
  })

  it('replaces rather than duplicating an existing robots tag', () => {
    const withRobots = HTML.replace('<title>', '<meta name="robots" content="all" />\n<title>')
    const out = injectOg(withRobots, {
      title: 'X', description: 'y', image: null, url: 'u', noindex: true,
    })
    expect(out.match(/name="robots"/g)).toHaveLength(1)
    expect(out).toContain('content="noindex, nofollow"')
  })

  it('omits the robots tag unless asked', () => {
    const out = injectOg(HTML, { title: 'X', description: 'y', image: null, url: 'u' })
    expect(out).not.toContain('name="robots"')
  })
})

// The regexes exist to rewrite the real shell. A hand-written fixture would
// keep passing while index.html silently drifted out of matching. Imported via
// Vite's ?raw rather than node:fs, because tsconfig pins `types` to
// vitest/globals to keep Node globals out of browser code.
describe('injectOg against the real index.html', () => {
  const out = injectOg(REAL_SHELL, {
    title: 'טורניר פאדל Samsung Galaxy Z Fold8',
    description: 'Samsung · יום רביעי, 5 באוגוסט 2026 · 18:00–22:00 · A.Padel סביון',
    image: 'https://rallypadel.app/club-a-padel-cover.jpeg',
    url: 'https://rallypadel.app/join/samsung-fold8',
    noindex: true,
  })

  const content = (key: string) =>
    out.match(new RegExp(`<meta\\s+(?:property|name)="${key}"\\s+content="([^"]*)"`, 'i'))?.[1]

  it('rewrites the title', () => {
    expect(out).toContain('<title>טורניר פאדל Samsung Galaxy Z Fold8 · Rally</title>')
  })

  it('rewrites og:title, og:description and og:url', () => {
    expect(content('og:title')).toContain('Samsung Galaxy Z Fold8')
    expect(content('og:description')).toContain('A.Padel')
    expect(content('og:url')).toBe('https://rallypadel.app/join/samsung-fold8')
  })

  it('rewrites og:image and drops the mismatched default dimensions', () => {
    expect(content('og:image')).toBe('https://rallypadel.app/club-a-padel-cover.jpeg')
    expect(out).not.toContain('og:image:width')
  })

  it('rewrites the twitter tags, so a stale card cannot win on X or Slack', () => {
    expect(content('twitter:title')).toContain('Samsung Galaxy Z Fold8')
    expect(content('twitter:description')).toContain('A.Padel')
  })

  it('marks the unlisted page noindex', () => {
    expect(content('robots')).toBe('noindex, nofollow')
  })

  it('leaves no generic marketing copy in the preview tags', () => {
    for (const key of ['og:title', 'og:description']) {
      expect(content(key)).not.toContain('כל המגרשים הפנויים')
    }
  })

  it('leaves the body shell intact', () => {
    expect(out).toContain('<div id="root">')
  })
})
