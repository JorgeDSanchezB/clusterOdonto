/**
 * ADMIN — PUT/DELETE /api/admin/locations/[id]
 */
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, runApi, readJsonBody, HttpError } from '@/lib/api-helpers'
import { requireUser } from '@/infrastructure/auth-guard'
import { locationUpdateSchema } from '@/domain/schemas'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER', 'STAFF'])
    const { id } = await params
    if (!user.tenantId) return ok(null)
    const existing = await db.location.findFirst({ where: { id, tenantId: user.tenantId } })
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Sede no encontrada.')
    const body = locationUpdateSchema.parse(await readJsonBody(req))
    const row = await db.location.update({ where: { id }, data: body })
    return ok(row)
  })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER'])
    const { id } = await params
    if (!user.tenantId) return ok({ ok: true })
    const existing = await db.location.findFirst({ where: { id, tenantId: user.tenantId } })
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Sede no encontrada.')
    await db.location.delete({ where: { id } })
    return ok({ ok: true })
  })
}
