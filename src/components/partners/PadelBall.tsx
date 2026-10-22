/** The like mark: a padel ball, not a heart (as in the app). Drawn in currentColor. */
export function PadelBall({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      data-testid="padel-ball"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9.5" />
      <path d="M5.4 5.4c3.2 2.8 3.2 10.4 0 13.2" />
      <path d="M18.6 5.4c-3.2 2.8-3.2 10.4 0 13.2" />
    </svg>
  )
}
