import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Pencil, Trash2, History } from 'lucide-react'
import { pobierzKlientow, dodajKlienta, aktualizujKlienta, usunKlienta } from '../utils/db'
import type { Klient } from '../utils/db'
import KlientForm from './KlientForm'
import ConfirmDialog from './ConfirmDialog'
import HistoriaZlecen from './HistoriaZlecen'
import { useToast } from '../stores/useToast'
import { useDebounce } from '../hooks/useDebounce'

export default function KlientLista() {
  const qc = useQueryClient()
  const toast = useToast()
  const [szukaj, setSzukaj] = useState('')
  const szukajDebounced = useDebounce(szukaj, 200)
  const [modal, setModal] = useState(false)
  const [edytowany, setEdytowany] = useState<Klient | null>(null)
  const [doUsuniecia, setDoUsuniecia] = useState<Klient | null>(null)
  const [historia, setHistoria] = useState<Klient | null>(null)

  const { data: klienci = [], isLoading } = useQuery({
    queryKey: ['klienci'],
    queryFn: pobierzKlientow,
  })

  const addMut = useMutation({
    mutationFn: dodajKlienta,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['klienci'] }); setModal(false); toast.dodaj('Klient dodany.') },
    onError: () => toast.dodaj('Błąd podczas dodawania klienta.', 'error'),
  })
  const editMut = useMutation({
    mutationFn: aktualizujKlienta,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['klienci'] }); setModal(false); toast.dodaj('Klient zaktualizowany.') },
    onError: () => toast.dodaj('Błąd podczas aktualizacji.', 'error'),
  })
  const delMut = useMutation({
    mutationFn: usunKlienta,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['klienci'] }); toast.dodaj('Klient usunięty.') },
    onError: () => toast.dodaj('Błąd podczas usuwania.', 'error'),
  })

  const filtered = klienci.filter(k => {
    const q = szukajDebounced.toLowerCase()
    return !q || k.imie.toLowerCase().includes(q) || k.nazwisko.toLowerCase().includes(q) ||
      (k.firma ?? '').toLowerCase().includes(q) || k.telefon.includes(q)
  })

  const otworz = (k?: Klient) => { setEdytowany(k ?? null); setModal(true) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Klienci</h1>
        <button onClick={() => otworz()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          <Plus size={18} /> Dodaj klienta
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Szukaj po nazwisku, firmie, telefonie…"
          value={szukaj} onChange={e => setSzukaj(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {isLoading ? <p className="p-6 text-center text-gray-400">Ładowanie…</p>
        : filtered.length === 0 ? <p className="p-6 text-center text-gray-400">Brak klientów.</p>
        : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Nazwisko / Firma</th>
                <th className="px-4 py-2 text-left">Telefon</th>
                <th className="px-4 py-2 text-left">E-mail</th>
                <th className="px-4 py-2 text-left">NIP</th>
                <th className="px-4 py-2 text-left">Adres</th>
                <th className="px-4 py-2 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(k => (
                <tr key={k.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <p className="font-medium">{k.nazwisko} {k.imie}</p>
                    {k.firma && <p className="text-xs text-gray-500">{k.firma}</p>}
                  </td>
                  <td className="px-4 py-2">{k.telefon}</td>
                  <td className="px-4 py-2 text-gray-500">{k.email ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-500">{k.nip ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-500 max-w-xs truncate">{k.adres ?? '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setHistoria(k)}
                        className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition" title="Historia zleceń">
                        <History size={15} />
                      </button>
                      <button onClick={() => otworz(k)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setDoUsuniecia(k)}
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
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
            <h2 className="text-lg font-bold mb-4">{edytowany ? 'Edytuj klienta' : 'Nowy klient'}</h2>
            <KlientForm
              poczatkowy={edytowany}
              ladowanie={addMut.isPending || editMut.isPending}
              onAnuluj={() => setModal(false)}
              onSubmit={(data) => {
                if (edytowany) editMut.mutate({ ...data, id: edytowany.id, created_at: edytowany.created_at })
                else addMut.mutate(data)
              }}
            />
          </div>
        </div>
      )}

      {historia && (
        <HistoriaZlecen
          typ="klient"
          id={historia.id}
          tytul={`${historia.imie} ${historia.nazwisko}${historia.firma ? ' / ' + historia.firma : ''}`}
          onZamknij={() => setHistoria(null)}
        />
      )}

      {doUsuniecia && (
        <ConfirmDialog
          tresc={`Usunąć klienta ${doUsuniecia.imie} ${doUsuniecia.nazwisko}? Zostaną usunięte też jego zlecenia.`}
          onPotwierdzenie={() => { delMut.mutate(doUsuniecia.id); setDoUsuniecia(null) }}
          onAnulowanie={() => setDoUsuniecia(null)}
        />
      )}
    </div>
  )
}
