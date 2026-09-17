'use client'

/** ADMIN — Preview del PDF de factura en el navegador (@react-pdf/renderer). */
import { BlobProvider } from '@react-pdf/renderer'
import { InvoiceDocument } from '@/infrastructure/pdf/invoice-document'
import type { InvoiceEntity, TenantEntity } from '@/domain/entities'

export default function InvoicePdfPreview({
  invoice,
  tenant,
  primaryColor,
}: {
  invoice: InvoiceEntity
  tenant: Pick<TenantEntity, 'name' | 'ruc' | 'address' | 'city' | 'phone' | 'email' | 'logoUrl'>
  primaryColor: string
}) {
  return (
    <BlobProvider document={<InvoiceDocument invoice={invoice} tenant={tenant} primaryColor={primaryColor} />}>
      {({ url, loading, error }) =>
        loading ? (
          <div className="grid place-items-center py-20 text-muted-foreground text-sm">
            Generando PDF…
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-destructive">
            No se pudo generar la vista previa. Usa “Descargar PDF (servidor)”.
          </div>
        ) : (
          <iframe title={`Factura ${invoice.number}`} src={url ?? undefined} className="w-full h-[26rem] border-0" />
        )
      }
    </BlobProvider>
  )
}
