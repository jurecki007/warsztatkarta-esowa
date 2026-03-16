import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useReactToPrint } from 'react-to-print'
import { Save, Printer, FileDown, ArrowLeft, Plus, Trash2, UserPlus, CarFront } from 'lucide-react'
import {
  pobierzKlientow, pobierzPojazdy, pobierzZlecenie,
  dodajZlecenie, aktualizujZlecenie, zapiszPozycje,
  dodajZdjecie, usunZdjecie, dodajKlienta, dodajPojazd,
} from '../utils/db'
import type { NowaPozycjaRobocizna, NowaPozycjaChesc, Zdjecie, NowyKlient, NowyPojazd } from '../utils/db'
import { generujFakturePDF } from '../utils/pdf'
import { useAppStore } from '../stores'
import GaleriaZdjec from './GaleriaZdjec'
import KlientForm from './KlientForm'

const pustyPojazd: NowyPojazd = { rejestracja: '', marka: '', model: '', rok: undefined, vin: '' }

const STATUSY = ['Nowe', 'W trakcie', 'Zakończone', 'Opłacone']
const KOLOR_STATUSU: Record<string, string> = {
  'Nowe':       'bg-blue-100 text-blue-800',
  'W trakcie':  'bg-yellow-100 text-yellow-800',
  'Zakończone': 'bg-green-100 text-green-800',
  'Opłacone':   'bg-gray-100 text-gray-700',
}

const pustaRob = (): NowaPozycjaRobocizna => ({ nazwa: '', czas_h: 1, stawka: 0 })
const pustaCz  = (): NowaPozycjaChesc      => ({ nazwa: '', ilosc: 1, cena: 0 })

export default function KartaZlecenia() {
  const qc = useQueryClient()
  const { aktywneZlecenieId, setWidok } = useAppStore()
  const printRef = useRef<HTMLDivElement>(null)

  const [klientId, setKlientId] = useState<number | null>(null)
  const [pojazdId, setPojazdId] = useState<number | null>(null)
  const [opis, setOpis] = useState('')
  const [status, setStatus] = useState('Nowe')
  const [robocizna, setRobocizna] = useState<NowaPozycjaRobocizna[]>([pustaRob()])
  const [czesci, setCzesci] = useState<NowaPozycjaChesc[]>([pustaCz()])
  const [zdjecia, setZdjecia] = useState<Zdjecie[]>([])
  const [savedId, setSavedId] = useState<number | null>(aktywneZlecenieId)
  const [komunikat, setKomunikat] = useState('')
  const [modalKlient, setModalKlient] = useState(false)
  const [modalPojazd, setModalPojazd] = useState(false)
  const [formPojazd, setFormPojazd] = useState<NowyPojazd>(pustyPojazd)

  const { data: klienci = [] } = useQuery({ queryKey: ['klienci'], queryFn: pobierzKlientow })
  const { data: pojazdy = [] } = useQuery({ queryKey: ['pojazdy'], queryFn: pobierzPojazdy })
  const { data: detail } = useQuery({
    queryKey: ['zlecenie', aktywneZlecenieId],
    queryFn: () => pobierzZlecenie(aktywneZlecenieId!),
    enabled: aktywneZlecenieId !== null,
  })

  useEffect(() => {
    if (detail) {
      setKlientId(detail.zlecenie.klient_id)
      setPojazdId(detail.zlecenie.pojazd_id)
      setOpis(detail.zlecenie.opis ?? '')
      setStatus(detail.zlecenie.status)
      setRobocizna(detail.robocizna.length > 0
        ? detail.robocizna.map(r => ({ nazwa: r.nazwa, czas_h: r.czas_h, stawka: r.stawka }))
        : [pustaRob()])
      setCzesci(detail.czesci.length > 0
        ? detail.czesci.map(c => ({ nazwa: c.nazwa, ilosc: c.ilosc, cena: c.cena }))
        : [pustaCz()])
      setZdjecia(detail.zdjecia)
      setSavedId(detail.zlecenie.id)
    }
  }, [detail])

  const sumaNetto = useMemo(() => {
    const r = robocizna.reduce((s, p) => s + p.czas_h * p.stawka, 0)
    const c = czesci.reduce((s, p) => s + p.ilosc * p.cena, 0)
    return r + c
  }, [robocizna, czesci])

  const vat = sumaNetto * 0.23
  const sumaBrutto = sumaNetto + vat

  const addMut = useMutation({ mutationFn: dodajZlecenie })
  const editMut = useMutation({ mutationFn: aktualizujZlecenie })
  const pozMut = useMutation({ mutationFn: (args: Parameters<typeof zapiszPozycje>) => zapiszPozycje(...args) })

  const nowyKlientMut = useMutation({
    mutationFn: dodajKlienta,
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['klienci'] })
      setKlientId(id)
      setModalKlient(false)
    },
  })

  const nowyPojazdMut = useMutation({
    mutationFn: dodajPojazd,
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['pojazdy'] })
      setPojazdId(id)
      setModalPojazd(false)
      setFormPojazd(pustyPojazd)
    },
  })

  const handleNowyPojazd = (e: React.FormEvent) => {
    e.preventDefault()
    nowyPojazdMut.mutate({ ...formPojazd, vin: formPojazd.vin || undefined })
  }

  const polePojazd = (k: keyof NowyPojazd) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = k === 'rok' ? (Number(e.target.value) || undefined) : e.target.value
    setFormPojazd(f => ({ ...f, [k]: val }))
  }

  const zapisz = async () => {
    if (!klientId || !pojazdId) { setKomunikat('Wybierz klienta i pojazd.'); return }
    try {
      let id = savedId
      if (!id) {
        id = await addMut.mutateAsync({ klient_id: klientId, pojazd_id: pojazdId, opis: opis || undefined, status })
        setSavedId(id)
      }
      await editMut.mutateAsync({ id, opis: opis || undefined, status, suma_netto: sumaNetto, vat, suma_brutto: sumaBrutto })
      await pozMut.mutateAsync([id,
        robocizna.filter(r => r.nazwa.trim()),
        czesci.filter(c => c.nazwa.trim()),
      ])
      qc.invalidateQueries({ queryKey: ['zlecenia'] })
      qc.invalidateQueries({ queryKey: ['zlecenie', id] })
      setKomunikat('Zlecenie zapisane ✓')
      setTimeout(() => setKomunikat(''), 3000)
    } catch (e) {
      setKomunikat(`Błąd: ${e}`)
    }
  }

  const handleDodajZdjecie = async (nazwa: string, data: string) => {
    if (!savedId) return
    const id = await dodajZdjecie(savedId, nazwa, data)
    setZdjecia(z => [...z, { id, zlecenie_id: savedId!, nazwa, data }])
  }

  const handleUsunZdjecie = async (id: number) => {
    await usunZdjecie(id)
    setZdjecia(z => z.filter(x => x.id !== id))
  }

  const handlePrint = useReactToPrint({ contentRef: printRef })

  const handlePDF = async () => {
    if (!savedId) { setKomunikat('Najpierw zapisz zlecenie.'); return }
    const d = await pobierzZlecenie(savedId)
    generujFakturePDF(d)
  }

  const setRob = (i: number, k: keyof NowaPozycjaRobocizna, v: string | number) =>
    setRobocizna(rs => rs.map((r, j) => j === i ? { ...r, [k]: v } : r))

  const setCz = (i: number, k: keyof NowaPozycjaChesc, v: string | number) =>
    setCzesci(cs => cs.map((c, j) => j === i ? { ...c, [k]: v } : c))

  const czyPending = addMut.isPending || editMut.isPending || pozMut.isPending

  return (
    <div className="space-y-4">
      {/* Pasek akcji */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={() => setWidok('zlecenia')}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition">
          <ArrowLeft size={18} /> Powrót
        </button>
        <h1 className="text-xl font-bold text-gray-800">
          {savedId ? `Zlecenie #${savedId}` : 'Nowe zlecenie'}
        </h1>
        <div className="flex gap-2">
          {komunikat && <span className="text-sm text-green-600 self-center">{komunikat}</span>}
          <button onClick={zapisz} disabled={czyPending}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
            <Save size={16} /> {czyPending ? 'Zapisuję…' : 'Zapisz'}
          </button>
          <button onClick={() => handlePrint()}
            className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition">
            <Printer size={16} /> Drukuj
          </button>
          <button onClick={handlePDF}
            className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition">
            <FileDown size={16} /> PDF
          </button>
        </div>
      </div>

      <div ref={printRef} className="space-y-4 print:p-4">
        {/* Klient + Pojazd + Status */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-1">
              <label className="label">Klient *</label>
              <button type="button" onClick={() => setModalKlient(true)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition">
                <UserPlus size={13} /> Nowy
              </button>
            </div>
            <select className="input" value={klientId ?? ''}
              onChange={e => setKlientId(Number(e.target.value) || null)}>
              <option value="">— wybierz —</option>
              {klienci.map(k => (
                <option key={k.id} value={k.id}>{k.nazwisko} {k.imie}{k.firma ? ' / ' + k.firma : ''}</option>
              ))}
            </select>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-1">
              <label className="label">Pojazd *</label>
              <button type="button" onClick={() => { setFormPojazd(pustyPojazd); setModalPojazd(true) }}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition">
                <CarFront size={13} /> Nowy
              </button>
            </div>
            <select className="input" value={pojazdId ?? ''}
              onChange={e => setPojazdId(Number(e.target.value) || null)}>
              <option value="">— wybierz —</option>
              {pojazdy.map(p => (
                <option key={p.id} value={p.id}>{p.rejestracja} — {p.marka} {p.model}</option>
              ))}
            </select>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <label className="label">Status</label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {STATUSY.map(s => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition
                    ${status === s ? KOLOR_STATUSU[s] + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Opis */}
        <div className="bg-white rounded-xl border p-4">
          <label className="label">Opis usterki / wykonanych prac</label>
          <textarea className="input mt-1 h-20 resize-none" value={opis}
            onChange={e => setOpis(e.target.value)}
            placeholder="Opisz usterkę lub zakres prac…" />
        </div>

        {/* Robocizna */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">Robocizna</h3>
            <button onClick={() => setRobocizna(r => [...r, pustaRob()])}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
              <Plus size={14} /> Dodaj
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase">
                <th className="pb-1 text-left">Nazwa pracy</th>
                <th className="pb-1 text-right w-24">Czas [h]</th>
                <th className="pb-1 text-right w-28">Stawka [zł/h]</th>
                <th className="pb-1 text-right w-28">Wartość</th>
                <th className="pb-1 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {robocizna.map((r, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2">
                    <input className="input py-1" value={r.nazwa}
                      onChange={e => setRob(i, 'nazwa', e.target.value)} placeholder="np. Wymiana oleju" />
                  </td>
                  <td className="py-1 px-1">
                    <input className="input py-1 text-right" type="number" min="0" step="0.5"
                      value={r.czas_h} onChange={e => setRob(i, 'czas_h', parseFloat(e.target.value) || 0)} />
                  </td>
                  <td className="py-1 px-1">
                    <input className="input py-1 text-right" type="number" min="0" step="1"
                      value={r.stawka} onChange={e => setRob(i, 'stawka', parseFloat(e.target.value) || 0)} />
                  </td>
                  <td className="py-1 pl-1 text-right font-medium">
                    {(r.czas_h * r.stawka).toFixed(2)} zł
                  </td>
                  <td className="py-1 pl-1">
                    <button onClick={() => setRobocizna(rs => rs.filter((_, j) => j !== i))}
                      className="text-gray-400 hover:text-red-500 transition">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Części */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">Części / materiały</h3>
            <button onClick={() => setCzesci(c => [...c, pustaCz()])}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
              <Plus size={14} /> Dodaj
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase">
                <th className="pb-1 text-left">Nazwa części</th>
                <th className="pb-1 text-right w-24">Ilość</th>
                <th className="pb-1 text-right w-28">Cena jedn.</th>
                <th className="pb-1 text-right w-28">Wartość</th>
                <th className="pb-1 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {czesci.map((c, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2">
                    <input className="input py-1" value={c.nazwa}
                      onChange={e => setCz(i, 'nazwa', e.target.value)} placeholder="np. Filtr oleju" />
                  </td>
                  <td className="py-1 px-1">
                    <input className="input py-1 text-right" type="number" min="0" step="1"
                      value={c.ilosc} onChange={e => setCz(i, 'ilosc', parseFloat(e.target.value) || 0)} />
                  </td>
                  <td className="py-1 px-1">
                    <input className="input py-1 text-right" type="number" min="0" step="0.01"
                      value={c.cena} onChange={e => setCz(i, 'cena', parseFloat(e.target.value) || 0)} />
                  </td>
                  <td className="py-1 pl-1 text-right font-medium">
                    {(c.ilosc * c.cena).toFixed(2)} zł
                  </td>
                  <td className="py-1 pl-1">
                    <button onClick={() => setCzesci(cs => cs.filter((_, j) => j !== i))}
                      className="text-gray-400 hover:text-red-500 transition">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Podsumowanie */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex justify-end">
            <div className="space-y-1 text-sm min-w-48">
              <div className="flex justify-between">
                <span className="text-gray-600">Netto:</span>
                <span className="font-medium">{sumaNetto.toFixed(2)} zł</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">VAT 23%:</span>
                <span className="font-medium">{vat.toFixed(2)} zł</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-1">
                <span>Brutto:</span>
                <span>{sumaBrutto.toFixed(2)} zł</span>
              </div>
            </div>
          </div>
        </div>

        {/* Galeria */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold text-gray-700 mb-3 print:hidden">Zdjęcia</h3>
          <GaleriaZdjec
            zdjecia={zdjecia}
            disabled={!savedId}
            onDodaj={handleDodajZdjecie}
            onUsun={handleUsunZdjecie}
          />
        </div>
      </div>
    </div>

    {/* Modal: nowy klient */}
    {modalKlient && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
          <h2 className="text-lg font-bold mb-4">Nowy klient</h2>
          <KlientForm
            ladowanie={nowyKlientMut.isPending}
            onAnuluj={() => setModalKlient(false)}
            onSubmit={(data: NowyKlient) => nowyKlientMut.mutate(data)}
          />
        </div>
      </div>
    )}

    {/* Modal: nowy pojazd */}
    {modalPojazd && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
          <h2 className="text-lg font-bold mb-4">Nowy pojazd</h2>
          <form onSubmit={handleNowyPojazd} className="space-y-3">
            <div>
              <label className="label">Nr rejestracyjny *</label>
              <input className="input uppercase" value={formPojazd.rejestracja} onChange={polePojazd('rejestracja')} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Marka *</label>
                <input className="input" value={formPojazd.marka} onChange={polePojazd('marka')} required /></div>
              <div><label className="label">Model *</label>
                <input className="input" value={formPojazd.model} onChange={polePojazd('model')} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Rok produkcji</label>
                <input className="input" type="number" min="1900" max="2099"
                  value={formPojazd.rok ?? ''} onChange={polePojazd('rok')} /></div>
              <div><label className="label">VIN</label>
                <input className="input font-mono text-sm" value={formPojazd.vin ?? ''} onChange={polePojazd('vin')} /></div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={nowyPojazdMut.isPending}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                {nowyPojazdMut.isPending ? 'Zapisuję…' : 'Zapisz'}
              </button>
              <button type="button" onClick={() => setModalPojazd(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition">
                Anuluj
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  )
}
