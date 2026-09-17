'use client'

/** PÚBLICO — Contacto: tarjeta con teléfono, WhatsApp, email y dirección. */
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { useUiStore } from '@/store/ui'
import { translator } from '@/lib/i18n'
import type { ContactContent } from '@/domain/entities'
import type { PublicTenant } from './types'

export function ContactSection({ tenant, content }: { tenant: PublicTenant; content: ContactContent | undefined }) {
  const lang = useUiStore((s) => s.lang)
  const t = translator(lang)

  const waMessage = content?.whatsappMessage || 'Hola 👋 Me gustaría información sobre sus servicios dentales.'
  const waUrl = tenant.whatsapp
    ? `https://wa.me/${tenant.whatsapp}?text=${encodeURIComponent(waMessage)}`
    : null

  return (
    <section id="contacto" className="py-20 sm:py-24 bg-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <header className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.18em] t-text-primary flex items-center justify-center gap-1.5">
            <MessageCircle className="size-3.5" aria-hidden /> Hablemos
          </p>
          <h2 className="font-heading mt-2 text-3xl sm:text-4xl font-extrabold text-neutral-900">{t('contact.title')}</h2>
          {content?.note && <p className="mt-3 text-neutral-500">{content.note}</p>}
        </header>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {tenant.phone && (
            <a
              href={`tel:${tenant.phone.replace(/\s/g, '')}`}
              className="group rounded-2xl border border-neutral-200 bg-white p-6 text-center hover:border-neutral-300 hover:shadow-md transition-all"
            >
              <span className="mx-auto grid place-items-center size-12 rounded-full t-bg-soft t-text-primary mb-3 group-hover:scale-110 transition-transform">
                <Phone className="size-5" aria-hidden />
              </span>
              <p className="text-xs uppercase tracking-wide text-neutral-400 font-semibold">{t('contact.call')}</p>
              <p className="mt-1 font-semibold text-neutral-800">{tenant.phone}</p>
            </a>
          )}
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center hover:border-emerald-300 hover:shadow-md transition-all"
            >
              <span className="mx-auto grid place-items-center size-12 rounded-full bg-emerald-100 text-emerald-600 mb-3 group-hover:scale-110 transition-transform">
                <MessageCircle className="size-5" aria-hidden />
              </span>
              <p className="text-xs uppercase tracking-wide text-emerald-700/70 font-semibold">{t('contact.whatsapp')}</p>
              <p className="mt-1 font-semibold text-emerald-800">+{tenant.whatsapp}</p>
            </a>
          )}
          {tenant.email && (
            <a
              href={`mailto:${tenant.email}`}
              className="group rounded-2xl border border-neutral-200 bg-white p-6 text-center hover:border-neutral-300 hover:shadow-md transition-all"
            >
              <span className="mx-auto grid place-items-center size-12 rounded-full t-bg-soft t-text-primary mb-3 group-hover:scale-110 transition-transform">
                <Mail className="size-5" aria-hidden />
              </span>
              <p className="text-xs uppercase tracking-wide text-neutral-400 font-semibold">Email</p>
              <p className="mt-1 font-semibold text-neutral-800 truncate">{tenant.email}</p>
            </a>
          )}
        </div>

        {tenant.address && (
          <p className="mt-6 flex items-center justify-center gap-1.5 text-sm text-neutral-500 text-center">
            <MapPin className="size-4 shrink-0" aria-hidden />
            {tenant.address}
            {tenant.city ? `, ${tenant.city}` : ''}
          </p>
        )}
      </div>
    </section>
  )
}
