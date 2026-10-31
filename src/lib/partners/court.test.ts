import { describe, expect, it } from 'vitest'
import { courtPlacement } from './court'

describe('courtPlacement', () => {
  it.each([
    // their side, your side → them, you
    ['right_side', 'left_side', 'right', 'left'], // a natural pair
    ['left_side', 'right_side', 'left', 'right'],
    ['right_side', 'right_side', 'right', 'right'], // the same side: shown, not hidden
    ['both_sides', 'right_side', 'left', 'right'], // they adapt to you
    ['both_sides', 'left_side', 'right', 'left'],
    ['right_side', 'both_sides', 'right', 'left'], // you adapt to them
    ['both_sides', 'both_sides', 'centre', null], // any split would be made up
    ['right_side', null, 'right', null], // your side unknown (or the profile not loaded yet)
    ['both_sides', null, 'centre', null],
    [null, 'left_side', 'centre', null], // their side unknown
    ['sideways', 'left_side', 'centre', null], // a value this build does not know
    ['right_side', 'sideways', 'right', null],
  ])('they play %s, you play %s → they stand %s, you %s', (theirs, yours, them, you) => {
    expect(courtPlacement(theirs, yours)).toEqual({ them, you })
  })
})
