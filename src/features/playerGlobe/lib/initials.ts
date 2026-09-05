/** First letter of the first two words; "?" for an empty name. Works for Hebrew too. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  const letters = parts.map((w) => w[0]).join('')
  return letters ? letters.toUpperCase() : '?'
}
