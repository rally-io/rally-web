import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import i18n from '@/i18n'
import { useDocumentLanguage } from './useDocumentLanguage'

// test-setup forces English; put it back so other suites see the same locale
afterEach(async () => {
  await act(() => i18n.changeLanguage('en'))
})

describe('useDocumentLanguage', () => {
  it('overrides the static RTL <html> attributes when the locale is English', () => {
    document.documentElement.dir = 'rtl'
    document.documentElement.lang = 'he'

    renderHook(() => useDocumentLanguage())

    expect(document.documentElement.dir).toBe('ltr')
    expect(document.documentElement.lang).toBe('en')
  })

  it('flips <html> back to RTL Hebrew when the language changes', async () => {
    renderHook(() => useDocumentLanguage())
    expect(document.documentElement.dir).toBe('ltr')

    await act(() => i18n.changeLanguage('he'))

    expect(document.documentElement.dir).toBe('rtl')
    expect(document.documentElement.lang).toBe('he')
  })
})
