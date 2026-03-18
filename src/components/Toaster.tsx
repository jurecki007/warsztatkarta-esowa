import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useToast } from '../stores/useToast'

const IKONA = { success: CheckCircle, error: AlertCircle, info: Info }
const KOLOR = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error:   'bg-red-50 border-red-200 text-red-800',
  info:    'bg-blue-50 border-blue-200 text-blue-800',
}

export default function Toaster() {
  const { toasts, usun } = useToast()
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-80">
      {toasts.map(t => {
        const Icon = IKONA[t.type]
        return (
          <div key={t.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg ${KOLOR[t.type]}`}>
            <Icon size={18} className="shrink-0 mt-0.5" />
            <span className="flex-1 text-sm">{t.message}</span>
            <button onClick={() => usun(t.id)} className="shrink-0 opacity-50 hover:opacity-100 transition">
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
