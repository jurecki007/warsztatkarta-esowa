import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Trash2, ImageIcon } from 'lucide-react'
import type { Zdjecie } from '../utils/db'

interface Props {
  zdjecia: Zdjecie[]
  onDodaj: (nazwa: string, data: string) => void
  onUsun: (id: number) => void
  disabled?: boolean
}

export default function GaleriaZdjec({ zdjecia, onDodaj, onUsun, disabled }: Props) {
  const onDrop = useCallback((accepted: File[]) => {
    for (const file of accepted) {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        onDodaj(file.name, dataUrl)
      }
      reader.readAsDataURL(file)
    }
  }, [onDodaj])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'] },
    disabled,
    multiple: true,
  })

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <ImageIcon size={32} className="mx-auto text-gray-300 mb-2" />
        {disabled
          ? <p className="text-sm text-gray-400">Najpierw zapisz zlecenie, aby dodać zdjęcia.</p>
          : isDragActive
            ? <p className="text-sm text-blue-600">Upuść zdjęcia tutaj…</p>
            : <p className="text-sm text-gray-500">Przeciągnij zdjęcia lub kliknij, aby wybrać</p>
        }
      </div>
      {zdjecia.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {zdjecia.map(z => (
            <div key={z.id} className="relative group rounded-lg overflow-hidden border bg-gray-50">
              <img src={z.data} alt={z.nazwa ?? 'zdjęcie'} className="w-full h-24 object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                <button onClick={() => onUsun(z.id)}
                  className="opacity-0 group-hover:opacity-100 bg-red-600 text-white p-1.5 rounded transition">
                  <Trash2 size={14} />
                </button>
              </div>
              {z.nazwa && <p className="text-xs text-gray-500 px-2 py-1 truncate">{z.nazwa}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
