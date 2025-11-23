"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import { Toast, ToastProps } from "./toast"

interface ToastContextType {
  toast: (props: Omit<ToastProps, "id">) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  warning: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToasterProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback((props: Omit<ToastProps, "id">) => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { ...props, id, onClose: () => removeToast(id) }])
  }, [removeToast])

  const toast = useCallback((props: Omit<ToastProps, "id">) => {
    addToast(props)
  }, [addToast])

  const success = useCallback((title: string, description?: string) => {
    addToast({ title, description, variant: "success" })
  }, [addToast])

  const error = useCallback((title: string, description?: string) => {
    addToast({ title, description, variant: "error", duration: 7000 })
  }, [addToast])

  const warning = useCallback((title: string, description?: string) => {
    addToast({ title, description, variant: "warning" })
  }, [addToast])

  const info = useCallback((title: string, description?: string) => {
    addToast({ title, description, variant: "info" })
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within ToasterProvider")
  }
  return context
}

