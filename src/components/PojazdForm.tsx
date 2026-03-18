import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Search, History } from 'lucide-react'
import { pobierzPojazdy, dodajPojazd, aktualizujPojazd, usunPojazd } from '../utils/db'
import type { Pojazd, NowyPojazd } from '../utils/db'
import ConfirmDialog from './ConfirmDialog'
import HistoriaZlecen from './HistoriaZlecen'
import { useToast } from '../stores/useToast'
import { useDebounce } from '../hooks/useDebounce'

const pusty: NowyPojazd = { rejestracja: '', marka: '', model: '', rok: undefined, vin: '' }

export default function PojazdForm() {
  const qc = useQueryClient()
  const toast = useToast()
  const [szukaj, setSzukaj] = useState('')
  const szukajDebounced = useDebounce(szukaj, 200)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<NowyPojazd>(pusty)
  const [edytowany, setEdytowany] = useState<Pojazd | null>(null)
  const [doUsuniecia, setDoUsuniecia] = useState<Pojazd | null>(null)
  const [historia, setHistoria] = useState<Pojazd | null>(null)

  const { data: pojazdy = [], isLoading } = useQuery({ queryKey: ['pojazdy'], queryFn: pobierzPojazdy })

  const addMut = useMutation({
    mutationFn: dodajPojazd,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pojazdy'] }); setModal(false); toast.dodaj('Pojazd dodany.') },
    onError: () => toast.dodaj('Błąd podczas dodawania pojazdu.', 'error'),
  })
  const editMut = useMutation({
    mutationFn: aktualizujPojazd,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pojazdy'] }); setModal(false); toast.dodaj('Pojazd zaktualizowany.') },
    onError: () => toast.dodaj('Błąd podczas aktualizacji.', 'error'),
  })
  const delMut = useMutation({
    mutationFn: usunPojazd,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pojazdy'] }); toast.dodaj('Pojazd usunięty.') },
    onError: () => toast.dodaj('Błąd podczas usuwania.', 'error'),
  })

  const filtered = pojazdy.filter(p => {
    const q = szukajDebounced.toLowerCase()
    return !q || p.rejestracja.toLowerCase().includes(q) || p.marka.toLowerCase().includes(q) ||
      p.model.toLowerCase().includes(q)
  })

  const otworz = (p?: Pojazd) => {
    if (p) {
      setEdytowany(p)
      setForm({ rejestracja: p.rejestracja, marka: p.marka, model: p.model, rok: p.rok, vin: p.vin ?? '' })
    } else {
      setEdytowany(null)
      setForm(pusty)
    }
    setModal(true)
  }

  const pole = (k: keyof NowyPojazd) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = k === 'rok' ? (Number(e.target.value) || undefined) : e.target.value
    setForm(f => ({ ...f, [k]: val }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = { ...form, vin: form.vin || undefined }
    if (edytowany) {
      editMut.mutate({ id: edytowany.id, rejestracja: data.rejestracja, marka: data.marka,
                       model: data.model, rok: data.rok, vin: data.vin })
    } else {
      addMut.mutate(data)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Pojazdy</h1>
        <button onClick={() => otworz()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          <Plus size={18} /> Dodaj pojazd
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Szukaj po rejestracji, marce, modelu…"
          value={szukaj} onChange={e => setSzukaj(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {isLoading ? <p className="p-6 text-center text-gray-400">Ładowanie…</p>
        : filtered.length === 0 ? <p className="p-6 text-center text-gray-400">Brak pojazdów.</p>
        : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Rejestracja</th>
                <th className="px-4 py-2 text-left">Marka / Model</th>
                <th className="px-4 py-2 text-left">Rok</th>
                <th className="px-4 py-2 text-left">VIN</th>
                <th className="px-4 py-2 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono font-medium">{p.rejestracja}</td>
                  <td className="px-4 py-2">{p.marka} {p.model}</td>
                  <td className="px-4 py-2 text-gray-500">{p.rok ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs font-mono">{p.vin ?? '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setHistoria(p)}
                        className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition" title="Historia serwisowa">
                        <History size={15} />
                      </button>
                      <button onClick={() => otworz(p)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setDoUsuniecia(p)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold mb-4">{edytowany ? 'Edytuj pojazd' : 'Nowy pojazd'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">Nr rejestracyjny *</label>
                <input className="input uppercase" value={form.rejestracja} onChange={pole('rejestracja')} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Marka *</label>
                  <input className="input" value={form.marka} onChange={pole('marka')} required /></div>
                <div><label className="label">Model *</label>
                  <input className="input" value={form.model} onChange={pole('model')} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Rok produkcji</label>
                  <input className="input" type="number" min="1900" max="2099"
                    value={form.rok ?? ''} onChange={pole('rok')} /></div>
                <div><label className="label">VIN</label>
                  <input className="input font-mono text-sm" value={form.vin ?? ''} onChange={pole('vin')} /></div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={addMut.isPending || editMut.isPending}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  {addMut.isPending || editMut.isPending ? 'Zapisuję…' : 'Zapisz'}
                </button>
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition">
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historia && (
        <HistoriaZlecen
          typ="pojazd"
          id={historia.id}
          tytul={`${historia.rejestracja} — ${historia.marka} ${historia.model}`}
          onZamknij={() => setHistoria(null)}
        />
      )}

      {doUsuniecia && (
        <ConfirmDialog
          tresc={`Usunąć pojazd ${doUsuniecia.rejestracja} (${doUsuniecia.marka} ${doUsuniecia.model})?`}
          onPotwierdzenie={() => { delMut.mutate(doUsuniecia.id); setDoUsuniecia(null) }}
          onAnulowanie={() => setDoUsuniecia(null)}
        />
      )}
    </div>
  )
}
