/**
 * ADMIN — PUT /api/admin/content/[section]
 * Guarda el JSONB de una sección (hero, about, testimonials, … o futuras).
 */
import type { NextRequest } from 'next/server'
import { ok, runApi, readJsonBody } from '@/lib/api-helpers'
import { requireUser } from '@/infrastructure/auth-guard'
import { updateContentSection } from '@/application/use-cases/tenants'
import { contentUpdateSchema } from '@/domain/schemas'
import { toJsonString } from '@/lib/json'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ section: string }> }) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER'])
    const { section } = await params
    if (!user.tenantId) return ok(null)

    const data = contentUpdateSchema.parse(await readJsonBody(req))
    const row = await updateContentSection(user.tenantId, section, data)
    return ok({ section, data: row.data, savedAt: row.updatedAt, raw: toJsonString(data).length })
  })
}
