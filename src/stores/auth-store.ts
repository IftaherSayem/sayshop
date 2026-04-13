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
  login: (user: AuthUser) => void
  logout: () => void
  setUser: (user: AuthUser | null) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

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
    }),
    {
      name: "say-shop-auth",
      version: 3,
    }
  )
)
