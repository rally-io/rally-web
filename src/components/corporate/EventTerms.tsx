import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ScrollText } from 'lucide-react'
import type { TermsSection } from '@/constants/eventTerms'
import { cn } from '@/lib/utils'

/**
 * An event's published rulebook, collapsed behind one control.
 *
 * Collapsed by DEFAULT and rendered last on the page: a player arrives to
 * register, not to read a legal document, and §9 of the rulebook itself only
 * asks that the text be available — registering is the acceptance. Expanding
 * costs one tap; a wall of clauses between the hero and the form would cost
 * every player who never wanted it.
 *
 * `dir="rtl"` is hard-coded on the content rather than taken from `i18n.dir()`
 * because the CONTENT is Hebrew whatever the interface language is — an English
 * UI showing this document still has to lay it out right-to-left, or the
 * clause numbers and punctuation land on the wrong side.
 */
export function EventTerms({ sections, className }: { sections: TermsSection[]; className?: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const panelId = useId()

  if (sections.length === 0) return null

  return (
    <section className={cn('rounded-2xl bg-rally-surface border border-rally-border overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center gap-3 px-5 py-4 text-start hover:bg-rally-surface-2 transition-colors"
      >
        <ScrollText className="w-4 h-4 text-rally-accent shrink-0" aria-hidden />
        <span className="flex-1 font-display font-bold text-sm text-rally-text">
          {t('corporate.terms.title')}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            'w-4 h-4 text-rally-text-2 shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* Unmounted, not hidden: the document is long, and leaving it in the
          tree would put every clause in the tab order and in the reading order
          of a screen reader that ignores `hidden` on an expanded ancestor. */}
      {open && (
        <div id={panelId} dir="rtl" className="px-5 pb-5 pt-1 border-t border-rally-border-subtle">
          {sections.map((section) => (
            <div key={section.heading} className="mt-5 first:mt-4">
              <h3 className="font-display font-bold text-sm text-rally-accent">{section.heading}</h3>
              {section.intro && (
                <p className="mt-2 text-sm leading-relaxed text-rally-text-2">{section.intro}</p>
              )}

              {section.blocks.map((block, bi) =>
                block.kind === 'facts' ? (
                  <dl
                    key={bi}
                    className="mt-3 rounded-xl bg-rally-surface-2 border border-rally-border-subtle divide-y divide-rally-border-subtle"
                  >
                    {block.rows.map(([label, value]) => (
                      <div key={label} className="flex gap-3 px-3 py-2">
                        <dt className="text-xs font-bold text-rally-text-muted w-28 shrink-0">{label}</dt>
                        <dd className="text-xs text-rally-text-2 flex-1">{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <div key={bi}>
                    {block.subheading && (
                      <p className="mt-4 text-xs font-bold text-rally-text">{block.subheading}</p>
                    )}
                    <ol
                      start={block.startAt ?? 1}
                      className="mt-2 space-y-2 list-decimal marker:text-rally-text-muted marker:text-xs ps-5"
                    >
                      {block.items.map((item) => (
                        <li key={item} className="text-sm leading-relaxed text-rally-text-2">
                          {item}
                        </li>
                      ))}
                    </ol>
                  </div>
                ),
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
