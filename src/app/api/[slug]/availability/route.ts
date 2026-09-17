/**
 * PÚBLICO — GET /api/[slug]/availability?serviceId=&professionalId=&locationId=&date=
 * Slots disponibles para un servicio en una fecha (hora Quito).
 */
import type { NextRequest } from 'next/server'
import { ok, runApi, HttpError } from '@/lib/api-helpers'
import { getTenantBySlugOr404 } from '@/application/use-cases/tenants'
import { getAvailability } from '@/application/use-cases/booking'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  return runApi(async () => {
    const { slug } = await params
    const tenant = await getTenantBySlugOr404(slug)

    const sp = new URL(req.url).searchParams
    const serviceId = sp.get('serviceId')
    const date = sp.get('date')
    if (!serviceId || !date) {
      throw new HttpError(400, 'MISSING_PARAMS', 'Se requieren serviceId y date (YYYY-MM-DD).')
    }

    const result = await getAvailability(tenant, {
      serviceId,
      professionalId: sp.get('professionalId'),
      locationId: sp.get('locationId'),
      date,
    })
    return ok(result)
  })
}
