/**
 * ADMIN — GET/POST /api/admin/locations
 */
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, runApi, readJsonBody, HttpError } from '@/lib/api-helpers'
import { requireUser } from '@/infrastructure/auth-guard'
import { locationCreateSchema } from '@/domain/schemas'
import { buildPage, cursorDescWhere, getPaginationParams } from '@/lib/pagination'

export async function GET(req: NextRequest) {
  return runApi(async () => {
    const user = await requireUser(req)
    if (!user.tenantId) return ok([], { nextCursor: null, hasMore: false })
    const { limit, cursor } = getPaginationParams(new URL(req.url).searchParams)
    const where: Record<string, unknown> = { tenantId: user.tenantId }
    const rows = await db.location.findMany({
      where: cursor ? { AND: [where, cursorDescWhere(cursor, 'createdAt')] } : where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })
    const page = buildPage(rows as unknown as Record<string, unknown>[], limit, 'createdAt')
    return ok(page.data, page.meta)
  })
}

export async function POST(req: NextRequest) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER', 'STAFF'])
    if (!user.tenantId) throw new HttpError(400, 'NO_TENANT', 'Usuario sin tenant.')
    const body = locationCreateSchema.parse(await readJsonBody(req))
    const row = await db.location.create({
      data: { ...body, tenantId: user.tenantId, phone: body.phone ?? null, mapQuery: body.mapQuery ?? null },
    })
    return ok(row, undefined, 201)
  })
}
