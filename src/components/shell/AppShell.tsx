'use client'

/**
 * SHELL — Punto de entrada de la app en el entorno de preview (ruta única `/`).
 * Tres vistas conmutables: Web Pública (sitio del tenant), Panel Admin y
 * Hub de Auditoría de Fases 1–5. En el template de producción estas vistas
 * mapean a /[slug] y /admin respectivamente.
 */
import { useEffect, useState, startTransition } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CalendarCheck, ClipboardList, Globe2, ShieldCheck } from 'lucide-react'
import { useUiStore, type AppView } from '@/store/ui'
import { useAuthStore } from '@/store/auth'
import { useCartStore } from '@/store/cart'
import { api } from '@/lib/api-client'
import PublicSite from '@/components/public-site/PublicSite'
import AdminApp from '@/components/admin/AdminApp'
import AuditHub from '@/components/audit/AuditHub'
import CancelReservationView from '@/components/shell/CancelReservationView'

const VIEWS: { id: AppView; label: string; icon: typeof Globe2 }[] = [
  { id: 'public', label: 'Web Pública', icon: Globe2 },
  { id: 'admin', label: 'Panel Admin', icon: ShieldCheck },
  { id: 'audit', label: 'Fases 1–5', icon: ClipboardList },
]

export default function AppShell() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: false } },
      }),
  )
  const view = useUiStore((s) => s.view)
  const setView = useUiStore((s) => s.setView)
  const siteSlug = useUiStore((s) => s.siteSlug)
  const lang = useUiStore((s) => s.lang)
  const setLang = useUiStore((s) => s.setLang)

  const refreshAuth = useAuthStore((s) => s.refresh)
  const ensureTenantCart = useCartStore((s) => s.ensureTenant)

  const [cancelState, setCancelState] = useState<{ id: string; token: string } | null>(null)
  const [tenants, setTenants] = useState<{ slug: string; name: string }[]>([])

  // Al montar: restaurar sesión y aplicar los query params reales
  // (?view=, ?site=, ?lang=, ?cancel=). Post-mount → sin mismatch de SSR.
  useEffect(() => {
    void refreshAuth()
    const sp = new URLSearchParams(window.location.search)
    const v = sp.get('view')
    if (v === 'admin' || v === 'audit' || v === 'public') {
      if (v !== 'public') useUiStore.setState({ view: v })
    }
    const site = sp.get('site')
    if (site) useUiStore.setState({ siteSlug: site })
    if (sp.get('lang') === 'en') useUiStore.setState({ lang: 'en' })
    const cancel = sp.get('cancel')
    const token = sp.get('token')
    if (cancel && token) startTransition(() => setCancelState({ id: cancel, token }))
  }, [refreshAuth])

  // Selector de sitios demo (multi-tenant): lista de tenants disponibles
  useEffect(() => {
    api<{ slug: string; name: string }[]>('/api/tenants')
      .then(setTenants)
      .catch(() => setTenants([{ slug: 'demo', name: 'Clínica Dental Sonrisa Andina' }]))
  }, [])

  useEffect(() => {
    ensureTenantCart(siteSlug)
  }, [siteSlug, ensureTenantCart])

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Barra de modo (chrome del demo, estilo page-builder) */}
        <header className="sticky top-0 z-[60] h-12 bg-neutral-950 text-neutral-100 flex items-center gap-2 sm:gap-4 px-3 sm:px-5 border-b border-neutral-800">
          <div className="flex items-center gap-2 shrink-0">
            <span className="grid place-items-center size-6 rounded-md bg-(--t-primary) text-white">
              <CalendarCheck className="size-4" />
            </span>
            <span className="font-heading font-semibold text-sm hidden sm:block">OdontoSite</span>
            <span className="text-[10px] uppercase tracking-wider bg-neutral-800 rounded-full px-2 py-0.5 text-neutral-300 hidden md:block">
              template saas · demo
            </span>
          </div>

          <nav className="flex-1 flex justify-center" aria-label="Cambiar vista">
            <div className="flex items-center gap-0.5 bg-neutral-900 rounded-full p-0.5 border border-neutral-800">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  aria-current={view === v.id}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                    view === v.id ? 'bg-white text-neutral-900' : 'text-neutral-400 hover:text-neutral-100'
                  }`}
                >
                  <v.icon className="size-3.5" />
                  <span className="hidden xs:inline sm:inline">{v.label}</span>
                </button>
              ))}
            </div>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {view === 'public' && (
              <>
                {tenants.length > 1 && (
                  <select
                    value={siteSlug}
                    onChange={(e) => useUiStore.getState().setSiteSlug(e.target.value)}
                    className="bg-neutral-900 border border-neutral-700 rounded-md text-xs px-2 py-1 max-w-40 truncate"
                    aria-label="Sitio del tenant"
                  >
                    {tenants.map((t) => (
                      <option key={t.slug} value={t.slug}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
                  className="text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 rounded-md px-2 py-1"
                  title="Cambiar idioma (i18n)"
                >
                  {lang.toUpperCase()}
                </button>
              </>
            )}
          </div>
        </header>

        {/* Vista activa */}
        {view === 'public' && <PublicSite key={siteSlug} slug={siteSlug} />}
        {view === 'admin' && <AdminApp />}
        {view === 'audit' && <AuditHub />}

        {/* Flujo de cancelación de reserva (?cancel=ID&token=…) */}
        {cancelState && (
          <CancelReservationView
            slug={siteSlug}
            id={cancelState.id}
            token={cancelState.token}
            onClose={() => {
              setCancelState(null)
              window.history.replaceState(null, '', '/')
            }}
          />
        )}
      </div>
    </QueryClientProvider>
  )
}
