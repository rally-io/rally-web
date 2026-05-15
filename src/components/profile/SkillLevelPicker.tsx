import { useState } from 'react'

interface SkillLevelPickerProps {
  value?: number
  onChange: (value: number) => void
}

const tiers = [
  { max: 1.9, label: 'D2', emoji: '🟤' },
  { max: 2.4, label: 'D1', emoji: '🟤' },
  { max: 2.9, label: 'C2', emoji: '🟤' },
  { max: 3.4, label: 'C1', emoji: '⚪' },
  { max: 3.9, label: 'B2', emoji: '⚪' },
  { max: 4.9, label: 'B1', emoji: '🟡' },
  { max: 5.9, label: 'A2', emoji: '🟡' },
  { max: 7.0, label: 'A1', emoji: '🟡' },
]

function getTier(level: number) {
  return tiers.find((t) => level <= t.max) ?? tiers[tiers.length - 1]
}

export function SkillLevelPicker({ value, onChange }: SkillLevelPickerProps) {
  const [inputValue, setInputValue] = useState(value?.toString() ?? '')

  const handleChange = (val: string) => {
    setInputValue(val)
    const num = parseFloat(val)
    if (!isNaN(num) && num >= 1.0 && num <= 7.0) {
      onChange(num)
    }
  }

  const level = parseFloat(inputValue)
  const tier = !isNaN(level) ? getTier(level) : null

  return (
    <div>
      <div className="flex items-center gap-4 mb-2">
        <input
          type="number"
          min={1.0}
          max={7.0}
          step={0.1}
          value={inputValue}
          onChange={(e) => handleChange(e.target.value)}
          className="w-32 bg-slate-950 border border-white/10 rounded-xl px-5 py-3 text-2xl font-bold text-center focus:outline-none focus:border-electric-green text-white"
        />
        {tier && (
          <div className="text-3xl">
            {tier.emoji} <span className="text-lg font-bold text-slate-200">{tier.label}</span>
          </div>
        )}
      </div>
      <input
        type="range"
        min={1.0}
        max={7.0}
        step={0.1}
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full accent-electric-green"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>1.0</span>
        <span>7.0</span>
      </div>
    </div>
  )
}