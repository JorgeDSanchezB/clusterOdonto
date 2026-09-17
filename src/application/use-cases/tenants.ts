/**
 * APLICACIÓN — Casos de uso de tenants: resolución pública por slug, contenido
 * por secciones, horarios fusionados, perfil/config del panel y alta por
 * super-admin (crea tenant + OWNER + contenido por defecto).
 */
import { db } from '@/lib/db'
import { HttpError } from '@/lib/api-helpers'
import { contentWithDefaults, resolveSiteContent, TenantFactory } from '@/domain/factories'
import { hashPassword } from '@/infrastructure/auth'
import { minutesToHHMM, quitoToUtc, todayInQuito } from '@/lib/quito-time'
import { safeJsonParse, toJsonString } from '@/lib/json'
import { APPOINTMENT_ACTIVE_STATUSES } from '@/lib/constants'
import { resolveTheme } from '@/lib/theme'
import type { SiteContentMap, TenantConfig } from '@/domain/entities'

/** Resuelve el tenant desde el slug (así se resolverá también en /api/[slug]). */
export async function getTenantBySlugOr404(slug: string) {
  const tenant = await db.tenant.findUnique({ where: { slug } })
  if (!tenant) throw new HttpError(404, 'TENANT_NOT_FOUND', `No existe el sitio "${slug}".`)
  return tenant
}

export async function getTenantByIdOr404(id: string) {
  const tenant = await db.tenant.findUnique({ where: { id } })
  if (!tenant) throw new HttpError(404, 'TENANT_NOT_FOUND', 'Tenant no encontrado.')
  return tenant
}

export interface PublicWeeklyHours {
  weekday: number
  open: string
  close: string
}

/** Horario mostrado en la web pública: fusión de ventanas de todos los profesionales. */
export async function getMergedWeeklyHours(tenantId: string): Promise<PublicWeeklyHours[]> {
  const rows = await db.availability.findMany({
    where: { professional: { tenantId, active: true } },
    select: { weekday: true, startMinute: true, endMinute: true },
  })
  const byDay = new Map<number, { min: number; max: number }>()
  for (const r of rows) {
    const cur = byDay.get(r.weekday)
    if (!cur) byDay.set(r.weekday, { min: r.startMinute, max: r.endMinute })
    else byDay.set(r.weekday, { min: Math.min(cur.min, r.startMinute), max: Math.max(cur.max, r.endMinute) })
  }
  return [...byDay.entries()]
    .sort((a, b) => ((a[0] + 6) % 7) - ((b[0] + 6) % 7)) // lunes primero
    .map(([weekday, { min, max }]) => ({ weekday, open: minutesToHHMM(min), close: minutesToHHMM(max) }))
}

/** Datos públicos del sitio de un tenant (contenido + tema + horarios + contacto). */
export async function getPublicTenantData(slug: string) {
  const tenant = await getTenantBySlugOr404(slug)
  const contentRows = await db.siteContent.findMany({ where: { tenantId: tenant.id } })
  const rawMap: Record<string, string | null> = {}
  for (const row of contentRows) rawMap[row.section] = row.data
  const content = contentWithDefaults(resolveSiteContent(rawMap))
  const config = TenantFactory.resolveConfig(tenant.config)
  const hours = await getMergedWeeklyHours(tenant.id)

  return {
    tenant: {
      slug: tenant.slug,
      name: tenant.name,
      address: tenant.address,
      city: tenant.city,
      phone: tenant.phone,
      email: tenant.email,
      whatsapp: tenant.whatsapp,
      logoUrl: tenant.logoUrl,
      ivaPercent: tenant.ivaPercent,
      theme: config.theme,
      hours,
    },
    content,
  }
}

/** Contenido completo para el editor del panel. */
export async function getTenantContent(tenantId: string): Promise<SiteContentMap> {
  const rows = await db.siteContent.findMany({ where: { tenantId } })
  const rawMap: Record<string, string | null> = {}
  for (const row of rows) rawMap[row.section] = row.data
  return resolveSiteContent(rawMap)
}

export async function updateContentSection(tenantId: string, section: string, data: unknown) {
  const existing = await db.siteContent.findFirst({ where: { tenantId, section } })
  if (existing) {
    return db.siteContent.update({ where: { id: existing.id }, data: { data: toJsonString(data) } })
  }
  return db.siteContent.create({ data: { tenantId, section, data: toJsonString(data) } })
}

/** Perfil+config para el panel (incluye ruc: solo usuarios autenticados). */
export async function getTenantForAdmin(tenantId: string) {
  const tenant = await getTenantByIdOr404(tenantId)
  const config = TenantFactory.resolveConfig(tenant.config)
  return { ...tenant, config, configRaw: tenant.config }
}

/** Update parcial con merge profundo de config (tema en vivo sin recargar). */
export async function updateTenantProfile(
  tenantId: string,
  input: Record<string, unknown>,
): Promise<{ name: string; config: TenantConfig }> {
  const tenant = await getTenantByIdOr404(tenantId)
  const patch: Record<string, unknown> = {}
  for (const key of ['name', 'ruc', 'address', 'city', 'phone', 'email', 'whatsapp', 'logoUrl', 'ivaPercent']) {
    if (input[key] !== undefined) patch[key] = input[key] === '' ? null : input[key]
  }
  if (input.config && typeof input.config === 'object') {
    const current = TenantFactory.resolveConfig(tenant.config)
    const incoming = safeJsonParse<Partial<TenantConfig>>(toJsonString(input.config), {})
    patch.config = toJsonString({
      ...current,
      ...incoming,
      theme: { ...current.theme, ...(incoming.theme ?? {}) },
    })
  }
  const updated = await db.tenant.update({ where: { id: tenantId }, data: patch })
  return { name: updated.name, config: TenantFactory.resolveConfig(updated.config) }
}

// ── Super-admin ──────────────────────────────────────────────────────────────

export async function listTenantsForSuperAdmin() {
  const tenants = await db.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      slug: true,
      name: true,
      createdAt: true,
      users: { select: { email: true, role: true, name: true } },
      _count: { select: { services: true, appointments: true, orders: true } },
    },
  })
  return tenants
}

export async function createTenantSuperAdmin(input: {
  slug: string
  name: string
  ownerName: string
  ownerEmail: string
  ownerPassword: string
  ruc?: string | null
  address?: string | null
  phone?: string | null
  whatsapp?: string | null
}) {
  const clash = await db.tenant.findUnique({ where: { slug: input.slug } })
  if (clash) throw new HttpError(409, 'SLUG_TAKEN', `El slug "${input.slug}" ya está en uso.`)
  const emailClash = await db.user.findUnique({ where: { email: input.ownerEmail } })
  if (emailClash) throw new HttpError(409, 'EMAIL_TAKEN', 'Ya existe un usuario con ese email.')

  const tenantRow = await db.tenant.create({ data: TenantFactory.create(input) })
  await db.user.create({
    data: {
      email: input.ownerEmail,
      passwordHash: await hashPassword(input.ownerPassword),
      name: input.ownerName,
      role: 'OWNER',
      tenantId: tenantRow.id,
    },
  })
  await db.siteContent.createMany({ data: TenantFactory.defaultContentRows(tenantRow.id) })

  return { tenant: tenantRow, ownerEmail: input.ownerEmail }
}

// ── Dashboard (resumen del panel) ───────────────────────────────────────────

export async function getOverview(tenantId: string) {
  const dayStart = quitoToUtc(todayInQuito(), 0)
  const dayEnd = quitoToUtc(todayInQuito(), 1440)
  const weekEnd = new Date(dayEnd.getTime() + 6 * 86_400_000)

  const [todayAppointments, pendingCount, newOrders, invoices, upcoming, recentOrders, weekAppointments, activeServices, professionals] =
    await Promise.all([
      db.appointment.count({ where: { tenantId, start: { gte: dayStart, lt: dayEnd }, status: { in: APPOINTMENT_ACTIVE_STATUSES } } }),
      db.appointment.count({ where: { tenantId, status: 'PENDING' } }),
      db.order.count({ where: { tenantId, status: 'NEW' } }),
      db.invoice.findMany({
        where: { tenantId, createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
        select: { total: true },
      }),
      db.appointment.findMany({
        where: { tenantId, start: { gte: new Date() }, status: { in: APPOINTMENT_ACTIVE_STATUSES } },
        orderBy: { start: 'asc' },
        take: 5,
        include: {
          service: { select: { name: true } },
          professional: { select: { name: true } },
        },
      }),
      db.order.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 5 }),
      db.appointment.findMany({
        where: { tenantId, start: { gte: dayStart, lt: weekEnd }, status: { in: APPOINTMENT_ACTIVE_STATUSES } },
        select: { start: true },
      }),
      db.service.count({ where: { tenantId, active: true } }),
      db.professional.count({ where: { tenantId, active: true } }),
    ])

  // Citas por día (7 días) para el mini-gráfico del panel
  const weekCounts: { date: string; count: number }[] = []
  for (let i = 0; i < 7; i++) {
    const from = new Date(dayStart.getTime() + i * 86_400_000)
    const to = new Date(dayStart.getTime() + (i + 1) * 86_400_000)
    weekCounts.push({
      date: from.toISOString().slice(0, 10),
      count: weekAppointments.filter((a) => a.start >= from && a.start < to).length,
    })
  }

  return {
    todayAppointments,
    pendingCount,
    newOrders,
    monthRevenue: invoices.reduce((s, i) => s + i.total, 0),
    activeServices,
    activeProfessionals: professionals,
    upcoming: upcoming.map((a) => ({
      id: a.id,
      start: a.start,
      end: a.end,
      status: a.status,
      patientName: a.patientName,
      service: a.service?.name ?? 'Bloqueo de agenda',
      professional: a.professional.name,
    })),
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      total: o.total,
      status: o.status,
      createdAt: o.createdAt,
    })),
    weekCounts,
  }
}

/** Tema resuelto (tolerante) para render inicial del sitio público. */
export function publicTheme(config: string) {
  return resolveTheme(safeJsonParse<{ theme?: unknown }>(config, {}).theme)
}
