'use client'

/**
 * PÚBLICO — Formulario de reserva con slot picker real.
 * Flujo: Servicio → Sede/Profesional → Fecha (calendario) + slots disponibles
 * → Datos del paciente → Confirmación con link de cancelación.
 * Los slots provienen de la disponibilidad REAL (Availability - citas - bloqueos).
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Loader2,
  Mail,
  User,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { api, apiErrMessage } from '@/lib/api-client'
import { useUiStore } from '@/store/ui'
import { translator } from '@/lib/i18n'
import { addDaysToDateStr, formatQuitoDateLong, hhmmToMinutes, todayInQuito, utcToQuito } from '@/lib/quito-time'
import type { PublicLocation, PublicProfessional, PublicService, PublicTenant } from './types'

interface SlotDto {
  start: string
  end: string
  startTime: string
  professionalId: string
  professionalName: string
}

interface BookingResult {
  id: string
  date: string
  startTime: string
  status: string
  service: { name: string }
  professional: { name: string }
  cancelUrl: string
  emailPreview: { to: string; subject: string; body: string } | null
}

const STEPS = ['service', 'who', 'when', 'patient'] as const

export function BookingModal({
  tenant,
  services,
  professionals,
  locations,
}: {
  tenant: PublicTenant
  services: PublicService[]
  professionals: PublicProfessional[]
  locations: PublicLocation[]
}) {
  const lang = useUiStore((s) => s.lang)
  const t = translator(lang)
  const open = useUiStore((s) => s.bookingOpen)
  const closeBooking = useUiStore((s) => s.closeBooking)
  const preselected = useUiStore((s) => s.bookingServiceId)

  const [stepIdx, setStepIdx] = useState(0)
  // Radix Dialog desmonta el contenido al cerrar: cada apertura reinicia todo
  // con estos inicializadores (sin efectos de sincronización).
  const [serviceId, setServiceId] = useState<string | null>(preselected ?? null)
  const [locationId, setLocationId] = useState<string | null>(locations[0]?.id ?? null)
  const [professionalId, setProfessionalId] = useState<string | null>(null)
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [slot, setSlot] = useState<SlotDto | null>(null)
  const [patient, setPatient] = useState({ name: '', phone: '', email: '', notes: '' })
  const [result, setResult] = useState<BookingResult | null>(null)
  const [copied, setCopied] = useState(false)

  const step = STEPS[Math.min(stepIdx, STEPS.length - 1)]
  const service = services.find((s) => s.id === serviceId) ?? null

  const dateStr = date ? utcToQuito(new Date(date.getTime() + 5 * 3600_000)).dateStr : null

  const { data: availability, isFetching: loadingSlots } = useQuery({
    queryKey: ['availability', tenant.slug, serviceId, professionalId, locationId, dateStr],
    queryFn: () =>
      api<{ slots: SlotDto[]; slotStepMinutes: number }>(
        `/api/${tenant.slug}/availability?serviceId=${serviceId}&date=${dateStr}` +
          (professionalId ? `&professionalId=${professionalId}` : '') +
          (locationId ? `&locationId=${locationId}` : ''),
      ),
    enabled: open && step === 'when' && !!serviceId && !!dateStr,
  })

  const slots = useMemo(() => availability?.slots ?? [], [availability])

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!serviceId || !slot || !dateStr) throw new Error('Faltan datos de la reserva')
      const startMinute = hhmmToMinutes(slot.startTime) ?? 0
      return api<BookingResult>(`/api/${tenant.slug}/appointments`, {
        method: 'POST',
        body: JSON.stringify({
          serviceId,
          professionalId: slot.professionalId,
          locationId,
          date: dateStr,
          startMinute,
          patientName: patient.name,
          patientPhone: patient.phone,
          patientEmail: patient.email || null,
          notes: patient.notes || null,
        }),
      })
    },
    onSuccess: (res) => setResult(res),
    onError: (err) => alert(apiErrMessage(err)),
  })

  const canNext =
    (step === 'service' && !!serviceId) ||
    (step === 'who') ||
    (step === 'when' && !!slot) ||
    (step === 'patient' && patient.name.trim().length >= 3 && patient.phone.trim().length >= 7)

  const visibleProfessionals = professionals.filter((p) => !locationId || !p.locationId || p.locationId === locationId)

  const todayStr = todayInQuito()
  const maxDate = addDaysToDateStr(todayStr, 60)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeBooking()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto nice-scroll p-0 gap-0">
        <DialogHeader className="p-5 sm:p-6 border-b bg-gradient-to-b from-muted/50 to-transparent">
          <DialogTitle className="font-heading text-lg sm:text-xl flex items-center gap-2">
            <CalendarDays className="size-5 t-text-primary" aria-hidden /> {result ? t('book.success') : t('book.title')}
          </DialogTitle>
          {!result && (
            <div className="flex items-center gap-1.5 mt-1" aria-hidden>
              {STEPS.map((s, i) => (
                <span
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${i === stepIdx ? 'w-7 t-bg-primary' : i < stepIdx ? 'w-4 t-bg-primary/50' : 'w-4 bg-neutral-200'}`}
                />
              ))}
            </div>
          )}
        </DialogHeader>

        <div className="p-5 sm:p-6">
          {result ? (
            <SuccessPanel
              result={result}
              copied={copied}
              onCopy={() => {
                void navigator.clipboard?.writeText(result.cancelUrl)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              onClose={closeBooking}
              labels={{
                title: t('book.success'),
                cancelLink: t('book.cancelLink'),
                copy: t('book.copy'),
                copied: t('book.copied'),
                emailNote: t('book.emailNote'),
                close: t('common.close'),
              }}
            />
          ) : step === 'service' ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-neutral-700">{t('book.step.service')}</h3>
              <div className="grid gap-2.5 max-h-80 overflow-y-auto nice-scroll pr-1">
                {services.length === 0 && (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No hay servicios publicados todavía.
                  </p>
                )}
                {services.map((s) => {
                  const selected = s.id === serviceId
                  return (
                    <button
                      key={s.id}
                      onClick={() => setServiceId(s.id)}
                      className={`flex items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                        selected ? 't-border t-bg-soft/70 shadow-sm' : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-neutral-900">{s.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <Clock className="inline size-3 -mt-0.5 mr-1" aria-hidden />
                          {s.durationMin} {t('common.minutes')}
                        </p>
                      </div>
                      <span className="font-heading font-bold t-text-primary whitespace-nowrap">${s.price.toFixed(2)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : step === 'who' ? (
            <div className="space-y-6">
              {locations.length > 1 && (
                <div>
                  <h3 className="text-sm font-semibold text-neutral-700 mb-3">{t('book.step.location')}</h3>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    {locations.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => setLocationId(l.id)}
                        className={`rounded-2xl border-2 p-3.5 text-left text-sm transition-all ${
                          locationId === l.id ? 't-border t-bg-soft/70' : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <span className="font-semibold block">{l.name}</span>
                        <span className="text-xs text-muted-foreground truncate block mt-0.5">{l.address}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold text-neutral-700 mb-3">{t('book.step.professional')}</h3>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setProfessionalId(null)}
                    className={`rounded-2xl border-2 p-3.5 text-left text-sm transition-all ${
                      professionalId === null ? 't-border t-bg-soft/70' : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <span className="font-semibold">💙 {t('book.anyProfessional')}</span>
                    <span className="text-xs text-muted-foreground block mt-0.5">Ver horarios de todo el equipo</span>
                  </button>
                  {visibleProfessionals.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setProfessionalId(p.id)}
                      className={`rounded-2xl border-2 p-3.5 text-left text-sm transition-all ${
                        professionalId === p.id ? 't-border t-bg-soft/70' : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <span className="font-semibold block truncate">{p.name}</span>
                      <span className="text-xs text-muted-foreground truncate block mt-0.5">{p.specialty}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : step === 'when' ? (
            <div className="grid md:grid-cols-2 gap-6 items-start">
              <div className="mx-auto">
                <h3 className="text-sm font-semibold text-neutral-700 mb-3 text-center md:text-left">{t('book.chooseDate')}</h3>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d)
                    setSlot(null)
                  }}
                  disabled={[{ before: new Date() }]}
                  weekStartsOn={1}
                />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-1.5">
                  <Clock className="size-4" aria-hidden /> Horas disponibles
                </h3>
                {!date ? (
                  <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-2xl">
                    {t('book.chooseDate')}
                  </p>
                ) : loadingSlots ? (
                  <p className="text-sm text-muted-foreground py-8 text-center flex items-center justify-center gap-2 border border-dashed rounded-2xl">
                    <Loader2 className="size-4 animate-spin" /> {t('book.loadingSlots')}
                  </p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-2xl">
                    {t('book.noSlots')}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto nice-scroll pr-1">
                    {slots.map((s) => {
                      const selected = slot?.start === s.start && slot?.professionalId === s.professionalId
                      return (
                        <button
                          key={`${s.start}-${s.professionalId}`}
                          onClick={() => setSlot(s)}
                          className={`rounded-xl border-2 py-2.5 px-1 text-center transition-all ${
                            selected ? 't-border t-bg-primary text-white' : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                          title={`${t('book.step.professional')}: ${s.professionalName}`}
                        >
                          <span className="text-sm font-bold tabular-nums block">{s.startTime}</span>
                          {!professionalId && (
                            <span className={`text-[10px] block truncate mt-0.5 ${selected ? 'text-white/80' : 'text-muted-foreground'}`}>
                              {s.professionalName.split(' ').slice(-1)[0]}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
                {slot && (
                  <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
                    <User className="size-3.5" aria-hidden /> {slot.professionalName} · {service?.durationMin} min
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-neutral-700">{t('book.step.patient')}</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="bk-name" className="text-xs font-medium text-muted-foreground">
                    Nombre completo *
                  </label>
                  <Input
                    id="bk-name"
                    className="mt-1 h-11"
                    placeholder="Ej: Andrea Velasco"
                    value={patient.name}
                    onChange={(e) => setPatient((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="bk-phone" className="text-xs font-medium text-muted-foreground">
                    Teléfono *
                  </label>
                  <Input
                    id="bk-phone"
                    className="mt-1 h-11"
                    placeholder="099 123 4567"
                    value={patient.phone}
                    onChange={(e) => setPatient((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="bk-email" className="text-xs font-medium text-muted-foreground">
                    Email (opcional — para confirmación)
                  </label>
                  <Input
                    id="bk-email"
                    type="email"
                    className="mt-1 h-11"
                    placeholder="tu@email.com"
                    value={patient.email}
                    onChange={(e) => setPatient((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="bk-notes" className="text-xs font-medium text-muted-foreground">
                    Notas (opcional)
                  </label>
                  <Textarea
                    id="bk-notes"
                    className="mt-1 min-h-16"
                    placeholder="Alergias, recomendaciones…"
                    value={patient.notes}
                    onChange={(e) => setPatient((p) => ({ ...p, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="rounded-2xl t-bg-soft border t-border/20 p-4 text-sm space-y-1">
                <p className="font-semibold text-sm">{service?.name}</p>
                <p className="text-muted-foreground">
                  {date ? formatQuitoDateLong(new Date(date.getTime() + 5 * 3600_000)) : ''} · {slot?.startTime} ·{' '}
                  {slot?.professionalName}
                </p>
                <p className="t-text-primary font-bold">${service?.price.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>

        {!result && (
          <footer className="p-4 sm:p-5 border-t bg-white flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
              disabled={stepIdx === 0}
            >
              <ChevronLeft className="size-4" aria-hidden /> {t('book.back')}
            </Button>
            {step === 'patient' ? (
              <Button
                className="t-btn-primary rounded-full px-6 font-bold"
                disabled={!canNext || confirmMutation.isPending}
                onClick={() => confirmMutation.mutate()}
              >
                {confirmMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Confirmando…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" aria-hidden /> {t('book.confirm')}
                  </>
                )}
              </Button>
            ) : (
              <Button
                className="t-btn-primary rounded-full px-6 font-bold"
                disabled={!canNext}
                onClick={() => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1))}
              >
                {t('book.next')} <ChevronRight className="size-4" aria-hidden />
              </Button>
            )}
          </footer>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SuccessPanel({
  result,
  copied,
  onCopy,
  onClose,
  labels,
}: {
  result: BookingResult
  copied: boolean
  onCopy: () => void
  onClose: () => void
  labels: { title: string; cancelLink: string; copy: string; copied: string; emailNote: string; close: string }
}) {
  return (
    <div className="text-center space-y-5">
      <div className="mx-auto grid place-items-center size-16 rounded-full t-bg-soft">
        <CheckCircle2 className="size-8 t-text-primary" aria-hidden />
      </div>
      <div>
        <h3 className="font-heading font-bold text-xl">{labels.title}</h3>
        <p className="text-sm text-muted-foreground mt-1.5">
          {result.service.name} · {result.startTime} · Estado: <span className="font-semibold">{result.status}</span>
        </p>
      </div>

      <div className="max-w-md mx-auto rounded-2xl border bg-muted/40 p-4 text-left">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <CalendarDays className="size-3.5" aria-hidden /> {labels.cancelLink}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 text-[11px] font-mono bg-white border rounded-lg px-2.5 py-2 truncate">{result.cancelUrl}</code>
          <Button size="sm" variant="outline" onClick={onCopy} className="shrink-0">
            <Copy className="size-3.5" aria-hidden /> {copied ? labels.copied : labels.copy}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          Guárdalo: con ese enlace puedes cancelar tu reserva cuando quieras (libera el horario).
        </p>
      </div>

      {result.emailPreview && (
        <div className="max-w-md mx-auto rounded-2xl border border-dashed p-4 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Mail className="size-3.5" aria-hidden /> {labels.emailNote}
          </p>
          <pre className="mt-2 text-[11px] whitespace-pre-wrap text-neutral-600 font-mono leading-relaxed max-h-32 overflow-y-auto nice-scroll">
            {result.emailPreview.body}
          </pre>
        </div>
      )}

      <Button onClick={onClose} className="t-btn-primary rounded-full px-8 font-bold">
        {labels.close}
      </Button>
    </div>
  )
}
