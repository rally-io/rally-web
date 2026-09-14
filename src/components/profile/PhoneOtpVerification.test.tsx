import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import '@/i18n'
import { PhoneOtpVerification } from './PhoneOtpVerification'
import * as api from '@/services/api/players'

vi.mock('@/services/api/players', () => ({ checkPhoneAvailable: vi.fn(), requestPhoneVerificationOtp: vi.fn(), verifyPhoneVerificationOtp: vi.fn() }))

function Form() {
  const [verified, setVerified] = useState(false)
  return <PhoneOtpVerification countryCode="+972" phone="501234567" verified={verified} onVerifiedChange={setVerified} />
}

beforeEach(() => {
  vi.mocked(api.checkPhoneAvailable).mockResolvedValue({ success: true, data: { available: true } } as any)
  vi.mocked(api.requestPhoneVerificationOtp).mockResolvedValue({ success: true, data: { message: 'sent' } } as any)
})

it('never marks a phone verified when the API responds success:false', async () => {
  vi.mocked(api.verifyPhoneVerificationOtp).mockResolvedValue({ success: false, error: { message: 'Rejected' } } as any)
  render(<Form />)
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /verify phone number/i }))
  await user.type(await screen.findByLabelText(/6-digit code/i), '123456')
  await user.click(screen.getByRole('button', { name: /verify code/i }))
  expect(await screen.findByText(/enter the 6-digit code/i)).toBeInTheDocument()
  expect(screen.queryByText(/phone verified/i)).not.toBeInTheDocument()
})

it('reports a failed send in the page language, not the raw server string', async () => {
  // OTP is on the critical path for every new web account, so this banner must
  // never be the server's English sentence on a Hebrew page.
  vi.mocked(api.requestPhoneVerificationOtp).mockResolvedValue({ success: false, error: { message: 'Unable to send verification code' } } as any)
  render(<Form />)
  await userEvent.click(screen.getByRole('button', { name: /verify phone number/i }))
  expect(await screen.findByText(/couldn't send a verification code/i)).toBeInTheDocument()
  expect(screen.queryByText('Unable to send verification code')).not.toBeInTheDocument()
  expect(screen.queryByLabelText(/6-digit code/i)).not.toBeInTheDocument()
})

it('still names the taken-number case rather than the generic send failure', async () => {
  vi.mocked(api.checkPhoneAvailable).mockResolvedValue({ success: true, data: { available: false } } as any)
  render(<Form />)
  await userEvent.click(screen.getByRole('button', { name: /verify phone number/i }))
  expect(await screen.findByText(/belongs to another Rally account/i)).toBeInTheDocument()
})
