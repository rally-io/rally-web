import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import {
  SKILL_STEP,
  SKILL_SLIDER_STEP,
  clampSkill,
  formatSkill,
  typedBounds,
} from '@/lib/skillLevel'
import { useSkillLadder } from '@/hooks/useSkillLadder'
import { useRtl } from '@/hooks/useRtl'

interface Props {
  /** null = the player has not chosen yet (no default is ever shown). */
  value: number | null
  onChange: (next: number) => void
}

/** One tick per whole level across the bounds: 1.0…7.0 before the scale flip, 1.0…5.0 after. */
function wholeLevels(min: number, max: number): number[] {
  const first = Math.ceil(min)
  return Array.from({ length: Math.floor(max) - first + 1 }, (_, i) => first + i)
}

// Where the thumb sits before a player has chosen. The start of the scale, not
// the middle: a thumb parked mid-track looks like a value someone already set,
// and 4.0 is a real level a player could be mistaken for having picked.

export function SkillLevelSlider({ value, onChange }: Props) {
  const { t } = useTranslation()
  const { dir } = useRtl()
  // The served ladder's [scale_min, typed_max]. rally-api refuses a typed level above
  // typed_max, so neither input may ever emit one.
  const ladder = useSkillLadder()
  const bounds = useMemo(() => typedBounds(ladder), [ladder])
  const ticks = useMemo(() => wholeLevels(bounds.min, bounds.max), [bounds])
  const isEmpty = value == null
  const [text, setText] = useState(isEmpty ? '' : formatSkill(value))
  // Read inside the resync effect without making it a dependency: the effect
  // must react to `value` only, but still needs the text of the same render.
  const textRef = useRef(text)
  textRef.current = text

  // Re-sync the text field whenever the controlled value changes (e.g. via slider).
  // Skip it when the box already spells that same number: typing "3" echoes back
  // as value=3, and rewriting the box as "3.0" would clobber a decimal the player
  // is still in the middle of typing ("3" → "3." → "3.5").
  useEffect(() => {
    if (value != null && parseFloat(textRef.current) === value) return
    setText(value == null ? '' : formatSkill(value))
  }, [value])

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = clampSkill(parseFloat(e.target.value), bounds)
    onChange(next)
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value)
    const parsed = parseFloat(e.target.value)
    if (!Number.isNaN(parsed) && parsed >= bounds.min && parsed <= bounds.max) {
      onChange(clampSkill(parsed, bounds))
    }
  }

  // Releasing the thumb commits a value even when it never moved. Without this
  // the parking spot is a dead zone: an empty slider sits on the scale's floor, so
  // grabbing it and letting go there — or clicking the track there — fires no
  // change event and the level stays unchosen. Only while empty, and only from
  // the input's own value, so a deliberate release is never a silent default.
  const handleRangePointerUp = (e: React.PointerEvent<HTMLInputElement>) => {
    if (isEmpty) onChange(clampSkill(parseFloat(e.currentTarget.value), bounds))
  }

  const handleTextBlur = () => {
    // Focus merely passing through must not rewrite the value: the box already
    // spells exactly what is stored, so there is nothing to reformat.
    if (value != null && text === formatSkill(value)) return
    const parsed = parseFloat(text)
    if (Number.isNaN(parsed)) {
      setText(value == null ? '' : formatSkill(value))
      return
    }
    const next = clampSkill(parsed, bounds)
    setText(formatSkill(next))
    if (next !== value) onChange(next)
  }

  const shown = value ?? bounds.min
  const fillPct = isEmpty
    ? '0%'
    : `${((shown - bounds.min) / (bounds.max - bounds.min)) * 100}%`

  return (
    <div className="w-full">
      <div className="relative mb-3 flex items-center justify-center">
        <input
          type="number"
          inputMode="decimal"
          min={bounds.min}
          max={bounds.max}
          step={SKILL_STEP}
          value={text}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          id="skill-level-value"
          aria-label="skill level"
          className="w-[150px] bg-transparent text-rally-accent font-black text-[72px] leading-none text-center tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {isEmpty && (
          // Sits in the slot the number will fill, so the empty state is an
          // instruction rather than a hole. Decorative here — the range input
          // carries the same sentence in `aria-valuetext`. Muted, because the
          // accent belongs to the level once a player has actually picked one.
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-sm text-rally-text-2"
          >
            {t('edit_profile.skillEmpty')}
          </span>
        )}
      </div>

      <input
        type="range"
        min={bounds.min}
        max={bounds.max}
        // Quarter-point jumps, like the app. The number above keeps SKILL_STEP (0.01)
        // so an exact rated level can still be typed — see SKILL_SLIDER_STEP.
        step={SKILL_SLIDER_STEP}
        value={shown}
        onChange={handleRangeChange}
        onPointerUp={handleRangePointerUp}
        dir={dir}
        data-empty={isEmpty ? 'true' : 'false'}
        aria-controls="skill-level-value"
        aria-valuetext={isEmpty ? t('edit_profile.skillEmpty') : formatSkill(shown)}
        className="skill-slider data-[empty=true]:opacity-60"
        style={{ '--skill-fill-pct': fillPct } as CSSProperties}
        aria-label="skill level slider"
      />

      <div className="flex justify-between mt-2 px-0">
        {ticks.map((tick) => (
          <span key={tick} className="text-[10px] font-bold text-rally-text-muted tabular-nums">
            {tick.toFixed(1)}
          </span>
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-rally-text-2">
        {t('edit_profile.skillNote')}
      </p>
    </div>
  )
}
