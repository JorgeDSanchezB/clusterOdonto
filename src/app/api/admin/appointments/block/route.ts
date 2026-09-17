/**
 * ADMIN — POST /api/admin/appointments/block
 * Bloqueo manual de horario (almuerzo, vacaciones, urgencia) → el slot queda
 * ocupado y desaparece del picker público.
 */
import type { NextRequest } from 'next/server'
import { ok, runApi, readJsonBody, HttpError } from '@/lib/api-helpers'
import { requireUser } from '@/infrastructure/auth-guard'
import { blockTime } from '@/application/use-cases/booking'
import { blockCreateSchema } from '@/domain/schemas'

export async function POST(req: NextRequest) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER', 'STAFF'])
    if (!user.tenantId) throw new HttpError(400, 'NO_TENANT', 'Usuario sin tenant.')
    const body = blockCreateSchema.parse(await readJsonBody(req))
    const appointment = await blockTime(user.tenantId, body)
    return ok({ id: appointment.id, start: appointment.start, end: appointment.end }, undefined, 201)
  })
}
