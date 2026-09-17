/**
 * ADMIN — GET/POST /api/admin/invoices
 * GET  lista con cursor. POST genera factura desde un Order:
 * numeración secuencial atómica (tabla Sequence) + IVA configurable del tenant.
 */
import type { NextRequest } from 'next/server'
import { ok, runApi, readJsonBody } from '@/lib/api-helpers'
import { requireUser } from '@/infrastructure/auth-guard'
import { createInvoiceFromOrder, listInvoicesAdmin } from '@/application/use-cases/invoices'
import { invoiceCreateSchema } from '@/domain/schemas'

export async function GET(req: NextRequest) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER'])
    if (!user.tenantId) return ok([], { nextCursor: null, hasMore: false })
    const result = await listInvoicesAdmin(req.url, user.tenantId)
    return ok(result.data, result.meta)
  })
}

export async function POST(req: NextRequest) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER'])
    if (!user.tenantId) return ok(null)
    const body = invoiceCreateSchema.parse(await readJsonBody(req))
    const { invoice, created } = await createInvoiceFromOrder(user, {
      orderId: body.orderId,
      customerEmail: body.customerEmail ?? null,
    })
    return ok(invoice, { created }, 201)
  })
}
