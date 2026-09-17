'use client'

/** ADMIN — Sedes del consultorio (CRUD) con coordenadas para el mapa. */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api, apiErrMessage } from '@/lib/api-client'

interface LocationRow {
  id: string
  name: string
  address: string
  phone: string | null
  lat: number | null
  lng: number | null
  mapQuery: string | null
  active: boolean
}

export function LocationsManager() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<LocationRow | null>(null)
  const [creating, setCreating] = useState(false)

  const { data: rows, isLoading } = useQuery({
    queryKey: ['admin-locations'],
    queryFn: () => api<LocationRow[]>('/api/admin/locations?limit=20'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/admin/locations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Sede eliminada')
      void queryClient.invalidateQueries({ queryKey: ['admin-locations'] })
    },
    onError: (e) => toast.error(apiErrMessage(e)),
  })

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-locations'] })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">Las sedes aparecen en el mapa de la web pública y en la reserva.</p>
        <Button size="sm" className="t-btn-primary rounded-full font-semibold" onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden /> Nueva sede
        </Button>
      </div>

      {isLoading ? (
        <div className="py-16 grid place-items-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (rows ?? []).length === 0 ? (
        <div className="py-16 text-center rounded-2xl border bg-white">
          <MapPin className="size-10 text-neutral-200 mx-auto" aria-hidden />
          <p className="text-sm text-muted-foreground mt-3">Sin sedes registradas.</p>
        </div>
      ) : (
        <div className="rounded-2xl border bg-white divide-y">
          {(rows ?? []).map((l) => (
            <div key={l.id} className="flex items-center gap-4 p-4">
              <span className="grid place-items-center size-11 rounded-xl t-bg-soft t-text-primary shrink-0">
                <MapPin className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{l.name}</p>
                <p className="text-xs text-muted-foreground truncate">{l.address}</p>
                {(l.lat != null || l.lng != null) && (
                  <p className="text-[11px] text-muted-foreground/70 font-mono">
                    {l.lat?.toFixed(4)}, {l.lng?.toFixed(4)}
                  </p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => setEditing(l)} aria-label={`Editar ${l.name}`}>
                  <Pencil className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(l.id)} aria-label={`Eliminar ${l.name}`}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <LocationFormDialog open={creating} onOpenChange={setCreating} onDone={invalidate} />
      {editing && <LocationFormDialog open onOpenChange={() => setEditing(null)} onDone={invalidate} initial={editing} />}
    </div>
  )
}

function LocationFormDialog({
  open,
  onOpenChange,
  onDone,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onDone: () => void
  initial?: LocationRow
}) {
  const isEdit = !!initial
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    address: initial?.address ?? '',
    phone: initial?.phone ?? '',
    lat: initial?.lat != null ? String(initial.lat) : '',
    lng: initial?.lng != null ? String(initial.lng) : '',
    mapQuery: initial?.mapQuery ?? '',
  })

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim() || null,
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null,
        mapQuery: form.mapQuery.trim() || null,
      }
      return isEdit
        ? api(`/api/admin/locations/${initial!.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        : api('/api/admin/locations', { method: 'POST', body: JSON.stringify(payload) })
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Sede actualizada' : 'Sede creada')
      onOpenChange(false)
      onDone()
    },
    onError: (e) => toast.error(apiErrMessage(e)),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEdit ? 'Editar sede' : 'Nueva sede'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3.5">
          <div>
            <Label className="text-xs">Nombre *</Label>
            <Input className="mt-1" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Sede Principal" />
          </div>
          <div>
            <Label className="text-xs">Dirección *</Label>
            <Input className="mt-1" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Av. Amazonas N36-152, Quito" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Teléfono</Label>
              <Input className="mt-1" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+593 2 000 0000" />
            </div>
            <div>
              <Label className="text-xs">Query del mapa</Label>
              <Input className="mt-1" value={form.mapQuery} onChange={(e) => setForm((f) => ({ ...f, mapQuery: e.target.value }))} placeholder="Av. Amazonas, Quito" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Latitud</Label>
              <Input className="mt-1" type="number" step="0.0001" value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} placeholder="-0.1807" />
            </div>
            <div>
              <Label className="text-xs">Longitud</Label>
              <Input className="mt-1" type="number" step="0.0001" value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))} placeholder="-78.4678" />
            </div>
          </div>
          <Button className="w-full t-btn-primary font-semibold" disabled={form.name.length < 2 || form.address.length < 4 || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear sede'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
