'use client'

/** PÚBLICO — Nosotros: historia, stats y equipo (profesionales). */
import Image from 'next/image'
import { Award, HeartHandshake, Users } from 'lucide-react'
import type { AboutContent } from '@/domain/entities'
import { useUiStore } from '@/store/ui'
import { translator } from '@/lib/i18n'
import type { PublicProfessional } from './types'

export function AboutSection({ content, professionals }: { content: AboutContent | undefined; professionals: PublicProfessional[] }) {
  const lang = useUiStore((s) => s.lang)
  const t = translator(lang)
  const title = content?.title || t('about.title')
  const text = content?.text || ''
  const stats = (content?.stats ?? []).filter((s) => s.label && s.value)

  return (
    <section id="nosotros" className="py-20 sm:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 grid gap-12 lg:grid-cols-2 items-center">
        <div className="order-2 lg:order-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] t-text-primary">{t('about.title')}</p>
          <h2 className="font-heading mt-2 text-3xl sm:text-4xl font-extrabold text-neutral-900">{title}</h2>
          {text && <p className="mt-5 text-neutral-600 leading-relaxed text-[15px]">{text}</p>}

          {stats.length > 0 && (
            <dl className="mt-8 grid grid-cols-3 gap-4">
              {stats.slice(0, 3).map((s, i) => (
                <div key={i} className="rounded-2xl t-bg-soft border t-border/20 p-4 text-center">
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="font-heading text-2xl sm:text-3xl font-extrabold t-text-primary">{s.value}</dd>
                  <dd className="text-[11px] sm:text-xs text-neutral-500 mt-1 leading-tight">{s.label}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-6 flex flex-wrap gap-4 text-xs text-neutral-500">
            <span className="inline-flex items-center gap-1.5"><Award className="size-4 t-text-primary" aria-hidden /> Equipo certificado</span>
            <span className="inline-flex items-center gap-1.5"><HeartHandshake className="size-4 t-text-primary" aria-hidden /> Trato humano</span>
            <span className="inline-flex items-center gap-1.5"><Users className="size-4 t-text-primary" aria-hidden /> Atención familiar</span>
          </div>
        </div>

        <div className="order-1 lg:order-2 grid gap-4">
          <div className="relative aspect-[16/10] rounded-3xl overflow-hidden shadow-xl border border-neutral-200">
            {content?.imageUrl ? (
              <Image src={content.imageUrl} alt="Instalaciones de la clínica" fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" />
            ) : (
              <div className="absolute inset-0 t-bg-soft grid place-items-center t-text-primary">
                <Users className="size-12 opacity-40" aria-hidden />
              </div>
            )}
          </div>

          {professionals.filter((p) => p.name).length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {professionals.slice(0, 2).map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3">
                  <div className="relative size-14 shrink-0 rounded-xl overflow-hidden bg-muted">
                    {p.photoUrl && (
                      <Image src={p.photoUrl} alt={p.name} fill sizes="56px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-[11px] text-neutral-500 truncate">{p.specialty ?? 'Odontología'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
