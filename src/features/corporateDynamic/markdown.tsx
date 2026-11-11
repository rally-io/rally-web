import { Fragment, type ReactNode } from 'react'
import { parseBlocks } from './markdownText'

/**
 * The CRM's landing builder stores prose as light markdown (`body_md`). This renders the small
 * subset it produces — paragraphs, `-`/`*` bullets, `1.` lists, `**bold**` and bare http(s)
 * links — as React nodes. Nothing is ever injected as HTML, so manager-authored text cannot
 * script the page.
 */

const INLINE = /(\*\*[^*]+\*\*|https?:\/\/[^\s<>)]+)/g

function renderInline(text: string): ReactNode {
  return text.split(INLINE).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i} className="font-bold text-rally-text">{part.slice(2, -2)}</strong>
    }
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-rally-accent underline underline-offset-2 break-all">
          {part}
        </a>
      )
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parseBlocks(source)
  if (blocks.length === 0) return null
  return (
    // `dir="auto"`: the copy is in the event's language, whatever the interface's.
    <div dir="auto" className={className ?? 'space-y-2 text-sm leading-relaxed text-rally-text-2'}>
      {blocks.map((b, i) =>
        b.kind === 'p' ? (
          <p key={i} className="text-pretty">{renderInline(b.text)}</p>
        ) : (
          <ul key={i} className="list-disc ps-5 space-y-1">
            {b.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
          </ul>
        ),
      )}
    </div>
  )
}
