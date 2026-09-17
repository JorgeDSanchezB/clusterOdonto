/**
 * PÚBLICO — GET /api/tenants
 * Lista mínima de tenants (slug + nombre) para el selector de sitios del demo.
 * En producción este endpoint se restringe o elimina.
 */
import { db } from '@/lib/db'
import { ok, runApi } from '@/lib/api-helpers'
import { buildPage, getPaginationParams } from '@/lib/pagination'

export async function GET(req: Request) {
  return runApi(async () => {
    const { limit } = getPaginationParams(new URL(req.url).searchParams)
    const rows = await db.tenant.findMany({
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { slug: true, name: true, logoUrl: true },
    })
    return ok(rows, { nextCursor: null, hasMore: false })
  })
}
