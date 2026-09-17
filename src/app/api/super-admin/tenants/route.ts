/**
 * SUPER-ADMIN — GET/POST /api/super-admin/tenants
 * GET  lista tenants con métricas. POST alta de un odontólogo nuevo:
 * crea tenant + usuario OWNER + contenido por defecto (todo listo para editar).
 */
import type { NextRequest } from 'next/server'
import { ok, runApi, readJsonBody } from '@/lib/api-helpers'
import { requireUser } from '@/infrastructure/auth-guard'
import { createTenantSuperAdmin, listTenantsForSuperAdmin } from '@/application/use-cases/tenants'
import { tenantCreateSchema } from '@/domain/schemas'

export async function GET(req: NextRequest) {
  return runApi(async () => {
    await requireUser(req, ['SUPER_ADMIN'])
    return ok(await listTenantsForSuperAdmin())
  })
}

export async function POST(req: NextRequest) {
  return runApi(async () => {
    await requireUser(req, ['SUPER_ADMIN'])
    const body = tenantCreateSchema.parse(await readJsonBody(req))
    const result = await createTenantSuperAdmin(body)
    return ok(
      {
        tenant: { id: result.tenant.id, slug: result.tenant.slug, name: result.tenant.name },
        ownerEmail: result.ownerEmail,
        siteUrl: `/?site=${result.tenant.slug}`,
      },
      undefined,
      201,
    )
  })
}
