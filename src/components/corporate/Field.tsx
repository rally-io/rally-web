export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  error?: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block font-display font-bold text-sm text-rally-text mb-2"
      >
        {label}
      </label>
      {children}
      {error ? (
        // `role="alert"` announces the message the moment validation writes it,
        // and the id is the one each field's own <input> points its
        // `aria-describedby` at (Field wraps `children`, so it cannot put the
        // attribute on the control itself).
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-rally-error mt-1.5">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-rally-text-muted mt-1.5 leading-relaxed">{hint}</p>
      ) : null}
    </div>
  )
}
