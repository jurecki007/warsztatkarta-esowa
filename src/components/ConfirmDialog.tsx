import { AlertTriangle } from 'lucide-react'

interface Props {
  tresc: string
  onPotwierdzenie: () => void
  onAnulowanie: () => void
}

export default function ConfirmDialog({ tresc, onPotwierdzenie, onAnulowanie }: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={22} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-gray-800 text-sm">{tresc}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onAnulowanie}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
            Anuluj
          </button>
          <button onClick={onPotwierdzenie}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
            Usuń
          </button>
        </div>
      </div>
    </div>
  )
}
