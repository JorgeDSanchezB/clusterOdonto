/**
 * ADMIN — GET /api/admin/content — contenido por secciones (para el editor).
 */
import type { NextRequest } from 'next/server'
import { ok, runApi } from '@/lib/api-helpers'
import { requireUser } from '@/infrastructure/auth-guard'
import { getTenantContent } from '@/application/use-cases/tenants'

export async function GET(req: NextRequest) {
  return runApi(async () => {
    const user = await requireUser(req)
    if (!user.tenantId) return ok({})
    const content = await getTenantContent(user.tenantId)
    return ok(content)
  })
}
