'use client'

/** PÚBLICO — Hero editable: imagen de fondo, título, subtítulo, CTA y highlights. */
import Image from 'next/image'
import { ArrowRight, CalendarPlus, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import type { HeroContent } from '@/domain/entities'
import { useUiStore } from '@/store/ui'
import { translator } from '@/lib/i18n'

export function HeroSection({ content, onBook }: { content: HeroContent | undefined; onBook: () => void }) {
  const lang = useUiStore((s) => s.lang)
  const t = translator(lang)

  const title = content?.title || 'Tu mejor sonrisa comienza aquí'
  const subtitle = content?.subtitle || ''
  const badge = content?.badge || ''
  const highlights = (content?.highlights ?? []).filter(Boolean).slice(0, 3)
  const cta = content?.ctaLabel || t('hero.cta')
  const cta2 = content?.ctaSecondaryLabel || t('hero.ctaSecondary')

  return (
    // `isolate` crea un stacking context propio: el fondo absoluto con `-z-10`
    // queda CONFINADO detrás del contenido de esta sección, pero nunca por
    // detrás de los fondos (`bg-white`) de los ancestros. Sin esto, el z-index
    // negativo escapa al stacking context raíz y el fondo del hero (imagen +
    // velo de gradiente) queda pintado DEBAJO del fondo blanco de la página,
    // dejando el hero invisible (texto blanco sobre blanco).
    <section id="inicio" className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        {content?.backgroundImageUrl ? (
          <Image
            src={content.backgroundImageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 t-bg-primary" />
        )}
        {/* Velo de gradiente con el color del tema */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(105deg, color-mix(in srgb, var(--t-primary) 92%, black) 8%, color-mix(in srgb, var(--t-primary) 55%, transparent) 55%, color-mix(in srgb, var(--t-primary) 20%, transparent) 100%)',
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-24 sm:py-32 lg:py-36">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="max-w-2xl"
        >
          {badge && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 text-white/95 backdrop-blur px-3.5 py-1.5 text-xs font-semibold tracking-wide border border-white/20">
              <Sparkles className="size-3.5" aria-hidden /> {badge}
            </span>
          )}
          <h1 className="font-heading mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.06] [text-wrap:balance]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-5 text-base sm:text-lg text-white/85 leading-relaxed max-w-xl">{subtitle}</p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={onBook}
              className="inline-flex items-center gap-2 rounded-full bg-white text-neutral-900 px-6 py-3.5 text-sm font-bold hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <CalendarPlus className="size-4.5" aria-hidden /> {cta}
            </button>
            <a
              href="#servicios"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 text-white px-6 py-3.5 text-sm font-semibold hover:bg-white/10 transition-colors"
            >
              {cta2} <ArrowRight className="size-4" aria-hidden />
            </a>
          </div>

          {highlights.length > 0 && (
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2">
              {highlights.map((h, i) => (
                <li key={i} className="text-white/90 text-sm font-medium flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-white/70" aria-hidden /> {h}
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>

      {/* Onda decorativa hacia servicios */}
      <svg
        className="absolute bottom-0 left-0 right-0 text-white"
        viewBox="0 0 1440 74"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d="M0,37 C240,74 480,0 720,17 C960,34 1200,74 1440,42 L1440,74 L0,74 Z" fill="currentColor" />
      </svg>
    </section>
  )
}
