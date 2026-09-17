/**
 * STORE — slice auth: sesión del panel admin (JWT en cookie httpOnly).
 */
import { create } from 'zustand'
import { api, apiErrMessage } from '@/lib/api-client'
import type { AuthUser } from '@/domain/entities'

export interface SessionInfo {
  user: AuthUser
  tenantName: string | null
  tenantSlug: string | null
}

type AuthStatus = 'idle' | 'loading' | 'authenticated'

interface AuthState {
  status: AuthStatus
  session: SessionInfo | null
  error: string | null
  refresh: () => Promise<void>
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  session: null,
  error: null,
  refresh: async () => {
    set({ status: 'loading' })
    try {
      const data = await api<SessionInfo | null>('/api/admin/auth/me')
      set({ session: data && data.user?.id ? data : null, status: data?.user?.id ? 'authenticated' : 'idle', error: null })
    } catch {
      set({ session: null, status: 'idle' })
    }
  },
  login: async (email, password) => {
    set({ status: 'loading', error: null })
    try {
      await api('/api/admin/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      const data = await api<SessionInfo>('/api/admin/auth/me')
      set({ session: data, status: 'authenticated' })
      return true
    } catch (err) {
      set({ status: 'idle', error: apiErrMessage(err) })
      return false
    }
  },
  logout: async () => {
    try {
      await api('/api/admin/auth/logout', { method: 'POST' })
    } catch {
      /* la cookie se limpia igualmente en el cliente */
    }
    set({ session: null, status: 'idle' })
  },
}))
