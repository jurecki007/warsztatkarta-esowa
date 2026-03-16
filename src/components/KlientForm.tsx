import { useState, useEffect } from 'react'
import type { Klient, NowyKlient } from '../utils/db'

interface Props {
  poczatkowy?: Klient | null
  onSubmit: (data: NowyKlient) => void
  onAnuluj: () => void
  ladowanie?: boolean
}

const pusty: NowyKlient = { imie: '', nazwisko: '', firma: '', telefon: '', email: '', nip: '', adres: '' }

export default function KlientForm({ poczatkowy, onSubmit, onAnuluj, ladowanie }: Props) {
  const [form, setForm] = useState<NowyKlient>(pusty)

  useEffect(() => {
    if (poczatkowy) {
      setForm({
        imie: poczatkowy.imie,
        nazwisko: poczatkowy.nazwisko,
        firma: poczatkowy.firma ?? '',
        telefon: poczatkowy.telefon,
        email: poczatkowy.email ?? '',
        nip: poczatkowy.nip ?? '',
        adres: poczatkowy.adres ?? '',
      })
    } else {
      setForm(pusty)
    }
  }, [poczatkowy])

  const pole = (k: keyof NowyKlient) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...form,
      firma: form.firma || undefined,
      email: form.email || undefined,
      nip: form.nip || undefined,
      adres: form.adres || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Imię *</label>
          <input className="input" value={form.imie} onChange={pole('imie')} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nazwisko *</label>
          <input className="input" value={form.nazwisko} onChange={pole('nazwisko')} required />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Firma</label>
        <input className="input" value={form.firma} onChange={pole('firma')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Telefon *</label>
          <input className="input" value={form.telefon} onChange={pole('telefon')} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
          <input className="input" type="email" value={form.email} onChange={pole('email')} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">NIP</label>
          <input className="input" value={form.nip} onChange={pole('nip')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Adres</label>
          <input className="input" value={form.adres} onChange={pole('adres')} />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={ladowanie}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
          {ladowanie ? 'Zapisuję…' : 'Zapisz'}
        </button>
        <button type="button" onClick={onAnuluj}
          className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition">
          Anuluj
        </button>
      </div>
    </form>
  )
}
