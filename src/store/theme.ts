/**
 * STORE — slice theme: tema "en vivo" (mutación Zustand).
 * El editor del panel cambia este slice y el sitio público lo refleja al
 * instante (sin recargar). "Guardar" persiste en tenant.config (BD) vía API.
 */
import { create } from 'zustand'
import { DEFAULT_THEME, resolveTheme } from '@/lib/theme'
import type { ThemeConfig } from '@/domain/entities'

interface ThemeState {
  /** override en vivo (null = usar el tema guardado del tenant) */
  live: ThemeConfig | null
  /** tema persistido en BD (se sincroniza al cargar/guardar) */
  saved: ThemeConfig
  setLive: (patch: Partial<ThemeConfig>) => void
  resetLive: () => void
  setSaved: (theme: Partial<ThemeConfig> | null) => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  live: null,
  saved: DEFAULT_THEME,
  setLive: (patch) => set({ live: { ...(get().live ?? get().saved), ...patch } }),
  resetLive: () => set({ live: null }),
  setSaved: (theme) => set({ saved: resolveTheme(theme), live: null }),
}))

/** Tema efectivo (live ?? saved). */
export const effectiveTheme = (s: ThemeState): ThemeConfig => s.live ?? s.saved
