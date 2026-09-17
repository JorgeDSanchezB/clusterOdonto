/**
 * PÚBLICO — GET /api/[slug]/tenant
 * Info pública del tenant: nombre, contacto, tema, IVA y horarios fusionados.
 * (Endpoint añadido al contrato original: el sitio público necesita el tema y
 * los horarios junto al contenido.)
 */
import type { NextRequest } from 'next/server'
import { ok, runApi } from '@/lib/api-helpers'
import { getPublicTenantData } from '@/application/use-cases/tenants'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  return runApi(async () => {
    const { slug } = await params
    const { tenant } = await getPublicTenantData(slug)
    return ok(tenant)
  })
}
