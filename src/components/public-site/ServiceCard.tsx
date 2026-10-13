'use client'

/**
 * PÚBLICO/COMPARTIDO — ServiceCard con render DINÁMICO de metadata.
 * Lee las claves de `metadata` (JSONB) sin conocerlas de antemano:
 * si mañana llega {alineadores: 20, requiere_escaneo_3d: true}, la tarjeta
 * los pinta con iconos sensatos y valores por defecto (regla de tolerancia).
 * React.memo + uso con key={service.id} (nunca índices).
 */
import { memo } from 'react'
import Image from 'next/image'
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Tag,
  Minus,
  Plus,
  ShoppingCart,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PublicService } from './types'
import { formatDuration } from '@/lib/quito-time'

/** Icono por heurística de clave (desconocida → Sparkles). */
function iconForKey(key: string): LucideIcon {
  const k = key.toLowerCase()
  if (/sesion|control|mes|semana|duracion|entrega|tiempo/.test(k)) return CalendarClock
  if (/requiere|incluye|permite|habilita/.test(k)) return CheckCircle2
  if (/garantia|seguro|certific/.test(k)) return ShieldCheck
  if (/marca|material|modelo|tipo/.test(k)) return Tag
  if (/financ|cuota|pago/.test(k)) return CreditCard
  if (/resultad|eficacia|precision|radiacion/.test(k)) return BadgeCheck
  if (/numero|cantidad|alineador|unidad|cada/.test(k)) return PackageCheck
  return Sparkles
}

/** Valor legible con tolerancia total (null/undefined → no se pinta). */
function formatMetaValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2)
  if (Array.isArray(value)) return value.length ? value.join(' · ') : null
  if (typeof value === 'object') return null
  const s = String(value).trim()
  return s.length ? s : null
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b3d\b/gi, '3D')
}

export interface ServiceCardProps {
  service: PublicService
  /** modo catálogo: stepper + botón añadir */
  onAdd?: (service: PublicService, qty: number) => void
  qtyInCart?: number
  onReserve?: (service: PublicService) => void
  /** remueve estilos interactivos (previews del editor) */
  static?: boolean
}

function ServiceCardInner({ service, onAdd, qtyInCart = 0, onReserve, static: isStatic = false }: ServiceCardProps) {
  const handleAdd = () => onAdd?.(service, 1)

  return (
    <article className="group skin-card overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 text-white">
      <div className="relative aspect-[16/9] bg-muted overflow-hidden">
        {service.imageUrl ? (
          <Image
            src={service.imageUrl}
            alt={service.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-[1.04] transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center t-bg-soft t-text-primary">
            <Sparkles className="size-8 opacity-60" aria-hidden />
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-1.5 flex-wrap z-10">
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-950/80 text-white text-[11px] font-medium px-2.5 py-1 backdrop-blur">
            <Clock className="size-3" aria-hidden /> {formatDuration(service.durationMin)}
          </span>
          {qtyInCart > 0 && !isStatic && (
            <span className="inline-flex items-center rounded-full t-bg-primary text-white text-[11px] font-semibold px-2.5 py-1">
              ×{qtyInCart}
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1 gap-3">
        <header>
          <h3 className="font-heading font-semibold text-[1.05rem] leading-snug text-neutral-900">{service.name}</h3>
          {service.description && (
            <p className="clamp-2 text-sm text-neutral-500 mt-1.5 leading-relaxed">{service.description}</p>
          )}
        </header>

        {Object.keys(service.metadata ?? {}).length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Atributos del servicio">
            {Object.entries(service.metadata ?? {}).map(([key, value]) => {
              const text = formatMetaValue(value)
              if (!text) return null
              const Icon = iconForKey(key)
              return (
                <li
                  key={key}
                  className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground text-[11px] px-2 py-1 border border-neutral-200/70"
                  title={`${humanizeKey(key)}: ${text}`}
                >
                  <Icon className="size-3 shrink-0 t-text-primary opacity-80" aria-hidden />
                  <span className="max-w-44 truncate">
                    <span className="text-neutral-400">{humanizeKey(key)}:</span> {text}
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        <footer className="mt-auto pt-3 border-t border-dashed border-neutral-200 flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] uppercase tracking-wide text-neutral-400">Desde</span>
            <p className="font-heading font-bold text-xl t-text-primary leading-none">
              ${Number.isFinite(service.price) ? service.price.toFixed(2) : '0.00'}
            </p>
          </div>
          {!isStatic && (
            <div className="flex items-center gap-2">
              {onReserve && (
                <button
                  onClick={() => onReserve(service)}
                  className="rounded-full border border-neutral-300 hover:border-neutral-400 px-3.5 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Reservar
                </button>
              )}
              {onAdd && (
                <button
                  onClick={handleAdd}
                  aria-label={`Añadir ${service.name} al pedido`}
                  className="t-btn-primary rounded-full inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
                >
                  <ShoppingCart className="size-3.5" aria-hidden />
                  Añadir
                </button>
              )}
            </div>
          )}
        </footer>
      </div>
    </article>
  )
}

export const ServiceCard = memo(ServiceCardInner)

/** Stepper compacto reutilizable (carrito). */
export function QtyStepper({
  qty,
  onChange,
  small,
}: {
  qty: number
  onChange: (qty: number) => void
  small?: boolean
}) {
  const btn = `grid place-items-center ${small ? 'size-7' : 'size-8'} rounded-full border border-neutral-300 hover:border-neutral-400 text-neutral-700 hover:text-neutral-950 transition-colors`
  return (
    <div className="inline-flex items-center gap-2" role="group" aria-label="Cantidad">
      <button type="button" className={btn} onClick={() => onChange(qty - 1)} aria-label="Quitar uno">
        <Minus className={small ? 'size-3' : 'size-3.5'} />
      </button>
      <span className={`text-center font-semibold tabular-nums ${small ? 'w-5 text-sm' : 'w-7'}`}>{qty}</span>
      <button type="button" className={btn} onClick={() => onChange(qty + 1)} aria-label="Añadir uno">
        <Plus className={small ? 'size-3' : 'size-3.5'} />
      </button>
    </div>
  )
}