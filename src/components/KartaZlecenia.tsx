import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useReactToPrint } from 'react-to-print'
import { Save, Printer, FileDown, ArrowLeft, Plus, Trash2, UserPlus, CarFront, BookOpen, Eye } from 'lucide-react'
import {
  pobierzKlientow, pobierzPojazdy, pobierzZlecenie,
  dodajZlecenie, aktualizujZlecenie, zapiszPozycje,
  dodajZdjecie, usunZdjecie, dodajKlienta, dodajPojazd,
  pobierzPresetyRobocizny,
} from '../utils/db'
import type { NowaPozycjaRobocizna, NowaPozycjaChesc, Zdjecie, NowyKlient, NowyPojazd, PresetRobocizny } from '../utils/db'
import { generujFakturePDF } from '../utils/pdf'
import { useAppStore } from '../stores'
import { useToast } from '../stores/useToast'
import GaleriaZdjec from './GaleriaZdjec'
import KlientForm from './KlientForm'
import Combobox from './Combobox'

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
  const toast = useToast()
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
  const [modalKlient, setModalKlient] = useState(false)
  const [modalPojazd, setModalPojazd] = useState(false)
  const [modalPresety, setModalPresety] = useState(false)
  const [modalPodglad, setModalPodglad] = useState(false)
  const [formPojazd, setFormPojazd] = useState<NowyPojazd>(pustyPojazd)

  const { data: klienci = [] } = useQuery({ queryKey: ['klienci'], queryFn: pobierzKlientow })
  const { data: pojazdy = [] } = useQuery({ queryKey: ['pojazdy'], queryFn: pobierzPojazdy })
  const { data: presety = [] } = useQuery({ queryKey: ['presety_robocizny'], queryFn: pobierzPresetyRobocizny })
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
      toast.dodaj('Klient dodany.')
    },
  })

  const nowyPojazdMut = useMutation({
    mutationFn: dodajPojazd,
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['pojazdy'] })
      setPojazdId(id)
      setModalPojazd(false)
      setFormPojazd(pustyPojazd)
      toast.dodaj('Pojazd dodany.')
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
    if (!klientId || !pojazdId) { toast.dodaj('Wybierz klienta i pojazd.', 'error'); return }
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
      toast.dodaj('Zlecenie zapisane.')
    } catch (e) {
      toast.dodaj(`Błąd: ${e}`, 'error')
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
    if (!savedId) { toast.dodaj('Najpierw zapisz zlecenie.', 'error'); return }
    try {
      const d = await pobierzZlecenie(savedId)
      const sciezka = await generujFakturePDF(d)
      toast.dodaj(`PDF zapisany: ${sciezka}`)
    } catch (e) {
      toast.dodaj(`Błąd PDF: ${e}`, 'error')
    }
  }

  const dodajPreset = (p: PresetRobocizny) => {
    setRobocizna(rs => [...rs, { nazwa: p.nazwa, czas_h: 1, stawka: p.stawka }])
    setModalPresety(false)
  }

  const setRob = (i: number, k: keyof NowaPozycjaRobocizna, v: string | number) =>
    setRobocizna(rs => rs.map((r, j) => j === i ? { ...r, [k]: v } : r))

  const setCz = (i: number, k: keyof NowaPozycjaChesc, v: string | number) =>
    setCzesci(cs => cs.map((c, j) => j === i ? { ...c, [k]: v } : c))

  const czyPending = addMut.isPending || editMut.isPending || pozMut.isPending

  const klientOpcje = klienci.map(k => ({
    value: k.id,
    label: `${k.nazwisko} ${k.imie}`,
    sub: k.firma,
  }))

  const pojazdOpcje = pojazdy.map(p => ({
    value: p.id,
    label: p.rejestracja,
    sub: `${p.marka} ${p.model}${p.rok ? ' · ' + p.rok : ''}`,
  }))

  const nrZlecenia = savedId
    ? `ZL/${new Date().getFullYear()}/${String(savedId).padStart(4, '0')}`
    : 'Nowe zlecenie'

  return (
    <>
    <div className="space-y-4">
      {/* Pasek akcji */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={() => setWidok('zlecenia')}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition">
          <ArrowLeft size={18} /> Powrót
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">{nrZlecenia}</h1>
          {savedId && <p className="text-xs text-gray-400 text-center">ID: #{savedId}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={zapisz} disabled={czyPending}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
            <Save size={16} /> {czyPending ? 'Zapisuję…' : 'Zapisz'}
          </button>
          <button onClick={() => setModalPodglad(true)}
            className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition">
            <Eye size={16} /> Podgląd
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
            <Combobox options={klientOpcje} value={klientId} onChange={setKlientId} placeholder="— wybierz klienta —" />
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-1">
              <label className="label">Pojazd *</label>
              <button type="button" onClick={() => { setFormPojazd(pustyPojazd); setModalPojazd(true) }}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition">
                <CarFront size={13} /> Nowy
              </button>
            </div>
            <Combobox options={pojazdOpcje} value={pojazdId} onChange={setPojazdId} placeholder="— wybierz pojazd —" />
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
          <textarea className="input mt-1 h-20 resize-none break-all overflow-x-hidden" value={opis}
            onChange={e => setOpis(e.target.value)}
            placeholder="Opisz usterkę lub zakres prac…" />
        </div>

        {/* Robocizna */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">Robocizna</h3>
            <div className="flex gap-2">
              {presety.length > 0 && (
                <button onClick={() => setModalPresety(true)}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                  <BookOpen size={14} /> Presety
                </button>
              )}
              <button onClick={() => setRobocizna(r => [...r, pustaRob()])}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                <Plus size={14} /> Dodaj
              </button>
            </div>
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

    {/* Modal: presety robocizny */}
    {modalPresety && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
          <h2 className="text-lg font-bold mb-4">Presety robocizny</h2>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {presety.map(p => (
              <button key={p.id} onClick={() => dodajPreset(p)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-blue-50 text-sm transition text-left">
                <span className="font-medium">{p.nazwa}</span>
                <span className="text-gray-500">{p.stawka.toFixed(2)} zł/h</span>
              </button>
            ))}
          </div>
          <button onClick={() => setModalPresety(false)}
            className="mt-4 w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition text-sm">
            Zamknij
          </button>
        </div>
      </div>
    )}

    {/* Modal: podgląd wydruku */}
    {modalPodglad && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-bold">Podgląd wydruku</h2>
            <div className="flex gap-2">
              <button onClick={() => handlePrint()}
                className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm">
                <Printer size={15} /> Drukuj
              </button>
              <button onClick={() => setModalPodglad(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm">
                Zamknij
              </button>
            </div>
          </div>
          <div className="overflow-y-auto overflow-x-hidden p-6">
            <div className="border rounded-lg p-6 space-y-4 text-sm">
              <div className="text-center border-b pb-4">
                <h1 className="text-xl font-bold">KARTA ZLECENIA</h1>
                <p className="text-gray-500">{nrZlecenia}</p>
              </div>
              {klientId && (() => {
                const k = klienci.find(x => x.id === klientId)
                return k ? (
                  <div>
                    <p className="font-semibold text-xs text-gray-400 uppercase mb-1">Klient</p>
                    <p className="font-medium">{k.nazwisko} {k.imie}{k.firma ? ' / ' + k.firma : ''}</p>
                    {k.telefon && <p className="text-gray-600">Tel: {k.telefon}</p>}
                    {k.nip && <p className="text-gray-600">NIP: {k.nip}</p>}
                  </div>
                ) : null
              })()}
              {pojazdId && (() => {
                const p = pojazdy.find(x => x.id === pojazdId)
                return p ? (
                  <div>
                    <p className="font-semibold text-xs text-gray-400 uppercase mb-1">Pojazd</p>
                    <p className="font-medium font-mono">{p.rejestracja}</p>
                    <p className="text-gray-600">{p.marka} {p.model}{p.rok ? ' · ' + p.rok : ''}</p>
                    {p.vin && <p className="text-gray-600 font-mono text-xs">VIN: {p.vin}</p>}
                  </div>
                ) : null
              })()}
              {opis && (
                <div>
                  <p className="font-semibold text-xs text-gray-400 uppercase mb-1">Opis prac</p>
                  <p className="text-gray-700 whitespace-pre-wrap break-all">{opis}</p>
                </div>
              )}
              {robocizna.filter(r => r.nazwa.trim()).length > 0 && (
                <div>
                  <p className="font-semibold text-xs text-gray-400 uppercase mb-2">Robocizna</p>
                  <table className="w-full text-xs">
                    <thead><tr className="border-b"><th className="text-left pb-1">Nazwa</th><th className="text-right pb-1">Czas</th><th className="text-right pb-1">Stawka</th><th className="text-right pb-1">Wartość</th></tr></thead>
                    <tbody>{robocizna.filter(r => r.nazwa.trim()).map((r, i) => (
                      <tr key={i} className="border-b border-gray-100"><td className="py-1">{r.nazwa}</td><td className="py-1 text-right">{r.czas_h}h</td><td className="py-1 text-right">{r.stawka.toFixed(2)} zł</td><td className="py-1 text-right font-medium">{(r.czas_h * r.stawka).toFixed(2)} zł</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
              {czesci.filter(c => c.nazwa.trim()).length > 0 && (
                <div>
                  <p className="font-semibold text-xs text-gray-400 uppercase mb-2">Części</p>
                  <table className="w-full text-xs">
                    <thead><tr className="border-b"><th className="text-left pb-1">Nazwa</th><th className="text-right pb-1">Ilość</th><th className="text-right pb-1">Cena</th><th className="text-right pb-1">Wartość</th></tr></thead>
                    <tbody>{czesci.filter(c => c.nazwa.trim()).map((c, i) => (
                      <tr key={i} className="border-b border-gray-100"><td className="py-1">{c.nazwa}</td><td className="py-1 text-right">{c.ilosc}</td><td className="py-1 text-right">{c.cena.toFixed(2)} zł</td><td className="py-1 text-right font-medium">{(c.ilosc * c.cena).toFixed(2)} zł</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
              <div className="border-t pt-3 text-right space-y-1">
                <p className="text-gray-600">Netto: <span className="font-medium">{sumaNetto.toFixed(2)} zł</span></p>
                <p className="text-gray-600">VAT 23%: <span className="font-medium">{vat.toFixed(2)} zł</span></p>
                <p className="text-lg font-bold">Brutto: {sumaBrutto.toFixed(2)} zł</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
