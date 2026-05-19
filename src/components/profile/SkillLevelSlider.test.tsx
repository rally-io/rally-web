import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@/i18n'
import { SkillLevelSlider } from './SkillLevelSlider'

describe('SkillLevelSlider', () => {
  it('renders the controlled value in the number input', () => {
    render(<SkillLevelSlider value={3.5} onChange={() => {}} />)
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    expect(input.value).toBe('3.5')
  })

  it('renders ticks 1.0 through 7.0', () => {
    render(<SkillLevelSlider value={3} onChange={() => {}} />)
    expect(screen.getByText('1.0')).toBeInTheDocument()
    expect(screen.getByText('7.0')).toBeInTheDocument()
  })

  it('calls onChange when the range slider moves', () => {
    const onChange = vi.fn()
    render(<SkillLevelSlider value={3} onChange={onChange} />)
    const range = screen.getByRole('slider') as HTMLInputElement
    fireEvent.change(range, { target: { value: '4.5' } })
    expect(onChange).toHaveBeenCalledWith(4.5)
  })

  it('snaps and clamps the text input on blur', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SkillLevelSlider value={3} onChange={onChange} />)
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    await user.clear(input)
    await user.type(input, '12')
    fireEvent.blur(input)
    expect(onChange).toHaveBeenLastCalledWith(7.0)
  })

  it('coerces NaN entry on blur to the controlled value (no spurious onChange)', () => {
    const onChange = vi.fn()
    render(<SkillLevelSlider value={3} onChange={onChange} />)
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'abc' } })
    fireEvent.blur(input)
    // Input is re-synced to '3.0' visually; onChange not called with NaN.
    expect(input.value).toBe('3.0')
    expect(onChange).not.toHaveBeenCalled()
  })
})
