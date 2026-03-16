import { create } from 'zustand'
import type { Klient } from '../utils/db'

interface KlienciStore {
  wybranyKlient: Klient | null
  setWybranyKlient: (k: Klient | null) => void
  pokazForm: boolean
  setPokazForm: (v: boolean) => void
}

export const useKlienci = create<KlienciStore>((set) => ({
  wybranyKlient: null,
  setWybranyKlient: (wybranyKlient) => set({ wybranyKlient }),
  pokazForm: false,
  setPokazForm: (pokazForm) => set({ pokazForm }),
}))
