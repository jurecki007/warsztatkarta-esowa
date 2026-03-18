import { LayoutDashboard, Users, Car, ClipboardList, RefreshCw, Download, RotateCcw, CheckCheck } from 'lucide-react'
import { useAppStore } from './stores'
import type { Widok } from './stores'
import Dashboard from './components/Dashboard'
import KlientLista from './components/KlientLista'
import PojazdForm from './components/PojazdForm'
import ZlecenieForm from './components/ZlecenieForm'
import KartaZlecenia from './components/KartaZlecenia'
import { useUpdater } from './hooks/useUpdater'

const NAV: { widok: Widok; label: string; icon: React.ElementType }[] = [
  { widok: 'dashboard', label: 'Pulpit',   icon: LayoutDashboard },
  { widok: 'klienci',   label: 'Klienci',  icon: Users },
  { widok: 'pojazdy',   label: 'Pojazdy',  icon: Car },
  { widok: 'zlecenia',  label: 'Zlecenia', icon: ClipboardList },
]

export default function App() {
  const { widok, setWidok } = useAppStore()
  const { state, sprawdz, pobierzIZainstaluj, uruchomPonownie } = useUpdater()

  const renderUpdateButton = () => {
    switch (state.status) {
      case 'checking':
        return <span className="flex items-center gap-1.5 text-blue-300"><RefreshCw size={12} className="animate-spin" /> Sprawdzanie…</span>
      case 'upToDate':
        return <span className="flex items-center gap-1.5 text-green-400"><CheckCheck size={12} /> Aktualna wersja</span>
      case 'available':
        return (
          <div className="space-y-1">
            <p className="text-yellow-300">Dostępna v{state.version}</p>
            <button onClick={pobierzIZainstaluj}
              className="flex items-center gap-1 text-white bg-blue-600 hover:bg-blue-500 px-2 py-0.5 rounded transition">
              <Download size={11} /> Pobierz
            </button>
          </div>
        )
      case 'downloading':
        return <span className="flex items-center gap-1.5 text-blue-300"><RefreshCw size={12} className="animate-spin" /> {state.percent}%</span>
      case 'ready':
        return (
          <button onClick={uruchomPonownie}
            className="flex items-center gap-1 text-white bg-green-600 hover:bg-green-500 px-2 py-0.5 rounded transition">
            <RotateCcw size={11} /> Uruchom ponownie
          </button>
        )
      case 'error':
        return <span className="text-red-400 leading-tight">{state.message}</span>
      default:
        return (
          <button onClick={sprawdz} className="hover:text-white transition">
            Sprawdź aktualizacje
          </button>
        )
    }
  }

  return (
    <div className="flex h-full bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 bg-blue-800 text-white flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-blue-700">
          <h1 className="font-bold text-lg leading-tight">NyxSerwis</h1>
          <p className="text-xs text-blue-300 mt-0.5">Panel serwisowy</p>
        </div>
        <nav className="flex-1 py-4">
          {NAV.map(({ widok: w, label, icon: Icon }) => (
            <button
              key={w}
              onClick={() => setWidok(w)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm transition
                ${widok === w || (widok === 'karta' && w === 'zlecenia')
                  ? 'bg-blue-900 text-white font-semibold'
                  : 'text-blue-200 hover:bg-blue-700 hover:text-white'}`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="px-5 py-4 text-xs text-blue-400 border-t border-blue-700 space-y-1.5">
          <div>v0.4.0 · Made by NyxionTech</div>
          <div>{renderUpdateButton()}</div>
        </div>
      </aside>

      {/* Główna treść */}
      <main className="flex-1 overflow-y-auto p-6">
        {widok === 'dashboard'  && <Dashboard />}
        {widok === 'klienci'    && <KlientLista />}
        {widok === 'pojazdy'    && <PojazdForm />}
        {widok === 'zlecenia'   && <ZlecenieForm />}
        {widok === 'karta'      && <KartaZlecenia />}
      </main>
    </div>
  )
}
