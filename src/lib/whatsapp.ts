/**
 * Construcción del mensaje de WhatsApp pre-armado para pedidos del carrito.
 * El backend lo genera (fuente de verdad de precios) y lo devuelve al cliente.
 */
import type { OrderItem } from '@/domain/entities'
import { DEFAULT_IVA_PERCENT } from './constants'

export interface WhatsAppOrderInput {
  clinicName: string
  customerName: string
  customerPhone: string
  items: OrderItem[]
  ivaPercent: number
  orderId: string
}

function usd(n: number): string {
  return `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`
}

export function buildOrderWhatsAppMessage(input: WhatsAppOrderInput): string {
  const ivaPercent = Number.isFinite(input.ivaPercent) ? input.ivaPercent : DEFAULT_IVA_PERCENT
  const subtotal = input.items.reduce((s, it) => s + it.price * it.qty, 0)
  const iva = (subtotal * ivaPercent) / 100
  const total = subtotal + iva

  const lines: string[] = [
    `🦷 *Nuevo pedido — ${input.clinicName}*`,
    '',
    `👤 ${input.customerName}`,
    `📞 ${input.customerPhone}`,
    '',
    '🛒 *Detalle del pedido:*',
  ]
  for (const it of input.items) {
    lines.push(`• ${it.name} ×${it.qty} — ${usd(it.price * it.qty)}`)
  }
  lines.push(
    '',
    `Subtotal: ${usd(subtotal)}`,
    `IVA (${ivaPercent}%): ${usd(iva)}`,
    `*Total: ${usd(total)}*`,
    '',
    `🔖 Ref. pedido: ${input.orderId.slice(0, 8).toUpperCase()}`,
    '¿Me confirman disponibilidad? ¡Gracias! 😊',
  )
  return lines.join('\n')
}

/** URL de WhatsApp con mensaje codificado. */
export function buildWhatsAppUrl(phoneDigits: string, message: string): string {
  const clean = phoneDigits.replace(/\D/g, '')
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`
}
