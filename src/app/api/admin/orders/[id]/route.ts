/**
 * ADMIN — PUT /api/admin/orders/[id] — cambiar estado (CONTACTED/COMPLETED/CANCELLED).
 */
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, runApi, readJsonBody } from '@/lib/api-helpers'
import { requireUser } from '@/infrastructure/auth-guard'
import { updateOrderStatus } from '@/application/use-cases/orders'
import { orderStatusSchema } from '@/domain/schemas'

const bodySchema = z.object({ status: orderStatusSchema })

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER', 'STAFF'])
    const { id } = await params
    if (!user.tenantId) return ok(null)
    const body = bodySchema.parse(await readJsonBody(req))
    const order = await updateOrderStatus(user.tenantId, id, body.status)
    return ok({ id: order.id, status: order.status })
  })
}
