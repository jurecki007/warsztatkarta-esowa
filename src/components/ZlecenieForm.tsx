import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2 } from 'lucide-react'
import { pobierzZlecenia, usunZlecenie, zmienStatus } from '../utils/db'
import { useAppStore } from '../stores'
import { useZlecenia } from '../stores/useZlecenia'

const STATUSY = ['', 'Nowe', 'W trakcie', 'Zakończone', 'Opłacone']
const KOLOR: Record<string, string> = {
  'Nowe':       'bg-blue-100 text-blue-800',
  'W trakcie':  'bg-yellow-100 text-yellow-800',
  'Zakończone': 'bg-green-100 text-green-800',
  'Opłacone':   'bg-gray-100 text-gray-700',
}

export default function ZlecenieForm() {
  const qc = useQueryClient()
  const { setWidok, setAktywneZlecenieId } = useAppStore()
  const { filterStatus, setFilterStatus, szukaj, setSzukaj } = useZlecenia()
  const [menuId, setMenuId] = useState<number | null>(null)

  const { data: zlecenia = [], isLoading } = useQuery({
    queryKey: ['zlecenia'],
    queryFn: pobierzZlecenia,
  })

  const delMut = useMutation({
    mutationFn: usunZlecenie,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zlecenia'] }),
  })
  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => zmienStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['zlecenia'] }); setMenuId(null) },
  })

  const filtered = zlecenia.filter(z => {
    const q = szukaj.toLowerCase()
    const pasuje = !q || z.klient_nazwisko.toLowerCase().includes(q) ||
      z.klient_imie.toLowerCase().includes(q) || z.rejestracja.toLowerCase().includes(q) ||
      String(z.id).includes(q)
    return pasuje && (!filterStatus || z.status === filterStatus)
  })

  const otworz = (id: number) => { setAktywneZlecenieId(id); setWidok('karta') }
  const noweZlecenie = () => { setAktywneZlecenieId(null); setWidok('karta') }
  const usun = (id: number) => { if (confirm(`Usunąć zlecenie #${id}?`)) delMut.mutate(id) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Zlecenia</h1>
        <button onClick={noweZlecenie}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          <Plus size={18} /> Nowe zlecenie
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Szukaj klienta, rejestracji, nr zlecenia…"
            value={szukaj} onChange={e => setSzukaj(e.target.value)} />
        </div>
        <select className="input w-44" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          {STATUSY.map(s => <option key={s} value={s}>{s || 'Wszystkie statusy'}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {isLoading ? <p className="p-6 text-center text-gray-400">Ładowanie…</p>
        : filtered.length === 0 ? <p className="p-6 text-center text-gray-400">Brak zleceń.</p>
        : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Nr</th>
                <th className="px-4 py-2 text-left">Klient</th>
                <th className="px-4 py-2 text-left">Pojazd</th>
                <th className="px-4 py-2 text-left">Data</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Brutto</th>
                <th className="px-4 py-2 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(z => (
                <tr key={z.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-gray-500 cursor-pointer" onClick={() => otworz(z.id)}>#{z.id}</td>
                  <td className="px-4 py-2 font-medium cursor-pointer" onClick={() => otworz(z.id)}>
                    {z.klient_nazwisko} {z.klient_imie}
                    {z.klient_firma && <span className="text-xs text-gray-400 block">{z.klient_firma}</span>}
                  </td>
                  <td className="px-4 py-2 cursor-pointer" onClick={() => otworz(z.id)}>
                    <span className="font-mono">{z.rejestracja}</span>
                    <span className="text-gray-500 text-xs block">{z.marka} {z.model}</span>
                  </td>
                  <td className="px-4 py-2 text-gray-500 cursor-pointer" onClick={() => otworz(z.id)}>{z.data_przyjecia}</td>
                  <td className="px-4 py-2 relative">
                    <button onClick={() => setMenuId(menuId === z.id ? null : z.id)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${KOLOR[z.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {z.status}
                    </button>
                    {menuId === z.id && (
                      <div className="absolute z-20 mt-1 bg-white rounded-lg shadow-lg border py-1 left-4">
                        {STATUSY.filter(Boolean).map(s => (
                          <button key={s} onClick={() => statusMut.mutate({ id: z.id, status: s })}
                            className="block w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50">{s}</button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-medium cursor-pointer" onClick={() => otworz(z.id)}>
                    {z.suma_brutto.toFixed(2)} zł
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => usun(z.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
