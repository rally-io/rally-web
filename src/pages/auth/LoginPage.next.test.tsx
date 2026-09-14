import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    session: { user: { id: 'u1', email: 'x@example.com' } },
    isLoading: false,
    signInWithOAuth: vi.fn(),
    checkEmailExists: vi.fn(),
  }),
}))

import LoginPage from './LoginPage'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>HOME</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  sessionStorage.clear()
})

describe('LoginPage next sanitisation', () => {
  it('rejects a backslash-prefixed next and falls back to home when already signed in', async () => {
    renderAt('/login?next=%2F%5Cevil.example')
    await waitFor(() => expect(screen.getByText('HOME')).toBeInTheDocument())
  })
})
