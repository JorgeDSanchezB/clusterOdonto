/**
 * ADMIN — GET/POST /api/admin/services
 * GET  lista con ?limit=&cursor= (paginación por cursor).
 * POST crea un servicio. Zod `.passthrough()` → claves extra a `metadata`
 * (regla del "Servicio": atributos nuevos SIN recompilar).
 */
import type { NextRequest } from 'next/server'
import { ok, runApi, readJsonBody, HttpError } from '@/lib/api-helpers'
import { requireUser } from '@/infrastructure/auth-guard'
import { createService, listServices } from '@/application/use-cases/services'
import { serviceCreateSchema } from '@/domain/schemas'

export async function GET(req: NextRequest) {
  return runApi(async () => {
    const user = await requireUser(req)
    if (!user.tenantId) return ok([], { nextCursor: null, hasMore: false })
    const result = await listServices(req.url, user.tenantId, { activeOnly: false })
    return ok(result.data, result.meta)
  })
}

export async function POST(req: NextRequest) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER', 'STAFF'])
    if (!user.tenantId) throw new HttpError(400, 'NO_TENANT', 'Usuario sin tenant.')
    const body = serviceCreateSchema.parse(await readJsonBody(req))
    const service = await createService(user.tenantId, { ...body, tenantId: user.tenantId })
    return ok(service, undefined, 201)
  })
}
