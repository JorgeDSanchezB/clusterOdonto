/**
 * Cliente HTTP tipado para las API Routes del template.
 * Envolvente { data, meta } y errores { error: { code, message } }.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) } })
  } catch {
    throw new ApiError(0, 'NETWORK', 'No se pudo conectar con el servidor.')
  }
  const isJson = (res.headers.get('content-type') ?? '').includes('application/json')
  const body = isJson ? await res.json().catch(() => null) : null
  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error
    throw new ApiError(res.status, err?.code ?? 'UNKNOWN', err?.message ?? `Error ${res.status}`, err?.details)
  }
  return body as T
}

/** GET/POST/PUT/DELETE → devuelve `data` del sobre. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const body = await request<{ data: T; meta?: unknown }>(path, init)
  return body.data
}

/** Lista paginada → devuelve data + meta.nextCursor. */
export async function apiPage<T>(
  path: string,
): Promise<{ data: T[]; meta: { nextCursor: string | null; hasMore: boolean } }> {
  return request(path)
}

/** Extrae el primer mensaje de error de un Zod issue array (detalles del backend). */
export function apiErrMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const details = err.details as { issues?: { message: string }[] } | undefined
    if (details?.issues?.length) return details.issues.map((i) => i.message).join(' · ')
    return err.message
  }
  if (err instanceof Error) return err.message
  return 'Error inesperado'
}

/** Upload multipart (StorageProvider). */
export async function uploadImage(file: File, folder?: string): Promise<{ url: string }> {
  const fd = new FormData()
  fd.append('file', file)
  if (folder) fd.append('folder', folder)
  const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.code ?? 'UPLOAD', body?.error?.message ?? 'Error al subir imagen')
  }
  return body.data
}
