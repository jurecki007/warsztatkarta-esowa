import { useQuery } from '@tanstack/react-query'
import { Users, Car, ClipboardList, Plus, AlertCircle } from 'lucide-react'
import { pobierzKlientow, pobierzPojazdy, pobierzZlecenia } from '../utils/db'
import { useAppStore } from '../stores'

const STATUSY_KOLOROWE: Record<string, string> = {
  'Nowe':       'bg-blue-100 text-blue-800',
  'W trakcie':  'bg-yellow-100 text-yellow-800',
  'Zakończone': 'bg-green-100 text-green-800',
  'Opłacone':   'bg-gray-100 text-gray-700',
}

export default function Dashboard() {
  const { setWidok, setAktywneZlecenieId } = useAppStore()
  const { data: klienci = [] } = useQuery({ queryKey: ['klienci'], queryFn: pobierzKlientow })
  const { data: pojazdy = [] } = useQuery({ queryKey: ['pojazdy'], queryFn: pobierzPojazdy })
  const { data: zlecenia = [] } = useQuery({ queryKey: ['zlecenia'], queryFn: pobierzZlecenia })

  const aktywne = zlecenia.filter(z => z.status === 'Nowe' || z.status === 'W trakcie')
  const ostatnie = zlecenia.slice(0, 8)

  const noweZlecenie = () => {
    setAktywneZlecenieId(null)
    setWidok('karta')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Pulpit</h1>
        <button
          onClick={noweZlecenie}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} /> Nowe zlecenie
        </button>
      </div>

      {/* Statystyki */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Klientów', val: klienci.length, icon: Users,         bg: 'bg-blue-100',   fg: 'text-blue-600',   fn: () => setWidok('klienci') },
          { label: 'Pojazdów', val: pojazdy.length, icon: Car,           bg: 'bg-green-100',  fg: 'text-green-600',  fn: () => setWidok('pojazdy') },
          { label: 'Zleceń',   val: zlecenia.length, icon: ClipboardList, bg: 'bg-purple-100', fg: 'text-purple-600', fn: () => setWidok('zlecenia') },
          { label: 'Aktywnych', val: aktywne.length, icon: AlertCircle,   bg: 'bg-orange-100', fg: 'text-orange-600', fn: () => setWidok('zlecenia') },
        ].map(({ label, val, icon: Icon, bg, fg, fn }) => (
          <button
            key={label}
            onClick={fn}
            className="bg-white rounded-xl shadow-sm border p-5 flex items-center gap-4 hover:shadow-md transition text-left"
          >
            <div className={`p-3 rounded-lg ${bg}`}>
              <Icon size={24} className={fg} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{val}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Ostatnie zlecenia */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Ostatnie zlecenia</h2>
          <button onClick={() => setWidok('zlecenia')} className="text-sm text-blue-600 hover:underline">
            Pokaż wszystkie →
          </button>
        </div>
        {ostatnie.length === 0 ? (
          <p className="p-6 text-center text-gray-400">Brak zleceń. Dodaj pierwsze zlecenie.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Nr</th>
                <th className="px-4 py-2 text-left">Klient</th>
                <th className="px-4 py-2 text-left">Pojazd</th>
                <th className="px-4 py-2 text-left">Data</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Brutto</th>
              </tr>
            </thead>
            <tbody>
              {ostatnie.map(z => (
                <tr
                  key={z.id}
                  className="border-t hover:bg-gray-50 cursor-pointer"
                  onClick={() => { setAktywneZlecenieId(z.id); setWidok('karta') }}
                >
                  <td className="px-4 py-2 font-mono text-gray-500">#{z.id}</td>
                  <td className="px-4 py-2 font-medium">{z.klient_nazwisko} {z.klient_imie}</td>
                  <td className="px-4 py-2 text-gray-600">{z.rejestracja} — {z.marka} {z.model}</td>
                  <td className="px-4 py-2 text-gray-500">{z.data_przyjecia}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUSY_KOLOROWE[z.status] ?? 'bg-gray-100 text-gray-600'}`}>
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
    </div>
  )
}
