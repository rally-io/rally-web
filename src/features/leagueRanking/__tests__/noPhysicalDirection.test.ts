import { describe, expect, it } from 'vitest';

/**
 * This app mirrors for Hebrew by setting `dir` on a wrapping element (src/App.tsx),
 * and the browser mirrors logical properties automatically. Physical Tailwind
 * utilities do NOT follow `dir` — they stay pinned to a side. So `ml-4` looks
 * perfect in English and is wrong in Hebrew, which is the default language here.
 *
 * The failure mode this guards is nasty precisely because it is invisible to
 * anyone reviewing in English. Use the logical variants: ms-/me-, ps-/pe-,
 * text-start/text-end, start-/end-.
 *
 * Sources are read with `import.meta.glob`, not `fs`. This file lives under `src`,
 * where tsconfig sets `"types": ["vitest/globals"]` — importing `fs`/`path` here
 * runs fine under vitest but breaks `tsc -b`, and `vite build` never runs. A guard
 * that blocks the production build is worse than the bug it guards against.
 */
const SOURCES = import.meta.glob('../**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const PHYSICAL =
  /\b(ml|mr|pl|pr|border-l|border-r|rounded-l|rounded-r)-(?![a-z])|\btext-(left|right)\b|\b(left|right)-\d/;

/**
 * Every string literal in the file, not just the ones directly after `className=`.
 *
 * The first version of this guard matched `className="…"` and its brace forms only.
 * This feature is written as `className={cn('flex …', className)}` throughout, so the
 * guard saw nothing at all and passed on every file — green because it was blind, not
 * because the code was clean. A guard that cannot see the code it guards is worse than
 * no guard, because it buys confidence nobody earned.
 *
 * Scanning every literal risks a false positive on prose. That trade is deliberate: a
 * false positive is loud and takes a minute to fix, a false negative is silent and
 * ships. Import paths are not a problem in practice — `left-` only matches before a
 * digit, so `./left-panel` does not trip it.
 */
function stringLiterals(source: string): string[] {
  const out: string[] = [];
  const re = /"([^"\\\n]*)"|'([^'\\\n]*)'|`([^`\\]*)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    // Drop ${...} expressions from template literals before tokenising.
    out.push((m[1] ?? m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, ' '));
  }
  return out;
}

function offendersIn(source: string): string[] {
  return stringLiterals(source)
    .flatMap(literal => literal.split(/\s+/))
    // Strip variant prefixes (hover:, md:, rtl:, …) before testing the utility.
    .filter(token => PHYSICAL.test(token.split(':').pop() ?? ''));
}

describe('league ranking uses logical direction utilities only', () => {
  it('has no physical direction utility in any className', () => {
    const offenders: string[] = [];

    for (const [path, source] of Object.entries(SOURCES)) {
      if (path.includes('noPhysicalDirection.test')) continue;
      for (const token of offendersIn(source)) {
        offenders.push(`${path}: "${token}"`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('actually detects a physical utility (the guard is not vacuous)', () => {
    expect(offendersIn('<div className="ms-2 ml-4 text-start">x</div>')).toEqual(['ml-4']);
    expect(offendersIn('<div className="me-2 ps-4 text-end rounded-s-lg">x</div>')).toEqual([]);
  });

  it('sees inside cn(), which is how this feature is actually written', () => {
    // The regression this test exists for: the original guard matched only
    // `className="…"` and was blind to `className={cn('…')}` — the form used by
    // every component here — so it passed over the entire feature without looking.
    expect(
      offendersIn(`<div className={cn('flex items-center ml-4', className)} />`),
    ).toEqual(['ml-4']);
    expect(
      offendersIn(`<div className={cn('flex', isMe && 'text-right', className)} />`),
    ).toEqual(['text-right']);
    expect(
      offendersIn(`<div className={cn('flex items-center ms-4', className)} />`),
    ).toEqual([]);
  });

  it('does not trip on ordinary strings that merely contain a direction word', () => {
    expect(offendersIn(`import X from './left-panel'`)).toEqual([]);
    expect(offendersIn(`const align = 'left'`)).toEqual([]);
    expect(offendersIn(`t('nav.right')`)).toEqual([]);
  });

  it('reads real feature sources, so it cannot pass by globbing nothing', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(0);
  });
});
