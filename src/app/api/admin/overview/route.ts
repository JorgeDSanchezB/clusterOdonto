/**
 * ADMIN — GET /api/admin/overview — métricas del dashboard.
 */
import type { NextRequest } from 'next/server'
import { ok, runApi } from '@/lib/api-helpers'
import { requireUser } from '@/infrastructure/auth-guard'
import { getOverview } from '@/application/use-cases/tenants'

export async function GET(req: NextRequest) {
  return runApi(async () => {
    const user = await requireUser(req)
    if (!user.tenantId) return ok(null) // super-admin sin tenant
    const overview = await getOverview(user.tenantId)
    return ok(overview)
  })
}
