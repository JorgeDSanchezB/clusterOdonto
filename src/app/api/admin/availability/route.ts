/**
 * ADMIN — GET/POST/DELETE /api/admin/availability
 * GET    ?professionalId= — ventanas del profesional.
 * POST   añade una ventana { professionalId, weekday, startMinute, endMinute, locationId? }.
 * DELETE ?id= — elimina una ventana.
 */
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ok, runApi, readJsonBody, HttpError } from '@/lib/api-helpers'
import { requireUser } from '@/infrastructure/auth-guard'

const windowSchema = z.object({
  professionalId: z.string().uuid(),
  weekday: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(1).max(1440),
  locationId: z.string().uuid().nullish(),
})

export async function GET(req: NextRequest) {
  return runApi(async () => {
    const user = await requireUser(req)
    if (!user.tenantId) return ok([])
    const professionalId = new URL(req.url).searchParams.get('professionalId')
    const rows = await db.availability.findMany({
      where: professionalId
        ? { professionalId, professional: { tenantId: user.tenantId } }
        : { professional: { tenantId: user.tenantId } },
      orderBy: [{ professionalId: 'asc' }, { weekday: 'asc' }, { startMinute: 'asc' }],
    })
    return ok(rows)
  })
}

export async function POST(req: NextRequest) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER', 'STAFF'])
    if (!user.tenantId) throw new HttpError(400, 'NO_TENANT', 'Usuario sin tenant.')
    const body = windowSchema.parse(await readJsonBody(req))
    if (body.startMinute >= body.endMinute) {
      throw new HttpError(400, 'INVALID_WINDOW', 'La hora fin debe ser mayor a la inicio.')
    }
    const professional = await db.professional.findFirst({
      where: { id: body.professionalId, tenantId: user.tenantId },
    })
    if (!professional) throw new HttpError(404, 'NOT_FOUND', 'Profesional no encontrado.')
    const row = await db.availability.create({
      data: {
        professionalId: body.professionalId,
        weekday: body.weekday,
        startMinute: body.startMinute,
        endMinute: body.endMinute,
        locationId: body.locationId ?? null,
      },
    })
    return ok(row, undefined, 201)
  })
}

export async function DELETE(req: NextRequest) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER', 'STAFF'])
    if (!user.tenantId) return ok({ ok: true })
    const id = new URL(req.url).searchParams.get('id')
    if (!id) throw new HttpError(400, 'MISSING_ID', 'Parámetro id requerido.')
    const existing = await db.availability.findFirst({
      where: { id, professional: { tenantId: user.tenantId } },
    })
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Ventana no encontrada.')
    await db.availability.delete({ where: { id } })
    return ok({ ok: true })
  })
}
