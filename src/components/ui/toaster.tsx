import * as React from "react"

import { ToastAction } from "@/components/ui/toast"
import { ToastClose } from "@/components/ui/toast"
import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastProvider,
  ToastViewport,
} from "@/components/ui/toast"

type ToastElement = React.ReactElement<React.ComponentPropsWithoutRef<typeof Toast>>

interface ToasterProps {
  toasts: ToastElement[]
}

export function Toaster({ toasts }: ToasterProps) {
  return (
    <ToastProvider>
      {toasts.map((toast, index) => {
        const { title, description, action, ...rest } = toast.props as any
        return (
          <Toast key={index} {...rest}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

export type { ToastProps } from "@/components/ui/toast"
export type { ToastActionElement } from "@/components/ui/toast"
export {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  ToastProvider,
  ToastViewport,
}