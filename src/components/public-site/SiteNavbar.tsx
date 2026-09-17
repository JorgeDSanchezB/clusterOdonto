'use client'

/** PÚBLICO — Navbar vistoso con anclas a secciones, carrito y CTA Reservar. */
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { CalendarPlus, Menu, Phone, ShoppingCart, X } from 'lucide-react'
import type { PublicService, PublicSiteContent, PublicTenant } from './types'
import { useUiStore } from '@/store/ui'
import { useCartStore, cartCount } from '@/store/cart'
import { translator } from '@/lib/i18n'

const LINKS = [
  { id: 'inicio', key: 'nav.home' },
  { id: 'servicios', key: 'nav.services' },
  { id: 'nosotros', key: 'nav.about' },
  { id: 'horarios', key: 'nav.hours' },
  { id: 'ubicacion', key: 'nav.location' },
  { id: 'contacto', key: 'nav.contact' },
] as const

export function SiteNavbar({
  tenant,
  content,
  services,
  onBook,
}: {
  tenant: PublicTenant
  content: PublicSiteContent | undefined
  services: PublicService[]
  onBook: () => void
}) {
  const lang = useUiStore((s) => s.lang)
  const t = translator(lang)
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const count = useCartStore(cartCount)
  const hydrated = useCartStore((s) => s.hydrated)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const brandInitial = tenant.name?.trim()?.[0] ?? 'S'
  void services
  void content

  return (
    <header
      className={`sticky top-12 z-40 transition-all duration-300 ${
        scrolled ? 'bg-white/90 backdrop-blur-md shadow-[0_1px_0_rgba(15,23,42,0.08)]' : 'bg-white'
      }`}
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center gap-3 h-16" aria-label="Principal">
        <a href="#inicio" className="flex items-center gap-2.5 min-w-0">
          {tenant.logoUrl ? (
            <Image
              src={tenant.logoUrl}
              alt={`Logo ${tenant.name}`}
              width={38}
              height={38}
              className="size-9 rounded-xl object-cover border border-neutral-200"
            />
          ) : (
            <span className="grid place-items-center size-9 rounded-xl t-bg-primary text-white font-heading font-bold">
              {brandInitial}
            </span>
          )}
          <span className="min-w-0">
            <span className="block font-heading font-bold text-sm sm:text-base leading-tight truncate">
              {tenant.name}
            </span>
            <span className="hidden sm:block text-[11px] text-neutral-400 truncate">
              {tenant.city ? `Odontología · ${tenant.city}` : 'Odontología integral'}
            </span>
          </span>
        </a>

        <div className="hidden lg:flex items-center gap-1 mx-auto">
          {LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              className="px-3 py-2 rounded-full text-sm font-medium text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 transition-colors"
            >
              {t(l.key)}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto lg:ml-0">
          {tenant.phone && (
            <a
              href={`tel:${tenant.phone.replace(/\s/g, '')}`}
              className="hidden md:inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-950"
            >
              <Phone className="size-4" aria-hidden /> {tenant.phone}
            </a>
          )}
          <CartButton count={hydrated ? count : 0} />
          <button
            onClick={onBook}
            className="t-btn-primary hidden sm:inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold"
          >
            <CalendarPlus className="size-4" aria-hidden /> {t('nav.book')}
          </button>
          <button
            className="lg:hidden grid place-items-center size-10 rounded-lg hover:bg-neutral-100"
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menú"
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="lg:hidden border-t bg-white px-4 pb-4 pt-2 animate-fade-up">
          <div className="grid gap-1">
            {LINKS.map((l) => (
              <a
                key={l.id}
                href={`#${l.id}`}
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                {t(l.key)}
              </a>
            ))}
            <button
              onClick={() => {
                setOpen(false)
                onBook()
              }}
              className="t-btn-primary mt-2 inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold"
            >
              <CalendarPlus className="size-4" aria-hidden /> {t('nav.book')}
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

function CartButton({ count }: { count: number }) {
  const setCartOpen = useUiStore((s) => s.setCartOpen)
  return (
    <button
      onClick={() => setCartOpen(true)}
      className="relative grid place-items-center size-10 rounded-full hover:bg-neutral-100 transition-colors"
      aria-label="Abrir pedido"
    >
      <ShoppingCart className="size-5 text-neutral-700" aria-hidden />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 grid place-items-center rounded-full t-bg-primary text-white text-[11px] font-bold">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}
