/**
 * PÚBLICO — GET /api/[slug]/locations
 * Sedes activas del tenant (con paginación por cursor).
 */
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, runApi } from '@/lib/api-helpers'
import { getTenantBySlugOr404 } from '@/application/use-cases/tenants'
import { buildPage, cursorDescWhere, getPaginationParams } from '@/lib/pagination'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  return runApi(async () => {
    const { slug } = await params
    const tenant = await getTenantBySlugOr404(slug)
    const { limit, cursor } = getPaginationParams(new URL(req.url).searchParams)
    const where: Record<string, unknown> = { tenantId: tenant.id, active: true }
    const rows = await db.location.findMany({
      where: cursor ? { AND: [where, cursorDescWhere(cursor, 'createdAt')] } : where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })
    const page = buildPage(rows as unknown as Record<string, unknown>[], limit, 'createdAt')
    return ok(page.data, page.meta)
  })
}
