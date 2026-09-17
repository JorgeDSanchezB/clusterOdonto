/**
 * ADMIN — POST /api/admin/auth/login
 * Login con email + contraseña. Firma un JWT (7 días) en cookie httpOnly.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fail, runApi, readJsonBody } from '@/lib/api-helpers'
import { loginSchema } from '@/domain/schemas'
import { sessionCookieHeader, signSession, verifyPassword } from '@/infrastructure/auth'
import type { UserRole } from '@/domain/entities'

export async function POST(req: Request) {
  return runApi(async () => {
    const body = loginSchema.parse(await readJsonBody(req))

    const user = await db.user.findUnique({ where: { email: body.email.toLowerCase() } })
    if (!user || !user.passwordHash) {
      return fail(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos.')
    }
    const valid = await verifyPassword(body.password, user.passwordHash)
    if (!valid) {
      return fail(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos.')
    }

    const token = await signSession({ id: user.id, role: user.role as UserRole, tenantId: user.tenantId })
    const res = NextResponse.json({
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId },
      },
    })
    res.headers.set('Set-Cookie', sessionCookieHeader(token))
    return res
  })
}
