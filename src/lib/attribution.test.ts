import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { captureAttribution, getAttribution, parseAttribution } from './attribution'

// Node 26 exposes its own (disabled) `localStorage` global that shadows
// jsdom's, so give the module a real in-memory Storage to talk to.
function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => Array.from(map.keys())[i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, String(v)),
  }
}

describe('attribution', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: memoryStorage(),
      configurable: true,
      writable: true,
    })
  })
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('parses the campaign params and ignores everything else', () => {
    expect(
      parseAttribution(
        '?utm_source=meta&utm_medium=paid&utm_campaign=b2b_clubs&utm_content=ad1&fbclid=abc&segment=club',
      ),
    ).toEqual({
      utm_source: 'meta',
      utm_medium: 'paid',
      utm_campaign: 'b2b_clubs',
      utm_content: 'ad1',
      fbclid: 'abc',
    })
  })

  it('stores a tagged landing and returns it for later leads', () => {
    const captured = captureAttribution(
      { pathname: '/contact', search: '?utm_source=meta&utm_campaign=b2b_clubs' },
      'https://l.facebook.com/',
    )
    expect(captured.utm_source).toBe('meta')
    expect(captured.landing_page).toBe('/contact?utm_source=meta&utm_campaign=b2b_clubs')
    expect(captured.referrer).toBe('https://l.facebook.com/')
    expect(captured.landed_at).toBeTruthy()
    expect(getAttribution().utm_campaign).toBe('b2b_clubs')
  })

  it('does not let an untagged visit erase a stored tagged one', () => {
    captureAttribution({ pathname: '/', search: '?utm_source=meta&utm_campaign=x' }, '')
    const again = captureAttribution({ pathname: '/contact', search: '' }, '')
    expect(again.utm_campaign).toBe('x')
  })

  it('overwrites with the newest tagged visit (last touch)', () => {
    captureAttribution({ pathname: '/', search: '?utm_campaign=first' }, '')
    captureAttribution({ pathname: '/', search: '?utm_campaign=second' }, '')
    expect(getAttribution().utm_campaign).toBe('second')
  })
})
