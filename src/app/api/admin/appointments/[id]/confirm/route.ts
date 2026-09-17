/**
 * ADMIN — POST /api/admin/appointments/[id]/confirm — PENDING → CONFIRMED.
 */
import type { NextRequest } from 'next/server'
import { ok, runApi } from '@/lib/api-helpers'
import { requireUser } from '@/infrastructure/auth-guard'
import { adminTransition } from '@/application/use-cases/booking'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER', 'STAFF'])
    const { id } = await params
    if (!user.tenantId) return ok(null)
    const appointment = await adminTransition(user.tenantId, id, 'CONFIRMED')
    return ok({ id: appointment.id, status: appointment.status })
  })
}
