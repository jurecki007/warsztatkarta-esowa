import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { pobierzZleceniaKlienta, pobierzZleceniaPojazdu } from '../utils/db'
import { useAppStore } from '../stores'

const KOLOR: Record<string, string> = {
  'Nowe':       'bg-blue-100 text-blue-800',
  'W trakcie':  'bg-yellow-100 text-yellow-800',
  'Zakończone': 'bg-green-100 text-green-800',
  'Opłacone':   'bg-gray-100 text-gray-700',
}

interface Props {
  typ: 'klient' | 'pojazd'
  id: number
  tytul: string
  onZamknij: () => void
}

export default function HistoriaZlecen({ typ, id, tytul, onZamknij }: Props) {
  const { setWidok, setAktywneZlecenieId } = useAppStore()

  const { data: zlecenia = [], isLoading } = useQuery({
    queryKey: [typ === 'klient' ? 'zlecenia_klienta' : 'zlecenia_pojazdu', id],
    queryFn: () => typ === 'klient' ? pobierzZleceniaKlienta(id) : pobierzZleceniaPojazdu(id),
  })

  const otworz = (zlecenieId: number) => {
    setAktywneZlecenieId(zlecenieId)
    setWidok('karta')
    onZamknij()
  }

  const sumaTotal = zlecenia.reduce((s, z) => s + z.suma_brutto, 0)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{tytul}</h2>
            <p className="text-sm text-gray-500">Historia zleceń</p>
          </div>
          <button onClick={onZamknij} className="p-2 text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <p className="p-6 text-center text-gray-400">Ładowanie…</p>
          ) : zlecenia.length === 0 ? (
            <p className="p-6 text-center text-gray-400">Brak zleceń.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left">Nr</th>
                  {typ === 'klient' && <th className="px-4 py-2 text-left">Pojazd</th>}
                  {typ === 'pojazd' && <th className="px-4 py-2 text-left">Klient</th>}
                  <th className="px-4 py-2 text-left">Data</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-right">Brutto</th>
                </tr>
              </thead>
              <tbody>
                {zlecenia.map(z => (
                  <tr key={z.id} onClick={() => otworz(z.id)}
                    className="border-t hover:bg-blue-50 cursor-pointer transition">
                    <td className="px-4 py-2">
                      <p className="font-mono text-gray-500">#{z.id}</p>
                      {z.numer_faktury && <p className="text-xs text-blue-600">{z.numer_faktury}</p>}
                    </td>
                    {typ === 'klient' && (
                      <td className="px-4 py-2">
                        <p className="font-mono font-medium">{z.rejestracja}</p>
                        <p className="text-xs text-gray-500">{z.marka} {z.model}</p>
                      </td>
                    )}
                    {typ === 'pojazd' && (
                      <td className="px-4 py-2">
                        <p className="font-medium">{z.klient_nazwisko} {z.klient_imie}</p>
                        {z.klient_firma && <p className="text-xs text-gray-500">{z.klient_firma}</p>}
                      </td>
                    )}
                    <td className="px-4 py-2 text-gray-500">{z.data_przyjecia}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${KOLOR[z.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {z.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-medium">{z.suma_brutto.toFixed(2)} zł</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {zlecenia.length > 0 && (
          <div className="border-t px-5 py-3 flex justify-between text-sm text-gray-600">
            <span>{zlecenia.length} zleceń</span>
            <span className="font-semibold">Łącznie: {sumaTotal.toFixed(2)} zł</span>
          </div>
        )}
      </div>
    </div>
  )
}
