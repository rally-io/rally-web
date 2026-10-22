/* The deck's haptics. `navigator.vibrate` exists in Android Chrome and is absent in Safari and
   on desktops, where these do nothing. Some browsers throw instead of returning false (a
   cross-origin frame, a blocked permission), so every call is guarded. */

function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // no haptics here
  }
}

/** A light tick: a swipe, or a drag crossing into like / pass. */
export function tick(): void {
  vibrate(10)
}

/** A short buzz-pause-buzz for a match. */
export function buzz(): void {
  vibrate([30, 40, 30])
}
