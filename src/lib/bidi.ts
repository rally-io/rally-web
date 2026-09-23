/** Wraps a token in LTR isolates (U+2066 LRI … U+2069 PDI) so a number or a percentage
    interpolated into a Hebrew sentence stays one left-to-right run — "72%" never becomes
    "%72". Apply it to the value *before* `t()` interpolation, never by concatenating around
    the translated string. See wiki/gotchas/web-rtl-score-string-mirroring. */
export const ltrIsolate = (s: string): string => `⁦${s}⁩`
