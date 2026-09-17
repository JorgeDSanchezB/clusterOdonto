'use client'

/**
 * PÚBLICO — Catálogo de servicios: Array.map + React.memo + key={service.id}
 * (prohibido index). El botón "Reservar" de cada tarjeta pre-selecciona el
 * servicio en el modal de reserva.
 */
import { PackageOpen } from 'lucide-react'
import type { ServicesSectionContent } from '@/domain/entities'
import { ServiceCard } from './ServiceCard'
import { useUiStore } from '@/store/ui'
import { translator } from '@/lib/i18n'
import type { PublicService } from './types'

export function ServicesSection({
  content,
  services,
  onAdd,
  onReserve,
  qtyOf,
  onQty,
}: {
  content: ServicesSectionContent | undefined
  services: PublicService[]
  onAdd: (service: PublicService, qty: number) => void
  onReserve: (service: PublicService) => void
  qtyOf: (serviceId: string) => number
  onQty: (serviceId: string, qty: number) => void
}) {
  const lang = useUiStore((s) => s.lang)
  const t = translator(lang)

  const title = content?.title || t('services.title')
  const subtitle = content?.subtitle || t('services.subtitle')

  return (
    <section id="servicios" className="py-20 sm:py-24 t-bg-soft/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <header className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] t-text-primary">Catálogo</p>
          <h2 className="font-heading mt-2 text-3xl sm:text-4xl font-extrabold text-neutral-900">{title}</h2>
          <p className="mt-3 text-neutral-500 leading-relaxed">{subtitle}</p>
        </header>

        {services.length === 0 ? (
          <div className="mt-12 max-w-md mx-auto text-center border rounded-2xl bg-white p-10">
            <PackageOpen className="size-10 text-neutral-300 mx-auto" aria-hidden />
            <p className="mt-4 text-sm text-muted-foreground">{t('services.empty')}</p>
          </div>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div key={service.id} className="relative">
                <ServiceCard service={service} onAdd={onAdd} onReserve={onReserve} qtyInCart={qtyOf(service.id)} />
                {qtyOf(service.id) > 0 && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <span className="inline-flex items-center rounded-full t-bg-primary text-white text-[11px] font-bold px-2 py-0.5 shadow-md">
                      ×{qtyOf(service.id)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {services.length > 0 && (
          <p className="mt-8 text-center text-xs text-neutral-400">
            Los atributos de cada servicio (sesiones, materiales, garantías…) provienen de un campo <code className="px-1 py-0.5 rounded bg-neutral-200/70">metadata JSONB</code> extensible sin recompilar.
          </p>
        )}
      </div>
    </section>
  )
}
