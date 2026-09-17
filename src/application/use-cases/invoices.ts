/**
 * APLICACIÓN — Casos de uso de facturación.
 * Numeración secuencial atómica (tabla Sequence) + generación de PDF local +
 * envío por email vía EmailProvider (console en dev).
 * La factura es un documento comercial interno; NO se envía al SRI.
 * v2: SriInvoiceProvider implementará la interfaz sin tocar este archivo.
 */
import { readFile } from 'fs/promises'
import path from 'path'
import { db } from '@/lib/db'
import { HttpError } from '@/lib/api-helpers'
import { buildPage, cursorDescWhere, getPaginationParams } from '@/lib/pagination'
import { InvoiceFactory } from '@/domain/factories'
import { invoiceProvider } from '@/infrastructure/pdf/invoice-provider'
import { emailProvider } from '@/infrastructure/email'
import { safeJsonParse, toJsonString } from '@/lib/json'
import { INVOICE_NUMBER_PAD } from '@/lib/constants'
import type { InvoiceEntity, InvoiceItem, OrderItem } from '@/domain/entities'

function padNumber(n: number, pad: number): string {
  return String(n).padStart(pad, '0')
}

/** Resuelve el logo a algo que @react-pdf pueda consumir (data URI o URL). */
async function resolveLogoSrc(logoUrl: string | null): Promise<string | null> {
  if (!logoUrl) return null
  if (/^https?:\/\//.test(logoUrl)) return logoUrl
  if (logoUrl.startsWith('/uploads/')) {
    try {
      const abs = path.join(process.cwd(), 'public', logoUrl)
      const buf = await readFile(abs)
      const ext = path.extname(logoUrl).toLowerCase()
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.svg' ? 'image/svg+xml' : 'image/jpeg'
      return `data:${mime};base64,${buf.toString('base64')}`
    } catch {
      return null // tolerante: sin logo, la factura usa placeholder
    }
  }
  return null
}

export async function createInvoiceFromOrder(
  user: { tenantId: string },
  input: { orderId: string; customerEmail?: string | null },
) {
  const tenantId = user.tenantId
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw new HttpError(404, 'NOT_FOUND', 'Tenant no encontrado.')

  const order = await db.order.findFirst({ where: { id: input.orderId, tenantId } })
  if (!order) throw new HttpError(404, 'NOT_FOUND', 'Pedido no encontrado.')

  const existing = await db.invoice.findFirst({ where: { orderId: order.id, tenantId } })
  if (existing) {
    return { invoice: toInvoiceEntity(existing), created: false }
  }

  const orderItems = safeJsonParse<OrderItem[]>(order.items, [])
  const items: InvoiceItem[] = orderItems.map((it) => ({
    description: it.name,
    qty: it.qty,
    unitPrice: it.price,
    total: Math.round(it.price * it.qty * 100) / 100,
  }))

  const prefix = safeJsonParse<{ invoicePrefix?: string }>(tenant.config, {}).invoicePrefix ?? '001-001'

  // Numeración secuencial ATÓMICA: upsert + increment en transacción
  const number = await db.$transaction(async (tx) => {
    const seq = await tx.sequence.upsert({
      where: { tenantId_prefix: { tenantId, prefix } },
      create: { tenantId, prefix, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    })
    return `${prefix}-${padNumber(seq.lastNumber, INVOICE_NUMBER_PAD)}`
  })

  const draft = InvoiceFactory.create({
    tenantId,
    orderId: order.id,
    number,
    customerName: order.customerName,
    customerEmail: input.customerEmail ?? order.customerEmail,
    items,
    ivaRate: tenant.ivaPercent,
  })

  const row = await db.invoice.create({
    data: {
      ...draft,
      items: toJsonString(draft.items),
      metadata: toJsonString({ source: 'order', orderCode: order.id.slice(0, 8).toUpperCase() }),
    },
  })

  return { invoice: toInvoiceEntity(row), created: true }
}

export function toInvoiceEntity(row: {
  items: string
  metadata: string
} & Record<string, unknown>): InvoiceEntity {
  return {
    ...(row as unknown as InvoiceEntity),
    items: safeJsonParse<InvoiceItem[]>(row.items, []),
    metadata: safeJsonParse<Record<string, unknown>>(row.metadata, {}),
  }
}

export async function getInvoiceOr404(tenantId: string, id: string): Promise<InvoiceEntity> {
  const row = await db.invoice.findFirst({ where: { id, tenantId } })
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Factura no encontrada.')
  return toInvoiceEntity(row)
}

export async function listInvoicesAdmin(reqUrl: string, tenantId: string) {
  const sp = new URL(reqUrl).searchParams
  const { limit, cursor } = getPaginationParams(sp)
  const where: Record<string, unknown> = { tenantId }

  const rows = await db.invoice.findMany({
    where: cursor ? { AND: [where, cursorDescWhere(cursor, 'createdAt')] } : where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  })

  const page = buildPage(rows as unknown as Record<string, unknown>[], limit, 'createdAt')
  return { data: page.data.map((r) => toInvoiceEntity(r as { items: string; metadata: string } & Record<string, unknown>)), meta: page.meta }
}

/** Genera el PDF (LocalPdfInvoiceProvider) con el tema del tenant. */
export async function generateInvoicePdf(tenantId: string, id: string): Promise<{ bytes: Uint8Array; number: string }> {
  const invoice = await getInvoiceOr404(tenantId, id)
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw new HttpError(404, 'NOT_FOUND', 'Tenant no encontrado.')

  const config = safeJsonParse<{ theme?: { primary?: string } }>(tenant.config, {})
  const primaryColor = config.theme?.primary ?? '#0f766e'
  const logoSrc = await resolveLogoSrc(tenant.logoUrl)

  const bytes = await invoiceProvider.generate({
    invoice,
    tenant: {
      name: tenant.name,
      ruc: tenant.ruc,
      address: tenant.address,
      city: tenant.city,
      phone: tenant.phone,
      email: tenant.email,
      logoUrl: logoSrc,
    },
    primaryColor,
  })
  return { bytes, number: invoice.number }
}

/** Envía la factura por email (ConsoleEmailProvider en dev) y marca el envío. */
export async function sendInvoiceEmail(tenantId: string, id: string) {
  const invoice = await getInvoiceOr404(tenantId, id)
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw new HttpError(404, 'NOT_FOUND', 'Tenant no encontrado.')
  if (!invoice.customerEmail) {
    throw new HttpError(400, 'NO_EMAIL', 'El pedido no tiene email del paciente.')
  }

  const lines = [
    `Hola ${invoice.customerName},`,
    ``,
    `Adjuntamos tu factura ${invoice.number} de ${tenant.name}:`,
    ...invoice.items.map((it) => `• ${it.description} ×${it.qty} — $${it.total.toFixed(2)}`),
    ``,
    `Subtotal: $${invoice.subtotal.toFixed(2)}`,
    `IVA (${invoice.ivaRate}%): $${invoice.ivaAmount.toFixed(2)}`,
    `TOTAL: $${invoice.total.toFixed(2)}`,
    ``,
    `¡Gracias por confiar en nosotros! 🦷`,
  ]

  const result = await emailProvider.send({
    to: invoice.customerEmail,
    subject: `Factura ${invoice.number} — ${tenant.name}`,
    body: lines.join('\n'),
  })

  await db.invoice.update({ where: { id: invoice.id }, data: { emailSentAt: new Date() } })
  return result
}
