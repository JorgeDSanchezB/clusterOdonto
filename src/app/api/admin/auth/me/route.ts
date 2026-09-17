/**
 * ADMIN — GET /api/admin/auth/me — usuario actual (restaura sesión al recargar).
 * Incluye el nombre del tenant para el header del panel.
 */
import { db } from '@/lib/db'
import { ok, runApi } from '@/lib/api-helpers'
import { requireUser } from '@/infrastructure/auth-guard'

export async function GET(req: Request) {
  return runApi(async () => {
    const user = await requireUser(req)
    const tenant = user.tenantId
      ? await db.tenant.findUnique({ where: { id: user.tenantId }, select: { name: true, slug: true } })
      : null
    return ok({ user, tenantName: tenant?.name ?? null, tenantSlug: tenant?.slug ?? null })
  })
}
