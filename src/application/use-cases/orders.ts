/**
 * APLICACIÓN — Casos de uso de pedidos (carrito → WhatsApp + bandeja admin).
 */
import { db } from '@/lib/db'
import { HttpError } from '@/lib/api-helpers'
import { buildPage, cursorDescWhere, getPaginationParams } from '@/lib/pagination'
import { OrderFactory } from '@/domain/factories'
import { buildOrderWhatsAppMessage, buildWhatsAppUrl } from '@/lib/whatsapp'
import { safeJsonParse } from '@/lib/json'
import type { OrderItem } from '@/domain/entities'

export async function createOrder(
  tenant: { id: string; name: string; whatsapp: string | null; ivaPercent: number },
  input: { customerName: string; customerPhone: string; customerEmail: string | null; items: { serviceId: string; qty: number }[] },
) {
  // Snapshot de precios desde BD (fuente de verdad; nunca se confía en el cliente)
  const services = await db.service.findMany({
    where: { id: { in: input.items.map((i) => i.serviceId) }, tenantId: tenant.id, active: true },
  })
  if (services.length !== new Set(input.items.map((i) => i.serviceId)).size) {
    throw new HttpError(400, 'INVALID_ITEMS', 'Uno o más servicios no están disponibles.')
  }

  const items: OrderItem[] = input.items.map((i) => {
    const svc = services.find((s) => s.id === i.serviceId)!
    return { serviceId: svc.id, name: svc.name, price: svc.price, qty: i.qty }
  })

  const orderRow = await db.order.create({
    data: OrderFactory.create({
      tenantId: tenant.id,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      items,
    }),
  })

  const message = buildOrderWhatsAppMessage({
    clinicName: tenant.name,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    items,
    ivaPercent: tenant.ivaPercent,
    orderId: orderRow.id,
  })

  const whatsappUrl = buildWhatsAppUrl(tenant.whatsapp ?? input.customerPhone, message)

  // Marcamos el momento en que se abrió el flujo de WhatsApp
  const updated = await db.order.update({
    where: { id: orderRow.id },
    data: { whatsappSentAt: new Date() },
  })

  return {
    order: { ...updated, items, metadata: {} },
    whatsappUrl,
    message,
  }
}

export async function listOrdersAdmin(reqUrl: string, tenantId: string) {
  const sp = new URL(reqUrl).searchParams
  const { limit, cursor } = getPaginationParams(sp)
  const where: Record<string, unknown> = { tenantId }
  const status = sp.get('status')
  if (status) where.status = status

  const rows = await db.order.findMany({
    where: cursor ? { AND: [where, cursorDescWhere(cursor, 'createdAt')] } : where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  })

  const page = buildPage(rows as unknown as Record<string, unknown>[], limit, 'createdAt')
  return {
    data: page.data.map((r) => {
      const row = r as { items: string; metadata: string } & Record<string, unknown>
      return { ...row, items: safeJsonParse<OrderItem[]>(row.items, []), metadata: safeJsonParse(row.metadata, {}) }
    }),
    meta: page.meta,
  }
}

export async function updateOrderStatus(tenantId: string, id: string, status: string) {
  const order = await db.order.findFirst({ where: { id, tenantId } })
  if (!order) throw new HttpError(404, 'NOT_FOUND', 'Pedido no encontrado.')
  return db.order.update({ where: { id }, data: { status } })
}
