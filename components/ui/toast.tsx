"use client"

import * as React from "react"
import { XIcon, CheckCircleIcon, AlertCircleIcon, InfoIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ToastProps {
  id: string
  title?: string
  description?: string
  variant?: "default" | "success" | "error" | "warning" | "info"
  duration?: number
  onClose?: () => void
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ id, title, description, variant = "default", onClose, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(true)

    React.useEffect(() => {
      if (variant !== "error") {
        const timer = setTimeout(() => {
          setIsVisible(false)
          setTimeout(() => onClose?.(), 300) // Wait for animation
        }, 5000)

        return () => clearTimeout(timer)
      }
    }, [variant, onClose])

    const handleClose = () => {
      setIsVisible(false)
      setTimeout(() => onClose?.(), 300)
    }

    const variants = {
      default: "bg-white border-gray-200",
      success: "bg-green-50 border-green-200",
      error: "bg-red-50 border-red-200",
      warning: "bg-yellow-50 border-yellow-200",
      info: "bg-blue-50 border-blue-200",
    }

    const icons = {
      default: null,
      success: <CheckCircleIcon className="h-5 w-5 text-green-600" />,
      error: <AlertCircleIcon className="h-5 w-5 text-red-600" />,
      warning: <AlertCircleIcon className="h-5 w-5 text-yellow-600" />,
      info: <InfoIcon className="h-5 w-5 text-blue-600" />,
    }

    const textColors = {
      default: "text-gray-900",
      success: "text-green-900",
      error: "text-red-900",
      warning: "text-yellow-900",
      info: "text-blue-900",
    }

    if (!isVisible) return null

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex items-start gap-3 rounded-lg border p-4 shadow-lg transition-all",
          variants[variant],
          isVisible ? "animate-in slide-in-from-top-5" : "animate-out slide-out-to-top-5"
        )}
        {...props}
      >
        {icons[variant] && <div className="flex-shrink-0">{icons[variant]}</div>}
        <div className="flex-1 min-w-0">
          {title && (
            <div className={cn("font-semibold text-sm", textColors[variant])}>
              {title}
            </div>
          )}
          {description && (
            <div className={cn("text-sm mt-1", textColors[variant], title && "opacity-90")}>
              {description}
            </div>
          )}
        </div>
        <button
          onClick={handleClose}
          className={cn(
            "flex-shrink-0 rounded-md p-1 transition-colors hover:bg-black/5",
            textColors[variant],
            "opacity-70 hover:opacity-100"
          )}
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    )
  }
)
Toast.displayName = "Toast"

export { Toast }

