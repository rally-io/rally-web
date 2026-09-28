/**
 * A /join/<slug> entry's local `heroImage` is served from public/ as the page's
 * hero AND as the link preview's og:image (join-og.ts). A renamed or deleted
 * file ships as a broken hero and an imageless WhatsApp card, and nothing in
 * the build notices — `heroImage` is just a string. Hence this check.
 */
import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { CORPORATE_EVENTS } from '../src/constants/corporateEvents.js'

const PUBLIC_DIR = join(__dirname, '..', 'public')

describe('join-og hero images', () => {
  it.each(Object.values(CORPORATE_EVENTS).map((ev) => [ev.slug, ev.heroImage] as const))(
    '%s: its local hero image exists in public/',
    (_slug, heroImage) => {
      if (!heroImage || /^https?:/.test(heroImage)) return
      expect(existsSync(join(PUBLIC_DIR, heroImage)), heroImage).toBe(true)
    },
  )
})
