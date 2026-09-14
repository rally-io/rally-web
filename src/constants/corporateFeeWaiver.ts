/**
 * Fee-waiver flag for a corporate tournament event.
 *
 * Split out of `corporateEvents.ts` on purpose: that file's `CORPORATE_EVENTS`
 * map carries an uncommitted, in-progress entry (`israel-open-2026`) and must
 * stay unstaged as a whole until its owner commits it. The `feeWaiver` field
 * on `CorporateTournamentEvent` is added there too (working tree only), but
 * the type it references lives here so committed code can import it.
 */
export interface CorporateFeeWaiver {
  type: 'holon_resident'
}
