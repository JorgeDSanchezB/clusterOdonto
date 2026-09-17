'use client'

/** PÚBLICO — Testimonios (contenido editable por sección). */
import { Quote, Star } from 'lucide-react'
import type { TestimonialsContent } from '@/domain/entities'
import { useUiStore } from '@/store/ui'
import { translator } from '@/lib/i18n'

function Stars({ rating }: { rating: number }) {
  const clamped = Number.isFinite(rating) ? Math.max(0, Math.min(5, Math.round(rating))) : 5
  return (
    <div className="flex gap-0.5" aria-label={`${clamped} de 5 estrellas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`size-4 ${i < clamped ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'}`} aria-hidden />
      ))}
    </div>
  )
}

export function TestimonialsSection({ content }: { content: TestimonialsContent | undefined }) {
  const lang = useUiStore((s) => s.lang)
  const t = translator(lang)
  const items = (content?.items ?? []).filter((x) => x.name && x.text).slice(0, 6)
  if (items.length === 0) return null

  const title = content?.title || t('testimonials.title')

  return (
    <section id="contacto-testimonios" className="py-20 sm:py-24 t-bg-soft/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <header className="text-center max-w-2xl mx-auto">
          <div className="flex justify-center gap-0.5 mb-3" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-neutral-900">{title}</h2>
          {content?.subtitle && <p className="mt-3 text-neutral-500">{content.subtitle}</p>}
        </header>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {items.map((item) => (
            <figure key={item.name + item.text.slice(0, 12)} className="relative bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm flex flex-col gap-4">
              <Quote className="size-6 t-text-primary opacity-30" aria-hidden />
              <blockquote className="text-sm text-neutral-600 leading-relaxed flex-1">{item.text}</blockquote>
              <figcaption className="flex items-center gap-3 pt-3 border-t border-dashed border-neutral-200">
                <span className="grid place-items-center size-10 rounded-full t-bg-primary text-white text-sm font-bold shrink-0">
                  {item.initials || item.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 truncate">{item.name}</p>
                  {item.role && <p className="text-[11px] text-neutral-400 truncate">{item.role}</p>}
                </div>
                <div className="ml-auto">
                  <Stars rating={item.rating} />
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
