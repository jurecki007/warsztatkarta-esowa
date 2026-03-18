import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastStore {
  toasts: Toast[]
  dodaj: (message: string, type?: ToastType) => void
  usun: (id: number) => void
}

let nextId = 0

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  dodaj: (message, type = 'success') => {
    const id = ++nextId
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 3500)
  },
  usun: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))
