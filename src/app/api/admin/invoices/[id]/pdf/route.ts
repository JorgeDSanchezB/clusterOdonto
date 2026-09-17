/**
 * ADMIN — GET /api/admin/invoices/[id]/pdf
 * Genera el PDF (LocalPdfInvoiceProvider) y lo transmite como descarga.
 * runtime nodejs + serverExternalPackages para @react-pdf/renderer.
 */
import type { NextRequest } from 'next/server'
import { runApi } from '@/lib/api-helpers'
import { requireUser } from '@/infrastructure/auth-guard'
import { generateInvoicePdf } from '@/application/use-cases/invoices'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER'])
    const { id } = await params
    if (!user.tenantId) {
      return new Response(JSON.stringify({ error: { code: 'NO_TENANT', message: 'Sin tenant' } }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    }
    const { bytes, number } = await generateInvoicePdf(user.tenantId, id)
    return new Response(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `inline; filename="factura-${number}.pdf"`,
        'cache-control': 'no-store',
      },
    })
  })
}
