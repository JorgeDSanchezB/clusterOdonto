'use client'

/**
 * ADMIN — Calendario real (FullCalendar): vista día/semana/mes.
 * Carga citas POR RANGO VISIBLE (from/to) — nunca todo el histórico.
 * Acciones: confirmar, cancelar (libera slot), bloquear horario, nueva cita.
 */
import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import type { EventInput, DatesSetArg, EventClickArg } from '@fullcalendar/core/index.js'
import { Ban, CalendarPlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { api, apiErrMessage } from '@/lib/api-client'
import { addDaysToDateStr, formatQuitoDateLong, minutesToHHMM, todayInQuito, utcToQuito } from '@/lib/quito-time'

interface AppointmentRow {
  id: string
  patientName: string | null
  patientPhone: string | null
  patientEmail: string | null
  notes: string | null
  start: string
  end: string
  status: string
  source: string
  service: { id: string; name: string; durationMin: number; price: number } | null
  professional: { id: string; name: string; specialty: string | null }
  location: { id: string; name: string } | null
  metadata: Record<string, unknown>
}

interface SlotDto {
  start: string
  startTime: string
  professionalId: string
  professionalName: string
}

const STATUS_COLOR: Record<string, string> = {
  CONFIRMED: '#0f766e',
  PENDING: '#d97706',
  BLOCKED: '#64748b',
  CANCELLED: '#e11d48',
}

export function CalendarView() {
  const queryClient = useQueryClient()
  const calendarRef = useRef<FullCalendar>(null)
  const [range, setRange] = useState<{ from: string; to: string } | null>(null)
  const [professionalFilter, setProfessionalFilter] = useState<string>('all')
  const [detail, setDetail] = useState<AppointmentRow | null>(null)
  const [blockOpen, setBlockOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const { data: professionals } = useQuery({
    queryKey: ['admin-professionals-list'],
    queryFn: () => api<{ id: string; name: string; specialty: string | null }[]>('/api/admin/professionals?limit=50'),
  })

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['admin-appointments', range?.from, range?.to],
    queryFn: () =>
      api<AppointmentRow[]>(
        `/api/admin/appointments?limit=500&from=${encodeURIComponent(range!.from)}&to=${encodeURIComponent(range!.to)}${
          professionalFilter !== 'all' ? `&professionalId=${professionalFilter}` : ''
        }`,
      ),
    enabled: !!range,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-appointments'] })
    void queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
  }

  const transitionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'confirm' | 'cancel' }) =>
      api(`/api/admin/appointments/${id}/${action}`, { method: 'POST' }),
    onSuccess: (_d, v) => {
      toast.success(v.action === 'confirm' ? 'Cita confirmada' : 'Cita cancelada — slot liberado')
      setDetail(null)
      invalidate()
    },
    onError: (e) => toast.error(apiErrMessage(e)),
  })

  const events: EventInput[] = useMemo(
    () =>
      (appointments ?? []).map((a) => ({
        id: a.id,
        title:
          a.status === 'BLOCKED'
            ? `⛔ ${typeof a.metadata?.reason === 'string' ? a.metadata.reason : 'Bloqueado'}`
            : `${a.patientName ?? '—'} · ${a.service?.name ?? 'Cita'}`,
        start: a.start,
        end: a.end,
        backgroundColor: STATUS_COLOR[a.status] ?? '#64748b',
        borderColor: 'transparent',
        extendedProps: { row: a },
      })),
    [appointments],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="t-btn-primary rounded-full font-semibold" onClick={() => setCreateOpen(true)}>
          <CalendarPlus className="size-4" aria-hidden /> Nueva cita
        </Button>
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => setBlockOpen(true)}>
          <Ban className="size-4" aria-hidden /> Bloquear horario
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
            <SelectTrigger className="w-52 h-9 text-sm">
              <SelectValue placeholder="Profesional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los profesionales</SelectItem>
              {(professionals ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-4 relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-white/60 backdrop-blur-sm">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={esLocale}
          height="auto"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
          slotMinTime="07:00:00"
          slotMaxTime="21:00:00"
          allDaySlot={false}
          nowIndicator
          events={events}
          eventClick={(info: EventClickArg) => setDetail((info.event.extendedProps as { row: AppointmentRow }).row)}
          datesSet={(arg: DatesSetArg) => {
            setRange({ from: arg.start.toISOString(), to: arg.end.toISOString() })
          }}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          dayHeaderFormat={{ weekday: 'short', day: 'numeric', month: 'short' }}
        />
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-full inline-block" style={{ background: STATUS_COLOR.CONFIRMED }} /> Confirmada</span>
          <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-full inline-block" style={{ background: STATUS_COLOR.PENDING }} /> Pendiente</span>
          <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-full inline-block" style={{ background: STATUS_COLOR.BLOCKED }} /> Bloqueada</span>
          <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-full inline-block" style={{ background: STATUS_COLOR.CANCELLED }} /> Cancelada</span>
        </p>
      </div>

      {/* Detalle de cita */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Detalle de la cita</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-muted/50 border divide-y text-sm">
                <Row label="Paciente" value={detail.patientName ?? '—'} />
                <Row label="Teléfono" value={detail.patientPhone ?? '—'} />
                <Row label="Servicio" value={detail.service?.name ?? 'Bloqueo'} />
                <Row label="Profesional" value={detail.professional?.name ?? '—'} />
                <Row label="Fecha" value={formatQuitoDateLong(new Date(detail.start))} />
                <Row
                  label="Hora"
                  value={`${minutesToHHMM(utcToQuito(new Date(detail.start)).minutes)} – ${minutesToHHMM(utcToQuito(new Date(detail.end)).minutes)}`}
                />
                <Row label="Origen" value={detail.source === 'PUBLIC' ? 'Web pública' : 'Panel'} />
                {detail.notes && <Row label="Notas" value={detail.notes} />}
              </div>
              <div className="flex items-center justify-between">
                <Badge variant={detail.status === 'CONFIRMED' ? 'default' : detail.status === 'PENDING' ? 'secondary' : 'destructive'}>
                  {detail.status}
                </Badge>
                <div className="flex gap-2">
                  {detail.status === 'PENDING' && (
                    <Button
                      size="sm"
                      disabled={transitionMutation.isPending}
                      onClick={() => transitionMutation.mutate({ id: detail.id, action: 'confirm' })}
                    >
                      Confirmar
                    </Button>
                  )}
                  {(detail.status === 'PENDING' || detail.status === 'CONFIRMED' || detail.status === 'BLOCKED') && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={transitionMutation.isPending}
                      onClick={() => transitionMutation.mutate({ id: detail.id, action: 'cancel' })}
                    >
                      {detail.status === 'BLOCKED' ? 'Quitar bloqueo' : 'Cancelar'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BlockDialog open={blockOpen} onOpenChange={setBlockOpen} professionals={professionals ?? []} onDone={invalidate} />
      <AdminCreateDialog open={createOpen} onOpenChange={setCreateOpen} professionals={professionals ?? []} onDone={invalidate} />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-2.5">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}

/** Bloqueo manual de horario (almuerzo, vacaciones, urgencia). */
function BlockDialog({
  open,
  onOpenChange,
  professionals,
  onDone,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  professionals: { id: string; name: string }[]
  onDone: () => void
}) {
  const [form, setForm] = useState({ professionalId: '', date: todayInQuito(), from: '13:00', to: '14:00', reason: 'Almuerzo' })
  const toMin = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    return h * 60 + (m || 0)
  }
  const mutation = useMutation({
    mutationFn: () =>
      api('/api/admin/appointments/block', {
        method: 'POST',
        body: JSON.stringify({
          professionalId: form.professionalId,
          date: form.date,
          startMinute: toMin(form.from),
          endMinute: toMin(form.to),
          reason: form.reason,
        }),
      }),
    onSuccess: () => {
      toast.success('Horario bloqueado — el slot desaparece de la web pública')
      onOpenChange(false)
      onDone()
    },
    onError: (e) => toast.error(apiErrMessage(e)),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Bloquear horario</DialogTitle>
        </DialogHeader>
        <div className="space-y-3.5">
          <div>
            <Label className="text-xs">Profesional</Label>
            <Select value={form.professionalId} onValueChange={(v) => setForm((f) => ({ ...f, professionalId: v }))}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Elegir profesional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Fecha</Label>
              <Input type="date" className="mt-1" value={form.date} min={todayInQuito()} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Desde</Label>
              <Input type="time" className="mt-1" value={form.from} onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Hasta</Label>
              <Input type="time" className="mt-1" value={form.to} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Motivo (interno)</Label>
            <Input className="mt-1" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
          </div>
          <Button
            className="w-full t-btn-primary font-semibold"
            disabled={!form.professionalId || mutation.isPending || toMin(form.to) <= toMin(form.from)}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Bloqueando…' : 'Bloquear horario'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Cita manual desde el panel (queda CONFIRMADA). */
function AdminCreateDialog({
  open,
  onOpenChange,
  professionals,
  onDone,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  professionals: { id: string; name: string }[]
  onDone: () => void
}) {
  const [form, setForm] = useState({ serviceId: '', date: todayInQuito(), patientName: '', patientPhone: '', slot: null as SlotDto | null })
  const [svcQueryEnabled, setSvcQueryEnabled] = useState(true)

  const { data: services } = useQuery({
    queryKey: ['admin-services-mini'],
    queryFn: () => api<{ id: string; name: string; durationMin: number; price: number }[]>('/api/admin/services?limit=50'),
    enabled: svcQueryEnabled && open,
  })

  const { data: availability, isFetching: loadingSlots } = useQuery({
    queryKey: ['admin-create-slots', form.serviceId, form.date],
    queryFn: () => api<{ slots: SlotDto[] }>(`/api/demo/availability?serviceId=${form.serviceId}&date=${form.date}`),
    enabled: open && !!form.serviceId && !!form.date,
  })

  const mutation = useMutation({
    mutationFn: () =>
      api('/api/admin/appointments', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: form.serviceId,
          professionalId: form.slot!.professionalId,
          date: form.date,
          startMinute: Number(form.slot!.startTime.slice(0, 2)) * 60 + Number(form.slot!.startTime.slice(3)),
          patientName: form.patientName,
          patientPhone: form.patientPhone,
          status: 'CONFIRMED',
        }),
      }),
    onSuccess: () => {
      toast.success('Cita creada y confirmada')
      onOpenChange(false)
      setForm({ serviceId: '', date: todayInQuito(), patientName: '', patientPhone: '', slot: null })
      onDone()
    },
    onError: (e) => toast.error(apiErrMessage(e)),
  })

  const maxDate = addDaysToDateStr(todayInQuito(), 90)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto nice-scroll">
        <DialogHeader>
          <DialogTitle className="font-heading">Nueva cita manual</DialogTitle>
        </DialogHeader>
        <div className="space-y-3.5">
          <div>
            <Label className="text-xs">Servicio</Label>
            <Select value={form.serviceId} onValueChange={(v) => setForm((f) => ({ ...f, serviceId: v, slot: null }))}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Elegir servicio" />
              </SelectTrigger>
              <SelectContent>
                {(services ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.durationMin} min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Fecha</Label>
            <Input type="date" className="mt-1" value={form.date} min={todayInQuito()} max={maxDate} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value, slot: null }))} />
          </div>
          <div>
            <Label className="text-xs">Horas disponibles (todos los profesionales)</Label>
            <div className="mt-1.5">
              {loadingSlots ? (
                <p className="text-xs text-muted-foreground flex items-center gap-2 py-3">
                  <Loader2 className="size-3.5 animate-spin" /> Buscando slots…
                </p>
              ) : !form.serviceId ? (
                <p className="text-xs text-muted-foreground py-3">Elige un servicio para ver horarios.</p>
              ) : (availability?.slots ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground py-3">Sin horarios disponibles ese día.</p>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {(availability?.slots ?? []).slice(0, 32).map((s) => {
                    const selected = form.slot?.start === s.start && form.slot?.professionalId === s.professionalId
                    return (
                      <button
                        key={`${s.start}-${s.professionalId}`}
                        onClick={() => setForm((f) => ({ ...f, slot: s }))}
                        className={`rounded-lg border-2 py-1.5 text-xs font-bold tabular-nums transition-all ${
                          selected ? 't-border t-bg-primary text-white' : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                        title={s.professionalName}
                      >
                        {s.startTime}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Paciente</Label>
              <Input className="mt-1" value={form.patientName} onChange={(e) => setForm((f) => ({ ...f, patientName: e.target.value }))} placeholder="Nombre completo" />
            </div>
            <div>
              <Label className="text-xs">Teléfono</Label>
              <Input className="mt-1" value={form.patientPhone} onChange={(e) => setForm((f) => ({ ...f, patientPhone: e.target.value }))} placeholder="099…" />
            </div>
          </div>
          <Button
            className="w-full t-btn-primary font-semibold"
            disabled={!form.serviceId || !form.slot || form.patientName.trim().length < 3 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Creando…' : 'Crear cita confirmada'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
