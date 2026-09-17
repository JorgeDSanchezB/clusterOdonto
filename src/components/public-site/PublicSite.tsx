'use client'

/**
 * PÚBLICO — Composición del sitio del tenant: aplica el tema (CSS vars en
 * vivo), carga los datos por slug y renderiza las secciones (cada una con
 * su componente y defaults tolerantes). Footer pegado al fondo (mt-auto).
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { resolveTheme, themeToCssVars } from '@/lib/theme'
import { useUiStore } from '@/store/ui'
import { useCartStore } from '@/store/cart'
import { useThemeStore } from '@/store/theme'
import { translator } from '@/lib/i18n'
import { SiteNavbar } from './SiteNavbar'
import { HeroSection } from './HeroSection'
import { ServicesSection } from './ServicesSection'
import { AboutSection } from './AboutSection'
import { HoursSection } from './HoursSection'
import { LocationSection } from './LocationSection'
import { TestimonialsSection } from './TestimonialsSection'
import { ContactSection } from './ContactSection'
import { SiteFooter } from './SiteFooter'
import { CartDrawer } from './CartDrawer'
import { BookingModal } from './BookingModal'
import type { PublicLocation, PublicProfessional, PublicService, PublicSiteContent, PublicTenant } from './types'

export default function PublicSite({ slug }: { slug: string }) {
  const lang = useUiStore((s) => s.lang)
  const openBooking = useUiStore((s) => s.openBooking)
  const liveTheme = useThemeStore((s) => s.live)
  const addItem = useCartStore((s) => s.addItem)
  const setQty = useCartStore((s) => s.setQty)
  const items = useCartStore((s) => s.items)
  const t = translator(lang)

  const { data: tenant } = useQuery({
    queryKey: ['public-tenant', slug],
    queryFn: () => api<PublicTenant>(`/api/${slug}/tenant`),
  })
  const { data: content } = useQuery({
    queryKey: ['public-content', slug],
    queryFn: () => api<PublicSiteContent>(`/api/${slug}/content`),
  })
  const { data: services } = useQuery({
    queryKey: ['public-services', slug],
    queryFn: () => api<PublicService[]>(`/api/${slug}/services?limit=50`),
  })
  const { data: professionals } = useQuery({
    queryKey: ['public-professionals', slug],
    queryFn: () => api<PublicProfessional[]>(`/api/${slug}/professionals?limit=50`),
  })
  const { data: locations } = useQuery({
    queryKey: ['public-locations', slug],
    queryFn: () => api<PublicLocation[]>(`/api/${slug}/locations?limit=20`),
  })

  // Tema efectivo: edición "en vivo" del panel (Zustand) si existe; si no, el
  // tema guardado del tenant. Nunca se escribe al store durante el render.
  const tenantTheme = tenant?.theme
  const applied = useMemo(
    () => liveTheme ?? resolveTheme(tenantTheme),
    [liveTheme, tenantTheme],
  )
  const themeVars = useMemo(() => themeToCssVars(applied), [applied])

  const qtyOf = (serviceId: string) => items.find((i) => i.serviceId === serviceId)?.qty ?? 0
  const handleAdd = (service: PublicService, qty: number) => {
    addItem(
      { serviceId: service.id, name: service.name, price: service.price, imageUrl: service.imageUrl, durationMin: service.durationMin },
      qty,
    )
  }

  if (!tenant) {
    return (
      <div className="flex-1 grid place-items-center py-32">
        <div className="text-center">
          <div className="size-10 rounded-full border-2 border-neutral-300 border-t-transparent animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground text-sm">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ ...themeVars, fontFamily: 'var(--font-body)' } as React.CSSProperties}
      className="min-h-[calc(100vh-3rem)] flex flex-col bg-white text-neutral-900"
    >
      <SiteNavbar tenant={tenant} content={content} services={services ?? []} onBook={() => openBooking()} />

      <main className="flex-1">
        <HeroSection content={content?.hero} onBook={() => openBooking()} />
        <ServicesSection
          content={content?.services}
          services={services ?? []}
          onAdd={handleAdd}
          onReserve={(svc) => openBooking(svc.id)}
          qtyOf={qtyOf}
          onQty={setQty}
        />
        <AboutSection content={content?.about} professionals={professionals ?? []} />
        <HoursSection content={content?.hours} hours={tenant.hours} />
        <LocationSection content={content?.location} locations={locations ?? []} />
        <TestimonialsSection content={content?.testimonials} />
        <ContactSection tenant={tenant} content={content?.contact} />
      </main>

      <SiteFooter tenant={tenant} />

      <CartDrawer tenant={tenant} />
      <BookingModal tenant={tenant} services={services ?? []} professionals={professionals ?? []} locations={locations ?? []} />
    </div>
  )
}
