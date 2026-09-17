'use client'

/** PÚBLICO — Ubicación: mapa embebido (OpenStreetMap, sin API key) + datos. */
import { MapPin, Navigation, Phone, ExternalLink } from 'lucide-react'
import type { LocationSectionContent } from '@/domain/entities'
import { useUiStore } from '@/store/ui'
import { translator } from '@/lib/i18n'
import type { PublicLocation } from './types'

function osmEmbedUrl(loc: PublicLocation): string {
  if (loc.lat != null && loc.lng != null) {
    const d = 0.008
    const bbox = `${loc.lng - d}%2C${loc.lat - d}%2C${loc.lng + d}%2C${loc.lat + d}`
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${loc.lat}%2C${loc.lng}`
  }
  return `https://www.openstreetmap.org/export/embed.html?bbox=-78.55%2C-0.25%2C-78.40%2C-0.13&layer=mapnik`
}

export function LocationSection({ content, locations }: { content: LocationSectionContent | undefined; locations: PublicLocation[] }) {
  const lang = useUiStore((s) => s.lang)
  const t = translator(lang)
  const main = locations[0]

  return (
    <section id="ubicacion" className="py-20 sm:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <header className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.18em] t-text-primary flex items-center justify-center gap-1.5">
            <MapPin className="size-3.5" aria-hidden /> Dónde estamos
          </p>
          <h2 className="font-heading mt-2 text-3xl sm:text-4xl font-extrabold text-neutral-900">{t('location.title')}</h2>
        </header>

        {!main ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">Dirección disponible próximamente.</p>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-5 items-stretch">
            <div className="lg:col-span-3 rounded-3xl overflow-hidden border border-neutral-200 shadow-sm min-h-72 bg-muted relative">
              <iframe
                title={`Mapa — ${main.name}`}
                src={osmEmbedUrl(main)}
                className="absolute inset-0 w-full h-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="rounded-3xl t-bg-soft border t-border/20 p-6 flex-1 flex flex-col justify-center gap-4">
                <div>
                  <h3 className="font-heading font-bold text-lg text-neutral-900">{main.name}</h3>
                  <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed">{main.address}</p>
                </div>
                {main.phone && (
                  <a href={`tel:${main.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 text-sm font-medium t-text-primary hover:underline">
                    <Phone className="size-4" aria-hidden /> {main.phone}
                  </a>
                )}
                {content?.note && <p className="text-xs text-neutral-500 leading-relaxed">{content.note}</p>}
                <div className="flex flex-wrap gap-2 mt-1">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(main.mapQuery || main.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-4 py-2 text-xs font-semibold hover:border-neutral-400 transition-colors"
                  >
                    {t('location.viewMap')} <ExternalLink className="size-3" aria-hidden />
                  </a>
                  <a
                    href={`https://waze.com/ul?q=${encodeURIComponent(main.mapQuery || main.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-4 py-2 text-xs font-semibold hover:border-neutral-400 transition-colors"
                  >
                    <Navigation className="size-3" aria-hidden /> {t('location.waze')}
                  </a>
                </div>
              </div>
              {locations.length > 1 && (
                <ul className="grid gap-2">
                  {locations.slice(1, 4).map((loc) => (
                    <li key={loc.id} className="rounded-2xl border border-neutral-200 px-4 py-3 text-sm">
                      <span className="font-medium">{loc.name}</span>
                      <span className="text-neutral-500"> — {loc.address}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
