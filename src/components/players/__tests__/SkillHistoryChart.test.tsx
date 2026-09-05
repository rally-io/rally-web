import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SkillHistoryChart } from '../SkillHistoryChart'

const day = 86_400_000
const at = (daysAgo: number) => new Date(Date.now() - daysAgo * day).toISOString()
const points = [
  { skill_level: 3.0, recorded_at: at(400) },
  { skill_level: 3.2, recorded_at: at(200) },
  { skill_level: 3.4, recorded_at: at(60) },
  { skill_level: 3.5, recorded_at: at(10) },
]

describe('SkillHistoryChart', () => {
  it('draws one line through every point on "All"', () => {
    render(<SkillHistoryChart points={points} />)
    expect(screen.getByTestId('skill-line')).toBeInTheDocument()
    expect(screen.getAllByTestId('skill-point')).toHaveLength(4)
    expect(screen.getByText('3.5')).toBeInTheDocument()
  })

  it('filters by range and shows the empty line when nothing falls inside it', () => {
    render(<SkillHistoryChart points={points} />)
    fireEvent.click(screen.getByRole('button', { name: '3M' }))
    expect(screen.getAllByTestId('skill-point')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: '1M' }))
    expect(screen.getAllByTestId('skill-point')).toHaveLength(1)
    render(<SkillHistoryChart points={[]} />)
    expect(screen.getByText(/no rated matches/i)).toBeInTheDocument()
  })

  it('keeps only the last ten points', () => {
    const many = Array.from({ length: 14 }, (_, i) => ({ skill_level: 3 + i * 0.05, recorded_at: at(14 - i) }))
    render(<SkillHistoryChart points={many} />)
    expect(screen.getAllByTestId('skill-point')).toHaveLength(10)
  })

  it('centers the tooltip with a physical offset so it does not drift under RTL', () => {
    // Regression: `start-1/2` is a logical property that flips to `right: 50%` under
    // dir="rtl", while the paired `-translate-x-1/2` is always physical-left — combined
    // they shove the tooltip a full width off-target in Hebrew. `left-1/2` pairs correctly.
    render(<SkillHistoryChart points={points} />)
    fireEvent.focus(screen.getAllByTestId('skill-point')[0])
    const tooltip = screen.getByRole('status')
    expect(tooltip.className).toContain('left-1/2')
    expect(tooltip.className).not.toContain('start-1/2')
  })

  it('pins the chart SVG to ltr so axis text-anchor does not clip under inherited RTL', () => {
    // Regression: SVG text-anchor start/end resolves against inherited CSS `direction`;
    // without an explicit direction the date labels flip and clip against the canvas
    // edges when an ancestor sets dir="rtl" (the app default, Hebrew).
    render(<SkillHistoryChart points={points} />)
    expect(screen.getByRole('img', { name: 'Level over time' })).toHaveAttribute('direction', 'ltr')
  })
})
