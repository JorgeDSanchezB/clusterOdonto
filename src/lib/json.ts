/**
 * JSON tolerante a fallos (Regla de calidad #4): si un atributo es nulo,
 * desconocido o está corrupto, se devuelve el valor por defecto y el sistema
 * NO colapsa. Aplica a todos los campos [JSON] de la BD.
 */
export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (raw === null || raw === undefined || raw === '') return fallback
  try {
    const parsed = JSON.parse(raw)
    // JSON.parse('null') → null: también lo toleramos devolviendo el fallback.
    return (parsed === null || parsed === undefined ? fallback : parsed) as T
  } catch {
    return fallback
  }
}

export function toJsonString(value: unknown): string {
  try {
    if (value === undefined) return '{}'
    const s = JSON.stringify(value)
    return s === undefined ? '{}' : s
  } catch {
    return '{}'
  }
}

/** Metadatos dinámicos de servicio: claves reservadas que nunca deben entrar. */
export const RESERVED_METADATA_KEYS = new Set([
  'id', 'tenantId', 'createdAt', 'updatedAt', 'name', 'description', 'price',
  'durationMin', 'imageUrl', 'active', 'sortOrder', 'metadata',
])
