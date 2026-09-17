/**
 * INFRAESTRUCTURA — Guard de autenticación para rutas admin.
 * Carga el usuario desde BD (rol/tenant frescos) y aplica RBAC.
 */
import { db } from '@/lib/db'
import { HttpError } from '@/lib/api-helpers'
import { readSessionCookie, verifySessionToken } from './auth'
import type { AuthUser, UserRole } from '@/domain/entities'

export async function requireUser(req: Request, roles?: UserRole[]): Promise<AuthUser> {
  const token = readSessionCookie(req)
  const payload = token ? await verifySessionToken(token) : null
  if (!payload) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Necesitas iniciar sesión.')
  }
  const user = await db.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true, role: true, tenantId: true, passwordHash: false },
  })
  if (!user) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Sesión inválida o expirada.')
  }
  if (roles && roles.length > 0 && !roles.includes(user.role as UserRole)) {
    throw new HttpError(403, 'FORBIDDEN', 'Tu rol no tiene permiso para esta acción.')
  }
  // Multi-tenant estricto: sin tenant no se puede operar rutas de tenant
  // (excepto SUPER_ADMIN, que usa endpoints propios).
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    tenantId: user.tenantId,
  }
}
