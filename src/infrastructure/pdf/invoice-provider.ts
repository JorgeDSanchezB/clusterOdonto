/**
 * INFRAESTRUCTURA — Proveedor de facturas.
 * LocalPdfInvoiceProvider: genera el PDF localmente con @react-pdf/renderer.
 * v2: SriInvoiceProvider implementará la misma interfaz (facturación
 * electrónica) SIN tocar el núcleo (regla de extensibilidad).
 */
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { InvoiceDocument } from './invoice-document'
import type { InvoiceEntity, TenantEntity } from '@/domain/entities'

export interface InvoiceRenderPayload {
  invoice: InvoiceEntity
  tenant: Pick<TenantEntity, 'name' | 'ruc' | 'address' | 'city' | 'phone' | 'email' | 'logoUrl'>
  primaryColor: string
}

export interface InvoiceProvider {
  readonly name: string
  generate(payload: InvoiceRenderPayload): Promise<Uint8Array>
}

export class LocalPdfInvoiceProvider implements InvoiceProvider {
  readonly name = 'local-pdf'

  async generate(payload: InvoiceRenderPayload): Promise<Uint8Array> {
    const buffer = await renderToBuffer(
      React.createElement(InvoiceDocument, {
        invoice: payload.invoice,
        tenant: payload.tenant,
        primaryColor: payload.primaryColor,
      }),
    )
    return new Uint8Array(buffer)
  }
}

/** Proveedor activo. */
export const invoiceProvider: InvoiceProvider = new LocalPdfInvoiceProvider()
