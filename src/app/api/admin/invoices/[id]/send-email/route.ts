/**
 * ADMIN — POST /api/admin/invoices/[id]/send-email
 * Envía la factura al paciente vía EmailProvider (ConsoleEmailProvider en
 * dev: queda en consola + preview en la respuesta para auditoría del dueño).
 */
import type { NextRequest } from 'next/server'
import { ok, runApi } from '@/lib/api-helpers'
import { requireUser } from '@/infrastructure/auth-guard'
import { sendInvoiceEmail } from '@/application/use-cases/invoices'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER'])
    const { id } = await params
    if (!user.tenantId) return ok(null)
    const result = await sendInvoiceEmail(user.tenantId, id)
    return ok({ sent: true, provider: result.provider, sentAt: result.sentAt, preview: result.preview })
  })
}
