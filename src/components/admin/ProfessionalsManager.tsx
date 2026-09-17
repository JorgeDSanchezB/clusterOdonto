'use client'

/**
 * ADMIN — Profesionales: CRUD + editor de disponibilidad semanal (L–D).
 * La disponibilidad alimenta el motor de slots de la web pública.
 */
import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, ImagePlus, Loader2, Pencil, Plus, Stethoscope, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api, apiErrMessage, uploadImage } from '@/lib/api-client'
import { minutesToHHMM, hhmmToMinutes } from '@/lib/quito-time'
import { WEEKDAY_SHORT } from '@/lib/constants'

interface AvailabilityRow {
  id: string
  weekday: number
  startMinute: number
  endMinute: number
}

interface ProfessionalRow {
  id: string
  name: string
  specialty: string | null
  bio: string | null
  photoUrl: string | null
  locationId: string | null
  active: boolean
  availabilities: AvailabilityRow[]
}

export function ProfessionalsManager() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<ProfessionalRow | null>(null)
  const [creating, setCreating] = useState(false)

  const { data: rows, isLoading } = useQuery({
    queryKey: ['admin-professionals-list'],
    queryFn: () => api<ProfessionalRow[]>('/api/admin/professionals?limit=50'),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-professionals-list'] })
    void queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">La disponibilidad define los slots que ve el paciente al reservar.</p>
        <Button size="sm" className="t-btn-primary rounded-full font-semibold" onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden /> Nuevo profesional
        </Button>
      </div>

      {isLoading ? (
        <div className="py-16 grid place-items-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (rows ?? []).length === 0 ? (
        <div className="py-16 text-center rounded-2xl border bg-white">
          <Stethoscope className="size-10 text-neutral-200 mx-auto" aria-hidden />
          <p className="text-sm text-muted-foreground mt-3">Sin profesionales — registra al equipo.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(rows ?? []).map((p) => (
            <div key={p.id} className="rounded-2xl border bg-white p-5 space-y-4">
              <div className="flex items-start gap-4">
                <div className="size-16 rounded-2xl overflow-hidden bg-muted shrink-0 grid place-items-center">
                  {p.photoUrl ? (
                     
                    <img src={p.photoUrl} alt={p.name} className="size-full object-cover" />
                  ) : (
                    <span className="font-heading font-bold text-xl text-neutral-300">{p.name?.[0] ?? '?'}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{p.name}</p>
                    {!p.active && <Badge variant="outline" className="text-[10px]">inactivo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{p.specialty ?? 'Odontología general'}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setEditing(p)} aria-label={`Editar ${p.name}`}>
                  <Pencil className="size-4" />
                </Button>
              </div>
              <div className="rounded-xl bg-muted/50 border border-dashed p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-2">
                  <CalendarClock className="size-3.5" aria-hidden /> Disponibilidad
                </p>
                {p.availabilities.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin horarios configurados.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {[...p.availabilities]
                      .sort((a, b) => a.weekday - b.weekday)
                      .map((a) => (
                        <Badge key={a.id} variant="secondary" className="text-[11px]">
                          {WEEKDAY_SHORT[a.weekday]} {minutesToHHMM(a.startMinute)}–{minutesToHHMM(a.endMinute)}
                        </Badge>
                      ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ProfessionalFormDialog open={creating} onOpenChange={setCreating} onDone={invalidate} />
      {editing && <ProfessionalFormDialog open onOpenChange={() => setEditing(null)} onDone={invalidate} initial={editing} />}
    </div>
  )
}

const DEFAULT_WINDOWS = [1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  enabled: weekday <= 5,
  from: '09:00',
  to: weekday <= 5 ? '18:00' : '13:00',
}))

function ProfessionalFormDialog({
  open,
  onOpenChange,
  onDone,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onDone: () => void
  initial?: ProfessionalRow
}) {
  const isEdit = !!initial
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    specialty: initial?.specialty ?? '',
    bio: initial?.bio ?? '',
    photoUrl: initial?.photoUrl ?? '',
    active: initial?.active ?? true,
  })
  const [windows, setWindows] = useState(() => {
    if (!initial) return DEFAULT_WINDOWS.map((w) => ({ ...w }))
    return [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
      const rows = initial.availabilities.filter((a) => a.weekday === weekday)
      if (rows.length === 0) return { weekday, enabled: false, from: '09:00', to: '18:00' }
      const first = rows.reduce((min, r) => (r.startMinute < min ? r.startMinute : min), rows[0].startMinute)
      const last = rows.reduce((max, r) => (r.endMinute > max ? r.endMinute : max), rows[0].endMinute)
      return { weekday, enabled: true, from: minutesToHHMM(first), to: minutesToHHMM(last) }
    })
  })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const availability = windows
        .filter((w) => w.enabled)
        .map((w) => ({
          weekday: w.weekday,
          startMinute: hhmmToMinutes(w.from) ?? 540,
          endMinute: hhmmToMinutes(w.to) ?? 1080,
        }))
        .filter((w) => w.endMinute > w.startMinute)
      const payload = {
        name: form.name.trim(),
        specialty: form.specialty.trim() || null,
        bio: form.bio.trim() || null,
        photoUrl: form.photoUrl || null,
        active: form.active,
        availability,
      }
      if (isEdit) {
        return api(`/api/admin/professionals/${initial!.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      }
      return api('/api/admin/professionals', { method: 'POST', body: JSON.stringify(payload) })
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Profesional actualizado' : 'Profesional creado con su disponibilidad')
      onOpenChange(false)
      onDone()
    },
    onError: (e) => toast.error(apiErrMessage(e)),
  })

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const { url } = await uploadImage(file, 'team')
      setForm((f) => ({ ...f, photoUrl: url }))
    } catch (e) {
      toast.error(apiErrMessage(e))
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto nice-scroll">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEdit ? 'Editar profesional' : 'Nuevo profesional'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="size-16 rounded-2xl border-2 border-dashed bg-muted grid place-items-center overflow-hidden shrink-0">
              {form.photoUrl ? (
                 
                <img src={form.photoUrl} alt="" className="size-full object-cover" />
              ) : (
                <Stethoscope className="size-5 text-neutral-300" aria-hidden />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && void handleUpload(e.target.files[0])} />
              <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" aria-hidden />} Subir foto
              </Button>
              <Input className="h-8 text-xs" placeholder="…o URL /uploads/…" value={form.photoUrl} onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Nombre completo *</Label>
            <Input className="mt-1" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Dra. María Fernández" />
          </div>
          <div>
            <Label className="text-xs">Especialidad</Label>
            <Input className="mt-1" value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))} placeholder="Ortodoncia y rehabilitación" />
          </div>
          <div>
            <Label className="text-xs">Bio (se muestra en Nosotros)</Label>
            <Textarea className="mt-1 min-h-16" value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
          </div>

          <div className="rounded-2xl border border-dashed p-4 space-y-2">
            <p className="text-xs font-semibold">Disponibilidad semanal</p>
            {windows.map((w, i) => (
              <div key={w.weekday} className="flex items-center gap-2.5">
                <Switch
                  checked={w.enabled}
                  onCheckedChange={(v) => setWindows((rows) => rows.map((r, j) => (j === i ? { ...r, enabled: v } : r)))}
                  aria-label={`Activar ${WEEKDAY_SHORT[w.weekday]}`}
                />
                <span className="text-sm w-10 font-medium">{WEEKDAY_SHORT[w.weekday]}</span>
                <Input
                  type="time"
                  className="h-9 w-28 text-xs"
                  value={w.from}
                  disabled={!w.enabled}
                  onChange={(e) => setWindows((rows) => rows.map((r, j) => (j === i ? { ...r, from: e.target.value } : r)))}
                />
                <span className="text-xs text-muted-foreground">→</span>
                <Input
                  type="time"
                  className="h-9 w-28 text-xs"
                  value={w.to}
                  disabled={!w.enabled}
                  onChange={(e) => setWindows((rows) => rows.map((r, j) => (j === i ? { ...r, to: e.target.value } : r)))}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-xl border px-4 py-3">
            <Label className="text-sm">Activo (acepta reservas)</Label>
            <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
          </div>

          <Button className="w-full t-btn-primary font-semibold" disabled={form.name.trim().length < 2 || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear profesional'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
