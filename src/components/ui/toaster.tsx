import * as React from "react"

import { cn } from "@/lib/utils"
import { ToastAction } from "@/components/ui/toast"
import { ToastClose } from "@/components/ui/toast"
import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastProvider,
  ToastViewport,
} from "@/components/ui/toast"

type ToastElement = React.ReactElement<ToastProps>

interface ToasterProps {
  toasts: ToastElement[]
}

export function Toaster({ toasts }: ToasterProps) {
  return (
    <ToastProvider>
      {toasts.map((toast, index) => (
        <Toast key={index} {...toast.props}>
          <div className="grid gap-1">
            <ToastTitle>{toast.props.title}</ToastTitle>
            <ToastDescription>{toast.props.description}</ToastDescription>
          </div>
          {toast.props.action}
          <ToastClose />
        </Toast>
      ))}
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