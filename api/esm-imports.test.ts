/**
 * Vercel serverless functions run as ESM, because package.json sets
 * "type": "module". Node's ESM resolver requires an explicit file extension on
 * relative imports, and an extensionless one throws ERR_MODULE_NOT_FOUND at
 * module load — before a single line of the handler runs, so every request to
 * that route 500s.
 *
 * This shipped once: `import { injectClubOg } from '../src/lib/clubOg'` took
 * down every /clubs/:id page in production. `npm run build`, `npm run test`
 * and `npm run lint` all passed, because none of them resolve modules the way
 * the Node runtime does. Hence this guard.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const API_DIR = join(__dirname)
const RELATIVE_IMPORT = /(?:^|\n)\s*import\s+(?!type\b)[^'"]*from\s+['"](\.[^'"]*)['"]/g

function functionFiles(): string[] {
  return readdirSync(API_DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
}

describe('api/ serverless functions', () => {
  it('has function files to check', () => {
    expect(functionFiles().length).toBeGreaterThan(0)
  })

  it.each(functionFiles())('%s uses extension-qualified relative imports', (file) => {
    const source = readFileSync(join(API_DIR, file), 'utf8')
    const offenders = [...source.matchAll(RELATIVE_IMPORT)]
      .map((m) => m[1])
      .filter((specifier) => !/\.(js|mjs|cjs|json)$/.test(specifier))

    expect(offenders, `${file}: relative imports need an explicit extension under ESM`).toEqual([])
  })
})
