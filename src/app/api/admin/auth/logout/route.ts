/**
 * ADMIN — POST /api/admin/auth/logout — limpia la cookie de sesión.
 */
import { NextResponse } from 'next/server'
import { clearSessionCookieHeader } from '@/infrastructure/auth'

export async function POST() {
  const res = NextResponse.json({ data: { ok: true } })
  res.headers.set('Set-Cookie', clearSessionCookieHeader())
  return res
}
