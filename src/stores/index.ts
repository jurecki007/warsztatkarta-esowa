import { create } from 'zustand'

export type Widok = 'dashboard' | 'klienci' | 'pojazdy' | 'zlecenia' | 'karta'

interface AppStore {
  widok: Widok
  setWidok: (w: Widok) => void
  aktywneZlecenieId: number | null
  setAktywneZlecenieId: (id: number | null) => void
}

export const useAppStore = create<AppStore>((set) => ({
  widok: 'dashboard',
  setWidok: (widok) => set({ widok }),
  aktywneZlecenieId: null,
  setAktywneZlecenieId: (aktywneZlecenieId) => set({ aktywneZlecenieId }),
}))
