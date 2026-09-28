/**
 * Vercel serverless functions run as ESM, because package.json sets
 * "type": "module". Node's ESM resolver requires an explicit file extension on
 * relative imports, and an extensionless one throws ERR_MODULE_NOT_FOUND at
 * module load — before a single line of the handler runs, so every request to
 * that route 500s.
 *
 * This shipped once: `import { injectOg } from '../src/lib/og'` took
 * down every /clubs/:id page in production. `npm run build`, `npm run test`
 * and `npm run lint` all passed, because none of them resolve modules the way
 * the Node runtime does. Hence this guard.
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const API_DIR = join(__dirname)
const RELATIVE_IMPORT = /(?:^|\n)\s*import\s+(?!type\b)[^'"]*from\s+['"](\.[^'"]*)['"]/g
// The `@/` path alias is a Vite/TypeScript convenience; Node's ESM resolver knows
// nothing about it, so a VALUE import through it 500s the function exactly like an
// extensionless one. Type-only imports are erased and stay allowed.
const ALIAS_IMPORT = /(?:^|\n)\s*import\s+(?!type\b)[^'"]*from\s+['"](@\/[^'"]*)['"]/g

function functionFiles(): string[] {
  return readdirSync(API_DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
}

/**
 * Every module a function pulls in, transitively.
 *
 * Checking only the files in `api/` was not enough, and the same outage shipped
 * a second time on 2026-09-27: `src/constants/corporateEvents.ts` grew an
 * extensionless `import { ISRAEL_OPEN_TERMS } from './israelOpenTerms'`, and
 * because that file lives under `src/` the guard never looked at it. All three
 * /join pages 500'd. Node resolves the whole graph at load, so the whole graph
 * is what has to be clean — not just the entry point.
 */
function reachableFrom(entry: string): string[] {
  const seen = new Set<string>()
  const queue = [entry]
  while (queue.length) {
    const file = queue.pop()!
    if (seen.has(file)) continue
    seen.add(file)
    let source: string
    try { source = readFileSync(file, 'utf8') } catch { continue }
    for (const [, spec] of source.matchAll(RELATIVE_IMPORT)) {
      const base = join(dirname(file), spec.replace(/\.(js|mjs|cjs)$/, ''))
      // Vite resolves `./x` to x.ts, x.tsx or x/index.ts; try each.
      for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
        if (existsSync(candidate)) { queue.push(candidate); break }
      }
    }
  }
  seen.delete(entry)
  return [...seen]
}

function offendersIn(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  const extensionless = [...source.matchAll(RELATIVE_IMPORT)]
    .map((m) => m[1])
    .filter((specifier) => !/\.(js|mjs|cjs|json)$/.test(specifier))
  const aliased = [...source.matchAll(ALIAS_IMPORT)].map((m) => m[1])
  return [...extensionless, ...aliased]
}

describe('api/ serverless functions', () => {
  it('has function files to check', () => {
    expect(functionFiles().length).toBeGreaterThan(0)
  })

  it.each(functionFiles())('%s uses extension-qualified relative imports', (file) => {
    const offenders = offendersIn(join(API_DIR, file))
    expect(offenders, `${file}: relative imports need an explicit extension under ESM`).toEqual([])
  })

  // The entry point being clean proves nothing: Node resolves the transitive
  // graph at load, and one extensionless value import anywhere in it 500s the
  // route. This is the check that would have caught the 2026-09-27 outage.
  it.each(functionFiles())('%s: every module it reaches is extension-qualified too', (file) => {
    const bad: string[] = []
    for (const dep of reachableFrom(join(API_DIR, file))) {
      for (const specifier of offendersIn(dep)) {
        bad.push(`${dep.replace(/.*\/rally-web\//, '')} -> ${specifier}`)
      }
    }
    expect(bad, `${file}: a module it imports has an extensionless relative import`).toEqual([])
  })
})
