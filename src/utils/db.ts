import { invoke } from '@tauri-apps/api/core'

export interface Klient {
  id: number
  imie: string
  nazwisko: string
  firma?: string
  telefon: string
  email?: string
  nip?: string
  adres?: string
  created_at?: string
}

export interface NowyKlient {
  imie: string
  nazwisko: string
  firma?: string
  telefon: string
  email?: string
  nip?: string
  adres?: string
}

export interface Pojazd {
  id: number
  rejestracja: string
  marka: string
  model: string
  rok?: number
  vin?: string
}

export interface NowyPojazd {
  rejestracja: string
  marka: string
  model: string
  rok?: number
  vin?: string
}

export interface ZlecenieWidok {
  id: number
  klient_id: number
  klient_imie: string
  klient_nazwisko: string
  klient_firma?: string
  pojazd_id: number
  rejestracja: string
  marka: string
  model: string
  opis?: string
  status: string
  data_przyjecia: string
  suma_netto: number
  vat: number
  suma_brutto: number
}

export interface Zlecenie {
  id: number
  klient_id: number
  pojazd_id: number
  opis?: string
  status: string
  data_przyjecia: string
  suma_netto: number
  vat: number
  suma_brutto: number
}

export interface NoweZlecenie {
  klient_id: number
  pojazd_id: number
  opis?: string
  status: string
}

export interface AktualizacjaZlecenia {
  id: number
  opis?: string
  status: string
  suma_netto: number
  vat: number
  suma_brutto: number
}

export interface NowaPozycjaRobocizna {
  nazwa: string
  czas_h: number
  stawka: number
}

export interface NowaPozycjaChesc {
  nazwa: string
  ilosc: number
  cena: number
}

export interface PozycjaRobocizna extends NowaPozycjaRobocizna {
  id: number
  zlecenie_id: number
}

export interface PozycjaChesc extends NowaPozycjaChesc {
  id: number
  zlecenie_id: number
}

export interface Zdjecie {
  id: number
  zlecenie_id: number
  nazwa?: string
  data: string
}

export interface ZlecenieDetail {
  zlecenie: Zlecenie
  klient: Klient
  pojazd: Pojazd
  robocizna: PozycjaRobocizna[]
  czesci: PozycjaChesc[]
  zdjecia: Zdjecie[]
}

// ── Klienci ──────────────────────────────────────────────────────────────────
export const pobierzKlientow = () => invoke<Klient[]>('pobierz_klientow')
export const szukajKlientow = (fraza: string) => invoke<Klient[]>('szukaj_klientow', { fraza })
export const dodajKlienta = (klient: NowyKlient) => invoke<number>('dodaj_klienta', { klient })
export const aktualizujKlienta = (klient: Klient) => invoke<void>('aktualizuj_klienta', { klient })
export const usunKlienta = (id: number) => invoke<void>('usun_klienta', { id })

// ── Pojazdy ───────────────────────────────────────────────────────────────────
export const pobierzPojazdy = () => invoke<Pojazd[]>('pobierz_pojazdy')
export const dodajPojazd = (pojazd: NowyPojazd) => invoke<number>('dodaj_pojazd', { pojazd })
export const aktualizujPojazd = (pojazd: Pojazd) => invoke<void>('aktualizuj_pojazd', { pojazd })
export const usunPojazd = (id: number) => invoke<void>('usun_pojazd', { id })

// ── Zlecenia ──────────────────────────────────────────────────────────────────
export const pobierzZlecenia = () => invoke<ZlecenieWidok[]>('pobierz_zlecenia')
export const pobierzZlecenie = (id: number) => invoke<ZlecenieDetail>('pobierz_zlecenie', { id })
export const dodajZlecenie = (zlecenie: NoweZlecenie) => invoke<number>('dodaj_zlecenie', { zlecenie })
export const aktualizujZlecenie = (zlecenie: AktualizacjaZlecenia) =>
  invoke<void>('aktualizuj_zlecenie', { zlecenie })
export const zmienStatus = (id: number, status: string) =>
  invoke<void>('zmien_status', { id, status })
export const usunZlecenie = (id: number) => invoke<void>('usun_zlecenie', { id })

// ── Pozycje ───────────────────────────────────────────────────────────────────
export const zapiszPozycje = (
  zlecenie_id: number,
  robocizna: NowaPozycjaRobocizna[],
  czesci: NowaPozycjaChesc[],
) => invoke<void>('zapisz_pozycje', { zlecenieId: zlecenie_id, robocizna, czesci })

// ── Zdjecia ───────────────────────────────────────────────────────────────────
export const dodajZdjecie = (zlecenie_id: number, nazwa: string | undefined, data: string) =>
  invoke<number>('dodaj_zdjecie', { zlecenieId: zlecenie_id, nazwa, data })
export const usunZdjecie = (id: number) => invoke<void>('usun_zdjecie', { id })
