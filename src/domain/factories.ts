/**
 * DOMINIO — Patrón Factory para construir entidades válidas con defaults.
 * Regla del "Servicio": ServiceFactory.create(data) acepta claves extra y las
 * consolida en metadata; NUNCA hay que tocar el núcleo para añadir atributos.
 */
import { randomUUID } from 'crypto'
import {
  type AboutContent,
  type ContactContent,
  type HeroContent,
  type HoursContent,
  type InvoiceEntity,
  type InvoiceItem,
  type LocationSectionContent,
  type OrderEntity,
  type OrderItem,
  type ServicesSectionContent,
  type SiteContentMap,
  type TenantConfig,
  type TestimonialsContent,
  type TimeRange,
} from './entities'
import { RESERVED_METADATA_KEYS, safeJsonParse, toJsonString } from '@/lib/json'
import {
  DEFAULT_INVOICE_PREFIX,
  DEFAULT_IVA_PERCENT,
  DEFAULT_MAX_ADVANCE_DAYS,
  DEFAULT_MIN_LEAD_MINUTES,
  DEFAULT_SLOT_STEP_MINUTES,
} from '@/lib/constants'

// ── Defaults globales (cero hardcoding en la lógica) ───────────────────────

export const DEFAULT_THEME: TenantConfig['theme'] = {
  palette: 'turquesa',
  primary: '#0f766e',
  primaryForeground: '#ffffff',
  secondary: '#f1f5f9',
  accent: '#5eead4',
  fontHeading: 'poppins',
  fontBody: 'inter',
  radius: '1rem',
}

export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  theme: DEFAULT_THEME,
  slotStepMinutes: DEFAULT_SLOT_STEP_MINUTES,
  minLeadMinutes: DEFAULT_MIN_LEAD_MINUTES,
  maxAdvanceDays: DEFAULT_MAX_ADVANCE_DAYS,
  invoicePrefix: DEFAULT_INVOICE_PREFIX,
}

export const DEFAULT_SITE_CONTENT: SiteContentMap = {
  hero: {
    badge: '',
    title: 'Tu mejor sonrisa comienza aquí',
    subtitle:
      'Odontología integral con atención personalizada y tecnología de última generación.',
    ctaLabel: 'Reservar cita',
    ctaSecondaryLabel: 'Ver servicios',
    highlights: [],
  },
  services: {
    title: 'Nuestros servicios',
    subtitle: 'Tratamientos diseñados para tu bienestar, con precios claros y honestos.',
  },
  about: {
    title: 'Sobre nosotros',
    text: '',
    stats: [],
  },
  hours: { note: '' },
  location: { note: '' },
  contact: { note: '', whatsappMessage: 'Hola, quisiera más información sobre sus servicios.' },
  testimonials: { title: 'Lo que dicen nuestros pacientes', subtitle: '', items: [] },
}

// ── ServiceFactory ──────────────────────────────────────────────────────────

export interface ServiceFactoryInput {
  tenantId: string
  name: string
  description?: string | null
  price: number
  durationMin: number
  imageUrl?: string | null
  active?: boolean
  sortOrder?: number
  metadata?: Record<string, unknown>
  /** claves extra arbitrarias (passthrough de Zod) → se fusionan en metadata */
  [key: string]: unknown
}

export class ServiceFactory {
  /**
   * Construye una ServiceEntity. Las claves desconocidas del input (que NO
   * sean campos conocidos ni reservadas) se consolidan en `metadata`, de modo
   * que "Ortodoncia invisible" con { alineadores: 20, duracion_meses: 18 }
   * se inserta sin cambiar UNA línea del núcleo.
   */
  static create(input: ServiceFactoryInput) {
    const {
      tenantId,
      name,
      description,
      price,
      durationMin,
      imageUrl,
      active,
      sortOrder,
      metadata,
      ...extras
    } = input

    const extraMetadata: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(extras)) {
      if (RESERVED_METADATA_KEYS.has(k)) continue
      extraMetadata[k] = v
    }

    return {
      tenantId,
      name: name.trim(),
      description: description ?? null,
      price: Number(price) || 0,
      durationMin: Math.max(5, Math.round(durationMin || 30)),
      imageUrl: imageUrl ?? null,
      active: active ?? true,
      sortOrder: sortOrder ?? 0,
      metadata: { ...extraMetadata, ...(metadata ?? {}) },
    }
  }

  /** Fila Prisma → entidad (deserializa metadata JSON). */
  static fromRow<T extends { metadata: string }>(row: T): Omit<T, 'metadata'> & { metadata: Record<string, unknown> } {
    return { ...row, metadata: safeJsonParse<Record<string, unknown>>(row.metadata, {}) }
  }
}

// ── AppointmentFactory ──────────────────────────────────────────────────────

export interface AppointmentFactoryInput {
  tenantId: string
  serviceId: string | null
  professionalId: string
  locationId: string | null
  start: Date
  end: Date
  patientName?: string | null
  patientPhone?: string | null
  patientEmail?: string | null
  notes?: string | null
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'BLOCKED'
  source?: 'PUBLIC' | 'ADMIN'
  metadata?: Record<string, unknown>
}

export class AppointmentFactory {
  static create(input: AppointmentFactoryInput) {
    return {
      tenantId: input.tenantId,
      serviceId: input.serviceId,
      professionalId: input.professionalId,
      locationId: input.locationId,
      start: input.start,
      end: input.end,
      patientName: input.patientName ?? null,
      patientPhone: input.patientPhone ?? null,
      patientEmail: input.patientEmail ?? null,
      notes: input.notes ?? null,
      status: input.status ?? 'PENDING',
      source: input.source ?? 'PUBLIC',
      cancelToken: randomUUID(),
      metadata: toJsonString(input.metadata ?? {}),
    }
  }
}

// ── OrderFactory ───────────────────────────────────────────────────────────

export class OrderFactory {
  static create(input: {
    tenantId: string
    customerName: string
    customerPhone: string
    customerEmail: string | null
    items: OrderItem[]
  }) {
    const total = input.items.reduce((sum, it) => sum + it.price * it.qty, 0)
    return {
      tenantId: input.tenantId,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      customerEmail: input.customerEmail,
      items: toJsonString(input.items),
      total: Math.round(total * 100) / 100,
      status: 'NEW' as const,
    }
  }

  static fromRow<T extends { items: string; metadata: string }>(
    row: T,
  ): Omit<T, 'items' | 'metadata'> & { items: OrderItem[]; metadata: Record<string, unknown> } {
    return {
      ...row,
      items: safeJsonParse<OrderItem[]>(row.items, []),
      metadata: safeJsonParse<Record<string, unknown>>(row.metadata, {}),
    }
  }
}

// ── InvoiceFactory ──────────────────────────────────────────────────────────

export class InvoiceFactory {
  static create(input: {
    tenantId: string
    orderId: string | null
    number: string
    customerName: string
    customerEmail: string | null
    items: InvoiceItem[]
    ivaRate: number
  }): Omit<InvoiceEntity, 'id' | 'createdAt' | 'updatedAt' | 'pdfUrl' | 'emailSentAt'> {
    const subtotal = input.items.reduce((sum, it) => sum + it.total, 0)
    const ivaAmount = (subtotal * input.ivaRate) / 100
    return {
      tenantId: input.tenantId,
      orderId: input.orderId,
      number: input.number,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      items: input.items,
      subtotal: Math.round(subtotal * 100) / 100,
      ivaRate: input.ivaRate,
      ivaAmount: Math.round(ivaAmount * 100) / 100,
      total: Math.round((subtotal + ivaAmount) * 100) / 100,
    }
  }

  static fromRow<T extends { items: string; metadata: string }>(
    row: T,
  ): Omit<T, 'items' | 'metadata'> & { items: InvoiceItem[]; metadata: Record<string, unknown> } {
    return {
      ...row,
      items: safeJsonParse<InvoiceItem[]>(row.items, []),
      metadata: safeJsonParse<Record<string, unknown>>(row.metadata, {}),
    }
  }
}

// ── TenantFactory ──────────────────────────────────────────────────────────

export class TenantFactory {
  /** Tenant nuevo con config por defecto + contenido por defecto. */
  static create(input: { slug: string; name: string; ruc?: string | null; address?: string | null; phone?: string | null; whatsapp?: string | null }) {
    return {
      slug: input.slug,
      name: input.name,
      ruc: input.ruc ?? null,
      address: input.address ?? null,
      phone: input.phone ?? null,
      whatsapp: input.whatsapp ?? null,
      ivaPercent: DEFAULT_IVA_PERCENT,
      config: toJsonString(DEFAULT_TENANT_CONFIG),
    }
  }

  static defaultContentRows(tenantId: string): { tenantId: string; section: string; data: string }[] {
    return Object.entries(DEFAULT_SITE_CONTENT).map(([section, data]) => ({
      tenantId,
      section,
      data: toJsonString(data),
    }))
  }

  /** Config del tenant → merge tolerante sobre defaults (regla #4). */
  static resolveConfig(raw: string | null | undefined): TenantConfig {
    const parsed = safeJsonParse<Partial<TenantConfig>>(raw, {})
    return {
      slotStepMinutes: parsed.slotStepMinutes ?? DEFAULT_TENANT_CONFIG.slotStepMinutes,
      minLeadMinutes: parsed.minLeadMinutes ?? DEFAULT_TENANT_CONFIG.minLeadMinutes,
      maxAdvanceDays: parsed.maxAdvanceDays ?? DEFAULT_TENANT_CONFIG.maxAdvanceDays,
      invoicePrefix: parsed.invoicePrefix ?? DEFAULT_TENANT_CONFIG.invoicePrefix,
      theme: { ...DEFAULT_THEME, ...(parsed.theme ?? {}) },
    }
  }
}

// ── Fusión de ventanas de disponibilidad ────────────────────────────────────

/** Fusiona ventanas solapadas/contiguas del mismo día (para el motor de slots). */
export function mergeTimeRanges(ranges: TimeRange[]): TimeRange[] {
  const valid = ranges.filter((r) => r.isValid).sort((a, b) => a.startMinute - b.startMinute)
  const merged: TimeRange[] = []
  for (const r of valid) {
    const last = merged[merged.length - 1]
    if (last && (last.overlaps(r) || last.endMinute === r.startMinute)) {
      merged[merged.length - 1] = last.mergeWith(r)
    } else {
      merged.push(r)
    }
  }
  return merged
}

/** Contenido por sección con defaults tolerantes (regla #4). */
export function resolveSiteContent(rawMap: Record<string, string | null>): SiteContentMap {
  const out: SiteContentMap = {}
  for (const [section, data] of Object.entries(rawMap)) {
    out[section] = safeJsonParse<unknown>(data, {})
  }
  return out
}

export function contentWithDefaults(map: SiteContentMap): Required<Pick<SiteContentMap, 'hero' | 'services' | 'about' | 'hours' | 'location' | 'contact' | 'testimonials'>> & SiteContentMap {
  return {
    ...map,
    hero: { ...DEFAULT_SITE_CONTENT.hero, ...(map.hero as HeroContent) } as HeroContent,
    services: { ...DEFAULT_SITE_CONTENT.services, ...(map.services as ServicesSectionContent) },
    about: { ...DEFAULT_SITE_CONTENT.about, ...(map.about as AboutContent) },
    hours: { ...DEFAULT_SITE_CONTENT.hours, ...(map.hours as HoursContent) },
    location: { ...DEFAULT_SITE_CONTENT.location, ...(map.location as LocationSectionContent) },
    contact: { ...DEFAULT_SITE_CONTENT.contact, ...(map.contact as ContactContent) },
    testimonials: { ...DEFAULT_SITE_CONTENT.testimonials, ...(map.testimonials as TestimonialsContent) },
  }
}
