/**
 * INFRAESTRUCTURA — Autenticación JWT (cookie httpOnly) + bcrypt.
 * El contrato de endpoints coincide con la especificación:
 *   POST /api/admin/auth/login · GET /api/admin/auth/me · POST /api/admin/auth/logout
 * Si en el futuro se desea NextAuth, basta implementar el mismo contrato de
 * `getSessionFromRequest` sin tocar dominio ni casos de uso.
 */
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import type { AuthUser, UserRole } from '@/domain/entities'
import { AUTH_SECRET_FALLBACK, SESSION_COOKIE, SESSION_TTL_SECONDS, USER_ROLES } from '@/lib/constants'

const secretKey = new TextEncoder().encode(
  process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16
    ? process.env.AUTH_SECRET
    : AUTH_SECRET_FALLBACK,
)

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

interface SessionPayload {
  sub: string
  role: UserRole
  tenantId: string | null
}

export async function signSession(user: { id: string; role: UserRole; tenantId: string | null }): Promise<string> {
  return new SignJWT({ role: user.role, tenantId: user.tenantId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey)
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey)
    if (typeof payload.sub !== 'string') return null
    const role = String(payload.role) as UserRole
    if (!USER_ROLES.includes(role)) return null
    return { sub: payload.sub, role, tenantId: (payload.tenantId as string | null) ?? null }
  } catch {
    return null
  }
}

/** Lee la cookie de sesión desde el header Cookie de un Request. */
export function readSessionCookie(req: Request): string | null {
  const header = req.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === SESSION_COOKIE) return decodeURIComponent(v.join('='))
  }
  return null
}

export function sessionCookieHeader(token: string): string {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ]
  // En producción (HTTPS real) conviene añadir Secure. En el sandbox se sirve
  // por proxy y forzarlo rompería la cookie; se activa con env.
  if (process.env.AUTH_COOKIE_SECURE === '1') parts.push('Secure')
  return parts.join('; ')
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

/**
 * Resuelve el usuario autenticado desde el request. Sin IO de DB donde no
 * hace falta (el payload ya trae rol/tenant); las rutas sensibles recargan
 * de BD vía requireUser.
 */
export async function getSessionFromRequest(req: Request): Promise<AuthUser | null> {
  const token = readSessionCookie(req)
  if (!token) return null
  const payload = await verifySessionToken(token)
  if (!payload) return null
  return {
    id: payload.sub,
    email: '', // completado por requireUser si hace falta
    name: null,
    role: payload.role,
    tenantId: payload.tenantId,
  }
}
