const HEBREW = /[\u0590-\u05FF]/
// "16:00–00:00", "07:30-13:00" — one clock range, kept on one line and LTR.
const TIME_RANGE = /(\d{1,2}:\d{2}\s?[–-]\s?\d{1,2}:\d{2})/
const IS_TIME_RANGE = /^\d{1,2}:\d{2}\s?[–-]\s?\d{1,2}:\d{2}$/

/**
 * One line of a chip value. A pure time range ("19:30–03:00") is rendered as a
 * single LTR island: the page is RTL, so bidi would reorder the two clock runs
 * and paint a range crossing midnight as a perfectly plausible reversed one — a
 * guest reads 03:00–19:30 and turns up sixteen hours early. A line that mixes
 * Hebrew words with ranges ("רביעי–חמישי 16:00–00:00") keeps its Hebrew order
 * and isolates each range on its own, so neither the words nor the clocks flip
 * and a range is never broken at its dash by a narrow chip.
 *
 * <bdi> rather than dir on the <dd>: it isolates the run without changing the
 * block's alignment, so the chip still reads right-aligned like its neighbours.
 */
function ChipLine({ line, isolateLtr }: { line: string; isolateLtr?: boolean }) {
  if (isolateLtr && !HEBREW.test(line)) return <bdi dir="ltr">{line}</bdi>
  return (
    <>
      {line.split(TIME_RANGE).map((part, i) =>
        IS_TIME_RANGE.test(part) ? (
          <bdi key={i} dir="ltr" className="whitespace-nowrap">{part}</bdi>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

export function DetailChip({
  icon,
  label,
  value,
  isolateLtr,
}: {
  icon: React.ReactNode
  label: string
  /** Copy, not data. A "\n" starts a new line inside the chip. */
  value: string
  /** Treat a value with no Hebrew in it as one LTR run (a bare time range). */
  isolateLtr?: boolean
}) {
  return (
    <div className="rounded-xl bg-rally-surface border border-rally-border px-4 py-3">
      <dt className="flex items-center gap-1.5 text-xs text-rally-text-muted font-bold mb-1">
        {icon}
        {label}
      </dt>
      <dd className="text-sm font-display font-bold text-rally-text leading-snug">
        {value.split('\n').map((line, i) => (
          <span key={i} className="block">
            <ChipLine line={line} isolateLtr={isolateLtr} />
          </span>
        ))}
      </dd>
    </div>
  )
}
