'use client'

/**
 * ADMIN — Shell del panel: gate de sesión, sidebar con secciones según rol y
 * enrutamiento interno por estado (equivalente client-side de /admin/*).
 */
import { useEffect, useRef, useState } from 'react'
import { LogOut, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useUiStore } from '@/store/ui'
import { LoginScreen } from './LoginScreen'
import { sectionsForRole, type SectionKey } from './permissions'
import { DashboardHome } from './DashboardHome'
import { CalendarView } from './CalendarView'
import { OrdersView } from './OrdersView'
import { ServicesManager } from './ServicesManager'
import { ProfessionalsManager } from './ProfessionalsManager'
import { LocationsManager } from './LocationsManager'
import { ContentEditor } from './ContentEditor'
import { ThemeEditor } from './ThemeEditor'
import { InvoicesView } from './InvoicesView'
import { SettingsView } from './SettingsView'
import { TenantsView } from './TenantsView'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function AdminApp() {
  const { status, session, refresh, logout } = useAuthStore()
  const setView = useUiStore((s) => s.setView)
  const [section, setSection] = useState<SectionKey>('overview')
  // Restaura la sesión UNA sola vez al montar (evita loops de refresh).
  const bootstrapped = useRef(false)

  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true
    void refresh()
  }, [refresh])

  if (status === 'loading') {
    return (
      <div className="flex-1 grid place-items-center py-40">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!session?.user?.id) return <LoginScreen />

  const role = session.user.role
  const available = sectionsForRole(role)
  const active = available.find((s) => s.key === section) ?? available[0]

  // El super-admin entra directo a la gestión de tenants
  const effectiveSection = role === 'SUPER_ADMIN' ? 'tenants' : active.key

  return (
    <div className="flex-1 flex min-h-0 bg-muted/30">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r bg-white">
        <div className="p-5 border-b">
          <p className="font-heading font-bold text-sm truncate">{session.tenantName ?? 'OdontoSite'}</p>
          <p className="text-[11px] text-muted-foreground truncate">{session.user.email}</p>
          <Badge className="mt-2" variant={role === 'OWNER' ? 'default' : role === 'STAFF' ? 'secondary' : 'outline'}>
            {role}
          </Badge>
        </div>
        <nav className="flex-1 overflow-y-auto nice-scroll p-3 space-y-0.5" aria-label="Secciones del panel">
          {available.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors text-left ${
                effectiveSection === s.key ? 't-bg-primary text-white shadow-sm' : 'text-neutral-600 hover:bg-muted'
              }`}
            >
              <s.icon className="size-4.5 shrink-0" aria-hidden />
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-3 border-t space-y-1">
          {role !== 'SUPER_ADMIN' && (
            <Button
              variant="ghost"
              className="w-full justify-start text-sm"
              onClick={() => setView('public')}
              title="Ver el sitio público"
            >
              🌐 Ver web pública
            </Button>
          )}
          <Button variant="ghost" className="w-full justify-start text-sm text-destructive hover:text-destructive" onClick={() => void logout()}>
            <LogOut className="size-4" aria-hidden /> Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Topbar móvil */}
        <div className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between gap-2">
          <select
            value={effectiveSection}
            onChange={(e) => setSection(e.target.value as SectionKey)}
            className="text-sm font-medium border rounded-lg px-2.5 py-2 max-w-56"
            aria-label="Sección"
          >
            {available.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <Badge variant="outline">{role}</Badge>
            <Button size="icon" variant="ghost" onClick={() => void logout()} aria-label="Cerrar sesión">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto nice-scroll">
          {effectiveSection === 'tenants' ? (
            <TenantsView />
          ) : (
            <>
              <header className="px-5 sm:px-8 pt-6 pb-2">
                <h1 className="font-heading text-xl sm:text-2xl font-extrabold flex items-center gap-2.5">
                  {active && <active.icon className="size-5.5 t-text-primary" aria-hidden />}
                  {active?.label}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">{active?.description}</p>
              </header>
              <div className="px-5 sm:px-8 pb-10 pt-3">
                {effectiveSection === 'overview' && <DashboardHome />}
                {effectiveSection === 'calendar' && <CalendarView />}
                {effectiveSection === 'orders' && <OrdersView />}
                {effectiveSection === 'services' && <ServicesManager />}
                {effectiveSection === 'professionals' && <ProfessionalsManager />}
                {effectiveSection === 'locations' && <LocationsManager />}
                {effectiveSection === 'content' && <ContentEditor />}
                {effectiveSection === 'theme' && <ThemeEditor />}
                {effectiveSection === 'invoices' && <InvoicesView />}
                {effectiveSection === 'settings' && <SettingsView />}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
