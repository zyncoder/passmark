import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  user: any | null;
  setUser: (user: any | null) => void;
  clearSession: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearSession: () => set({ user: null }),
    }),
    {
      name: 'passmark-storage', // name of the item in the storage (must be unique)
    }
  )
)
