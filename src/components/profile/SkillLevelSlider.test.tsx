import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@/i18n'
import { SkillLevelSlider } from './SkillLevelSlider'

/** Feeds onChange back into value, the way EditProfilePage's Controller does. */
function Harness() {
  const [value, setValue] = useState<number | null>(null)
  return (
    <>
      <SkillLevelSlider value={value} onChange={setValue} />
      <output data-testid="controlled">{value === null ? 'null' : String(value)}</output>
    </>
  )
}

describe('SkillLevelSlider', () => {
  it('renders the controlled value in the number input', () => {
    render(<SkillLevelSlider value={3.5} onChange={() => {}} />)
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    expect(input.value).toBe('3.50')
  })

  it('renders an off-grid engine level exactly, at the same precision as the level chip', () => {
    // A rated level is rarely round. The readout used to print 4.2 for 4.17 while the chip
    // beside it printed 4.20 — and the coarse step meant the player could not get back to
    // 4.17 once they touched the control, so editing anything cost them the seal.
    render(<SkillLevelSlider value={4.17} onChange={() => {}} />)
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('4.17')
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

  it('clamps the text input to the top of the scale on blur', async () => {
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
    // Input is re-synced to '3.00' visually; onChange not called with NaN.
    expect(input.value).toBe('3.00')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('renders the empty state and the note when value is null', () => {
    render(<SkillLevelSlider value={null} onChange={() => {}} />)
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    expect(input.value).toBe('')
    expect(screen.getByText(/slide to choose your level/i)).toBeInTheDocument()
    expect(screen.getByRole('slider')).toHaveAttribute('data-empty', 'true')
    expect(screen.getByText(/pick your real level/i)).toBeInTheDocument()
  })

  // Only the emitted value: with a fixed `value={null}` the empty state cannot
  // clear. The Harness tests below cover the round-trip that does clear it.
  it('the first slider move emits a snapped value', () => {
    const onChange = vi.fn()
    render(<SkillLevelSlider value={null} onChange={onChange} />)
    // Snapped to the scale's own precision, which is the engine's: 0.01, not
    // the 0.5 grid this test was written against. A coarser grid is what made a
    // rated level inexpressible in the first place.
    fireEvent.change(screen.getByRole('slider'), { target: { value: '4.234' } })
    expect(onChange).toHaveBeenCalledWith(4.23)
  })

  it('typing a number while empty sets a value', () => {
    const onChange = vi.fn()
    render(<SkillLevelSlider value={null} onChange={onChange} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } })
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('does not rewrite a just-typed "3" as "3.0"', () => {
    render(<Harness />)
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    // Root cause of the typing bug: onChange(3) round-trips back as value=3
    // and the resync effect used to overwrite the in-progress "3" with "3.0",
    // so the next keystrokes built "3.0.5" — which a number input sanitises
    // away entirely.
    fireEvent.change(input, { target: { value: '3' } })
    expect(input.value).toBe('3')
    expect(screen.getByTestId('controlled')).toHaveTextContent('3')
  })

  it('keeps in-progress decimal typing instead of resyncing to the rounded value', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    await user.type(input, '3.5')
    expect(input.value).toBe('3.5')
    expect(screen.getByTestId('controlled')).toHaveTextContent('3.5')
    // Re-typing over an existing value is where the resync bit hardest: the
    // echoed onChange(5) rewrote "5" as "5.0", so the following ".5" never
    // reached the controlled value and it stuck at 5.
    await user.clear(input)
    await user.type(input, '5.5')
    expect(input.value).toBe('5.5')
    expect(screen.getByTestId('controlled')).toHaveTextContent('5.5')
  })

  it('releasing the thumb on an empty slider commits the spot it parks at', () => {
    const onChange = vi.fn()
    render(<SkillLevelSlider value={null} onChange={onChange} />)
    // Without this the parking spot is a dead zone: the empty thumb already
    // sits on 1.0, so releasing it there fires no change event at all.
    fireEvent.pointerUp(screen.getByRole('slider'))
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('parks an unchosen level at the start of the scale, not the middle', () => {
    render(<SkillLevelSlider value={null} onChange={vi.fn()} />)
    // A thumb resting mid-track reads as a level someone already chose, and
    // 4.0 is a real level — so the empty state would be lying about itself.
    expect(screen.getByRole('slider')).toHaveValue('1')
  })

  it('releasing the thumb on an already-chosen slider changes nothing', () => {
    const onChange = vi.fn()
    render(<SkillLevelSlider value={3} onChange={onChange} />)
    fireEvent.pointerUp(screen.getByRole('slider'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('blurring an untouched engine level does not round it away', () => {
    const onChange = vi.fn()
    render(<SkillLevelSlider value={4.68} onChange={onChange} />)
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    // The rating engine's 4.68 is shown as it is stored. It used to read "4.7"
    // here, back when the grid was 0.5 and the box could only ever approximate
    // the stored value; at 0.01 the readout IS the value, so focus passing
    // through has nothing to round and nothing to save.
    expect(input.value).toBe('4.68')
    fireEvent.blur(input)
    expect(onChange).not.toHaveBeenCalled()
    expect(input.value).toBe('4.68')
  })

  it('shows the note under a set value too', () => {
    render(<SkillLevelSlider value={3} onChange={() => {}} />)
    expect(screen.getByText(/pick your real level/i)).toBeInTheDocument()
    expect(screen.queryByText(/slide to choose your level/i)).not.toBeInTheDocument()
    expect(screen.getByRole('slider')).toHaveAttribute('data-empty', 'false')
  })
})
