/**
 * ADMIN — GET /api/admin/invoices/[id] — detalle de la factura.
 */
import type { NextRequest } from 'next/server'
import { ok, runApi } from '@/lib/api-helpers'
import { requireUser } from '@/infrastructure/auth-guard'
import { getInvoiceOr404 } from '@/application/use-cases/invoices'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER'])
    const { id } = await params
    if (!user.tenantId) return ok(null)
    const invoice = await getInvoiceOr404(user.tenantId, id)
    return ok(invoice)
  })
}
