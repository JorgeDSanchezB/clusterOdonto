'use client'

/** FASE 1 — Plan estratégico: wireframes navegable + arquitectura + rutas. */
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'

const FOLDER_TREE = `src/
├─ app/
│  ├─ page.tsx              → AppShell (3 vistas en dev; prod: /[slug])
│  ├─ layout.tsx            → fuentes + Toaster + metadata
│  └─ api/                  → TODA la API REST
│     ├─ [slug]/            → público por tenant (content, services,
│     │                        availability, appointments, orders…)
│     ├─ admin/             → panel (auth JWT + tenantId de sesión)
│     └─ super-admin/       → gestión de tenants
├─ domain/                  → NÚCLEO: entidades, VOs, factories, schemas Zod
├─ application/
│  └─ use-cases/            → booking, orders, invoices, services, tenants
├─ infrastructure/          → adaptadores: auth(JWT), storage(local),
│                             email(console/smtp), pdf(InvoiceProvider)
├─ components/
│  ├─ public-site/          → secciones del sitio público (por sección)
│  ├─ admin/                → panel por secciones
│  └─ audit/                → este hub
├─ store/                   → Zustand: cart, auth, theme, ui (slices)
└─ lib/                     → utils: quito-time, pagination, slots, theme…`

const ROUTES = [
  { kind: 'Pública', path: '/ (vista Web Pública)', desc: 'Sitio del tenant — prod: /[slug]' },
  { kind: 'Pública', path: '/api/[slug]/content', desc: 'Contenido editable' },
  { kind: 'Pública', path: '/api/[slug]/services', desc: 'Catálogo con cursor' },
  { kind: 'Pública', path: '/api/[slug]/professionals', desc: 'Equipo' },
  { kind: 'Pública', path: '/api/[slug]/locations', desc: 'Sedes' },
  { kind: 'Pública', path: '/api/[slug]/availability', desc: 'Slots disponibles' },
  { kind: 'Pública', path: '/api/[slug]/appointments', desc: 'POST crear reserva' },
  { kind: 'Pública', path: '/api/[slug]/appointments/[id]/cancel', desc: 'POST cancelar (token)' },
  { kind: 'Pública', path: '/api/[slug]/orders', desc: 'POST pedido carrito→WhatsApp' },
  { kind: 'Privada', path: '/ (vista Panel Admin)', desc: 'Login + dashboard — prod: /admin' },
  { kind: 'Privada', path: '/api/admin/*', desc: 'CRUDs, agenda, pedidos, facturas' },
  { kind: 'Super', path: '/api/super-admin/tenants', desc: 'Alta de odontólogos' },
]

const WF_SCREENS = ['home', 'admin', 'calendar'] as const
const WF_LABELS: Record<(typeof WF_SCREENS)[number], string> = {
  home: 'Home pública',
  admin: 'Panel admin',
  calendar: 'Calendario',
}

export default function Phase1Plan() {
  const [screen, setScreen] = useState<(typeof WF_SCREENS)[number]>('home')

  return (
    <div className="space-y-8">
      {/* Wireframes */}
      <section className="bg-white rounded-2xl border p-5 sm:p-6">
        <header className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-heading font-bold">Wireframes navegable</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Estructura aprobada antes de programar (ahora ya implementada).</p>
          </div>
          <div className="flex gap-1 rounded-full border p-0.5">
            {WF_SCREENS.map((s) => (
              <button
                key={s}
                onClick={() => setScreen(s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${screen === s ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'}`}
              >
                {WF_LABELS[s]}
              </button>
            ))}
          </div>
        </header>
        <div className="mt-4 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 overflow-x-auto">
          {screen === 'home' && <WireframeHome />}
          {screen === 'admin' && <WireframeAdmin />}
          {screen === 'calendar' && <WireframeCalendar />}
        </div>
      </section>

      {/* Arquitectura */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border p-5 sm:p-6">
          <h2 className="font-heading font-bold">Arquitectura hexagonal</h2>
          <div className="mt-4 space-y-2">
            {[
              { layer: 'Presentación', detail: 'public-site/ · admin/ · audit/ (React + shadcn/ui)', color: 'bg-violet-100 border-violet-200 text-violet-900' },
              { layer: 'Aplicación', detail: 'use-cases: booking · orders · invoices · services · tenants', color: 'bg-amber-100 border-amber-200 text-amber-900' },
              { layer: 'Dominio', detail: 'entidades + Value Objects (Money, TimeRange) + Factories + Zod', color: 'bg-emerald-100 border-emerald-200 text-emerald-900' },
              { layer: 'Infraestructura', detail: 'Prisma(SQLite→Postgres) · JWT · Storage · Email · PDF providers', color: 'bg-rose-100 border-rose-200 text-rose-900' },
            ].map((l) => (
              <div key={l.layer} className={`rounded-xl border p-3.5 ${l.color}`}>
                <p className="text-xs font-bold uppercase tracking-wider">{l.layer}</p>
                <p className="text-xs mt-1 font-mono opacity-80">{l.detail}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            Las dependencias apuntan hacia adentro: el dominio no conoce Prisma ni HTTP. Cambiar
            de motor de BD o de proveedor de email/PDF no toca el núcleo.
          </p>
        </div>

        <div className="bg-white rounded-2xl border p-5 sm:p-6">
          <h2 className="font-heading font-bold">Resolución multi-tenant</h2>
          <div className="mt-4 font-mono text-[11px] leading-relaxed bg-neutral-950 text-emerald-300 rounded-xl p-4 overflow-x-auto">
            <pre>{`URL pública (prod)          API (dev y prod)
──────────────────          ─────────────────────────────────
/demo  ─┐                   GET /api/demo/services
        │ resolve slug →    → where: { tenantId: ${'<tenant.id>'} }
        ▼ tenant.id         → paginación por cursor
 Tenant(slug='demo')         → metadata JSONB incluida
        │
        ├─ todo query filtra tenantId (estricto)
        └─ sesión admin trae tenantId del JWT`}</pre>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { slice: 'cart', detail: 'carrito por tenant, persistido' },
              { slice: 'auth', detail: 'sesión + rol + tenantId' },
              { slice: 'theme', detail: 'tema vivo (mutación sin recarga)' },
              { slice: 'ui', detail: 'vista, idioma, modales' },
            ].map((s) => (
              <div key={s.slice} className="rounded-xl border bg-muted/40 p-3">
                <p className="text-xs font-bold font-mono">use{s.slice}Store()</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rutas + estructura */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border p-5 sm:p-6">
          <h2 className="font-heading font-bold">Rutas (públicas / privadas)</h2>
          <ul className="mt-3 divide-y">
            {ROUTES.map((r) => (
              <li key={r.path} className="flex items-center gap-2.5 py-2">
                <Badge
                  variant="outline"
                  className={
                    r.kind === 'Pública'
                      ? 'border-emerald-200 text-emerald-700'
                      : r.kind === 'Privada'
                        ? 'border-amber-200 text-amber-700'
                        : 'border-rose-200 text-rose-700'
                  }
                >
                  {r.kind}
                </Badge>
                <code className="text-[11px] font-mono min-w-0 truncate">{r.path}</code>
                <span className="text-[11px] text-muted-foreground ml-auto hidden sm:block">{r.desc}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white rounded-2xl border p-5 sm:p-6">
          <h2 className="font-heading font-bold">Estructura de carpetas</h2>
          <pre className="mt-3 text-[10.5px] leading-relaxed font-mono bg-neutral-950 text-neutral-200 rounded-xl p-4 overflow-x-auto">
{FOLDER_TREE}
          </pre>
        </div>
      </section>
    </div>
  )
}

/** Wireframe: home pública (cajas grises + anotaciones). */
function WireframeHome() {
  return (
    <div className="min-w-[520px] p-4 space-y-2.5" aria-label="Wireframe home pública">
      <WBar label="Navbar: logo · Inicio Servicios Nosotros Horarios Ubicación Contacto · [Reservar CTA] [🛒]" />
      <div className="h-36 rounded-lg bg-neutral-200/80 border border-neutral-300 grid place-items-center relative">
        <WNote>HERO — imagen de fondo + título + subtítulo + CTA</WNote>
        <span className="absolute bottom-2 right-3 text-[10px] text-neutral-500">editable en Panel → Contenido → Hero</span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg bg-neutral-100 border border-neutral-300 p-2 space-y-1.5">
            <div className="h-14 rounded bg-neutral-200" />
            <div className="h-2 w-3/4 rounded bg-neutral-300" />
            <div className="h-2 w-1/2 rounded bg-neutral-200" />
            <div className="flex justify-between items-center pt-1">
              <span className="text-[10px] font-bold">$35</span>
              <span className="text-[9px] rounded-full bg-neutral-800 text-white px-2 py-0.5">Añadir</span>
            </div>
          </div>
        ))}
        <WNote className="col-span-3 -mt-1">Servicios — tarjetas con metadata dinámica + stepper de carrito</WNote>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="h-20 rounded-lg bg-neutral-100 border border-neutral-300 grid place-items-center"><WNote>Nosotros — equipo + stats</WNote></div>
        <div className="h-20 rounded-lg bg-neutral-100 border border-neutral-300 grid place-items-center"><WNote>Horarios (desde disponibilidad)</WNote></div>
        <div className="h-20 rounded-lg bg-neutral-100 border border-neutral-300 grid place-items-center"><WNote>Ubicación — mapa embebido</WNote></div>
        <div className="h-20 rounded-lg bg-neutral-100 border border-neutral-300 grid place-items-center"><WNote>Contacto + WhatsApp</WNote></div>
      </div>
      <WBar label="Footer — marca · enlaces · contacto · Powered by" dark />
    </div>
  )
}

function WireframeAdmin() {
  return (
    <div className="min-w-[520px] p-4" aria-label="Wireframe panel admin">
      <div className="rounded-lg border border-neutral-300 overflow-hidden">
        <div className="flex">
          <div className="w-40 bg-neutral-200/80 border-r border-neutral-300 p-2.5 space-y-1.5">
            <div className="h-2 w-24 rounded bg-neutral-400 mb-3" />
            {['Resumen', 'Citas', 'Pedidos', 'Servicios', 'Profesionales', 'Sedes', 'Contenido', 'Tema', 'Facturación', 'Config'].map((s, i) => (
              <div key={s} className={`h-5 rounded px-2 text-[10px] leading-5 ${i === 0 ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}>{s}</div>
            ))}
          </div>
          <div className="flex-1 bg-neutral-50 p-2.5 space-y-2.5">
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 rounded bg-neutral-100 border border-neutral-300 p-1.5">
                  <div className="h-1.5 w-2/3 rounded bg-neutral-300" />
                  <div className="h-2.5 w-1/2 rounded bg-neutral-400 mt-1" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-24 rounded bg-white border border-neutral-300 p-2">
                <WNote>Próximas citas (lista)</WNote>
              </div>
              <div className="h-24 rounded bg-white border border-neutral-300 p-2">
                <WNote>Pedidos recientes (virtual)</WNote>
              </div>
            </div>
            <WNote className="text-center">Cada sección = su propio componente + permisos por rol</WNote>
          </div>
        </div>
      </div>
    </div>
  )
}

function WireframeCalendar() {
  return (
    <div className="min-w-[520px] p-4" aria-label="Wireframe calendario">
      <div className="rounded-lg border border-neutral-300 overflow-hidden bg-white">
        <div className="flex items-center justify-between border-b border-neutral-300 px-3 py-2">
          <span className="text-[10px] font-bold">← Hoy →</span>
          <span className="text-[10px]">septiembre 2026</span>
          <div className="flex gap-1">
            {['MES', 'SEMANA', 'DÍA'].map((v, i) => (
              <span key={v} className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${i === 1 ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}>{v}</span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-8 text-[9px] text-neutral-400 border-b border-neutral-200 py-1 px-3">
          {['HORA', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map((d) => (
            <span key={d} className="text-center">{d}</span>
          ))}
        </div>
        {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'].map((h) => (
          <div key={h} className="grid grid-cols-8 border-b border-neutral-100 px-3 text-[9px]">
            <span className="text-neutral-400 py-1.5">{h}</span>
            {Array.from({ length: 7 }).map((_, i) => {
              const hasEvent = (i + Number(h.slice(0, 2))) % 3 === 0
              const blocked = (i + Number(h.slice(0, 2))) % 7 === 0
              return (
                <div key={i} className="border-l border-neutral-100 min-h-6 p-0.5">
                  {hasEvent && (
                    <span className={`block rounded px-1 py-0.5 truncate ${blocked ? 'bg-neutral-300 text-neutral-600' : 'bg-emerald-100 text-emerald-800'}`}>
                      {blocked ? '⛔ bloqueo' : '🦷 Limpieza'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <WNote className="mt-2">Citas cargadas por rango visible (from/to) · click en evento → confirmar / cancelar</WNote>
    </div>
  )
}

function WBar({ label, dark }: { label: string; dark?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2 text-[10px] font-medium ${dark ? 'bg-neutral-900 text-neutral-300' : 'bg-neutral-200 border border-neutral-300 text-neutral-600'}`}>
      {label}
    </div>
  )
}

function WNote({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[10px] text-neutral-500 ${className}`}>{children}</p>
}
