/**
 * SEED — Datos demo del template SaaS odontológico.
 * Tenant: "Clínica Dental Sonrisa Andina" (Quito, Ecuador) · slug: demo
 * Usuarios: admin@demo.com / demo1234 (OWNER) · staff@demo.com / demo1234 (STAFF)
 *           super@odontosite.com / admin1234 (SUPER_ADMIN)
 *
 * Ejecutar: bun run db:seed
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

// Imports relativos para que `bun prisma/seed.ts` funcione sin alias:
import { quitoToUtc, todayInQuito, addDaysToDateStr } from '../src/lib/quito-time'
import { toJsonString } from '../src/lib/json'
import { DEFAULT_TENANT_CONFIG } from '../src/domain/factories'

const db = new PrismaClient()

const T = {
  slug: 'demo',
  name: 'Clínica Dental Sonrisa Andina',
  ruc: '1791234567001',
  address: 'Av. Amazonas N36-152 y Av. Naciones Unidas',
  city: 'Quito',
  phone: '+593 2 245 8899',
  email: 'info@sonrisaandina.ec',
  whatsapp: '593991234567',
}

async function main() {
  console.log('🌱 Sembrando datos demo…')

  // Limpieza (idempotente)
  await db.user.deleteMany()
  await db.tenant.deleteMany()
  await db.sequence.deleteMany()

  // ── Tenant ────────────────────────────────────────────────────────────────
  const tenant = await db.tenant.create({
    data: {
      slug: T.slug,
      name: T.name,
      ruc: T.ruc,
      address: T.address,
      city: T.city,
      phone: T.phone,
      email: T.email,
      whatsapp: T.whatsapp,
      ivaPercent: 15,
      logoUrl: '/uploads/demo/logo.png',
      config: toJsonString({
        ...DEFAULT_TENANT_CONFIG,
        theme: {
          ...DEFAULT_TENANT_CONFIG.theme,
          palette: 'turquesa',
          primary: '#0f766e',
          primaryForeground: '#ffffff',
          secondary: '#f0fdfa',
          accent: '#5eead4',
          fontHeading: 'poppins',
          fontBody: 'inter',
          radius: '1rem',
        },
      }),
    },
  })

  // ── Usuarios (OWNER + STAFF del tenant, SUPER_ADMIN global) ────────────────
  const [hashAdmin, hashStaff, hashSuper] = await Promise.all([
    bcrypt.hash('demo1234', 10),
    bcrypt.hash('demo1234', 10),
    bcrypt.hash('admin1234', 10),
  ])
  await db.user.createMany({
    data: [
      { email: 'admin@demo.com', passwordHash: hashAdmin, name: 'Dra. María Fernanda Salazar', role: 'OWNER', tenantId: tenant.id },
      { email: 'staff@demo.com', passwordHash: hashStaff, name: 'Carolina Naranjo (Recepción)', role: 'STAFF', tenantId: tenant.id },
      { email: 'super@odontosite.com', passwordHash: hashSuper, name: 'Super Admin', role: 'SUPER_ADMIN', tenantId: null },
    ],
  })

  // ── Sede ───────────────────────────────────────────────────────────────────
  const location = await db.location.create({
    data: {
      tenantId: tenant.id,
      name: 'Sede Principal — Av. Amazonas',
      address: T.address,
      phone: T.phone,
      lat: -0.1808,
      lng: -78.4679,
      mapQuery: 'Av. Amazonas y Naciones Unidas, Quito, Ecuador',
      active: true,
      sortOrder: 0,
    },
  })

  // ── Profesionales (con disponibilidad L-V 9-18 y S 9-13) ───────────────────
  const mkAvailability = (professionalId: string) => {
    const rows: { professionalId: string; locationId: string; weekday: number; startMinute: number; endMinute: number }[] = []
    for (let wd = 1; wd <= 5; wd++) rows.push({ professionalId, locationId: location.id, weekday: wd, startMinute: 9 * 60, endMinute: 18 * 60 })
    rows.push({ professionalId, locationId: location.id, weekday: 6, startMinute: 9 * 60, endMinute: 13 * 60 })
    return rows
  }

  const drSalazar = await db.professional.create({
    data: {
      tenantId: tenant.id,
      locationId: location.id,
      name: 'Dra. María Fernanda Salazar',
      specialty: 'Ortodoncia y Odontología Integral',
      bio: '12 años transformando sonrisas en Quito. Especialista en ortodoncia estética e invisible, con formación internacional.',
      photoUrl: '/uploads/demo/dr-salazar.png',
      active: true,
      sortOrder: 0,
    },
  })
  await db.availability.createMany({ data: mkAvailability(drSalazar.id) })

  const drPino = await db.professional.create({
    data: {
      tenantId: tenant.id,
      locationId: location.id,
      name: 'Dr. Carlos Andrés Pino',
      specialty: 'Implantología y Cirugía Oral',
      bio: '15 años de experiencia en rehabilitación oral e implantes. Certificado en cirugía avanzada y sedación consciente.',
      photoUrl: '/uploads/demo/dr-pino.png',
      active: true,
      sortOrder: 1,
    },
  })
  await db.availability.createMany({ data: mkAvailability(drPino.id) })

  // ── 8 Servicios (con metadata JSONB para demostrar extensibilidad) ────────
  const services = await Promise.all(
    (
      [
        {
          name: 'Limpieza y Profilaxis Dental',
          description: 'Eliminación de placa y sarro con ultrasonido, pulido y aplicación de flúor. La base de una boca sana.',
          price: 35,
          durationMin: 45,
          imageUrl: '/uploads/demo/svc-limpieza.png',
          metadata: { incluye: 'Pulido y flúor', cada_meses: 6 },
        },
        {
          name: 'Blanqueamiento Dental',
          description: 'Aclaración profesional en sesión única con luz LED. Hasta 6 tonos más blanco, sin sensibilidad.',
          price: 120,
          durationMin: 60,
          imageUrl: '/uploads/demo/svc-blanqueamiento.png',
          metadata: { sesiones_incluidas: 1, resultados_meses: 6, requiere_evaluacion_previa: true },
        },
        {
          name: 'Ortodoncia con Brackets',
          description: 'Tratamiento de alineación dental con brackets metálicos o estéticos. Incluye controles mensuales.',
          price: 850,
          durationMin: 50,
          imageUrl: '/uploads/demo/svc-ortodoncia.png',
          metadata: { duracion_tratamiento_meses: 24, requiere_control_mensual: true, incluye_retenedores: true, financiamiento: 'Hasta 12 cuotas sin interés' },
        },
        {
          name: 'Endodoncia (Tratamiento de Conducto)',
          description: 'Salva tu pieza natural. Limpieza y sellado de conductos radiculares con tecnología rotatoria.',
          price: 150,
          durationMin: 90,
          imageUrl: '/uploads/demo/svc-endodoncia.png',
          metadata: { sesiones: 2, incluye_anestesia: true, incluye_radiografia: true },
        },
        {
          name: 'Extracción Dental Simple',
          description: 'Extracción atraumática con anestesia local. Recuperación rápida con las indicaciones correctas.',
          price: 45,
          durationMin: 40,
          imageUrl: '/uploads/demo/svc-extraccion.png',
          metadata: {},
        },
        {
          name: 'Implante Dental',
          description: 'Reemplazo de pieza dental con implante de titanio y corona. Recupera función y estética de por vida.',
          price: 950,
          durationMin: 90,
          imageUrl: '/uploads/demo/svc-implante.png',
          metadata: { marcas_disponibles: 'Straumann · Osstem · MIS', requiere_escaneo_3d: true, garantia_anios: 10, osteointegracion_meses: 3 },
        },
        {
          name: 'Corona de Porcelana',
          description: 'Restauración total de la pieza dental con porcelana E-max de alta resistencia. Color idéntico al natural.',
          price: 320,
          durationMin: 75,
          imageUrl: '/uploads/demo/svc-corona.png',
          metadata: { material: 'Porcelana E-max', impresion_digital: true, tiempos_entrega_dias: 5 },
        },
        {
          name: 'Radiografía Panorámica',
          description: 'Imagen completa de maxilares en alta definición digital. Diagnóstico preciso en minutos.',
          price: 25,
          durationMin: 15,
          imageUrl: '/uploads/demo/svc-radiografia.png',
          metadata: { tipo: 'Panorámica digital', entrega_inmediata: true, radiazon_mSv: 0.01 },
        },
      ] as const
    ).map(async (svc, index) =>
      db.service.create({
        data: {
          tenantId: tenant.id,
          name: svc.name,
          description: svc.description,
          price: svc.price,
          durationMin: svc.durationMin,
          imageUrl: svc.imageUrl,
          metadata: toJsonString(svc.metadata),
          active: true,
          sortOrder: index,
        },
      }),
    ),
  )

  // ── Contenido del sitio por secciones ─────────────────────────────────────
  await db.siteContent.createMany({
    data: [
      {
        tenantId: tenant.id,
        section: 'hero',
        data: toJsonString({
          badge: 'Clínica acreditada · Quito',
          title: 'Tu mejor sonrisa comienza aquí',
          subtitle: 'Odontología integral, implantes y ortodoncia invisible en el corazón de Quito. Atención personalizada con tecnología de última generación.',
          ctaLabel: 'Reservar cita',
          ctaSecondaryLabel: 'Ver servicios',
          backgroundImageUrl: '/uploads/demo/hero.png',
          highlights: ['⭐ 4.9 — más de 2.000 pacientes', '🛡 15 años de experiencia', '💳 Financiamiento disponible'],
        }),
      },
      {
        tenantId: tenant.id,
        section: 'services',
        data: toJsonString({
          title: 'Nuestros servicios',
          subtitle: 'Tratamientos diseñados para tu bienestar, con precios claros y honestos. Añade lo que necesites al pedido y envíalo por WhatsApp.',
        }),
      },
      {
        tenantId: tenant.id,
        section: 'about',
        data: toJsonString({
          title: 'Sobre Sonrisa Andina',
          text: 'Somos un equipo de odontólogos quiteños apasionados por la odontología moderna y humana. Desde 2009 acompañamos a miles de familias con diagnósticos honestos, tecnología de vanguardia y un trato cálido que nos define. Creemos que una sonrisa sana cambia vidas — la tuya puede ser la próxima.',
          imageUrl: '/uploads/demo/about.png',
          stats: [
            { label: 'Años de experiencia', value: '15+' },
            { label: 'Pacientes atendidos', value: '2.000+' },
            { label: 'Calificación promedio', value: '4.9★' },
          ],
        }),
      },
      {
        tenantId: tenant.id,
        section: 'hours',
        data: toJsonString({ note: 'Agenda tu cita en línea — los sábados atendemos con horario reducido.' }),
      },
      {
        tenantId: tenant.id,
        section: 'location',
        data: toJsonString({ note: 'Estamos en una zona privilegiada de Quito, con estacionamiento para pacientes.' }),
      },
      {
        tenantId: tenant.id,
        section: 'contact',
        data: toJsonString({
          note: '¿Dudas sobre un tratamiento? Escríbenos y te asesoramos sin compromiso.',
          whatsappMessage: 'Hola 👋 Me gustaría información sobre sus servicios dentales.',
        }),
      },
      {
        tenantId: tenant.id,
        section: 'testimonials',
        data: toJsonString({
          title: 'Lo que dicen nuestros pacientes',
          subtitle: 'Historias reales de sonrisas transformadas.',
          items: [
            {
              name: 'María Gabriela Torres',
              role: 'Paciente de ortodoncia',
              initials: 'MT',
              rating: 5,
              text: 'Después de dos años con brackets terminé encantada. Cada control fue puntual y el trato, impecable. Mi sonrisa es otra.',
            },
            {
              name: 'Jorge Andrade',
              role: 'Paciente de implante',
              initials: 'JA',
              rating: 5,
              text: 'El Dr. Pino me colocó dos implantes y volví a morder una manzana sin miedo. Profesionalismo de primer nivel.',
            },
            {
              name: 'Lucía Pazmiño',
              role: 'Paciente de blanqueamiento',
              initials: 'LP',
              rating: 5,
              text: 'Me hicieron el blanqueamiento en una sola sesión y el resultado fue increíble. La clínica es moderna y acogedora.',
            },
          ],
        }),
      },
    ],
  })

  // ── Citas de ejemplo (relativas a HOY para que el calendario luzca) ──────
  const today = todayInQuito()
  const at = (dateStr: string, minutes: number) => quitoToUtc(dateStr, minutes)

  const svcByName = (name: string) => services.find((s) => s.name.includes(name))!

  await db.appointment.createMany({
    data: [
      // Hoy 10:00 — limpieza CONFIRMADA con Dra. Salazar
      {
        tenantId: tenant.id,
        patientName: 'Andrea Velasco',
        patientPhone: '0998765432',
        patientEmail: 'andrea.velasco@example.com',
        serviceId: svcByName('Limpieza').id,
        professionalId: drSalazar.id,
        locationId: location.id,
        start: at(today, 10 * 60),
        end: at(today, 10 * 60 + 45),
        status: 'CONFIRMED',
        source: 'PUBLIC',
        cancelToken: randomUUID(),
      },
      // Hoy 11:30 — blanqueamiento PENDIENTE con Dr. Pino
      {
        tenantId: tenant.id,
        patientName: 'Daniela Cárdenas',
        patientPhone: '0987654321',
        patientEmail: 'daniela.cardenas@example.com',
        serviceId: svcByName('Blanqueamiento').id,
        professionalId: drPino.id,
        locationId: location.id,
        start: at(today, 11 * 60 + 30),
        end: at(today, 12 * 60 + 30),
        status: 'PENDING',
        source: 'PUBLIC',
        cancelToken: randomUUID(),
      },
      // Hoy 13:00-14:00 — BLOQUEO de almuerzo del Dr. Pino
      {
        tenantId: tenant.id,
        serviceId: null,
        professionalId: drPino.id,
        locationId: location.id,
        start: at(today, 13 * 60),
        end: at(today, 14 * 60),
        status: 'BLOCKED',
        source: 'ADMIN',
        cancelToken: randomUUID(),
        metadata: toJsonString({ type: 'block', reason: 'Almuerzo' }),
      },
      // Mañana 09:00 — ortodoncia CONFIRMADA
      {
        tenantId: tenant.id,
        patientName: 'Sebastián Loor',
        patientPhone: '0961234567',
        serviceId: svcByName('Ortodoncia').id,
        professionalId: drSalazar.id,
        locationId: location.id,
        start: at(addDaysToDateStr(today, 1), 9 * 60),
        end: at(addDaysDateStrSafe(addDaysToDateStr(today, 1)), 9 * 60 + 50),
        status: 'CONFIRMED',
        source: 'ADMIN',
        cancelToken: randomUUID(),
      },
      // +2 días 15:00 — endodoncia CONFIRMADA
      {
        tenantId: tenant.id,
        patientName: 'Paola Guerrero',
        patientPhone: '0993456789',
        serviceId: svcByName('Endodoncia').id,
        professionalId: drPino.id,
        locationId: location.id,
        start: at(addDaysToDateStr(today, 2), 15 * 60),
        end: at(addDaysToDateStr(today, 2), 15 * 60 + 90),
        status: 'CONFIRMED',
        source: 'PUBLIC',
        cancelToken: randomUUID(),
      },
      // +3 días 10:00 — extracción CANCELADA (liberó el slot)
      {
        tenantId: tenant.id,
        patientName: 'Marco Villagómez',
        patientPhone: '0994567890',
        serviceId: svcByName('Extracción').id,
        professionalId: drSalazar.id,
        locationId: location.id,
        start: at(addDaysToDateStr(today, 3), 10 * 60),
        end: at(addDaysToDateStr(today, 3), 10 * 60 + 40),
        status: 'CANCELLED',
        source: 'PUBLIC',
        cancelToken: randomUUID(),
      },
    ],
  })

  // ── 2 Pedidos de ejemplo ──────────────────────────────────────────────────
  const order1 = await db.order.create({
    data: {
      tenantId: tenant.id,
      customerName: 'María Fernanda Torres',
      customerPhone: '0998112233',
      customerEmail: 'mafe.torres@example.com',
      items: toJsonString([
        { serviceId: svcByName('Limpieza').id, name: 'Limpieza y Profilaxis Dental', price: 35, qty: 2 },
        { serviceId: svcByName('Radiografía').id, name: 'Radiografía Panorámica', price: 25, qty: 1 },
      ]),
      total: 95,
      status: 'NEW',
      whatsappSentAt: new Date(),
    },
  })
  const order2 = await db.order.create({
    data: {
      tenantId: tenant.id,
      customerName: 'Jorge Andrade',
      customerPhone: '0984455667',
      customerEmail: 'jorge.andrade@example.com',
      items: toJsonString([
        { serviceId: svcByName('Blanqueamiento').id, name: 'Blanqueamiento Dental', price: 120, qty: 1 },
      ]),
      total: 120,
      status: 'CONTACTED',
      whatsappSentAt: new Date(Date.now() - 86_400_000),
    },
  })

  // ── 1 Factura de ejemplo (numeración secuencial real) ────────────────────
  await db.$transaction(async (tx) => {
    const seq = await tx.sequence.upsert({
      where: { tenantId_prefix: { tenantId: tenant.id, prefix: '001-001' } },
      create: { tenantId: tenant.id, prefix: '001-001', lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    })
    const subtotal = 120
    const iva = (subtotal * 15) / 100
    await tx.invoice.create({
      data: {
        tenantId: tenant.id,
        orderId: order2.id,
        number: `001-001-${String(seq.lastNumber).padStart(9, '0')}`,
        customerName: order2.customerName,
        customerEmail: order2.customerEmail,
        items: toJsonString([{ description: 'Blanqueamiento Dental', qty: 1, unitPrice: 120, total: 120 }]),
        subtotal,
        ivaRate: 15,
        ivaAmount: Math.round(iva * 100) / 100,
        total: Math.round((subtotal + iva) * 100) / 100,
        emailSentAt: new Date(),
        metadata: toJsonString({ source: 'order', orderCode: order2.id.slice(0, 8).toUpperCase() }),
      },
    })
  })

  const counts = {
    tenants: await db.tenant.count(),
    users: await db.user.count(),
    professionals: await db.professional.count(),
    locations: await db.location.count(),
    services: await db.service.count(),
    appointments: await db.appointment.count(),
    orders: await db.order.count(),
    invoices: await db.invoice.count(),
  }
  console.log('✅ Seed completado:', counts)
  console.log('   Web pública:  /?site=demo   ·   Panel:  /?view=admin')
  console.log('   OWNER:  admin@demo.com / demo1234')
  console.log('   STAFF:  staff@demo.com / demo1234')
  console.log('   SUPER:  super@odontosite.com / admin1234')
}

/** helper para evitar repetir el addDays en 'end' de ortodoncia */
function addDaysDateStrSafe(s: string) {
  return s
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
