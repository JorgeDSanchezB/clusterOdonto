'use client'

/** FASE 2 — Modelo de datos: diagrama ER + tabla real de servicios con metadata. */
import { useQuery } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api-client'

const ENTITIES: { name: string; color: string; fields: string[]; rel: string }[] = [
  { name: 'Tenant', color: 'border-amber-300 bg-amber-50', fields: ['id UUID PK', 'slug UNIQUE', 'name', 'ruc', 'address', 'phone', 'whatsapp', 'ivaPercent 15', 'config JSONB*'], rel: '1 → N de casi todo' },
  { name: 'User', color: 'border-violet-300 bg-violet-50', fields: ['id UUID PK', 'email UNIQUE', 'passwordHash', 'role: OWNER|STAFF|SUPER_ADMIN', 'tenantId FK'], rel: 'N → 1 Tenant' },
  { name: 'Professional', color: 'border-emerald-300 bg-emerald-50', fields: ['id UUID PK', 'tenantId FK', 'locationId FK?', 'name', 'specialty', 'photoUrl', 'active'], rel: 'N → 1 Tenant · 1 → N Availability' },
  { name: 'Location', color: 'border-emerald-300 bg-emerald-50', fields: ['id UUID PK', 'tenantId FK', 'name', 'address', 'lat / lng', 'mapQuery', 'active'], rel: 'N → 1 Tenant' },
  { name: 'Availability', color: 'border-sky-300 bg-sky-50', fields: ['id UUID PK', 'professionalId FK', 'weekday 0–6', 'startMinute 540', 'endMinute 1080'], rel: 'N → 1 Professional' },
  { name: 'Service', color: 'border-rose-300 bg-rose-50', fields: ['id UUID PK', 'tenantId FK', 'name', 'price', 'durationMin', 'imageUrl', 'active', '★ metadata JSONB*'], rel: 'N → 1 Tenant · 1 → N Appointment' },
  { name: 'Appointment', color: 'border-rose-300 bg-rose-50', fields: ['id UUID PK', 'tenantId FK', 'patientName/Phone/Email', 'serviceId FK?', 'professionalId FK', 'start / end (UTC)', 'status: PENDING|CONFIRMED|CANCELLED|BLOCKED', 'cancelToken UNIQUE', 'metadata JSONB*'], rel: 'N → 1 Service · N → 1 Professional' },
  { name: 'Order', color: 'border-neutral-300 bg-neutral-50', fields: ['id UUID PK', 'tenantId FK', 'customerName/Phone', 'items JSONB* (snapshot)', 'total', 'status: NEW|CONTACTED|…', 'whatsappSentAt'], rel: 'N → 1 Tenant · 1 → N Invoice' },
  { name: 'Invoice', color: 'border-neutral-300 bg-neutral-50', fields: ['id UUID PK', 'tenantId FK', 'orderId FK?', 'number "001-001-000000123"', 'subtotal / ivaRate / total', 'items JSONB* (snapshot)', 'emailSentAt'], rel: 'N → 1 Order · secuencial vía Sequence' },
  { name: 'Sequence', color: 'border-neutral-300 bg-neutral-50', fields: ['id UUID PK', 'tenantId FK', 'prefix "001-001"', 'lastNumber (↑ atómico)'], rel: 'UNIQUE(tenantId, prefix)' },
  { name: 'SiteContent', color: 'border-sky-300 bg-sky-50', fields: ['id UUID PK', 'tenantId FK', 'section: hero|about|…', 'data JSONB*'], rel: 'UNIQUE(tenantId, section) — secciones futuras sin migrar' },
]

interface ServiceRow {
  id: string
  name: string
  price: number
  durationMin: number
  metadata: Record<string, unknown>
}

export default function Phase2Data() {
  const { data: services } = useQuery({
    queryKey: ['phase2-services'],
    queryFn: () => api<ServiceRow[]>('/api/demo/services?limit=8'),
  })

  return (
    <div className="space-y-8">
      <section className="bg-white rounded-2xl border p-5 sm:p-6">
        <header>
          <h2 className="font-heading font-bold">Diagrama Entidad–Relación</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            <code className="font-mono">JSONB*</code> = en PostgreSQL es JSONB real; en dev SQLite se guarda como
            String JSON (mismo dominio, cero cambios de código).
          </p>
        </header>
        <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ENTITIES.map((e) => (
            <div key={e.name} className={`rounded-xl border-2 ${e.color} p-3.5`}>
              <div className="flex items-center justify-between">
                <p className="font-heading font-bold text-sm">{e.name}</p>
                <KeyRound className="size-3.5 text-neutral-400" aria-hidden />
              </div>
              <ul className="mt-2 space-y-1">
                {e.fields.map((f) => (
                  <li key={f} className={`text-[10.5px] font-mono leading-tight ${f.includes('★') ? 'font-bold' : ''} ${f.startsWith('id') ? 'text-neutral-900' : 'text-neutral-600'}`}>
                    {f}
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-[10px] text-neutral-500 border-t border-dashed pt-2">{e.rel}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl border p-5 sm:p-6">
        <header className="flex items-center gap-2 flex-wrap">
          <h2 className="font-heading font-bold">Tabla Service con <code className="font-mono text-sm">metadata</code> real</h2>
          <Badge variant="secondary" className="ml-auto">datos en vivo de /api/demo/services</Badge>
        </header>
        <p className="text-xs text-muted-foreground mt-1">
          Fíjate cómo cada servicio tiene atributos DISTINTOS: eso es la regla del “Servicio” en acción.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr className="bg-muted/60 text-left">
                <th className="px-3 py-2.5 font-bold uppercase tracking-wide text-[10px]">Servicio</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wide text-[10px]">Precio</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wide text-[10px]">Duración</th>
                <th className="px-3 py-2.5 font-bold uppercase tracking-wide text-[10px] w-1/2">metadata (JSONB)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(services ?? []).map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2.5 font-semibold">{s.name}</td>
                  <td className="px-3 py-2.5 tabular-nums">${s.price.toFixed(2)}</td>
                  <td className="px-3 py-2.5">{s.durationMin} min</td>
                  <td className="px-3 py-2.5">
                    {Object.keys(s.metadata).length === 0 ? (
                      <span className="text-muted-foreground">{'{}'}</span>
                    ) : (
                      <code className="font-mono text-[10.5px] leading-relaxed whitespace-pre-wrap break-all">
                        {JSON.stringify(s.metadata, null, 0)}
                      </code>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 rounded-xl border border-dashed bg-muted/40 p-4 text-xs text-muted-foreground leading-relaxed">
          <strong className="text-neutral-700">Numeración de factura:</strong> tabla <code className="font-mono">Sequence</code> con{' '}
          <code className="font-mono">UNIQUE(tenantId, prefix)</code> y <code className="font-mono">lastNumber</code> incrementado
          dentro de una transacción atómica → formato <code className="font-mono">001-001-000000123</code> sin huecos por
          concurrencia. Cada tenant tiene su propio contador.
        </div>
      </section>
    </div>
  )
}
