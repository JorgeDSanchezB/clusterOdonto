/**
 * PÚBLICO — POST /api/[slug]/appointments
 * Crear reserva desde la web pública. El servidor revalida TODO (ventana,
 * solapamiento, lead time) dentro de una transacción. Devuelve la cita con su
 * link de cancelación por token.
 */
import type { NextRequest } from 'next/server'
import { ok, runApi, readJsonBody } from '@/lib/api-helpers'
import { getTenantBySlugOr404 } from '@/application/use-cases/tenants'
import { buildCancelUrl, createAppointment } from '@/application/use-cases/booking'
import { appointmentCreateSchema } from '@/domain/schemas'
import { minutesToHHMM, utcToQuito } from '@/lib/quito-time'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  return runApi(async () => {
    const { slug } = await params
    const tenant = await getTenantBySlugOr404(slug)

    const body = appointmentCreateSchema.parse(await readJsonBody(req))
    const origin = req.headers.get('origin') ?? undefined
    const { appointment, service, professional, emailPreview } = await createAppointment(tenant, {
      serviceId: body.serviceId,
      professionalId: body.professionalId,
      locationId: body.locationId ?? null,
      date: body.date,
      startMinute: body.startMinute,
      patientName: body.patientName,
      patientPhone: body.patientPhone,
      patientEmail: body.patientEmail ?? null,
      notes: body.notes ?? null,
    }, 'PUBLIC', origin)

    const q = utcToQuito(appointment.start)
    return ok({
      id: appointment.id,
      status: appointment.status,
      date: q.dateStr,
      startTime: minutesToHHMM(q.minutes),
      start: appointment.start,
      end: appointment.end,
      service: { id: service.id, name: service.name, price: service.price, durationMin: service.durationMin },
      professional: { id: professional.id, name: professional.name },
      cancelToken: appointment.cancelToken,
      cancelUrl: buildCancelUrl(origin, appointment.id, appointment.cancelToken),
      emailPreview,
    }, undefined, 201)
  })
}
