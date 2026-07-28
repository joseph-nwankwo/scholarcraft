import { useState, useCallback } from 'react'

interface Toast {
  id:       string
  title:    string
  description?: string
  variant?: 'default' | 'destructive'
}

interface ToastOptions {
  title:       string
  description?: string
  variant?:    'default' | 'destructive'
  duration?:   number
}

let listeners: Array<(toasts: Toast[]) => void> = []
let toasts: Toast[] = []

function notify() { listeners.forEach((l) => l([...toasts])) }

function addToast(opts: ToastOptions) {
  const id = crypto.randomUUID()
  toasts = [...toasts, { id, title: opts.title, description: opts.description, variant: opts.variant }]
  notify()
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    notify()
  }, opts.duration ?? 4000)
}

export function useToast() {
  const [, setTick] = useState(0)

  const subscribe = useCallback(() => {
    const handler = () => setTick((t) => t + 1)
    listeners = [...listeners, handler]
    return () => { listeners = listeners.filter((l) => l !== handler) }
  }, [])

  // Self-subscribe on first call
  useState(subscribe)

  return { toast: addToast, toasts }
}
