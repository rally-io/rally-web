import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n'
import PaymentsMovedPage from './PaymentsMovedPage'
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/appLinks'

describe('PaymentsMovedPage', () => {
  it('shows the moved message and both store links', () => {
    render(
      <MemoryRouter>
        <PaymentsMovedPage />
      </MemoryRouter>,
    )
    expect(screen.getByText(i18n.t('appDownload.movedTitle'))).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /app store/i })).toHaveAttribute('href', APP_STORE_URL)
    expect(screen.getByRole('link', { name: /google play/i })).toHaveAttribute('href', PLAY_STORE_URL)
  })
})
