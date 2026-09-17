/**
 * STORE — slice ui: vista activa, tenant del sitio, idioma y estado de modales.
 * Sincroniza con query params (compartible): ?view=admin&site=demo&lang=en
 *
 * NOTA SSR: el estado inicial SIEMPRE son los defaults (sin leer window) para
 * que server y cliente hidraten idénticos; AppShell aplica los query params
 * reales en un efecto post-mount (sin mismatch de hidratación).
 */
import { create } from 'zustand'
import type { Lang } from '@/lib/i18n'

export type AppView = 'public' | 'admin' | 'audit'

interface UiState {
  view: AppView
  siteSlug: string
  lang: Lang
  bookingOpen: boolean
  bookingServiceId: string | null
  cartOpen: boolean
  setView: (view: AppView) => void
  setSiteSlug: (slug: string) => void
  setLang: (lang: Lang) => void
  openBooking: (serviceId?: string | null) => void
  closeBooking: () => void
  setCartOpen: (open: boolean) => void
}

function syncUrl(view: AppView, siteSlug: string, lang: Lang) {
  if (typeof window === 'undefined') return
  const sp = new URLSearchParams(window.location.search)
  sp.delete('cancel')
  if (view === 'public' && siteSlug === 'demo') sp.delete('site')
  else sp.set(view === 'public' ? 'site' : 'view', view === 'public' ? siteSlug : view)
  if (lang !== 'es') sp.set('lang', lang)
  else sp.delete('lang')
  const qs = sp.toString()
  window.history.replaceState(null, '', qs ? `/?${qs}` : '/')
}

export const useUiStore = create<UiState>((set, get) => ({
  view: 'public',
  siteSlug: 'demo',
  lang: 'es',
  bookingOpen: false,
  bookingServiceId: null,
  cartOpen: false,
  setCartOpen: (cartOpen) => set({ cartOpen }),
  setView: (view) => {
    set({ view, bookingOpen: false })
    syncUrl(view, get().siteSlug, get().lang)
  },
  setSiteSlug: (siteSlug) => {
    set({ siteSlug })
    syncUrl(get().view, siteSlug, get().lang)
  },
  setLang: (lang) => {
    set({ lang })
    syncUrl(get().view, get().siteSlug, lang)
  },
  openBooking: (serviceId = null) => set({ bookingOpen: true, bookingServiceId: serviceId }),
  closeBooking: () => set({ bookingOpen: false }),
}))
