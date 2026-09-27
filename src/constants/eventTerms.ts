/**
 * The shape of an event's published rulebook (תקנון).
 *
 * Split out of `corporateEvents.ts` for the same reason `corporateFeeWaiver.ts`
 * was: that file is a registry of events, and a rulebook is bulk content. The
 * types live here so a rulebook module can import them without pulling the
 * whole event registry in behind it.
 *
 * Content is authored in the organiser's own language and is NOT translated —
 * see the note at the top of `israelOpenTerms.ts`.
 */

/** A numbered run of clauses, optionally under its own sub-heading. */
export interface TermsListBlock {
  kind: 'list'
  /** e.g. "תושבי חולון" — a heading inside a section, as the source document has. */
  subheading?: string
  /**
   * The number the first item carries. Sub-headed runs continue the section's
   * own numbering rather than restarting at 1 (the source document numbers
   * 1–7 straight through §3 across three sub-headings), so a block that picks
   * up mid-section says where it starts. Defaults to 1.
   */
  startAt?: number
  items: string[]
}

/** The key/value facts table the source document opens with. */
export interface TermsFactsBlock {
  kind: 'facts'
  rows: [label: string, value: string][]
}

export type TermsBlock = TermsListBlock | TermsFactsBlock

export interface TermsSection {
  /** Carries its own number, e.g. "3. דמי השתתפות ותושבי חולון". */
  heading: string
  /** Unnumbered lead paragraph, before any clauses. */
  intro?: string
  blocks: TermsBlock[]
}
