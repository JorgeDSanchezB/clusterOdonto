'use client'

/**
 * FASE 3 — Contratos API: explorador filtrable con "Try it" REAL
 * (los GET públicos se ejecutan contra la API en vivo).
 */
import { useMemo, useState, Fragment } from 'react'
import { Loader2, Lock, Play, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth'
import { useUiStore } from '@/store/ui'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface EndpointDef {
  method: Method
  path: string
  scope: 'Público' | 'Admin' | 'Super'
  desc: string
  query?: string
  body?: string
  safeToTry?: boolean
}

const ENDPOINTS: EndpointDef[] = [
  { method: 'GET', path: '/api/[slug]/content', scope: 'Público', desc: 'Contenido editable por secciones', safeToTry: true },
  { method: 'GET', path: '/api/[slug]/tenant', scope: 'Público', desc: 'Info del tenant: tema, contacto, horarios', safeToTry: true },
  { method: 'GET', path: '/api/[slug]/services', scope: 'Público', desc: 'Catálogo con paginación por cursor', query: 'limit=12&cursor=&active=true', safeToTry: true },
  { method: 'GET', path: '/api/[slug]/professionals', scope: 'Público', desc: 'Profesionales activos', safeToTry: true },
  { method: 'GET', path: '/api/[slug]/locations', scope: 'Público', desc: 'Sedes del consultorio', safeToTry: true },
  { method: 'GET', path: '/api/[slug]/availability', scope: 'Público', desc: 'Slots disponibles para un servicio/fecha', query: 'serviceId=&professionalId=&date=YYYY-MM-DD', safeToTry: true },
  { method: 'POST', path: '/api/[slug]/appointments', scope: 'Público', desc: 'Crear reserva (revalida todo server-side)', body: '{ "serviceId": "uuid", "professionalId": "uuid", "locationId": "uuid|null", "date": "YYYY-MM-DD", "startMinute": 600, "patientName": "…", "patientPhone": "099…", "patientEmail": "…", "notes": "…" }' },
  { method: 'GET', path: '/api/[slug]/appointments/[id]', scope: 'Público', desc: 'Vista previa de la reserva (con token)', query: 'token=<cancelToken>' },
  { method: 'POST', path: '/api/[slug]/appointments/[id]/cancel', scope: 'Público', desc: 'Cancelar reserva por el paciente', query: 'token=<cancelToken>', body: '(sin body)' },
  { method: 'POST', path: '/api/[slug]/orders', scope: 'Público', desc: 'Pedido del carrito → bandeja + URL WhatsApp', body: '{ "customerName": "…", "customerPhone": "099…", "items": [{ "serviceId": "uuid", "qty": 2 }] }' },
  { method: 'POST', path: '/api/admin/auth/login', scope: 'Admin', desc: 'Login (set-cookie JWT httpOnly)', body: '{ "email": "admin@demo.com", "password": "demo1234" }', safeToTry: true },
  { method: 'GET', path: '/api/admin/auth/me', scope: 'Admin', desc: 'Usuario actual + nombre del tenant', safeToTry: true },
  { method: 'POST', path: '/api/admin/auth/logout', scope: 'Admin', desc: 'Cierra la sesión', body: '(sin body)' },
  { method: 'GET', path: '/api/admin/overview', scope: 'Admin', desc: 'Métricas del dashboard', safeToTry: true },
  { method: 'GET', path: '/api/admin/content', scope: 'Admin', desc: 'Contenido por secciones (editor)', safeToTry: true },
  { method: 'PUT', path: '/api/admin/content/[section]', scope: 'Admin', desc: 'Guardar sección (hero, about, …o futuras)', body: '{ …data JSONB de la sección… }' },
  { method: 'GET', path: '/api/admin/services', scope: 'Admin', desc: 'Listado con cursor (incluye inactivos)', query: 'limit=&cursor=', safeToTry: true },
  { method: 'POST', path: '/api/admin/services', scope: 'Admin', desc: 'Crear servicio — passthrough → metadata', body: '{ "name": "Ortodoncia invisible", "price": 1800, "durationMin": 40, "alineadores": 20, "duracion_meses": 18, "requiere_escaneo_3d": true }' },
  { method: 'PUT', path: '/api/admin/services/[id]', scope: 'Admin', desc: 'Actualizar (merge de metadata)', body: '{ "price": 1900, "metadata": { "sesiones": 3 } }' },
  { method: 'DELETE', path: '/api/admin/services/[id]', scope: 'Admin', desc: 'Eliminar servicio', body: '(sin body)' },
  { method: 'GET', path: '/api/admin/professionals', scope: 'Admin', desc: 'Equipo + disponibilidad', query: 'limit=&cursor=&active=', safeToTry: true },
  { method: 'POST', path: '/api/admin/professionals', scope: 'Admin', desc: 'Crear profesional (con availability)', body: '{ "name": "Dra. X", "specialty": "…", "availability": [{ "weekday": 1, "startMinute": 540, "endMinute": 1080 }] }' },
  { method: 'GET', path: '/api/admin/locations', scope: 'Admin', desc: 'Sedes', safeToTry: true },
  { method: 'GET', path: '/api/admin/availability', scope: 'Admin', desc: 'Ventanas horarias', query: 'professionalId=', safeToTry: true },
  { method: 'GET', path: '/api/admin/appointments', scope: 'Admin', desc: 'Citas por rango visible + cursor', query: 'from=&to=&professionalId=&status=&cursor=&limit=', safeToTry: true },
  { method: 'POST', path: '/api/admin/appointments', scope: 'Admin', desc: 'Cita manual (queda confirmada)', body: '{ …como la pública + status }' },
  { method: 'POST', path: '/api/admin/appointments/block', scope: 'Admin', desc: 'Bloqueo manual de agenda', body: '{ "professionalId": "uuid", "date": "YYYY-MM-DD", "startMinute": 780, "endMinute": 840, "reason": "Almuerzo" }' },
  { method: 'POST', path: '/api/admin/appointments/[id]/cancel', scope: 'Admin', desc: 'Cancelar (libera slot)', body: '(sin body)' },
  { method: 'POST', path: '/api/admin/appointments/[id]/confirm', scope: 'Admin', desc: 'PENDING → CONFIRMED', body: '(sin body)' },
  { method: 'GET', path: '/api/admin/orders', scope: 'Admin', desc: 'Bandeja de pedidos con cursor', query: 'limit=&cursor=&status=', safeToTry: true },
  { method: 'PUT', path: '/api/admin/orders/[id]', scope: 'Admin', desc: 'Cambiar estado del pedido', body: '{ "status": "CONTACTED" }' },
  { method: 'GET', path: '/api/admin/invoices', scope: 'Admin', desc: 'Facturas con cursor', safeToTry: true },
  { method: 'POST', path: '/api/admin/invoices', scope: 'Admin', desc: 'Generar factura desde un Order (secuencial atómico)', body: '{ "orderId": "uuid" }' },
  { method: 'GET', path: '/api/admin/invoices/[id]/pdf', scope: 'Admin', desc: 'PDF de la factura (LocalPdfInvoiceProvider)' },
  { method: 'POST', path: '/api/admin/invoices/[id]/send-email', scope: 'Admin', desc: 'Enviar por email (ConsoleEmailProvider)', body: '(sin body)' },
  { method: 'GET', path: '/api/admin/tenant', scope: 'Admin', desc: 'Perfil + config + tema', safeToTry: true },
  { method: 'PUT', path: '/api/admin/tenant', scope: 'Admin', desc: 'Actualizar perfil/config (merge profundo)', body: '{ "name": "…", "ivaPercent": 15, "config": { "slotStepMinutes": 30, "theme": { … } } }' },
  { method: 'POST', path: '/api/admin/upload', scope: 'Admin', desc: 'Subida de imágenes (multipart/form-data)', body: 'form-data: file=@imagen.jpg, folder=services' },
  { method: 'GET', path: '/api/super-admin/tenants', scope: 'Super', desc: 'Listar tenants del SaaS', safeToTry: true },
  { method: 'POST', path: '/api/super-admin/tenants', scope: 'Super', desc: 'Crear odontólogo (tenant + OWNER)', body: '{ "slug": "aurora", "name": "Clínica Aurora", "ownerName": "Dra. Ríos", "ownerEmail": "…", "ownerPassword": "…" }' },
]

const METHOD_COLOR: Record<Method, string> = {
  GET: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  POST: 'bg-amber-100 text-amber-700 border-amber-200',
  PUT: 'bg-sky-100 text-sky-700 border-sky-200',
  DELETE: 'bg-rose-100 text-rose-700 border-rose-200',
}

export default function Phase3Api() {
  const [filter, setFilter] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [response, setResponse] = useState<{ path: string; status: number; body: string; ms: number } | null>(null)
  const [trying, setTrying] = useState<string | null>(null)
  const session = useAuthStore((s) => s.session)
  const setView = useUiStore((s) => s.setView)

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return ENDPOINTS
    return ENDPOINTS.filter((e) => `${e.method} ${e.path} ${e.desc} ${e.scope}`.toLowerCase().includes(q))
  }, [filter])

  const tryIt = async (ep: EndpointDef) => {
    setTrying(ep.path + ep.method)
    const url = ep.path.replace('[slug]', 'demo').replace('[id]', '00000000-0000-0000-0000-000000000000')
    const started = performance.now()
    try {
      let res: Response
      if (ep.method === 'GET') {
        res = await fetch(url)
      } else if (ep.path.includes('/invoices/') && ep.method === 'GET') {
        res = await fetch(url)
      } else {
        // POST/PUT de demo: solo login (sin efectos secundarios)
        if (ep.path.includes('login')) {
          res = await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: 'admin@demo.com', password: 'demo1234' }),
          })
        } else {
          setResponse({
            path: `${ep.method} ${ep.path}`,
            status: 0,
            body: 'Operación con efectos secundarios: ejecútala desde el panel admin (más seguro y auditado). Aquí solo se documenta el contrato.',
            ms: 0,
          })
          return
        }
      }
      const text = await res.text()
      let pretty = text
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2)
      } catch {
        /* respuesta no JSON */
      }
      setResponse({ path: `${ep.method} ${ep.path}`, status: res.status, body: pretty, ms: Math.round(performance.now() - started) })
    } catch (err) {
      setResponse({ path: `${ep.method} ${ep.path}`, status: 0, body: String(err), ms: Math.round(performance.now() - started) })
    } finally {
      setTrying(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border p-5 sm:p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-heading font-bold">Contratos API ({ENDPOINTS.length} endpoints)</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Todos los GET de listas aceptan <code className="font-mono">?limit=&cursor=</code>.</p>
          </div>
          <div className="relative">
            <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input className="pl-8 w-64" placeholder="Filtrar (ruta, método, scope…)" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border max-h-[32rem] overflow-y-auto nice-scroll">
          <table className="w-full text-xs min-w-[680px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted/90 backdrop-blur text-left">
                <th className="px-3 py-2.5 font-bold uppercase tracking-wide text-[10px] w-20">Método</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wide text-[10px]">Ruta</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wide text-[10px]">Scope</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wide text-[10px] hidden md:table-cell">Descripción</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wide text-[10px] w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y bg-white">
              {filtered.map((ep) => {
                const key = `${ep.method}-${ep.path}`
                const isOpen = expanded === key
                const needsAuth = ep.scope !== 'Público'
                return (
                  <Fragment key={key}>
                    <tr
                      key={key}
                      className={`cursor-pointer hover:bg-muted/40 transition-colors ${isOpen ? 'bg-muted/40' : ''}`}
                      onClick={() => setExpanded(isOpen ? null : key)}
                    >
                      <td className="px-3 py-2.5">
                        <span className={`inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${METHOD_COLOR[ep.method]}`}>{ep.method}</span>
                      </td>
                      <td className="px-3 py-2.5 font-mono">{ep.path}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] text-muted-foreground">{ep.scope}</span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">{ep.desc}</td>
                      <td className="px-3 py-2.5 text-right">
                        {needsAuth && !session && <Lock className="size-3.5 inline text-neutral-300" aria-label="Requiere sesión" />}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${key}-detail`} className="bg-neutral-50">
                        <td colSpan={5} className="px-4 py-4 space-y-3">
                          <div className="grid gap-3 md:grid-cols-2">
                            {ep.query && (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Query params</p>
                                <code className="mt-1 block font-mono text-[11px] bg-white border rounded-lg p-2.5">{ep.query}</code>
                              </div>
                            )}
                            {ep.body && (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Body (Zod validado)</p>
                                <code className="mt-1 block font-mono text-[11px] bg-white border rounded-lg p-2.5 whitespace-pre-wrap">{ep.body}</code>
                              </div>
                            )}
                            {!ep.query && !ep.body && <p className="text-[11px] text-muted-foreground">Sin parámetros.</p>}
                          </div>
                          {ep.safeToTry && (
                            <Button
                              size="sm"
                              className="rounded-full t-btn-primary font-semibold"
                              disabled={trying === key}
                              onClick={(e) => {
                                e.stopPropagation()
                                void tryIt(ep)
                              }}
                            >
                              {trying === key ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" aria-hidden />} Try it (real)
                            </Button>
                          )}
                          {needsAuth && !session && (
                            <p className="text-[11px] text-muted-foreground">
                              Requiere sesión admin —{' '}
                              <button className="underline font-medium" onClick={() => setView('admin')}>
                                ingresa con las credenciales demo
                              </button>{' '}
                              y vuelve.
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground">
                            Errores: <code className="font-mono">400 VALIDATION_ERROR</code> · <code className="font-mono">401/403</code> auth · <code className="font-mono">404 NOT_FOUND</code> · <code className="font-mono">409 conflicto</code> · sobre <code className="font-mono">{'{ error: { code, message, details } }'}</code>
                          </p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Sin resultados para “{filter}”.</p>}
      </div>

      {response && (
        <div className="bg-white rounded-2xl border p-5 sm:p-6">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-heading font-bold text-sm">Respuesta</h3>
            <Badge variant="outline" className="font-mono">
              {response.path}
            </Badge>
            {response.status > 0 && (
              <Badge variant={response.status < 300 ? 'default' : 'destructive'} className="font-mono">
                {response.status}
              </Badge>
            )}
            {response.ms > 0 && <span className="text-[11px] text-muted-foreground">{response.ms} ms</span>}
            <button className="ml-auto text-xs text-muted-foreground hover:text-foreground" onClick={() => setResponse(null)}>
              cerrar ✕
            </button>
          </div>
          <pre className="mt-3 max-h-80 overflow-auto nice-scroll rounded-xl bg-neutral-950 text-emerald-300 p-4 text-[11px] font-mono leading-relaxed">
            {response.body}
          </pre>
        </div>
      )}
    </div>
  )
}
