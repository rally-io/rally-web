import { useEffect, useState, type CSSProperties } from 'react'
import {
  SKILL_MIN,
  SKILL_MAX,
  SKILL_STEP,
  clampSkill,
} from '@/lib/skillLevel'
import { useRtl } from '@/hooks/useRtl'

interface Props {
  value: number
  onChange: (next: number) => void
}

const TICKS = Array.from(
  { length: SKILL_MAX - SKILL_MIN + 1 },
  (_, i) => SKILL_MIN + i
)

export function SkillLevelSlider({ value, onChange }: Props) {
  const { dir } = useRtl()
  const [text, setText] = useState(value.toFixed(1))

  // Re-sync the text field whenever the controlled value changes (e.g. via slider).
  useEffect(() => {
    setText(value.toFixed(1))
  }, [value])

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = clampSkill(parseFloat(e.target.value))
    onChange(next)
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value)
    const parsed = parseFloat(e.target.value)
    if (!Number.isNaN(parsed) && parsed >= SKILL_MIN && parsed <= SKILL_MAX) {
      onChange(clampSkill(parsed))
    }
  }

  const handleTextBlur = () => {
    const parsed = parseFloat(text)
    if (Number.isNaN(parsed)) {
      setText(value.toFixed(1))
      return
    }
    const next = clampSkill(parsed)
    setText(next.toFixed(1))
    if (next !== value) onChange(next)
  }

  const fillPct = `${((value - SKILL_MIN) / (SKILL_MAX - SKILL_MIN)) * 100}%`

  return (
    <div className="w-full">
      <div className="flex items-center justify-center mb-6">
        <input
          type="number"
          inputMode="decimal"
          min={SKILL_MIN}
          max={SKILL_MAX}
          step={SKILL_STEP}
          value={text}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          id="skill-level-value"
          aria-label="skill level"
          className="w-[150px] bg-transparent text-rally-accent font-black text-[72px] leading-none text-center tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>

      <input
        type="range"
        min={SKILL_MIN}
        max={SKILL_MAX}
        step={SKILL_STEP}
        value={value}
        onChange={handleRangeChange}
        dir={dir}
        aria-controls="skill-level-value"
        className="skill-slider"
        style={{ '--skill-fill-pct': fillPct } as CSSProperties}
        aria-label="skill level slider"
      />

      <div className="flex justify-between mt-2 px-0">
        {TICKS.map((t) => (
          <span key={t} className="text-[10px] font-bold text-rally-text-muted tabular-nums">
            {t.toFixed(1)}
          </span>
        ))}
      </div>
    </div>
  )
}
