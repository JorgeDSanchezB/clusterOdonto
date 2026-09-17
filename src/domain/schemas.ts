/**
 * DOMINIO — Esquemas Zod (contratos de validación compartidos cliente/servidor).
 * Regla del "Servicio": los inputs usan .passthrough() para que las claves
 * extra fluyan hacia `metadata` sin recompilar el núcleo.
 */
import { z } from 'zod'
import {
  APPOINTMENT_STATUSES,
  ORDER_STATUSES,
  USER_ROLES,
} from '@/lib/constants'

const phoneEC = z
  .string()
  .trim()
  .min(7)
  .max(20)
  .regex(/^[+0-9()\s-]+$/, 'Teléfono inválido')

const hexColor = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color hexadecimal inválido')

// ── Auth ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6).max(100),
})

// ── Servicios (extensibles vía metadata + passthrough) ──────────────────────

export const serviceCreateSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(2000).nullish(),
    price: z.number().nonnegative(),
    durationMin: z.number().int().min(5).max(600),
    imageUrl: z.string().max(500).nullish(),
    active: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
    metadata: z.record(z.string(), z.unknown()).default({}),
  })
  .passthrough() // ← claves desconocidas (ej: "alineadores": 20) pasan a metadata

export const serviceUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(2000).nullish(),
    price: z.number().nonnegative().optional(),
    durationMin: z.number().int().min(5).max(600).optional(),
    imageUrl: z.string().max(500).nullish(),
    active: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough()

// ── Profesionales / Sedes / Disponibilidad ──────────────────────────────────

export const professionalCreateSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    specialty: z.string().trim().max(120).nullish(),
    bio: z.string().trim().max(2000).nullish(),
    photoUrl: z.string().max(500).nullish(),
    locationId: z.string().uuid().nullish(),
    active: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
    availability: z
      .array(
        z.object({
          weekday: z.number().int().min(0).max(6),
          startMinute: z.number().int().min(0).max(1439),
          endMinute: z.number().int().min(1).max(1440),
          locationId: z.string().uuid().nullish(),
        }),
      )
      .optional(),
  })
  .passthrough()

export const professionalUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    specialty: z.string().trim().max(120).nullish(),
    bio: z.string().trim().max(2000).nullish(),
    photoUrl: z.string().max(500).nullish(),
    locationId: z.string().uuid().nullish(),
    active: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    availability: z
      .array(
        z.object({
          weekday: z.number().int().min(0).max(6),
          startMinute: z.number().int().min(0).max(1439),
          endMinute: z.number().int().min(1).max(1440),
          locationId: z.string().uuid().nullish(),
        }),
      )
      .optional(),
  })
  .passthrough()

export const locationCreateSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    address: z.string().trim().min(4).max(300),
    phone: phoneEC.nullish(),
    lat: z.number().min(-90).max(90).nullish(),
    lng: z.number().min(-180).max(180).nullish(),
    mapQuery: z.string().trim().max(200).nullish(),
    active: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
  })
  .passthrough()

export const locationUpdateSchema = locationCreateSchema.partial()

// ── Reservas (público) ──────────────────────────────────────────────────────

export const appointmentCreateSchema = z.object({
  serviceId: z.string().uuid(),
  professionalId: z.string().uuid(),
  locationId: z.string().uuid().nullish(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado YYYY-MM-DD'),
  startMinute: z.number().int().min(0).max(1439),
  patientName: z.string().trim().min(3).max(120),
  patientPhone: phoneEC,
  patientEmail: z.email().nullish(),
  notes: z.string().trim().max(1000).nullish(),
})

export const appointmentAdminCreateSchema = appointmentCreateSchema.extend({
  status: z.enum(APPOINTMENT_STATUSES).optional(),
})

/** Bloqueo manual de agenda por el admin. */
export const blockCreateSchema = z.object({
  professionalId: z.string().uuid(),
  locationId: z.string().uuid().nullish(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(1).max(1440),
  reason: z.string().trim().max(200).nullish(),
})

// ── Pedidos (carrito → WhatsApp) ────────────────────────────────────────────

export const orderCreateSchema = z.object({
  customerName: z.string().trim().min(3).max(120),
  customerPhone: phoneEC,
  customerEmail: z.email().nullish(),
  items: z
    .array(
      z.object({
        serviceId: z.string().uuid(),
        qty: z.number().int().min(1).max(50),
      }),
    )
    .min(1, 'El pedido necesita al menos un servicio'),
})

// ── Facturación ────────────────────────────────────────────────────────────

export const invoiceCreateSchema = z.object({
  orderId: z.string().uuid(),
  customerEmail: z.email().nullish(),
})

// ── Tenant (perfil + config + tema) ────────────────────────────────────────

export const themeSchema = z.object({
  palette: z.string().max(40).default('turquesa'),
  primary: hexColor.default('#0f766e'),
  primaryForeground: hexColor.default('#ffffff'),
  secondary: hexColor.default('#f1f5f9'),
  accent: hexColor.default('#5eead4'),
  fontHeading: z.string().max(60).default('poppins'),
  fontBody: z.string().max(60).default('inter'),
  radius: z.string().max(10).default('1rem'),
})

export const tenantConfigSchema = z.object({
  theme: themeSchema.default({}),
  slotStepMinutes: z.number().int().min(5).max(120).default(30),
  minLeadMinutes: z.number().int().min(0).max(1440).default(60),
  maxAdvanceDays: z.number().int().min(1).max(365).default(60),
  invoicePrefix: z.string().regex(/^\d{3}-\d{3}$/, 'Formato esperado 000-000').default('001-001'),
})

export const tenantUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(140).optional(),
    ruc: z.string().trim().regex(/^\d{10,13}$/, 'RUC: 10 a 13 dígitos').nullish(),
    address: z.string().trim().max(300).nullish(),
    city: z.string().trim().max(80).nullish(),
    phone: phoneEC.nullish(),
    email: z.email().nullish(),
    whatsapp: z.string().trim().regex(/^\d{8,15}$/, 'WhatsApp: solo dígitos con código país').nullish(),
    ivaPercent: z.number().min(0).max(100).optional(),
    logoUrl: z.string().max(500).nullish(),
    config: tenantConfigSchema.optional(),
  })
  .passthrough()

/** Super-admin: alta de un odontólogo nuevo (tenant + usuario OWNER). */
export const tenantCreateSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  name: z.string().trim().min(2).max(140),
  ownerName: z.string().trim().min(2).max(120),
  ownerEmail: z.email(),
  ownerPassword: z.string().min(8).max(100),
  ruc: z.string().trim().regex(/^\d{10,13}$/).nullish(),
  address: z.string().trim().max(300).nullish(),
  phone: phoneEC.nullish(),
  whatsapp: z.string().trim().regex(/^\d{8,15}$/).nullish(),
})

// ── Contenido por secciones ────────────────────────────────────────────────

/** data libre por sección: valida que sea objeto, el resto lo tolera el dominio. */
export const contentUpdateSchema = z.record(z.string(), z.unknown())

export const orderStatusSchema = z.enum(ORDER_STATUSES)
export const userRoleSchema = z.enum(USER_ROLES)
