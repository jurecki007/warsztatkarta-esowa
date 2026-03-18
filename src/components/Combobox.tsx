import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search } from 'lucide-react'

interface Option {
  value: number
  label: string
  sub?: string
}

interface Props {
  options: Option[]
  value: number | null
  onChange: (value: number | null) => void
  placeholder?: string
}

export default function Combobox({ options, value, onChange, placeholder = '— wybierz —' }: Props) {
  const [open, setOpen] = useState(false)
  const [fraza, setFraza] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.value === value)

  const filtered = fraza
    ? options.filter(o => o.label.toLowerCase().includes(fraza.toLowerCase()) ||
        (o.sub ?? '').toLowerCase().includes(fraza.toLowerCase()))
    : options

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open) { setFraza(''); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  const select = (opt: Option) => { onChange(opt.value); setOpen(false) }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="input flex items-center justify-between w-full text-left">
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={14} className="text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white rounded-lg shadow-lg border overflow-hidden">
          <div className="p-2 border-b">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input ref={inputRef} className="input py-1.5 pl-8 text-sm" placeholder="Szukaj…"
                value={fraza} onChange={e => setFraza(e.target.value)} />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0
              ? <p className="px-3 py-2 text-sm text-gray-400">Brak wyników.</p>
              : filtered.map(o => (
                <button key={o.value} type="button" onClick={() => select(o)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition
                    ${o.value === value ? 'bg-blue-50 font-medium' : ''}`}>
                  <span>{o.label}</span>
                  {o.sub && <span className="block text-xs text-gray-400">{o.sub}</span>}
                </button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}
