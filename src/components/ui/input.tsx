import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-white/10 bg-rally-surface px-4 py-2 text-sm text-rally-text placeholder:text-rally-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rally-accent focus-visible:ring-offset-0 focus-visible:border-rally-accent disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }