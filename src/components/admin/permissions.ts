/** ADMIN — Mapa de secciones del panel + permisos por rol. */
import {
  BarChart3,
  CalendarDays,
  FileText,
  LayoutDashboard,
  MapPin,
  Palette,
  Receipt,
  Settings,
  ShoppingBag,
  Stethoscope,
  Sparkles,
  Building2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { UserRole } from '@/domain/entities'

export type SectionKey =
  | 'overview'
  | 'calendar'
  | 'orders'
  | 'services'
  | 'professionals'
  | 'locations'
  | 'content'
  | 'theme'
  | 'invoices'
  | 'settings'
  | 'tenants'

export interface SectionDef {
  key: SectionKey
  label: string
  icon: LucideIcon
  roles: UserRole[]
  description: string
}

export const SECTIONS: SectionDef[] = [
  { key: 'overview', label: 'Resumen', icon: LayoutDashboard, roles: ['OWNER', 'STAFF'], description: 'Métricas del día' },
  { key: 'calendar', label: 'Citas', icon: CalendarDays, roles: ['OWNER', 'STAFF'], description: 'Agenda día / semana / mes' },
  { key: 'orders', label: 'Pedidos', icon: ShoppingBag, roles: ['OWNER', 'STAFF'], description: 'Bandeja de pedidos web' },
  { key: 'services', label: 'Servicios', icon: Sparkles, roles: ['OWNER', 'STAFF'], description: 'Catálogo + metadata' },
  { key: 'professionals', label: 'Profesionales', icon: Stethoscope, roles: ['OWNER', 'STAFF'], description: 'Equipo y horarios' },
  { key: 'locations', label: 'Sedes', icon: MapPin, roles: ['OWNER', 'STAFF'], description: 'Consultorios' },
  { key: 'content', label: 'Contenido', icon: FileText, roles: ['OWNER'], description: 'Editor por secciones' },
  { key: 'theme', label: 'Tema', icon: Palette, roles: ['OWNER'], description: 'Paletas y tipografía' },
  { key: 'invoices', label: 'Facturación', icon: Receipt, roles: ['OWNER'], description: 'Facturas PDF + email' },
  { key: 'settings', label: 'Configuración', icon: Settings, roles: ['OWNER'], description: 'Perfil del consultorio' },
  { key: 'tenants', label: 'Odontólogos', icon: Building2, roles: ['SUPER_ADMIN'], description: 'Gestión del SaaS' },
  { key: 'bar', label: '', icon: BarChart3, roles: [], description: '' }, // reserva de ícono
]

export const sectionsForRole = (role: UserRole): SectionDef[] => SECTIONS.filter((s) => s.roles.includes(role))
