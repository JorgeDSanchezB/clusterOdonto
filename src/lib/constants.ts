/**
 * Constantes del sistema — cero hardcoding en la lógica de negocio.
 * Todo valor "mágico" vive aquí o en la config del tenant (BD).
 */

export const APP_NAME = 'OdontoSite'
export const APP_TAGLINE = 'Template SaaS para consultorios odontológicos'
export const CURRENCY = 'USD'
export const COUNTRY = 'EC'

/** Paginación por cursor: límites por defecto y máximo (regla de escalabilidad). */
export const PAGINATION_DEFAULT_LIMIT = 12
export const PAGINATION_MAX_LIMIT = 50
/** Límite ampliado para rangos acotados (ej. calendario por mes visible). */
export const PAGINATION_RANGE_MAX_LIMIT = 500

/** Ecuador continental: UTC-5 fijo, sin horario de verano. */
export const QUITO_UTC_OFFSET_MINUTES = -300 // -05:00

/** Agenda: valores por defecto (sobrescribibles desde tenant.config). */
export const DEFAULT_SLOT_STEP_MINUTES = 30
export const DEFAULT_MIN_LEAD_MINUTES = 60
export const DEFAULT_MAX_ADVANCE_DAYS = 60

/** Facturación: prefijo del número secuencial y relleno. */
export const DEFAULT_INVOICE_PREFIX = '001-001'
export const INVOICE_NUMBER_PAD = 9
/** IVA por defecto Ecuador (configurable por tenant). */
export const DEFAULT_IVA_PERCENT = 15

/** Sesión admin (JWT en cookie httpOnly). */
export const SESSION_COOKIE = 'odts_session'
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 días
export const AUTH_SECRET_FALLBACK = 'odonto-site-dev-secret-cambia-en-produccion'

/** Subida de imágenes (LocalStorageProvider; S3/Cloudinary en v2). */
export const UPLOAD_MAX_BYTES = 4 * 1024 * 1024
export const UPLOAD_ALLOWED_MIME = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
]

/** Dominios del negocio (validados con Zod en el borde; SQLite no tiene enums). */
export const USER_ROLES = ['SUPER_ADMIN', 'OWNER', 'STAFF'] as const
export const APPOINTMENT_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'BLOCKED'] as const
export const APPOINTMENT_ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'BLOCKED'] as const
export const ORDER_STATUSES = ['NEW', 'CONTACTED', 'COMPLETED', 'CANCELLED'] as const

/** SiteContent: secciones soportadas por el editor (extensible sin tocar núcleo). */
export const CONTENT_SECTIONS = [
  'hero',
  'services',
  'about',
  'hours',
  'location',
  'contact',
  'testimonials',
] as const

/** Nombres de días/meses en es-EC (date-fns con locale es-EC donde aplique). */
export const WEEKDAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const
export const WEEKDAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const
export const MONTH_LABELS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const

/** Reservas: horario razonable para mostrar en el picker (no limita la BD). */
export const BOOKING_UI_MIN_MINUTE = 7 * 60
export const BOOKING_UI_MAX_MINUTE = 21 * 60
