/**
 * PÚBLICO — GET /api/[slug]/appointments/[id]?token=
 * Vista previa (para el paciente) de SU reserva antes de cancelar.
 */
import type { NextRequest } from 'next/server'
import { ok, runApi, HttpError } from '@/lib/api-helpers'
import { getTenantBySlugOr404 } from '@/application/use-cases/tenants'
import { getAppointmentByToken } from '@/application/use-cases/booking'
import { formatQuitoDateLong, minutesToHHMM, utcToQuito } from '@/lib/quito-time'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  return runApi(async () => {
    const { slug, id } = await params
    const tenant = await getTenantBySlugOr404(slug)

    const token = new URL(req.url).searchParams.get('token')
    if (!token) throw new HttpError(403, 'FORBIDDEN', 'Token requerido.')

    const { appointment, service, professional } = await getAppointmentByToken(tenant.id, id, token)
    const q = utcToQuito(appointment.start)

    return ok({
      id: appointment.id,
      status: appointment.status,
      patientName: appointment.patientName,
      dateLabel: formatQuitoDateLong(appointment.start),
      date: q.dateStr,
      startTime: minutesToHHMM(q.minutes),
      endTime: minutesToHHMM(utcToQuito(appointment.end).minutes),
      service: service ? { name: service.name } : null,
      professional: professional ? { name: professional.name } : null,
    })
  })
}
