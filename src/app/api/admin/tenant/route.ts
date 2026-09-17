/**
 * ADMIN — GET/PUT /api/admin/tenant
 * Perfil del consultorio + config (tema, IVA, paso de slots, prefijo factura).
 * PUT permite merge parcial: la edición de tema se guarda aquí y el sitio
 * público la refleja en vivo (sin recargar).
 */
import type { NextRequest } from 'next/server'
import { ok, runApi, readJsonBody } from '@/lib/api-helpers'
import { requireUser } from '@/infrastructure/auth-guard'
import { getTenantForAdmin, updateTenantProfile } from '@/application/use-cases/tenants'
import { tenantUpdateSchema } from '@/domain/schemas'

export async function GET(req: NextRequest) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER', 'STAFF'])
    if (!user.tenantId) return ok(null)
    return ok(await getTenantForAdmin(user.tenantId))
  })
}

export async function PUT(req: NextRequest) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER'])
    if (!user.tenantId) return ok(null)
    const body = tenantUpdateSchema.parse(await readJsonBody(req))
    const updated = await updateTenantProfile(user.tenantId, body)
    return ok(updated)
  })
}
