/**
 * PÚBLICO — POST /api/[slug]/appointments/[id]/cancel?token=
 * Cancelación de la reserva por el paciente (token secreto) → libera el slot.
 */
import type { NextRequest } from 'next/server'
import { ok, runApi, HttpError } from '@/lib/api-helpers'
import { getTenantBySlugOr404 } from '@/application/use-cases/tenants'
import { cancelByToken, getAppointmentByToken } from '@/application/use-cases/booking'
import { formatQuitoDateLong } from '@/lib/quito-time'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  return runApi(async () => {
    const { slug, id } = await params
    const tenant = await getTenantBySlugOr404(slug)

    const token = new URL(req.url).searchParams.get('token')
    if (!token) throw new HttpError(403, 'FORBIDDEN', 'Token requerido.')

    // Resumen previo para el mensaje de éxito
    const before = await getAppointmentByToken(tenant.id, id, token)
    const updated = await cancelByToken(tenant.id, id, token)

    return ok({
      id: updated.id,
      status: updated.status,
      dateLabel: formatQuitoDateLong(before.appointment.start),
      service: before.service?.name ?? null,
    })
  })
}
