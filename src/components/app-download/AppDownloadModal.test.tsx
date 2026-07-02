import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import i18n from '@/i18n'
import { AppDownloadModal } from './AppDownloadModal'
import { APP_STORE_URL, PLAY_STORE_URL, buildAppDeepLink } from '@/lib/appLinks'

afterEach(() => {
  vi.restoreAllMocks()
})

function mockMobileUA() {
  vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
  )
}

describe('AppDownloadModal', () => {
  it('renders variant title, body and both store links when open', () => {
    render(<AppDownloadModal open variant="register" onOpenChange={() => {}} />)
    expect(
      screen.getByText(i18n.t('appDownload.title_register')),
    ).toBeInTheDocument()
    expect(screen.getByText(i18n.t('appDownload.body'))).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /app store/i })).toHaveAttribute(
      'href',
      APP_STORE_URL,
    )
    expect(screen.getByRole('link', { name: /google play/i })).toHaveAttribute(
      'href',
      PLAY_STORE_URL,
    )
  })

  it('uses the pay title for the pay variant', () => {
    render(<AppDownloadModal open variant="pay" onOpenChange={() => {}} />)
    expect(screen.getByText(i18n.t('appDownload.title_pay'))).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    render(<AppDownloadModal open={false} variant="book" onOpenChange={() => {}} />)
    expect(screen.queryByText(i18n.t('appDownload.body'))).toBeNull()
  })

  it('calls onOpenChange(false) when closed via the X button', () => {
    const onOpenChange = vi.fn()
    render(<AppDownloadModal open variant="book" onOpenChange={onOpenChange} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows the open-in-app deep link on mobile devices when a path is given', () => {
    mockMobileUA()
    render(
      <AppDownloadModal open variant="register" onOpenChange={() => {}} deepLinkPath="/tournaments/t-1" />,
    )
    const link = screen.getByRole('link', { name: i18n.t('appDownload.open_in_app') })
    expect(link).toHaveAttribute('href', buildAppDeepLink('/tournaments/t-1'))
  })

  it('hides the open-in-app link on desktop even when a path is given', () => {
    render(
      <AppDownloadModal open variant="register" onOpenChange={() => {}} deepLinkPath="/tournaments/t-1" />,
    )
    expect(
      screen.queryByRole('link', { name: i18n.t('appDownload.open_in_app') }),
    ).toBeNull()
  })

  it('hides the open-in-app link on mobile when no path is given', () => {
    mockMobileUA()
    render(<AppDownloadModal open variant="register" onOpenChange={() => {}} />)
    expect(
      screen.queryByRole('link', { name: i18n.t('appDownload.open_in_app') }),
    ).toBeNull()
  })
})
