import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * The web's one dropdown — a sibling of `ui/input.tsx`, sized and coloured the same
 * so a form mixing the two reads as one form. Before this every page styled its own
 * `<select>` inline, so no two dropdowns on the site quite matched.
 *
 * A NATIVE `<select>` on purpose: a phone opens its own picker, keyboard and screen
 * reader support come for free, and with `color-scheme: dark` on `:root` the open
 * list draws dark to match the page. `appearance-none` removes the platform's arrow,
 * so the chevron is drawn here, on the logical END side — the left in Hebrew.
 *
 * An empty value (the "choose one" placeholder option) renders muted, so a required
 * dropdown that nobody has touched doesn't look answered. Forwards its ref, so
 * react-hook-form's `register()` spreads onto it directly.
 */
const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, children, value, ...props }, ref) => (
    <div className="relative w-full">
      <select
        ref={ref}
        value={value}
        className={cn(
          // ps-3/pe-9 (not the input's px-4): the narrowest caller is Edit Profile's
          // 7rem country column, where "🇮🇱 +972" at 16px needs the room; pe-9 keeps
          // a clear gap before the chevron drawn at end-3.
          "flex h-11 w-full appearance-none rounded-lg border border-rally-border bg-rally-surface-2 ps-3 pe-9 py-2 text-base sm:text-sm text-rally-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rally-accent focus-visible:ring-offset-0 focus-visible:border-rally-accent disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          value === "" && "text-rally-text-muted",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 -translate-y-1/2 end-3 h-4 w-4 text-rally-text-2"
      />
    </div>
  )
)
Select.displayName = "Select"

export { Select }
