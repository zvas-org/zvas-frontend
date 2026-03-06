import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface AuthState {
  token: string
  setToken: (token: string) => void
  clearToken: () => void
}

/**
 * useAuthStore 管理当前控制台使用的 Bearer Token。
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: '',
      setToken: (token) => set({ token: token.trim() }),
      clearToken: () => set({ token: '' }),
    }),
    {
      name: 'zvas.console.auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
