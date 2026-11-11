/** Pure text helpers for the landing config's light markdown (no React). See markdown.tsx for rendering. */
import type { TermsSection } from '@/constants/eventTerms'

const LIST_ITEM = /^\s*(?:[-*]|\d+[.)])\s+(.*)$/

export type Block = { kind: 'p'; text: string } | { kind: 'ul'; items: string[] }

export function parseBlocks(md: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  let list: string[] | null = null
  const flushPara = () => {
    if (para.length) blocks.push({ kind: 'p', text: para.join(' ') })
    para = []
  }
  const flushList = () => {
    if (list?.length) blocks.push({ kind: 'ul', items: list })
    list = null
  }
  for (const raw of md.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim()
    if (!line) { flushPara(); flushList(); continue }
    const item = LIST_ITEM.exec(raw)
    if (item) { flushPara(); (list ??= []).push(item[1].trim()); continue }
    flushList()
    para.push(line)
  }
  flushPara()
  flushList()
  return blocks
}

/** Plain paragraphs for places that take raw text (the hero's intro): markup stripped. */
export function markdownToParagraphs(md: string): string[] {
  return parseBlocks(md).map((b) =>
    (b.kind === 'p' ? b.text : b.items.join('; ')).replace(/\*\*([^*]+)\*\*/g, '$1'),
  )
}

/**
 * The terms component's markdown as `EventTerms` sections: a `#`/`##` line starts a section; the
 * paragraphs before the first list are its intro and each list is a numbered block.
 */
export function termsSectionsFromMarkdown(md: string, fallbackHeading: string): TermsSection[] {
  const sections: TermsSection[] = []
  let current: { heading: string; chunks: string[] } | null = null
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const flush = () => {
    if (!current) return
    const blocks = parseBlocks(current.chunks.join('\n'))
    const intro = blocks.filter((b): b is Extract<Block, { kind: 'p' }> => b.kind === 'p').map((b) => b.text).join(' ')
    const lists = blocks.filter((b): b is Extract<Block, { kind: 'ul' }> => b.kind === 'ul')
    if (intro || lists.length) {
      sections.push({
        heading: current.heading,
        intro: intro || undefined,
        blocks: lists.map((l) => ({ kind: 'list' as const, items: l.items })),
      })
    }
    current = null
  }
  for (const line of lines) {
    const h = /^\s*#{1,3}\s+(.*)$/.exec(line)
    if (h) { flush(); current = { heading: h[1].trim(), chunks: [] }; continue }
    ;(current ??= { heading: fallbackHeading, chunks: [] }).chunks.push(line)
  }
  flush()
  // EventTerms keys sections by heading; two with the same text would collide.
  const seen = new Map<string, number>()
  return sections.map((s) => {
    const n = (seen.get(s.heading) ?? 0) + 1
    seen.set(s.heading, n)
    return n === 1 ? s : { ...s, heading: `${s.heading} (${n})` }
  })
}
