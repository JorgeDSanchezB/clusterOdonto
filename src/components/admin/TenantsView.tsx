'use client'

/** SUPER-ADMIN — Gestión de tenants (odontólogos) del SaaS. */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Loader2, Plus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api, apiErrMessage } from '@/lib/api-client'
import { formatQuitoDateShort } from '@/lib/quito-time'
import { useUiStore } from '@/store/ui'

interface TenantListRow {
  id: string
  slug: string
  name: string
  createdAt: string
  users: { email: string; role: string; name: string | null }[]
  _count: { services: number; appointments: number; orders: number }
}

export function TenantsView() {
  const queryClient = useQueryClient()
  const setSiteSlug = useUiStore((s) => s.setSiteSlug)
  const setView = useUiStore((s) => s.setView)
  const [creating, setCreating] = useState(false)

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['super-tenants'],
    queryFn: () => api<TenantListRow[]>('/api/super-admin/tenants'),
  })

  const createMutation = useMutation({
    mutationFn: (payload: {
      slug: string
      name: string
      ownerName: string
      ownerEmail: string
      ownerPassword: string
    }) => api('/api/super-admin/tenants', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: (res) => {
      toast.success('Odontólogo creado', {
        description: `Web: /?site=${(res as { slug: string }).slug} · Owner listo para entrar al panel.`,
      })
      setCreating(false)
      void queryClient.invalidateQueries({ queryKey: ['super-tenants'] })
      void queryClient.invalidateQueries({ queryKey: ['tenants-public'] })
    },
    onError: (e) => toast.error(apiErrMessage(e)),
  })

  return (
    <div className="max-w-4xl mx-auto w-full px-5 sm:px-8 pb-10 pt-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-extrabold flex items-center gap-2.5">
            <Building2 className="size-5.5 t-text-primary" aria-hidden /> Odontólogos del SaaS
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Alta de tenants: crea consultorio + usuario OWNER en un paso.</p>
        </div>
        <Button size="sm" className="t-btn-primary rounded-full font-semibold" onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden /> Nuevo odontólogo
        </Button>
      </header>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <div className="py-16 grid place-items-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (tenants ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center border rounded-2xl">Sin tenants.</p>
        ) : (
          (tenants ?? []).map((t) => (
            <div key={t.id} className="rounded-2xl border bg-white p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">/{t.slug}</p>
                </div>
                <Badge variant="secondary">desde {formatQuitoDateShort(new Date(t.createdAt))}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {(
                  [
                    ['Servicios', t._count.services],
                    ['Citas', t._count.appointments],
                    ['Pedidos', t._count.orders],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-muted/60 py-2">
                    <p className="font-heading font-bold">{value}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Users className="size-3.5" aria-hidden />
                  {t.users.map((u) => `${u.email} (${u.role})`).join(' · ')}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full text-xs"
                  onClick={() => {
                    setSiteSlug(t.slug)
                    setView('public')
                  }}
                >
                  🌐 Ver su web
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Nuevo odontólogo (tenant)</DialogTitle>
          </DialogHeader>
          <NewTenantForm onSubmit={(payload) => createMutation.mutate(payload)} pending={createMutation.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function NewTenantForm({ onSubmit, pending }: { onSubmit: (p: { slug: string; name: string; ownerName: string; ownerEmail: string; ownerPassword: string }) => void; pending: boolean }) {
  const [f, setF] = useState({
    name: '',
    slug: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
  })
  return (
    <form
      className="space-y-3.5"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(f)
      }}
    >
      <Field label="Nombre de la clínica *">
        <Input required value={f.name} onChange={(e) => setF((p) => ({ ...p, name: e.target.value, slug: p.slug || e.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }))} placeholder="Clínica Dental Aurora" />
      </Field>
      <Field label="Slug (URL pública) *">
        <Input required value={f.slug} onChange={(e) => setF((p) => ({ ...p, slug: e.target.value }))} placeholder="aurora" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre del dueño *">
          <Input required value={f.ownerName} onChange={(e) => setF((p) => ({ ...p, ownerName: e.target.value }))} placeholder="Dra. Camila Ríos" />
        </Field>
        <Field label="Email del dueño *">
          <Input required type="email" value={f.ownerEmail} onChange={(e) => setF((p) => ({ ...p, ownerEmail: e.target.value }))} placeholder="camila@aurora.com" />
        </Field>
      </div>
      <Field label="Contraseña inicial (mín. 8) *">
        <Input required type="text" minLength={8} value={f.ownerPassword} onChange={(e) => setF((p) => ({ ...p, ownerPassword: e.target.value }))} placeholder="••••••••" />
      </Field>
      <Button type="submit" className="w-full t-btn-primary font-semibold" disabled={pending || !f.slug || !f.name}>
        {pending ? 'Creando…' : 'Crear consultorio + OWNER'}
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Se crea el tenant con contenido y tema por defecto, y su usuario OWNER. Todo editable desde su panel.
      </p>
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
