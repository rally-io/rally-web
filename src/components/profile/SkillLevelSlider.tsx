import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import {
  SKILL_MIN,
  SKILL_MAX,
  SKILL_STEP,
  clampSkill,
} from '@/lib/skillLevel'
import { useRtl } from '@/hooks/useRtl'

interface Props {
  /** null = the player has not chosen yet (no default is ever shown). */
  value: number | null
  onChange: (next: number) => void
}

const TICKS = Array.from(
  { length: SKILL_MAX - SKILL_MIN + 1 },
  (_, i) => SKILL_MIN + i
)
// Where the thumb sits before a player has chosen. The start of the scale, not
// the middle: a thumb parked mid-track looks like a value someone already set,
// and 4.0 is a real level a player could be mistaken for having picked.

export function SkillLevelSlider({ value, onChange }: Props) {
  const { t } = useTranslation()
  const { dir } = useRtl()
  const isEmpty = value == null
  const [text, setText] = useState(isEmpty ? '' : value.toFixed(1))
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
    setText(value == null ? '' : value.toFixed(1))
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

  // Releasing the thumb commits a value even when it never moved. Without this
  // the parking spot is a dead zone: an empty slider sits on SKILL_MIN, so
  // grabbing it and letting go there — or clicking the track there — fires no
  // change event and the level stays unchosen. Only while empty, and only from
  // the input's own value, so a deliberate release is never a silent default.
  const handleRangePointerUp = (e: React.PointerEvent<HTMLInputElement>) => {
    if (isEmpty) onChange(clampSkill(parseFloat(e.currentTarget.value)))
  }

  const handleTextBlur = () => {
    // Focus merely passing through must not rewrite an untouched off-step
    // level: the rating engine stores 4.68, the box shows "4.7", and snapping
    // that on blur would save 4.5 over a rated value nobody edited.
    if (value != null && text === value.toFixed(1)) return
    const parsed = parseFloat(text)
    if (Number.isNaN(parsed)) {
      setText(value == null ? '' : value.toFixed(1))
      return
    }
    const next = clampSkill(parsed)
    setText(next.toFixed(1))
    if (next !== value) onChange(next)
  }

  const shown = value ?? SKILL_MIN
  const fillPct = isEmpty
    ? '0%'
    : `${((shown - SKILL_MIN) / (SKILL_MAX - SKILL_MIN)) * 100}%`

  return (
    <div className="w-full">
      <div className="relative mb-3 flex items-center justify-center">
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
        min={SKILL_MIN}
        max={SKILL_MAX}
        step={SKILL_STEP}
        value={shown}
        onChange={handleRangeChange}
        onPointerUp={handleRangePointerUp}
        dir={dir}
        data-empty={isEmpty ? 'true' : 'false'}
        aria-controls="skill-level-value"
        aria-valuetext={isEmpty ? t('edit_profile.skillEmpty') : shown.toFixed(1)}
        className="skill-slider data-[empty=true]:opacity-60"
        style={{ '--skill-fill-pct': fillPct } as CSSProperties}
        aria-label="skill level slider"
      />

      <div className="flex justify-between mt-2 px-0">
        {TICKS.map((tick) => (
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
