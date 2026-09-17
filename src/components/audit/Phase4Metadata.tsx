'use client'

/**
 * FASE 4 — Laboratorio de inserción extensible (la "regla del Servicio").
 * Escribe el caso real: "Ortodoncia invisible" con atributos NUEVOS y míralo
 * renderizarse en la ServiceCard sin tocar el núcleo. Opcional: insertarlo
 * de verdad en la BD del tenant demo (requiere sesión admin).
 */
import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, Database, Loader2, Plus, Sparkles, Wand2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { api, apiErrMessage } from '@/lib/api-client'
import { ServiceCard } from '@/components/public-site/ServiceCard'
import { useAuthStore } from '@/store/auth'
import { useUiStore } from '@/store/ui'

const EXAMPLE = {
  name: 'Ortodoncia invisible',
  description: 'Alineadores transparentes removibles, con seguimiento digital mensual.',
  price: 1800,
  durationMin: 40,
  alineadores: 20,
  duracion_meses: 18,
  requiere_escaneo_3d: true,
}

function parseValue(raw: string): string | number | boolean {
  const v = raw.trim()
  if (/^(true|verdadero)$/i.test(v)) return true
  if (/^(false|falso)$/i.test(v)) return false
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v)
  return v
}

const STEPS = [
  { n: 1, title: 'POST /api/admin/services', detail: 'El JSON llega con claves desconocidas junto a las conocidas.' },
  { n: 2, title: 'Zod .passthrough()', detail: 'El esquema valida los campos base y DEJA PASAR las claves extra (alineadores, duracion_meses…).' },
  { n: 3, title: 'ServiceFactory.create()', detail: 'El factory consolida las claves extra dentro de metadata: {...extras}.' },
  { n: 4, title: 'Prisma → Service.metadata', detail: 'Se persiste como JSONB (Postgres) / String JSON (SQLite dev). Misma entidad de dominio.' },
  { n: 5, title: 'ServiceCard dinámica', detail: 'La tarjeta lee Object.entries(metadata) y pinta chips con iconos heurísticos; claves desconocidas → icono por defecto.' },
  { n: 6, title: 'Cero cambios de código', detail: 'No se modificó UNA línea del núcleo. Solo se insertó data. (Appointment, Tenant y SiteContent usan el mismo patrón.)' },
]

export default function Phase4Metadata() {
  const session = useAuthStore((s) => s.session)
  const setView = useUiStore((s) => s.setView)
  const [base, setBase] = useState({ name: EXAMPLE.name, description: EXAMPLE.description, price: String(EXAMPLE.price), durationMin: String(EXAMPLE.durationMin) })
  const [kv, setKv] = useState<{ key: string; value: string }[]>([
    { key: 'alineadores', value: '20' },
    { key: 'duracion_meses', value: '18' },
    { key: 'requiere_escaneo_3d', value: 'true' },
  ])

  const metadata = useMemo(() => {
    const m: Record<string, unknown> = {}
    for (const { key, value } of kv) {
      if (key.trim() && value.trim()) m[key.trim()] = parseValue(value)
    }
    return m
  }, [kv])

  const previewService = useMemo(
    () => ({
      id: 'lab-preview',
      name: base.name || 'Servicio nuevo',
      description: base.description || null,
      price: Number(base.price) || 0,
      durationMin: Number(base.durationMin) || 30,
      imageUrl: null as string | null,
      metadata,
      active: true,
      sortOrder: 0,
    }),
    [base, metadata],
  )

  const insertMutation = useMutation({
    mutationFn: async () => {
      const extras: Record<string, unknown> = { ...metadata }
      return api('/api/admin/services', {
        method: 'POST',
        body: JSON.stringify({
          name: base.name,
          description: base.description || null,
          price: Number(base.price) || 0,
          durationMin: Number(base.durationMin) || 30,
          ...extras,
        }),
      })
    },
    onSuccess: (svc) => {
      toast.success('Servicio insertado de verdad', {
        description: `${(svc as { name: string }).name} ya está en el catálogo del tenant demo (mira Panel → Servicios y la web pública).`,
      })
    },
    onError: (e) => toast.error(apiErrMessage(e)),
  })

  return (
    <div className="space-y-8">
      {/* Explicación */}
      <section className="bg-white rounded-2xl border p-5 sm:p-6">
        <h2 className="font-heading font-bold">Cómo nace “Ortodoncia invisible” sin recompilar</h2>
        <ol className="mt-4 grid md:grid-cols-3 gap-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-xl border bg-muted/40 p-3.5">
              <span className="grid place-items-center size-6 rounded-full t-bg-primary text-white text-xs font-bold">{s.n}</span>
              <p className="font-mono text-[11px] font-bold mt-2">{s.title}</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{s.detail}</p>
            </li>
          ))}
        </ol>
        <div className="mt-4 grid gap-2 text-[11px] text-muted-foreground">
          <p>
            <strong className="text-neutral-700">Mismo patrón en:</strong>{' '}
            <code className="font-mono">Appointment.metadata</code> (atributos futuros de la cita),{' '}
            <code className="font-mono">Tenant.config</code> (nuevas opciones de tema/agenda) y{' '}
            <code className="font-mono">SiteContent</code> (secciones nuevas del editor sin migrar schema).
          </p>
        </div>
      </section>

      {/* Laboratorio */}
      <section className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="bg-white rounded-2xl border p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold flex items-center gap-2">
              <Wand2 className="size-4 t-text-primary" aria-hidden /> Laboratorio en vivo
            </h3>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={() => {
                setBase({ name: EXAMPLE.name, description: EXAMPLE.description, price: String(EXAMPLE.price), durationMin: String(EXAMPLE.durationMin) })
                setKv([
                  { key: 'alineadores', value: '20' },
                  { key: 'duracion_meses', value: '18' },
                  { key: 'requiere_escaneo_3d', value: 'true' },
                ])
              }}
            >
              Restaurar ejemplo
            </Button>
          </div>

          <div>
            <Label className="text-xs">Nombre</Label>
            <Input className="mt-1" value={base.name} onChange={(e) => setBase((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Descripción</Label>
            <Input className="mt-1" value={base.description} onChange={(e) => setBase((p) => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Precio (USD)</Label>
              <Input className="mt-1" type="number" value={base.price} onChange={(e) => setBase((p) => ({ ...p, price: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Duración (min)</Label>
              <Input className="mt-1" type="number" value={base.durationMin} onChange={(e) => setBase((p) => ({ ...p, durationMin: e.target.value }))} />
            </div>
          </div>

          <div className="rounded-xl border border-dashed p-3.5 space-y-2.5">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="size-3.5 t-text-primary" aria-hidden /> Atributos NUEVOS (no existen en el schema)
            </p>
            {kv.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input className="flex-1 h-9 font-mono text-xs" placeholder="clave" value={row.key} onChange={(e) => setKv((rows) => rows.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)))} />
                <span className="text-muted-foreground text-xs">:</span>
                <Input className="flex-1 h-9 font-mono text-xs" placeholder="20 · true · texto" value={row.value} onChange={(e) => setKv((rows) => rows.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))} />
                <button className="text-neutral-300 hover:text-destructive" onClick={() => setKv((rows) => rows.filter((_, j) => j !== i))} aria-label="Quitar">
                  <X className="size-4" />
                </button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => setKv((rows) => [...rows, { key: '', value: '' }])}>
              <Plus className="size-3.5" aria-hidden /> Añadir par clave-valor
            </Button>
            <p className="text-[10px] text-muted-foreground font-mono bg-muted/60 rounded-lg p-2">
              metadata = {JSON.stringify(metadata)}
            </p>
          </div>

          {session ? (
            <Button className="w-full t-btn-primary rounded-full font-semibold" disabled={!base.name || insertMutation.isPending} onClick={() => insertMutation.mutate()}>
              {insertMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" aria-hidden />}
              Insertar de verdad (POST /api/admin/services)
            </Button>
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/40 p-3.5 text-xs text-muted-foreground">
              Sesión admin requerida para insertar en la BD —{' '}
              <button className="underline font-semibold text-foreground" onClick={() => setView('admin')}>
                Ingresar con admin@demo.com
              </button>{' '}
              y vuelve a este laboratorio.
            </div>
          )}
        </div>

        {/* Resultado */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ArrowRight className="size-3.5" aria-hidden /> La ServiceCard se adapta sola (iconos por heurística)
          </p>
          <div className="max-w-sm">
            <ServiceCard service={previewService} static />
          </div>
          <div className="rounded-xl border bg-white p-4 max-w-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Payload que se enviaría</p>
            <pre className="mt-2 text-[10.5px] font-mono text-neutral-700 whitespace-pre-wrap leading-relaxed">
              {JSON.stringify({ ...base, price: Number(base.price) || 0, durationMin: Number(base.durationMin) || 30, ...metadata }, null, 2)}
            </pre>
            <Badge variant="secondary" className="mt-2 font-mono text-[10px]">claves extra → metadata JSONB</Badge>
          </div>
        </div>
      </section>
    </div>
  )
}
