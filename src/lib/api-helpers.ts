/**
 * HELPERS DE API — sobre: { data, meta } · errores: { error: { code, message } }.
 * `runApi` captura HttpError, ZodError y errores de Prisma devolviendo el
 * status correcto (manejo uniforme en las ~37 rutas).
 */
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export function ok<T>(data: T, meta?: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(meta ? { data, meta } : { data }, { status })
}

export function fail(status: number, code: string, message: string, details?: unknown): NextResponse {
  return NextResponse.json({ error: { code, message, details } }, { status })
}

/** Envuelve un handler y traduce errores a respuestas HTTP consistentes. */
export async function runApi<T extends NextResponse>(fn: () => Promise<T>): Promise<T | NextResponse> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof HttpError) {
      return fail(err.status, err.code, err.message, err.details)
    }
    if (err instanceof ZodError) {
      return fail(400, 'VALIDATION_ERROR', 'Datos inválidos. Revisa los campos enviados.', {
        issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      })
    }
    console.error('[api] Error no controlado:', err)
    const message = err instanceof Error ? err.message : 'Error interno del servidor'
    // Errores conocidos de Prisma
    if (/Unique constraint/i.test(message)) {
      return fail(409, 'DUPLICATE', 'Ya existe un registro con esos datos únicos.')
    }
    if (/Foreign key constraint/i.test(message)) {
      return fail(409, 'FK_CONSTRAINT', 'No se puede completar: hay datos relacionados.')
    }
    return fail(500, 'INTERNAL_ERROR', message)
  }
}

/** Parsea el body JSON de un request (lanza HttpError 400 si está corrupto). */
export async function readJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    throw new HttpError(400, 'BAD_JSON', 'El cuerpo de la petición no es JSON válido.')
  }
}

/** Validación Zod con error de dominio claro. */
export function parseOr400<T>(schema: { parse(input: unknown): T }, input: unknown): T {
  return schema.parse(input)
}
