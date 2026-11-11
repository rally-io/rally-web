import { describe, expect, it } from 'vitest'
import { markdownToParagraphs, parseBlocks, termsSectionsFromMarkdown } from '../markdownText'

describe('markdown-lite', () => {
  it('splits paragraphs and bullet lists', () => {
    expect(parseBlocks('One\ntwo\n\n- a\n- b\n\n1. x\n2) y')).toEqual([
      { kind: 'p', text: 'One two' }, { kind: 'ul', items: ['a', 'b'] }, { kind: 'ul', items: ['x', 'y'] },
    ])
  })
  it('strips markup for plain-text consumers', () => {
    expect(markdownToParagraphs('Hi **there**\n\n- a\n- b')).toEqual(['Hi there', 'a; b'])
  })
  it('turns terms markdown into EventTerms sections', () => {
    const s = termsSectionsFromMarkdown('Intro line\n- one\n- two\n\n## Safety\n- wear shoes', 'Rules')
    expect(s).toEqual([
      { heading: 'Rules', intro: 'Intro line', blocks: [{ kind: 'list', items: ['one', 'two'] }] },
      { heading: 'Safety', intro: undefined, blocks: [{ kind: 'list', items: ['wear shoes'] }] },
    ])
  })
  it('keeps duplicate headings unique (EventTerms keys by heading)', () => {
    const s = termsSectionsFromMarkdown('# A\n- x\n# A\n- y', 'R')
    expect(new Set(s.map((x) => x.heading)).size).toBe(2)
  })
})
