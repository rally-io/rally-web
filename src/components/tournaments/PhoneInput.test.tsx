import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PhoneInput } from './PhoneInput'

describe('PhoneInput', () => {
  it('emits dial code and national number', () => {
    const onChange = vi.fn()
    render(<PhoneInput onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText('Mobile number'), {
      target: { value: '501234567' },
    })
    expect(onChange).toHaveBeenLastCalledWith({
      countryCode: '+972',
      phone: '501234567',
    })
  })

  it('changing country updates emitted code', () => {
    const onChange = vi.fn()
    render(<PhoneInput onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('country'), { target: { value: '+1' } })
    fireEvent.change(screen.getByPlaceholderText('Mobile number'), {
      target: { value: '5551234' },
    })
    expect(onChange).toHaveBeenLastCalledWith({ countryCode: '+1', phone: '5551234' })
  })
})
