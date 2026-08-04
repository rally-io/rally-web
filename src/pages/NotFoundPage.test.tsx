import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n'
import NotFoundPage from './NotFoundPage'
import { buildAppDeepLink } from '@/lib/appLinks'

afterEach(() => {
  vi.restoreAllMocks()
})

function mockMobileUA() {
  vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
  )
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NotFoundPage />
    </MemoryRouter>,
  )
}

describe('NotFoundPage', () => {
  it('explains the page is coming and points at the app', () => {
    renderAt('/coaches/c-1')
    expect(screen.getByText(i18n.t('notFound.title'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('notFound.body'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('common.coming_soon'))).toBeInTheDocument()
  })

  it('offers a way back home', () => {
    renderAt('/coaches/c-1')
    expect(screen.getByRole('link', { name: i18n.t('common.back_home') })).toHaveAttribute(
      'href',
      '/',
    )
  })

  // The point of the page: a desktop visitor who followed a shared link gets a code
  // that opens the app ON what they came for, not on the app's home screen.
  it('encodes the attempted path in the QR and the store badges', () => {
    renderAt('/coaches/c-1')
    const link = buildAppDeepLink('/coaches/c-1')
    expect(screen.getByRole('img', { name: i18n.t('notFound.qr_hint') })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /app store/i })).toHaveAttribute('href', link)
    expect(screen.getByRole('link', { name: /google play/i })).toHaveAttribute('href', link)
  })

  it('carries whichever path was attempted, not a fixed one', () => {
    renderAt('/feed/post/p-9')
    expect(screen.getByRole('link', { name: /app store/i })).toHaveAttribute(
      'href',
      buildAppDeepLink('/feed/post/p-9'),
    )
  })

  it('on a phone offers a direct open-in-app link instead of a QR', () => {
    mockMobileUA()
    renderAt('/events/e-2')
    expect(screen.getByRole('link', { name: i18n.t('appDownload.open_in_app') })).toHaveAttribute(
      'href',
      buildAppDeepLink('/events/e-2'),
    )
    expect(screen.queryByRole('img', { name: i18n.t('notFound.qr_hint') })).toBeNull()
  })
})
