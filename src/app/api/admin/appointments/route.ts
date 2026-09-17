/**
 * ADMIN — GET/POST /api/admin/appointments
 * GET  ?from=&to=&professionalId=&status=&cursor=&limit= (rango visible del
 *      calendario: NUNCA se cargan todas las citas históricas).
 * POST crea una cita directamente desde el panel (source=ADMIN, confirmada).
 */
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, runApi, readJsonBody, HttpError } from '@/lib/api-helpers'
import { requireUser } from '@/infrastructure/auth-guard'
import { createAppointment, listAppointmentsAdmin } from '@/application/use-cases/booking'
import { appointmentAdminCreateSchema } from '@/domain/schemas'
import { minutesToHHMM, utcToQuito } from '@/lib/quito-time'

export async function GET(req: NextRequest) {
  return runApi(async () => {
    const user = await requireUser(req)
    if (!user.tenantId) return ok([], { nextCursor: null, hasMore: false })
    const result = await listAppointmentsAdmin(req.url, user.tenantId)
    return ok(result.data, result.meta)
  })
}

export async function POST(req: NextRequest) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER', 'STAFF'])
    if (!user.tenantId) throw new HttpError(400, 'NO_TENANT', 'Usuario sin tenant.')
    const tenant = await db.tenant.findUnique({ where: { id: user.tenantId } })
    if (!tenant) throw new HttpError(404, 'NOT_FOUND', 'Tenant no encontrado.')

    const body = appointmentAdminCreateSchema.parse(await readJsonBody(req))
    const origin = req.headers.get('origin') ?? undefined
    const { appointment, service, professional } = await createAppointment(
      tenant,
      { ...body, locationId: body.locationId ?? null },
      'ADMIN',
      origin,
    )
    const q = utcToQuito(appointment.start)
    return ok(
      {
        id: appointment.id,
        status: appointment.status,
        date: q.dateStr,
        startTime: minutesToHHMM(q.minutes),
        service: service.name,
        professional: professional.name,
      },
      undefined,
      201,
    )
  })
}
