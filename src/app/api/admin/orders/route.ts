/**
 * ADMIN — GET /api/admin/orders?limit=&cursor=&status= — bandeja de pedidos.
 */
import type { NextRequest } from 'next/server'
import { ok, runApi } from '@/lib/api-helpers'
import { requireUser } from '@/infrastructure/auth-guard'
import { listOrdersAdmin } from '@/application/use-cases/orders'

export async function GET(req: NextRequest) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER', 'STAFF'])
    if (!user.tenantId) return ok([], { nextCursor: null, hasMore: false })
    const result = await listOrdersAdmin(req.url, user.tenantId)
    return ok(result.data, result.meta)
  })
}
