/**
 * PÚBLICO — GET /api/[slug]/services?limit=&cursor=&active=
 * Catálogo de servicios con paginación por cursor.
 */
import type { NextRequest } from 'next/server'
import { ok, runApi } from '@/lib/api-helpers'
import { getTenantBySlugOr404 } from '@/application/use-cases/tenants'
import { listServices } from '@/application/use-cases/services'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  return runApi(async () => {
    const { slug } = await params
    const tenant = await getTenantBySlugOr404(slug)
    const result = await listServices(req.url, tenant.id, { activeOnly: true })
    return ok(result.data, result.meta)
  })
}
