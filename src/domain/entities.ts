/**
 * DOMINIO — Entidades y Value Objects (arquitectura hexagonal).
 * Estas interfaces son el corazón del sistema; la infraestructura (Prisma,
 * PDF, storage, email) las implementa/consume, nunca al revés.
 */
import type { AppointmentStatus, OrderStatus, UserRole } from '@/lib/constants'

/** Interfaz base exigida por toda entidad persistente. */
export interface IEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

// ── Value Objects ────────────────────────────────────────────────────────────

/** VO Dinero: operaciones y formato USD sin float-sorpresas de UI. */
export class Money {
  constructor(
    public readonly amount: number,
    public readonly currency = 'USD',
  ) {}

  static fromCents(cents: number, currency = 'USD'): Money {
    return new Money(cents / 100, currency)
  }

  add(other: Money): Money {
    return new Money(this.amount + other.amount, this.currency)
  }

  multiply(qty: number): Money {
    return new Money(this.amount * qty, this.currency)
  }

  percent(p: number): Money {
    return new Money((this.amount * p) / 100, this.currency)
  }

  format(): string {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: 2,
    }).format(Number.isFinite(this.amount) ? this.amount : 0)
  }
}

/** VO RangoHorario (minutos del día, horario Quito): validación + solapamiento. */
export class TimeRange {
  constructor(
    public readonly startMinute: number,
    public readonly endMinute: number,
  ) {}

  get isValid(): boolean {
    return (
      Number.isInteger(this.startMinute) &&
      Number.isInteger(this.endMinute) &&
      this.startMinute >= 0 &&
      this.endMinute <= 1440 &&
      this.startMinute < this.endMinute
    )
  }

  contains(minutes: number): boolean {
    return minutes >= this.startMinute && minutes < this.endMinute
  }

  overlaps(other: TimeRange): boolean {
    return this.startMinute < other.endMinute && other.startMinute < this.endMinute
  }

  /** Fusión (para ventanas contiguas/solapadas). */
  mergeWith(other: TimeRange): TimeRange {
    return new TimeRange(
      Math.min(this.startMinute, other.startMinute),
      Math.max(this.endMinute, other.endMinute),
    )
  }
}

// ── Config del tenant (theme + parámetros de negocio) ──────────────────────

export interface ThemeConfig {
  palette: string
  primary: string
  primaryForeground: string
  secondary: string
  accent: string
  fontHeading: string
  fontBody: string
  radius: string
}

export interface TenantConfig {
  theme: ThemeConfig
  slotStepMinutes: number
  minLeadMinutes: number
  maxAdvanceDays: number
  invoicePrefix: string
}

export interface TenantEntity extends IEntity {
  slug: string
  name: string
  ruc: string | null
  address: string | null
  city: string | null
  phone: string | null
  email: string | null
  whatsapp: string | null
  ivaPercent: number
  logoUrl: string | null
  config: TenantConfig
}

// ── Catálogo ────────────────────────────────────────────────────────────────

/** metadata: JSONB libre — la regla del "Servicio" (extensibilidad sin recompilar). */
export interface ServiceEntity extends IEntity {
  tenantId: string
  name: string
  description: string | null
  price: number
  durationMin: number
  imageUrl: string | null
  active: boolean
  metadata: Record<string, unknown>
  sortOrder: number
}

export interface ProfessionalEntity extends IEntity {
  tenantId: string
  locationId: string | null
  name: string
  photoUrl: string | null
  specialty: string | null
  bio: string | null
  active: boolean
  sortOrder: number
}

export interface LocationEntity extends IEntity {
  tenantId: string
  name: string
  address: string
  phone: string | null
  lat: number | null
  lng: number | null
  mapQuery: string | null
  active: boolean
  sortOrder: number
}

export interface AvailabilityEntity extends IEntity {
  professionalId: string
  locationId: string | null
  weekday: number // 0=dom … 6=sáb
  startMinute: number
  endMinute: number
}

// ── Agenda ──────────────────────────────────────────────────────────────────

export interface AppointmentEntity extends IEntity {
  tenantId: string
  patientName: string | null
  patientPhone: string | null
  patientEmail: string | null
  notes: string | null
  serviceId: string | null
  professionalId: string
  locationId: string | null
  start: Date
  end: Date
  status: AppointmentStatus
  source: 'PUBLIC' | 'ADMIN'
  cancelToken: string
  metadata: Record<string, unknown>
}

export type { AppointmentStatus, OrderStatus, UserRole }

// ── Pedidos y facturación ───────────────────────────────────────────────────

export interface OrderItem {
  serviceId: string
  name: string
  price: number
  qty: number
}

export interface OrderEntity extends IEntity {
  tenantId: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  items: OrderItem[]
  total: number
  status: OrderStatus
  whatsappSentAt: Date | null
  metadata: Record<string, unknown>
}

export interface InvoiceItem {
  description: string
  qty: number
  unitPrice: number
  total: number
}

export interface InvoiceEntity extends IEntity {
  tenantId: string
  orderId: string | null
  number: string
  customerName: string
  customerEmail: string | null
  items: InvoiceItem[]
  subtotal: number
  ivaRate: number
  ivaAmount: number
  total: number
  pdfUrl: string | null
  emailSentAt: Date | null
  metadata: Record<string, unknown>
}

// ── Contenido del sitio público (editor por secciones) ──────────────────────

export interface Testimonial {
  name: string
  text: string
  rating: number
  initials?: string
  role?: string
}

export interface HeroContent {
  badge?: string
  title: string
  subtitle?: string
  ctaLabel?: string
  ctaSecondaryLabel?: string
  ctaSecondaryHref?: string
  backgroundImageUrl?: string
  highlights?: string[]
}

export interface AboutContent {
  title?: string
  text?: string
  imageUrl?: string
  stats?: { label: string; value: string }[]
}

export interface TestimonialsContent {
  title?: string
  subtitle?: string
  items: Testimonial[]
}

export interface ContactContent {
  note?: string
  whatsappMessage?: string
  showForm?: boolean
}

export interface ServicesSectionContent {
  title?: string
  subtitle?: string
}

export interface HoursContent {
  note?: string
}

export interface LocationSectionContent {
  note?: string
  mapQuery?: string
}

/** Mapa section → data. Secciones desconocidas se pasan de largo (extensible). */
export interface SiteContentMap {
  hero?: HeroContent
  services?: ServicesSectionContent
  about?: AboutContent
  hours?: HoursContent
  location?: LocationSectionContent
  contact?: ContactContent
  testimonials?: TestimonialsContent
  [section: string]: unknown
}

// ── Usuario de sesión ──────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  name: string | null
  role: UserRole
  tenantId: string | null
}
