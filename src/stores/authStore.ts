// src/stores/authStore.ts
import { create } from 'zustand'

interface AuthState {
  token: string | null
  user: any | null
  setAuth: (token: string, user: any) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('sb-access-token'),
  user: null,
  setAuth: (token, user) => {
    localStorage.setItem('sb-access-token', token)
    set({ token, user })
  },
  clearAuth: () => {
    localStorage.removeItem('sb-access-token')
    set({ token: null, user: null })
  },
}))