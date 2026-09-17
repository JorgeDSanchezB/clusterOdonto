/**
 * ADMIN — GET/POST /api/admin/professionals
 * POST acepta `availability` (ventanas semanales) en el mismo payload:
 * se crean junto con el profesional (transacción).
 */
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, runApi, readJsonBody, HttpError } from '@/lib/api-helpers'
import { requireUser } from '@/infrastructure/auth-guard'
import { professionalCreateSchema } from '@/domain/schemas'
import { buildPage, cursorDescWhere, getPaginationParams } from '@/lib/pagination'
import { TimeRange } from '@/domain/entities'
import { mergeTimeRanges } from '@/domain/factories'

export async function GET(req: NextRequest) {
  return runApi(async () => {
    const user = await requireUser(req)
    if (!user.tenantId) return ok([], { nextCursor: null, hasMore: false })
    const { limit, cursor } = getPaginationParams(new URL(req.url).searchParams)
    const sp = new URL(req.url).searchParams
    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
      ...(sp.get('active') === 'true' ? { active: true } : {}),
    }
    const rows = await db.professional.findMany({
      where: cursor ? { AND: [where, cursorDescWhere(cursor, 'createdAt')] } : where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: { availabilities: true },
    })
    const page = buildPage(rows as unknown as Record<string, unknown>[], limit, 'createdAt')
    return ok(page.data, page.meta)
  })
}

export async function POST(req: NextRequest) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER', 'STAFF'])
    if (!user.tenantId) throw new HttpError(400, 'NO_TENANT', 'Usuario sin tenant.')
    const body = professionalCreateSchema.parse(await readJsonBody(req))
    const { availability, ...fields } = body

    // Validar ventanas con el VO TimeRange antes de persistir
    if (availability) {
      for (const w of availability) {
        const tr = new TimeRange(w.startMinute, w.endMinute)
        if (!tr.isValid) throw new HttpError(400, 'INVALID_WINDOW', 'Ventana horaria inválida.')
      }
    }

    const professional = await db.$transaction(async (tx) => {
      const created = await tx.professional.create({
        data: {
          tenantId: user.tenantId!,
          name: fields.name,
          specialty: fields.specialty ?? null,
          bio: fields.bio ?? null,
          photoUrl: fields.photoUrl ?? null,
          locationId: fields.locationId ?? null,
          active: fields.active ?? true,
          sortOrder: fields.sortOrder ?? 0,
        },
      })
      if (availability && availability.length > 0) {
        // Una fila por ventana fusionada (evita duplicados solapados)
        const byDay = new Map<number, { startMinute: number; endMinute: number }[]>()
        for (const w of availability) {
          const list = byDay.get(w.weekday) ?? []
          list.push({ startMinute: w.startMinute, endMinute: w.endMinute })
          byDay.set(w.weekday, list)
        }
        for (const [weekday, windows] of byDay) {
          for (const w of mergeTimeRanges(windows.map((x) => new TimeRange(x.startMinute, x.endMinute)))) {
            await tx.availability.create({
              data: {
                professionalId: created.id,
                locationId: fields.locationId ?? null,
                weekday,
                startMinute: w.startMinute,
                endMinute: w.endMinute,
              },
            })
          }
        }
      }
      return created
    })

    return ok(professional, undefined, 201)
  })
}
