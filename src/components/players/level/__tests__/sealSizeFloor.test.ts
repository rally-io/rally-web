import { describe, expect, it } from 'vitest'

/**
 * Spec §5: the seal is illegible below 16px — its own seam detail gates at 16
 * (see `VerifiedSeal.tsx`'s `size >= 16` seams gate; `VerificationMark.tsx` already
 * enforces this floor at runtime via `Math.max(MIN_SIZE, size)` — pinned in
 * `VerificationMark.test.tsx`'s "never renders a seal below the 16px floor"). This
 * guard is the complementary STATIC check: nothing calls `VerifiedSeal` directly
 * with a literal size below the floor, bypassing `VerificationMark`'s runtime clamp
 * entirely (`VerifiedSeal` itself performs no clamping — it renders whatever size
 * it is given).
 *
 * DEVIATION FROM THE TASK BRIEF'S CODE SAMPLE, FLAGGED per this task's rule that a
 * prose/code disagreement resolves to the prose: the brief's sample walks `src`
 * with `node:fs` (`readdirSync`/`statSync`/`readFileSync`) and `node:path` (`join`).
 * This project's `tsconfig.json` pins `"types": ["vitest/globals"]` — no Node
 * types — so `node:fs` type-checks against nothing here: it runs fine under
 * vitest but fails `tsc --noEmit` / `vite build`, and a guard that blocks the
 * production build is worse than the bug it guards against. This exact wall (and
 * fix) is already documented in this repo, in the header comment of
 * `leagueRanking/__tests__/noPhysicalDirection.test.ts`: read sources via
 * `import.meta.glob(..., { query: '?raw' })` instead of `fs`. Same fix applied
 * here — with an absolute glob pattern (`/src/**`) rather than that file's
 * feature-relative `../**`, since `VerifiedSeal` call sites are not confined to
 * one feature.
 */
const SOURCES = import.meta.glob('/src/**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function offendersIn(path: string, src: string): string[] {
  const offenders: string[] = []
  for (const m of src.matchAll(/<VerifiedSeal[^>]*size=\{(\d+)\}/g)) {
    if (Number(m[1]) < 16) offenders.push(`${path}: size={${m[1]}}`)
  }
  return offenders
}

/* SCOPE, stated honestly because the old title overclaimed: this guard reads SOURCE TEXT, so it
   sees only LITERAL numeric props — `size={12}`. A COMPUTED size is invisible to it. One such
   call site exists and is deliberate: LevelChip passes `size={SEAL_PX[size]}` where
   `SEAL_PX.sm = 12`, which the 2026-09-05 rating-reliability-ui spec §5.3 locks at 12/16/22.
   That conflicts with the 2026-09-10 badge spec's blanket 16px floor; the conflict is open and
   is the owner's call, not this test's. Until it is settled, do not "fix" either side here. */
describe('no VerifiedSeal call site with a LITERAL size is below the 16px floor', () => {
  it('holds across src/', () => {
    const offenders: string[] = []
    for (const [path, src] of Object.entries(SOURCES)) {
      if (path.includes('.test.')) continue
      offenders.push(...offendersIn(path, src))
    }
    expect(offenders).toEqual([])
  })

  it('actually detects an offender (the guard is not vacuous)', () => {
    // A guard that never fires on anything is not proven to work — same reasoning
    // as noPhysicalDirection.test.ts's own "is not vacuous" case. Exercise the
    // detector directly against a literal call site the way a real regression
    // would introduce one, since src/ itself currently holds none.
    expect(offendersIn('fake.tsx', '<VerifiedSeal size={12} className="shrink-0" />')).toEqual([
      'fake.tsx: size={12}',
    ])
    expect(offendersIn('fake.tsx', '<VerifiedSeal size={16} />')).toEqual([])
    expect(offendersIn('fake.tsx', '<VerifiedSeal size={22} ghost />')).toEqual([])
  })

  it('reads real sources, so it cannot pass by globbing nothing', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(0)
  })
})
