'use client'

/** ADMIN — Configuración del consultorio: perfil, IVA, agenda y facturación. */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Save, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api, apiErrMessage } from '@/lib/api-client'

interface TenantAdmin {
  id: string
  slug: string
  name: string
  ruc: string | null
  address: string | null
  city: string | null
  phone: string | null
  email: string | null
  whatsapp: string | null
  ivaPercent: number
  logoUrl: string | null
  config: {
    slotStepMinutes: number
    minLeadMinutes: number
    maxAdvanceDays: number
    invoicePrefix: string
  }
}

export function SettingsView() {
  const { data: tenant, isLoading } = useQuery({
    queryKey: ['admin-tenant'],
    queryFn: () => api<TenantAdmin | null>('/api/admin/tenant'),
  })

  if (isLoading) {
    return (
      <div className="py-16 grid place-items-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    )
  }
  if (!tenant) return <p className="text-sm text-muted-foreground">Sin tenant asociado a tu usuario.</p>

  // Remount con key cuando los datos del servidor cambian → el formulario se
  // reinicializa con lo guardado (sin efectos de sincronización).
  return <SettingsForm key={JSON.stringify(tenant)} tenant={tenant} />
}

function SettingsForm({ tenant }: { tenant: TenantAdmin }) {
  const queryClient = useQueryClient()
  const [f, setF] = useState<TenantAdmin>(tenant)

  const mutation = useMutation({
    mutationFn: () =>
      api('/api/admin/tenant', {
        method: 'PUT',
        body: JSON.stringify({
          name: f?.name,
          ruc: f?.ruc || null,
          address: f?.address || null,
          city: f?.city || null,
          phone: f?.phone || null,
          email: f?.email || null,
          whatsapp: f?.whatsapp || null,
          ivaPercent: Number(f?.ivaPercent ?? 15),
          config: tenant?.config
            ? {
                ...tenant.config,
                slotStepMinutes: Number(f.config.slotStepMinutes),
                minLeadMinutes: Number(f.config.minLeadMinutes),
                maxAdvanceDays: Number(f.config.maxAdvanceDays),
                invoicePrefix: f.config.invoicePrefix,
              }
            : undefined,
        }),
      }),
    onSuccess: () => {
      toast.success('Configuración guardada')
      void queryClient.invalidateQueries({ queryKey: ['admin-tenant'] })
      void queryClient.invalidateQueries({ queryKey: ['public-tenant'] })
    },
    onError: (e) => toast.error(apiErrMessage(e)),
  })

  return (
    <form
      className="grid lg:grid-cols-2 gap-6 items-start"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
    >
      <div className="bg-white rounded-2xl border p-5 sm:p-6 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Settings2 className="size-4 t-text-primary" aria-hidden /> Datos del consultorio
        </h3>
        <Field label="Nombre comercial">
          <Input value={f.name} onChange={(e) => setF((p) => p && { ...p, name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="RUC">
            <Input value={f.ruc ?? ''} onChange={(e) => setF((p) => p && { ...p, ruc: e.target.value })} placeholder="1791234567001" />
          </Field>
          <Field label="IVA (%)">
            <Input type="number" min="0" max="100" value={f.ivaPercent} onChange={(e) => setF((p) => p && { ...p, ivaPercent: Number(e.target.value) })} />
          </Field>
          <Field label="Ciudad">
            <Input value={f.city ?? ''} onChange={(e) => setF((p) => p && { ...p, city: e.target.value })} />
          </Field>
          <Field label="Teléfono">
            <Input value={f.phone ?? ''} onChange={(e) => setF((p) => p && { ...p, phone: e.target.value })} />
          </Field>
          <Field label="WhatsApp (solo dígitos con país)">
            <Input value={f.whatsapp ?? ''} onChange={(e) => setF((p) => p && { ...p, whatsapp: e.target.value })} placeholder="593991234567" />
          </Field>
          <Field label="Email">
            <Input value={f.email ?? ''} onChange={(e) => setF((p) => p && { ...p, email: e.target.value })} />
          </Field>
        </div>
        <Field label="Dirección">
          <Input value={f.address ?? ''} onChange={(e) => setF((p) => p && { ...p, address: e.target.value })} />
        </Field>
      </div>

      <div className="bg-white rounded-2xl border p-5 sm:p-6 space-y-4">
        <h3 className="text-sm font-semibold">Agenda y facturación</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Paso entre slots (min)">
            <Input type="number" min="5" max="120" step="5" value={f.config.slotStepMinutes} onChange={(e) => setF((p) => p && { ...p, config: { ...p.config, slotStepMinutes: Number(e.target.value) } })} />
          </Field>
          <Field label="Anticipo mínimo (min)">
            <Input type="number" min="0" max="1440" step="10" value={f.config.minLeadMinutes} onChange={(e) => setF((p) => p && { ...p, config: { ...p.config, minLeadMinutes: Number(e.target.value) } })} />
          </Field>
          <Field label="Máx. días de anticipación">
            <Input type="number" min="1" max="365" value={f.config.maxAdvanceDays} onChange={(e) => setF((p) => p && { ...p, config: { ...p.config, maxAdvanceDays: Number(e.target.value) } })} />
          </Field>
          <Field label="Prefijo de factura">
            <Input value={f.config.invoicePrefix} onChange={(e) => setF((p) => p && { ...p, config: { ...p.config, invoicePrefix: e.target.value } })} placeholder="001-001" />
          </Field>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          El prefijo + el secuencial atómico (tabla <code className="font-mono">Sequence</code>) forman el número de
          factura: <code className="font-mono">{f.config.invoicePrefix}-000000123</code>.
        </p>
        <Button type="submit" className="t-btn-primary rounded-full font-semibold w-full" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" aria-hidden />} Guardar configuración
        </Button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  )
}
