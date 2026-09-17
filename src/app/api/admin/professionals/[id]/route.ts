/**
 * ADMIN — PUT/DELETE /api/admin/professionals/[id]
 * PUT reemplaza la disponibilidad si viene en el payload.
 */
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, runApi, readJsonBody, HttpError } from '@/lib/api-helpers'
import { requireUser } from '@/infrastructure/auth-guard'
import { professionalUpdateSchema } from '@/domain/schemas'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER', 'STAFF'])
    const { id } = await params
    if (!user.tenantId) return ok(null)

    const body = professionalUpdateSchema.parse(await readJsonBody(req))
    const { availability, ...fields } = body

    const existing = await db.professional.findFirst({ where: { id, tenantId: user.tenantId } })
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Profesional no encontrado.')

    const updated = await db.$transaction(async (tx) => {
      const patch: Record<string, unknown> = {}
      for (const key of ['name', 'specialty', 'bio', 'photoUrl', 'locationId', 'active', 'sortOrder']) {
        if ((fields as Record<string, unknown>)[key] !== undefined) {
          patch[key] = (fields as Record<string, unknown>)[key]
        }
      }
      const row = await tx.professional.update({ where: { id }, data: patch })
      if (availability) {
        await tx.availability.deleteMany({ where: { professionalId: id } })
        for (const w of availability) {
          if (w.startMinute >= w.endMinute) continue
          await tx.availability.create({
            data: {
              professionalId: id,
              locationId: w.locationId ?? fields.locationId ?? null,
              weekday: w.weekday,
              startMinute: w.startMinute,
              endMinute: w.endMinute,
            },
          })
        }
      }
      return row
    })

    const withAvailability = await db.professional.findUnique({
      where: { id: updated.id },
      include: { availabilities: true },
    })
    return ok(withAvailability)
  })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER'])
    const { id } = await params
    if (!user.tenantId) return ok({ ok: true })
    const existing = await db.professional.findFirst({ where: { id, tenantId: user.tenantId } })
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Profesional no encontrado.')
    await db.professional.delete({ where: { id } })
    return ok({ ok: true })
  })
}
