/**
 * PÚBLICO — POST /api/[slug]/orders
 * Guarda el pedido del carrito (aparece en la bandeja del admin) y devuelve
 * el mensaje de WhatsApp pre-armado + URL lista para abrir.
 */
import type { NextRequest } from 'next/server'
import { ok, runApi, readJsonBody } from '@/lib/api-helpers'
import { getTenantBySlugOr404 } from '@/application/use-cases/tenants'
import { createOrder } from '@/application/use-cases/orders'
import { orderCreateSchema } from '@/domain/schemas'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  return runApi(async () => {
    const { slug } = await params
    const tenant = await getTenantBySlugOr404(slug)

    const body = orderCreateSchema.parse(await readJsonBody(req))
    const { order, whatsappUrl, message } = await createOrder(tenant, {
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail ?? null,
      items: body.items,
    })

    return ok(
      {
        orderId: order.id,
        total: order.total,
        items: order.items,
        whatsappUrl,
        message,
      },
      undefined,
      201,
    )
  })
}
