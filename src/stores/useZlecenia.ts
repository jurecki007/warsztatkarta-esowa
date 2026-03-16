import { create } from 'zustand'

interface ZleceniaStore {
  filterStatus: string
  setFilterStatus: (s: string) => void
  szukaj: string
  setSzukaj: (s: string) => void
}

export const useZlecenia = create<ZleceniaStore>((set) => ({
  filterStatus: '',
  setFilterStatus: (filterStatus) => set({ filterStatus }),
  szukaj: '',
  setSzukaj: (szukaj) => set({ szukaj }),
}))
