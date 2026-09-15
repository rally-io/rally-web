import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { describeLevel } from './describeLevel'
import { LevelChip } from './LevelChip'

describe('LevelChip', () => {
  it('verified: lime number, two decimals as one LTR token, trailing seal with its label', () => {
    render(<LevelChip descriptor={describeLevel(4, true, 91)} size="md" />)
    const chip = screen.getByTestId('level-chip')
    expect(chip).toHaveAttribute('data-state', 'verified')
    expect(chip.className).toMatch(/text-rally-accent/)
    expect(chip.className).not.toMatch(/border-dashed/)
    expect(screen.getByText('4.00')).toHaveAttribute('dir', 'ltr')
    const seal = screen.getByRole('img', { name: 'Verified level' })
    expect(seal).toHaveAttribute('width', '16')
    // trailing: the number comes before the seal in DOM order (flex mirrors it in RTL)
    expect(chip.firstElementChild).toBe(screen.getByText('4.00'))
  })

  it('seal size follows the chip size: 12 / 16 / 22', () => {
    const d = describeLevel(4, true, 91)
    const { rerender } = render(<LevelChip descriptor={d} size="sm" />)
    expect(screen.getByRole('img')).toHaveAttribute('width', '12')
    rerender(<LevelChip descriptor={d} size="lg" />)
    expect(screen.getByRole('img')).toHaveAttribute('width', '22')
  })

  it('unverified: dashed muted pill, no seal; md carries "Not verified", sm does not', () => {
    const d = describeLevel(3.5, false, 40)
    const { rerender } = render(<LevelChip descriptor={d} size="md" />)
    const chip = screen.getByTestId('level-chip')
    expect(chip).toHaveAttribute('data-state', 'unverified')
    expect(chip.className).toMatch(/border-dashed/)
    expect(chip.className).toMatch(/text-rally-text-2/)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('3.50')).toHaveAttribute('dir', 'ltr')
    expect(screen.getByText('Not verified')).toBeInTheDocument()
    rerender(<LevelChip descriptor={d} size="sm" />)
    expect(screen.queryByText('Not verified')).not.toBeInTheDocument()
    rerender(<LevelChip descriptor={d} size="lg" showLabel={false} />)
    expect(screen.queryByText('Not verified')).not.toBeInTheDocument()
  })

  it('unknown: a plain number — no seal, no dashes, no label', () => {
    render(<LevelChip descriptor={describeLevel(3.5, undefined, null)} size="lg" />)
    const chip = screen.getByTestId('level-chip')
    expect(chip).toHaveAttribute('data-state', 'unknown')
    expect(screen.getByText('3.50')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(chip.className).not.toMatch(/border-dashed/)
    expect(chip.className).not.toMatch(/text-rally-accent/)
    expect(screen.queryByText('Not verified')).not.toBeInTheDocument()
  })

  it('none: a muted em dash and nothing else', () => {
    render(<LevelChip descriptor={describeLevel(null, true, 90)} />)
    const chip = screen.getByTestId('level-chip')
    expect(chip).toHaveAttribute('data-state', 'none')
    expect(chip).toHaveTextContent('—')
    expect(chip.className).toMatch(/text-rally-text-muted/)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
