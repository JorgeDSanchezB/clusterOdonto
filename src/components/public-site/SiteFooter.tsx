'use client'

/** PÚBLICO — Footer pegado al fondo (mt-auto en el layout del sitio). */
import { CalendarCheck } from 'lucide-react'
import type { PublicTenant } from './types'
import { useUiStore } from '@/store/ui'
import { translator } from '@/lib/i18n'
import { APP_NAME } from '@/lib/constants'

export function SiteFooter({ tenant }: { tenant: PublicTenant }) {
  const lang = useUiStore((s) => s.lang)
  const t = translator(lang)
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto bg-black/90 border-t border-white/10 text-neutral-300 skin-dark">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 grid gap-10 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center size-9 rounded-xl t-bg-primary text-white">
              <CalendarCheck className="size-4.5" aria-hidden />
            </span>
            <div>
              <p className="font-heading font-bold text-white text-sm">{tenant.name}</p>
              <p className="text-[11px] text-neutral-500">Odontología integral</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-neutral-400 leading-relaxed max-w-xs">
            {tenant.city ? `Atención odontológica de calidad en ${tenant.city}.` : 'Atención odontológica de calidad.'}{' '}
            Tu sonrisa, nuestra prioridad.
          </p>
        </div>

        <nav aria-label="Enlaces del sitio" className="grid grid-cols-2 gap-2 text-sm self-center">
          <a className="hover:text-white/90 transition-colors text-white/70" href="#inicio">{t('nav.home')}</a>
          <a className="hover:text-white transition-colors" href="#servicios">{t('nav.services')}</a>
          <a className="hover:text-white transition-colors" href="#nosotros">{t('nav.about')}</a>
          <a className="hover:text-white transition-colors" href="#horarios">{t('nav.hours')}</a>
          <a className="hover:text-white transition-colors" href="#ubicacion">{t('nav.location')}</a>
          <a className="hover:text-white transition-colors" href="#contacto">{t('nav.contact')}</a>
        </nav>

        <div className="text-sm space-y-1.5 md:text-right">
          {tenant.phone && <p className="text-neutral-400">{tenant.phone}</p>}
          {tenant.email && <p className="text-neutral-400">{tenant.email}</p>}
          {tenant.address && (
            <p className="text-neutral-500">
              {tenant.address}
              {tenant.city ? `, ${tenant.city}` : ''}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-neutral-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-neutral-500">
          <p>
            © {year} {tenant.name}. {t('footer.rights')}
          </p>
          <p className="inline-flex items-center gap-1">
            {t('footer.poweredBy')} <span className="font-semibold text-neutral-300">{APP_NAME}</span>
          </p>
        </div>
      </div>
    </footer>
  )
}