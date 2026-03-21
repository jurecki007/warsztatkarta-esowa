import jsPDF from 'jspdf'
import { invoke } from '@tauri-apps/api/core'
import type { ZlecenieDetail } from './db'
import fontUrl from '../assets/Roboto-Regular.ttf?url'

let fontB64Cache: string | null = null

async function loadFont(): Promise<string> {
  if (fontB64Cache) return fontB64Cache
  const resp = await fetch(fontUrl)
  const buffer = await resp.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  fontB64Cache = btoa(binary)
  return fontB64Cache
}

export async function generujFakturePDF(d: ZlecenieDetail): Promise<void> {
  const doc = new jsPDF()
  const b64 = await loadFont()
  doc.addFileToVFS('Roboto-Regular.ttf', b64)
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')

  const margin = 14
  let y = 20

  const line = (text: string, x = margin) => {
    doc.text(text, x, y)
    y += 7
  }
  const hline = () => {
    doc.setDrawColor(200)
    doc.line(margin, y, 196, y)
    y += 4
  }

  // Nagłówek
  doc.setFontSize(18)
  doc.setFont('Roboto', 'normal')
  doc.text('KARTA ZLECENIA / FAKTURA', 105, y, { align: 'center' })
  y += 8
  doc.setFontSize(11)
  doc.text(`Nr: ${d.zlecenie.id} | Data: ${d.zlecenie.data_przyjecia}`, 105, y, { align: 'center' })
  y += 10
  hline()

  // Klient
  doc.setFontSize(11)
  doc.setFont('Roboto', 'normal')
  line('DANE KLIENTA')
  line(`${d.klient.imie} ${d.klient.nazwisko}${d.klient.firma ? ' / ' + d.klient.firma : ''}`)
  if (d.klient.telefon) line(`Tel: ${d.klient.telefon}`)
  if (d.klient.email) line(`Email: ${d.klient.email}`)
  if (d.klient.nip) line(`NIP: ${d.klient.nip}`)
  if (d.klient.adres) line(`Adres: ${d.klient.adres}`)
  y += 2
  hline()

  // Pojazd
  doc.setFont('Roboto', 'normal')
  line('POJAZD')
  line(`${d.pojazd.marka} ${d.pojazd.model}${d.pojazd.rok ? ' (' + d.pojazd.rok + ')' : ''}`)
  line(`Rejestracja: ${d.pojazd.rejestracja}`)
  if (d.pojazd.vin) line(`VIN: ${d.pojazd.vin}`)
  y += 2
  hline()

  // Opis
  if (d.zlecenie.opis) {
    doc.setFont('Roboto', 'normal')
    line('OPIS USTERKI / PRAC')
    doc.setFont('Roboto', 'normal')
    const lines = doc.splitTextToSize(d.zlecenie.opis, 182)
    doc.text(lines, margin, y)
    y += lines.length * 7 + 2
    hline()
  }

  // Robocizna
  if (d.robocizna.length > 0) {
    doc.setFont('Roboto', 'normal')
    line('ROBOCIZNA')
    doc.text('Nazwa', margin, y)
    doc.text('Czas [h]', 110, y)
    doc.text('Stawka', 140, y)
    doc.text('Wartość', 170, y)
    y += 5
    for (const p of d.robocizna) {
      const val = (p.czas_h * p.stawka).toFixed(2)
      doc.text(p.nazwa, margin, y)
      doc.text(String(p.czas_h), 110, y)
      doc.text(`${p.stawka.toFixed(2)} zł`, 140, y)
      doc.text(`${val} zł`, 170, y)
      y += 6
    }
    y += 2
    hline()
  }

  // Części
  if (d.czesci.length > 0) {
    doc.setFont('Roboto', 'normal')
    line('CZĘŚCI')
    doc.text('Nazwa', margin, y)
    doc.text('Ilość', 110, y)
    doc.text('Cena', 140, y)
    doc.text('Wartość', 170, y)
    y += 5
    for (const p of d.czesci) {
      const val = (p.ilosc * p.cena).toFixed(2)
      doc.text(p.nazwa, margin, y)
      doc.text(String(p.ilosc), 110, y)
      doc.text(`${p.cena.toFixed(2)} zł`, 140, y)
      doc.text(`${val} zł`, 170, y)
      y += 6
    }
    y += 2
    hline()
  }

  // Podsumowanie
  doc.setFont('Roboto', 'normal')
  doc.text(`Netto:   ${d.zlecenie.suma_netto.toFixed(2)} zł`, 140, y); y += 7
  doc.text(`VAT 23%: ${d.zlecenie.vat.toFixed(2)} zł`, 140, y); y += 7
  doc.setFontSize(13)
  doc.text(`BRUTTO:  ${d.zlecenie.suma_brutto.toFixed(2)} zł`, 140, y); y += 10

  // Status
  doc.setFontSize(11)
  doc.setFont('Roboto', 'normal')
  doc.text(`Status: ${d.zlecenie.status}`, margin, y)
  y += 10

  // Podpisy
  if (y > 240) { doc.addPage(); y = 20 }
  y += 20
  doc.setDrawColor(80)
  doc.line(margin, y, 85, y)
  doc.line(115, y, 196, y)
  doc.setFontSize(9)
  doc.setFont('Roboto', 'normal')
  doc.text('Podpis Mechanika', margin, y + 5)
  doc.text('Podpis Klienta', 115, y + 5)

  const nazwa = `zlecenie_${d.zlecenie.id}_${d.klient.nazwisko}.pdf`
  const bytes = Array.from(new Uint8Array(doc.output('arraybuffer')))
  const sciezka = await invoke<string>('zapisz_pdf', { nazwa, dane: bytes })
  alert(`PDF zapisano: ${sciezka}`)
}
