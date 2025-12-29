'use client'

import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

let toastListeners: Array<(toasts: Toast[]) => void> = []
let toasts: Toast[] = []

export function showToast(message: string, type: ToastType = 'info', duration: number = 3000) {
  const id = `toast-${Date.now()}-${Math.random()}`
  const newToast: Toast = { id, message, type, duration }
  
  toasts = [...toasts, newToast]
  toastListeners.forEach(listener => listener(toasts))
  
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }
  
  return id
}

export function removeToast(id: string) {
  toasts = toasts.filter(t => t.id !== id)
  toastListeners.forEach(listener => listener(toasts))
}

export default function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setCurrentToasts(newToasts)
    }
    toastListeners.push(listener)
    setCurrentToasts(toasts)
    
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener)
    }
  }, [])

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
      {currentToasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto min-w-[300px] max-w-md p-4 rounded-lg border shadow-lg backdrop-blur-sm animate-slideInRight ${
            toast.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-200'
              : toast.type === 'error'
              ? 'bg-red-500/20 border-red-500/30 text-red-200'
              : toast.type === 'warning'
              ? 'bg-amber-500/20 border-amber-500/30 text-amber-200'
              : 'bg-blue-500/20 border-blue-500/30 text-blue-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
              aria-label="Dismiss"
            >
              <i data-lucide="x" className="w-4 h-4"></i>
            </button>
          </div>
        </div>
      ))}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}










