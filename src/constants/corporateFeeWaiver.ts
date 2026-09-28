/**
 * Fee-waiver flag for a corporate tournament event.
 *
 * Split out of `corporateEvents.ts` so the waiver's type can be imported
 * without pulling in the whole event registry. The event that declares one is
 * `holon-israel-open-2026`, whose tournament authorises `holon_resident`; the
 * page offers the waiver only when BOTH that entry and the loaded tournament's
 * `fee_waiver_type` say so, never on the constant alone.
 */
export interface CorporateFeeWaiver {
  type: 'holon_resident'
}
