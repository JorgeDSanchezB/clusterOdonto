/**
 * Paginación por cursor para TODAS las listas (Regla de calidad #3).
 * Cursor opaco (base64url de {createdAt|start, id}) — el cliente lo trata
 * como un token oscuro. Orden: campo de orden DESC (más reciente primero)
 * con desempate por id.
 */
import { PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT } from './constants'

export interface CursorPayload {
  /** valor ISO del campo de orden (createdAt o start) */
  k: string
  /** id del último elemento de la página anterior */
  id: string
}

export function encodeCursor(p: CursorPayload): string {
  return Buffer.from(JSON.stringify(p), 'utf8').toString('base64url')
}

export function parseCursor(raw: string | null | undefined): CursorPayload | null {
  if (!raw) return null
  try {
    const p = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as CursorPayload
    if (typeof p?.k !== 'string' || typeof p?.id !== 'string') return null
    return p
  } catch {
    return null // tolerante: cursor corrupto → primera página
  }
}

export interface PaginationParams {
  limit: number
  cursor: CursorPayload | null
}

export function getPaginationParams(
  sp: URLSearchParams,
  maxLimit: number = PAGINATION_MAX_LIMIT,
): PaginationParams {
  const rawLimit = Number(sp.get('limit'))
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(Math.floor(rawLimit), maxLimit)
    : PAGINATION_DEFAULT_LIMIT
  return { limit, cursor: parseCursor(sp.get('cursor')) }
}

/** Cláusula "después del cursor" para orden DESC por campo dado. */
export function cursorDescWhere(cursor: CursorPayload, field: string) {
  const date = new Date(cursor.k)
  return {
    OR: [
      { [field]: { lt: date } },
      { [field]: date, id: { lt: cursor.id } },
    ],
  }
}

/** Cláusula "después del cursor" para orden ASC (ej. citas por start). */
export function cursorAscWhere(cursor: CursorPayload, field: string) {
  const date = new Date(cursor.k)
  return {
    OR: [
      { [field]: { gt: date } },
      { [field]: date, id: { gt: cursor.id } },
    ],
  }
}

/**
 * Recorta la página (se piden limit+1 para detectar si hay más) y devuelve
 * el cursor del último elemento.
 */
export function buildPage<T extends Record<string, unknown>>(
  items: T[],
  limit: number,
  cursorField: string,
): { data: T[]; meta: { nextCursor: string | null; hasMore: boolean } } {
  const hasMore = items.length > limit
  const data = hasMore ? items.slice(0, limit) : items
  const last = data[data.length - 1] as T | undefined
  const nextCursor =
    hasMore && last
      ? encodeCursor({ k: String(last[cursorField]), id: String(last.id) })
      : null
  return { data, meta: { nextCursor, hasMore } }
}
