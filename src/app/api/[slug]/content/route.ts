/**
 * PÚBLICO — GET /api/[slug]/content
 * Contenido editable por secciones del sitio del tenant (con defaults tolerantes).
 */
import type { NextRequest } from 'next/server'
import { ok, runApi } from '@/lib/api-helpers'
import { getPublicTenantData } from '@/application/use-cases/tenants'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  return runApi(async () => {
    const { slug } = await params
    const { content } = await getPublicTenantData(slug)
    return ok(content)
  })
}
