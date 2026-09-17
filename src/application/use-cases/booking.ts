/**
 * APLICACIÓN — Casos de uso de agenda: disponibilidad, reservas, cancelaciones
 * y bloqueos. El motor de cálculo puro vive en domain/slots.ts; aquí se orquesta
 * con datos reales (multi-tenant estricto en cada query).
 */
import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { HttpError } from '@/lib/api-helpers'
import { generateSlots, type SlotProfessional } from '@/domain/slots'
import { AppointmentFactory, TenantFactory } from '@/domain/factories'
import { buildPage, cursorAscWhere, getPaginationParams } from '@/lib/pagination'
import { minutesToHHMM, quitoToUtc, todayInQuito, utcToQuito, weekdayOfDateStr, addDaysToDateStr } from '@/lib/quito-time'
import { APPOINTMENT_ACTIVE_STATUSES } from '@/lib/constants'
import { emailProvider } from '@/infrastructure/email'
import { toJsonString } from '@/lib/json'
import type { AppointmentStatus } from '@/domain/entities'

interface TenantLike {
  id: string
  name: string
  whatsapp: string | null
  config: string
  ivaPercent: number
}

// ── Disponibilidad (público) ────────────────────────────────────────────────

export interface SlotDto {
  start: string
  end: string
  professionalId: string
  professionalName: string
  startTime: string // 'HH:MM' Quito
}

export async function getAvailability(
  tenant: TenantLike,
  input: { serviceId: string; professionalId?: string | null; locationId?: string | null; date: string },
): Promise<{ date: string; slotStepMinutes: number; slots: SlotDto[] }> {
  const config = TenantFactory.resolveConfig(tenant.config)

  // Servicio válido del tenant
  const service = await db.service.findFirst({
    where: { id: input.serviceId, tenantId: tenant.id, active: true },
  })
  if (!service) throw new HttpError(404, 'NOT_FOUND', 'Servicio no encontrado o inactivo.')

  // Profesionales activos del tenant (filtrados por sede y/o profesional)
  const profs = await db.professional.findMany({
    where: {
      tenantId: tenant.id,
      active: true,
      ...(input.professionalId ? { id: input.professionalId } : {}),
      ...(input.locationId ? { OR: [{ locationId: input.locationId }, { locationId: null }] } : {}),
    },
  })
  if (profs.length === 0) {
    return { date: input.date, slotStepMinutes: config.slotStepMinutes, slots: [] }
  }

  const weekday = weekdayOfDateStr(input.date)

  const windows = await db.availability.findMany({
    where: { professionalId: { in: profs.map((p) => p.id) }, weekday },
  })

  // Ventanas por profesional (opcionalmente filtradas por sede)
  const byProfessional = new Map<string, { startMinute: number; endMinute: number }[]>()
  for (const w of windows) {
    if (input.locationId && w.locationId && w.locationId !== input.locationId) continue
    const list = byProfessional.get(w.professionalId) ?? []
    list.push({ startMinute: w.startMinute, endMinute: w.endMinute })
    byProfessional.set(w.professionalId, list)
  }

  const slotProfessionals: SlotProfessional[] = profs
    .map((p) => ({ id: p.id, name: p.name, windows: byProfessional.get(p.id) ?? [] }))
    .filter((p) => p.windows.length > 0)

  // Citas ocupadas de ESE día (rango ±1 día por seguridad de zonas)
  const dayStart = quitoToUtc(input.date, 0)
  const dayEnd = quitoToUtc(input.date, 1440)
  const busy = await db.appointment.findMany({
    where: {
      tenantId: tenant.id,
      professionalId: { in: slotProfessionals.map((p) => p.id) },
      status: { in: APPOINTMENT_ACTIVE_STATUSES },
      start: { lt: dayEnd },
      end: { gt: dayStart },
    },
    select: { start: true, end: true, professionalId: true },
  })

  const slots = generateSlots({
    date: input.date,
    durationMin: service.durationMin,
    stepMin: config.slotStepMinutes,
    minLeadMin: config.minLeadMinutes,
    professionals: slotProfessionals,
    busy,
  })

  return {
    date: input.date,
    slotStepMinutes: config.slotStepMinutes,
    slots: slots.map((s) => ({
      start: s.start.toISOString(),
      end: s.end.toISOString(),
      startTime: minutesToHHMM(utcToQuito(s.start).minutes),
      professionalId: s.professionalId,
      professionalName: s.professionalName,
    })),
  }
}

// ── Crear reserva (público y admin) ────────────────────────────────────────

export interface CreateAppointmentInput {
  serviceId: string
  professionalId: string
  locationId?: string | null
  date: string
  startMinute: number
  patientName: string
  patientPhone: string
  patientEmail?: string | null
  notes?: string | null
  status?: AppointmentStatus
}

export async function createAppointment(
  tenant: TenantLike,
  input: CreateAppointmentInput,
  source: 'PUBLIC' | 'ADMIN',
  origin?: string,
) {
  const config = TenantFactory.resolveConfig(tenant.config)
  const now = new Date()

  // Reglas de negocio (server-side SIEMPRE revalida):
  if (input.date < todayInQuito()) {
    throw new HttpError(400, 'INVALID_DATE', 'No puedes reservar en una fecha pasada.')
  }
  if (input.date > addDaysToDateStr(todayInQuito(), config.maxAdvanceDays)) {
    throw new HttpError(400, 'TOO_FAR', `Solo se aceptan reservas con ${config.maxAdvanceDays} días de anticipación.`)
  }

  const service = await db.service.findFirst({
    where: { id: input.serviceId, tenantId: tenant.id, active: true },
  })
  if (!service) throw new HttpError(404, 'NOT_FOUND', 'Servicio no encontrado o inactivo.')

  const professional = await db.professional.findFirst({
    where: { id: input.professionalId, tenantId: tenant.id, active: true },
  })
  if (!professional) throw new HttpError(404, 'NOT_FOUND', 'Profesional no encontrado o inactivo.')

  if (input.locationId) {
    const location = await db.location.findFirst({
      where: { id: input.locationId, tenantId: tenant.id, active: true },
    })
    if (!location) throw new HttpError(404, 'NOT_FOUND', 'Sede no encontrada.')
  }

  const start = quitoToUtc(input.date, input.startMinute)
  const end = quitoToUtc(input.date, input.startMinute + service.durationMin)
  if (start.getTime() < now.getTime() + config.minLeadMinutes * 60_000 && source === 'PUBLIC') {
    throw new HttpError(400, 'TOO_SOON', `Necesitas al menos ${config.minLeadMinutes} minutos de anticipación.`)
  }

  // La ventana de disponibilidad debe contener TODO el bloque
  const weekday = weekdayOfDateStr(input.date)
  const windows = await db.availability.findMany({
    where: { professionalId: professional.id, weekday },
  })
  const endMinute = input.startMinute + service.durationMin
  const fits = windows.some(
    (w) =>
      input.startMinute >= w.startMinute &&
      endMinute <= w.endMinute &&
      (!input.locationId || !w.locationId || w.locationId === input.locationId),
  )
  if (!fits) {
    throw new HttpError(409, 'OUT_OF_WINDOW', 'El profesional no atiende en ese horario.')
  }

  // Creación atómica con re-chequeo de solapamiento (evita doble reserva)
  const created = await db.$transaction(async (tx) => {
    const conflicts = await tx.appointment.count({
      where: {
        professionalId: professional.id,
        status: { in: APPOINTMENT_ACTIVE_STATUSES },
        start: { lt: end },
        end: { gt: start },
      },
    })
    if (conflicts > 0) {
      throw new HttpError(409, 'SLOT_TAKEN', 'Ese horario acaba de ocuparse. Elige otro, por favor.')
    }
    return tx.appointment.create({
      data: AppointmentFactory.create({
        tenantId: tenant.id,
        serviceId: service.id,
        professionalId: professional.id,
        locationId: input.locationId ?? professional.locationId ?? null,
        start,
        end,
        patientName: input.patientName,
        patientPhone: input.patientPhone,
        patientEmail: input.patientEmail ?? null,
        notes: input.notes ?? null,
        status: input.status ?? (source === 'ADMIN' ? 'CONFIRMED' : 'PENDING'),
        source,
      }),
    })
  })

  // Email de confirmación (ConsoleEmailProvider en dev — visible en consola)
  let emailPreview: { to: string; subject: string; body: string } | null = null
  if (input.patientEmail) {
    const result = await emailProvider.send({
      to: input.patientEmail,
      subject: `Confirmación de reserva — ${tenant.name}`,
      body: [
        `Hola ${input.patientName},`,
        ``,
        `Tu reserva quedó registrada en ${tenant.name}:`,
        `• Servicio: ${service.name}`,
        `• Profesional: ${professional.name}`,
        `• Fecha: ${input.date} a las ${minutesToHHMM(input.startMinute)}`,
        `• Duración estimada: ${service.durationMin} min`,
        ``,
        `Para cancelar usa este enlace (guárdalo):`,
        `${buildCancelUrl(origin, created.id, created.cancelToken)}`,
      ].join('\n'),
    })
    emailPreview = result.preview
  }

  return { appointment: created, service, professional, emailPreview }
}

export function buildCancelUrl(origin: string | undefined, id: string, token: string): string {
  // En producción el template apunta a /{slug}/reserva/{id}?token=…;
  // en este entorno single-page usamos la raíz con query params.
  const base = origin && /^https?:\/\//.test(origin) ? origin : ''
  return `${base}/?cancel=${id}&token=${token}`
}

// ── Cancelación ─────────────────────────────────────────────────────────────

export async function getAppointmentByToken(tenantId: string, id: string, token: string) {
  const appt = await db.appointment.findFirst({ where: { id, tenantId } })
  if (!appt || appt.cancelToken !== token) {
    throw new HttpError(404, 'NOT_FOUND', 'Reserva no encontrada o token inválido.')
  }
  const service = appt.serviceId
    ? await db.service.findUnique({ where: { id: appt.serviceId } })
    : null
  const professional = await db.professional.findUnique({ where: { id: appt.professionalId } })
  return { appointment: appt, service, professional }
}

export async function cancelByToken(tenantId: string, id: string, token: string) {
  const { appointment } = await getAppointmentByToken(tenantId, id, token)
  if (appointment.status === 'CANCELLED') {
    throw new HttpError(409, 'ALREADY_CANCELLED', 'Esta reserva ya fue cancelada.')
  }
  if (appointment.end.getTime() < Date.now()) {
    throw new HttpError(400, 'PAST_APPOINTMENT', 'No se puede cancelar una cita que ya ocurrió.')
  }
  const updated = await db.appointment.update({
    where: { id },
    data: { status: 'CANCELLED', metadata: toJsonString({ ...(appointment as { metadata?: string }).metadata ? JSON.parse((appointment as { metadata: string }).metadata) : {}, cancelledBy: 'PATIENT' }) },
  })
  return updated
}

export async function adminTransition(tenantId: string, id: string, status: AppointmentStatus) {
  const appt = await db.appointment.findFirst({ where: { id, tenantId } })
  if (!appt) throw new HttpError(404, 'NOT_FOUND', 'Cita no encontrada.')
  if (appt.status === status) return appt
  return db.appointment.update({ where: { id }, data: { status } })
}

// ── Bloqueo manual de agenda ────────────────────────────────────────────────

export async function blockTime(
  tenantId: string,
  input: { professionalId: string; locationId?: string | null; date: string; startMinute: number; endMinute: number; reason?: string | null },
) {
  const professional = await db.professional.findFirst({
    where: { id: input.professionalId, tenantId, active: true },
  })
  if (!professional) throw new HttpError(404, 'NOT_FOUND', 'Profesional no encontrado.')

  const start = quitoToUtc(input.date, input.startMinute)
  const end = quitoToUtc(input.date, input.endMinute)
  if (end <= start) throw new HttpError(400, 'INVALID_RANGE', 'La hora fin debe ser mayor a la inicio.')

  // Las citas activas en el rango se avisan (el bloqueo igual se aplica):
  const overlapping = await db.appointment.count({
    where: {
      professionalId: input.professionalId,
      status: { in: APPOINTMENT_ACTIVE_STATUSES },
      start: { lt: end },
      end: { gt: start },
    },
  })
  if (overlapping > 0) {
    throw new HttpError(409, 'HAS_APPOINTMENTS', 'Hay citas activas en ese rango. Cancélalas o cancela primero.')
  }

  return db.appointment.create({
    data: AppointmentFactory.create({
      tenantId,
      serviceId: null,
      professionalId: input.professionalId,
      locationId: input.locationId ?? professional.locationId ?? null,
      start,
      end,
      patientName: null,
      patientPhone: null,
      status: 'BLOCKED',
      source: 'ADMIN',
      metadata: { type: 'block', reason: input.reason ?? 'Bloqueo manual' },
    }),
  })
}

// ── Listado admin (por rango visible del calendario + cursor) ──────────────

export async function listAppointmentsAdmin(
  reqUrl: string,
  tenantId: string,
): Promise<{ data: Record<string, unknown>[]; meta: { nextCursor: string | null; hasMore: boolean } }> {
  const sp = new URL(reqUrl).searchParams
  const { limit, cursor } = getPaginationParams(sp, 500)

  const where: Record<string, unknown> = { tenantId }
  const from = sp.get('from')
  const to = sp.get('to')
  if (from || to) {
    where.start = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    }
  }
  const professionalId = sp.get('professionalId')
  if (professionalId) where.professionalId = professionalId
  const status = sp.get('status')
  if (status) where.status = status
  if (sp.get('hideCancelled') === 'true') {
    where.status = status ? status : { not: 'CANCELLED' }
  }

  const rows = await db.appointment.findMany({
    where: cursor
      ? { AND: [where, cursorAscWhere(cursor, 'start')] }
      : where,
    orderBy: [{ start: 'asc' }, { id: 'asc' }],
    take: limit + 1,
    include: {
      service: { select: { id: true, name: true, durationMin: true, price: true } },
      professional: { select: { id: true, name: true, specialty: true } },
      location: { select: { id: true, name: true } },
    },
  })

  const page = buildPage(rows as unknown as Record<string, unknown>[], limit, 'start')
  return { data: page.data, meta: page.meta }
}
