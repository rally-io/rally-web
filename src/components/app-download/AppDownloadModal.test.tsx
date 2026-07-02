import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import i18n from '@/i18n'
import { AppDownloadModal } from './AppDownloadModal'
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/appLinks'

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
})
