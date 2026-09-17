/**
 * ADMIN — PUT/DELETE /api/admin/services/[id]
 */
import type { NextRequest } from 'next/server'
import { ok, runApi, readJsonBody } from '@/lib/api-helpers'
import { requireUser } from '@/infrastructure/auth-guard'
import { deleteService, updateService } from '@/application/use-cases/services'
import { serviceUpdateSchema } from '@/domain/schemas'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER', 'STAFF'])
    const { id } = await params
    if (!user.tenantId) return ok(null)
    const body = serviceUpdateSchema.parse(await readJsonBody(req))
    const service = await updateService(user.tenantId, id, body)
    return ok(service)
  })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER'])
    const { id } = await params
    if (!user.tenantId) return ok({ ok: true })
    await deleteService(user.tenantId, id)
    return ok({ ok: true })
  })
}
