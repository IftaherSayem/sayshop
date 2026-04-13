import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
}

interface AuthStore {
  user: AuthUser | null
  isAuthenticated: boolean
  /** Whether the persist middleware has finished hydrating from localStorage */
  _hydrated: boolean
  login: (user: AuthUser) => void
  logout: () => void
  setUser: (user: AuthUser | null) => void
  setHydrated: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      _hydrated: false,

      login: (user: AuthUser) => {
        set({ user, isAuthenticated: true })
      },

      logout: () => {
        set({ user: null, isAuthenticated: false })
      },

      setUser: (user: AuthUser | null) => {
        set({
          user,
          isAuthenticated: !!user,
        })
      },

      setHydrated: () => {
        set({ _hydrated: true })
      },
    }),
    {
      name: "say-shop-auth",
      version: 4,
      // This callback fires when hydration from localStorage is complete
      onRehydrateStorage: () => {
        return (_state, error) => {
          if (!error) {
            // Use setTimeout to avoid setting state during render
            setTimeout(() => {
              useAuthStore.getState().setHydrated()
            }, 0)
          }
        }
      },
    }
  )
)
