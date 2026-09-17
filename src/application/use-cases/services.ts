/**
 * APLICACIÓN — Casos de uso de servicios (CRUD con extensibilidad vía metadata).
 */
import { db } from '@/lib/db'
import { HttpError } from '@/lib/api-helpers'
import { buildPage, cursorDescWhere, getPaginationParams } from '@/lib/pagination'
import { ServiceFactory, type ServiceFactoryInput } from '@/domain/factories'
import { safeJsonParse, toJsonString } from '@/lib/json'
import type { ServiceEntity } from '@/domain/entities'

export type ServiceRow = {
  id: string
  tenantId: string
  name: string
  description: string | null
  price: number
  durationMin: number
  imageUrl: string | null
  active: boolean
  metadata: string
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export function toServiceEntity(row: ServiceRow): ServiceEntity {
  return { ...row, metadata: safeJsonParse<Record<string, unknown>>(row.metadata, {}) }
}

interface ListOptions {
  activeOnly?: boolean
  maxLimit?: number
}

export async function listServices(
  reqUrl: string,
  tenantId: string,
  opts: ListOptions = {},
): Promise<{ data: ServiceEntity[]; meta: { nextCursor: string | null; hasMore: boolean } }> {
  const sp = new URL(reqUrl).searchParams
  const { limit, cursor } = getPaginationParams(sp, opts.maxLimit)
  const where: Record<string, unknown> = { tenantId }
  if (opts.activeOnly || sp.get('active') === 'true') where.active = true

  const rows = (await db.service.findMany({
    where: cursor ? { AND: [where, cursorDescWhere(cursor, 'createdAt')] } : where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  })) as ServiceRow[]

  const page = buildPage(rows as unknown as Record<string, unknown>[], limit, 'createdAt')
  return {
    data: page.data.map((r) => toServiceEntity(r as unknown as ServiceRow)),
    meta: page.meta,
  }
}

export async function getServiceOr404(tenantId: string, id: string): Promise<ServiceEntity> {
  const row = (await db.service.findFirst({
    where: { id, tenantId },
  })) as ServiceRow | null
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Servicio no encontrado.')
  return toServiceEntity(row)
}

/**
 * Regla del "Servicio" en acción: el input ya viene del Zod `.passthrough()`;
 * ServiceFactory consolida las claves extra dentro de `metadata` (JSON).
 * Añadir "Ortodoncia invisible" con {alineadores: 20} NO toca el núcleo.
 */
export async function createService(tenantId: string, input: ServiceFactoryInput): Promise<ServiceEntity> {
  const entity = ServiceFactory.create(input)
  const row = (await db.service.create({
    data: { ...entity, tenantId, metadata: toJsonString(entity.metadata) },
  })) as ServiceRow
  return toServiceEntity(row)
}

export async function updateService(
  tenantId: string,
  id: string,
  input: Record<string, unknown>,
): Promise<ServiceEntity> {
  const existing = await getServiceOr404(tenantId, id)

  // Campos conocidos del update
  const patch: Record<string, unknown> = {}
  for (const key of ['name', 'description', 'price', 'durationMin', 'imageUrl', 'active', 'sortOrder']) {
    if (input[key] !== undefined) patch[key] = input[key]
  }

  // metadata: merge de la existente con la nueva (claves a null se eliminan)
  const incomingMeta = (input.metadata as Record<string, unknown> | undefined) ?? {}
  const extraMeta: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input)) {
    if (['name', 'description', 'price', 'durationMin', 'imageUrl', 'active', 'sortOrder', 'metadata'].includes(k)) continue
    extraMeta[k] = v
  }
  const mergedMeta: Record<string, unknown> = { ...existing.metadata, ...extraMeta }
  for (const [k, v] of Object.entries(incomingMeta)) {
    if (v === null) delete mergedMeta[k]
    else mergedMeta[k] = v
  }
  patch.metadata = toJsonString(mergedMeta)

  const row = (await db.service.update({ where: { id }, data: patch })) as ServiceRow
  return toServiceEntity(row)
}

export async function deleteService(tenantId: string, id: string): Promise<void> {
  await getServiceOr404(tenantId, id)
  await db.service.delete({ where: { id } })
}
