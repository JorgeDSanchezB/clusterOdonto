/**
 * i18n minimalista y tipado — Español (default) con arquitectura lista para
 * añadir idiomas. El contenido editable vive en BD; aquí solo el "chrome"
 * de la interfaz (nav, botones, formularios).
 */

export type Lang = 'es' | 'en'

type Dict = Record<string, string>

const es: Dict = {
  'nav.home': 'Inicio',
  'nav.services': 'Servicios',
  'nav.about': 'Nosotros',
  'nav.hours': 'Horarios',
  'nav.location': 'Ubicación',
  'nav.contact': 'Contacto',
  'nav.book': 'Reservar',
  'hero.cta': 'Reservar cita',
  'hero.ctaSecondary': 'Ver servicios',
  'services.title': 'Nuestros servicios',
  'services.subtitle': 'Tratamientos diseñados para tu bienestar, con precios claros y honestos.',
  'services.addToCart': 'Añadir',
  'services.added': 'Añadido',
  'services.from': 'Desde',
  'services.duration': 'Duración',
  'services.empty': 'Aún no hay servicios publicados. Vuelve pronto.',
  'cart.title': 'Tu pedido',
  'cart.empty': 'Tu carrito está vacío. ¡Añade algunos servicios!',
  'cart.subtotal': 'Subtotal',
  'cart.iva': 'IVA',
  'cart.total': 'Total',
  'cart.name': 'Tu nombre',
  'cart.phone': 'Tu teléfono',
  'cart.send': 'Enviar pedido por WhatsApp',
  'cart.sent': '¡Pedido enviado!',
  'cart.openWa': 'Abrir WhatsApp',
  'about.title': 'Sobre nosotros',
  'hours.title': 'Horarios de atención',
  'hours.closed': 'Cerrado',
  'location.title': 'Dónde encontrarnos',
  'location.viewMap': 'Ver en Google Maps',
  'location.waze': 'Abrir en Waze',
  'testimonials.title': 'Lo que dicen nuestros pacientes',
  'contact.title': 'Contáctanos',
  'contact.whatsapp': 'Escríbenos por WhatsApp',
  'contact.call': 'Llamar',
  'footer.rights': 'Todos los derechos reservados.',
  'footer.poweredBy': 'Sitio creado con',
  'book.title': 'Reservar tu cita',
  'book.step.service': 'Servicio',
  'book.step.location': 'Sede',
  'book.step.professional': 'Profesional',
  'book.step.datetime': 'Fecha y hora',
  'book.step.patient': 'Tus datos',
  'book.anyProfessional': 'Cualquier profesional',
  'book.chooseDate': 'Elige una fecha',
  'book.noSlots': 'No hay horarios disponibles para este día. Prueba otra fecha.',
  'book.loadingSlots': 'Buscando horarios disponibles…',
  'book.confirm': 'Confirmar reserva',
  'book.success': '¡Reserva registrada!',
  'book.cancelLink': 'Link para cancelar tu reserva',
  'book.copy': 'Copiar',
  'book.copied': '¡Copiado!',
  'book.emailNote': 'Te enviamos la confirmación por email (ver demo en consola).',
  'book.back': 'Atrás',
  'book.next': 'Continuar',
  'cancel.title': 'Cancelar tu reserva',
  'cancel.confirm': 'Sí, cancelar mi reserva',
  'cancel.success': 'Tu reserva fue cancelada. ¡Esperamos verte pronto!',
  'cancel.already': 'Esta reserva ya fue cancelada.',
  'common.loading': 'Cargando…',
  'common.error': 'Ocurrió un error. Intenta de nuevo.',
  'common.close': 'Cerrar',
  'common.minutes': 'min',
}

const en: Dict = {
  'nav.home': 'Home',
  'nav.services': 'Services',
  'nav.about': 'About us',
  'nav.hours': 'Hours',
  'nav.location': 'Location',
  'nav.contact': 'Contact',
  'nav.book': 'Book now',
  'hero.cta': 'Book an appointment',
  'hero.ctaSecondary': 'View services',
  'services.title': 'Our services',
  'services.subtitle': 'Treatments designed for your wellbeing, with clear and honest pricing.',
  'services.addToCart': 'Add',
  'services.added': 'Added',
  'services.from': 'From',
  'services.duration': 'Duration',
  'services.empty': 'No services published yet. Come back soon!',
  'cart.title': 'Your order',
  'cart.empty': 'Your cart is empty. Add some services!',
  'cart.subtotal': 'Subtotal',
  'cart.iva': 'VAT',
  'cart.total': 'Total',
  'cart.name': 'Your name',
  'cart.phone': 'Your phone',
  'cart.send': 'Send order via WhatsApp',
  'cart.sent': 'Order sent!',
  'cart.openWa': 'Open WhatsApp',
  'about.title': 'About us',
  'hours.title': 'Opening hours',
  'hours.closed': 'Closed',
  'location.title': 'Where to find us',
  'location.viewMap': 'View on Google Maps',
  'location.waze': 'Open in Waze',
  'testimonials.title': 'What our patients say',
  'contact.title': 'Contact us',
  'contact.whatsapp': 'Message us on WhatsApp',
  'contact.call': 'Call us',
  'footer.rights': 'All rights reserved.',
  'footer.poweredBy': 'Site built with',
  'book.title': 'Book your appointment',
  'book.step.service': 'Service',
  'book.step.location': 'Location',
  'book.step.professional': 'Professional',
  'book.step.datetime': 'Date & time',
  'book.step.patient': 'Your details',
  'book.anyProfessional': 'Any professional',
  'book.chooseDate': 'Pick a date',
  'book.noSlots': 'No slots available for this day. Try another date.',
  'book.loadingSlots': 'Looking for available slots…',
  'book.confirm': 'Confirm booking',
  'book.success': 'Booking registered!',
  'book.cancelLink': 'Link to cancel your booking',
  'book.copy': 'Copy',
  'book.copied': 'Copied!',
  'book.emailNote': 'We sent you a confirmation email (see console demo).',
  'book.back': 'Back',
  'book.next': 'Continue',
  'cancel.title': 'Cancel your booking',
  'cancel.confirm': 'Yes, cancel my booking',
  'cancel.success': 'Your booking was cancelled. See you soon!',
  'cancel.already': 'This booking was already cancelled.',
  'common.loading': 'Loading…',
  'common.error': 'Something went wrong. Try again.',
  'common.close': 'Close',
  'common.minutes': 'min',
}

export const DICTIONARIES: Record<Lang, Dict> = { es, en }

export const LANGUAGES: { id: Lang; label: string }[] = [
  { id: 'es', label: 'ES' },
  { id: 'en', label: 'EN' },
]

/** Tolerante: clave faltante → fallback es → clave. */
export function translator(lang: Lang) {
  const dict = DICTIONARIES[lang] ?? DICTIONARIES.es
  return (key: string): string => dict[key] ?? es[key] ?? key
}

export type TranslateFn = ReturnType<typeof translator>

/** Utilidad para hooks/consumidores no-React. */
export function t(lang: Lang, key: string): string {
  return translator(lang)(key)
}
