/** DTOs públicos del sitio (respuestas de /api/[slug]/*). */
import type {
  AboutContent,
  ContactContent,
  HeroContent,
  HoursContent,
  LocationSectionContent,
  ServicesSectionContent,
  SiteContentMap,
  TestimonialsContent,
  ThemeConfig,
} from '@/domain/entities'

export interface PublicTenant {
  slug: string
  name: string
  address: string | null
  city: string | null
  phone: string | null
  email: string | null
  whatsapp: string | null
  logoUrl: string | null
  ivaPercent: number
  theme: ThemeConfig
  hours: { weekday: number; open: string; close: string }[]
}

export interface PublicService {
  id: string
  name: string
  description: string | null
  price: number
  durationMin: number
  imageUrl: string | null
  metadata: Record<string, unknown>
  active: boolean
  sortOrder: number
}

export interface PublicProfessional {
  id: string
  name: string
  specialty: string | null
  bio: string | null
  photoUrl: string | null
  locationId: string | null
}

export interface PublicLocation {
  id: string
  name: string
  address: string
  phone: string | null
  lat: number | null
  lng: number | null
  mapQuery: string | null
  active: boolean
  sortOrder: number
}

export interface PublicSiteContent extends SiteContentMap {
  hero?: HeroContent
  services?: ServicesSectionContent
  about?: AboutContent
  hours?: HoursContent
  location?: LocationSectionContent
  contact?: ContactContent
  testimonials?: TestimonialsContent
}
