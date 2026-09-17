# 🦷 OdontoSite — Template SaaS Multi-Tenant para Consultorios Odontológicos

**Producto:** plataforma reutilizable para vender sitios web + agenda + facturación a odontólogos independientes (Ecuador 🇪🇨, español, i18n listo para más idiomas).

**Demo incluido:** *Clínica Dental Sonrisa Andina* (Quito) — `slug: demo`.

| Acceso | URL (en este entorno de preview) | Credenciales |
|---|---|---|
| 🌐 Web pública | `/` → vista **Web Pública** | — |
| 🔐 Panel admin | `/` → vista **Panel Admin** (o `/?view=admin`) | `admin@demo.com` / `demo1234` (OWNER) · `staff@demo.com` / `demo1234` (STAFF) |
| 🛠️ Super-admin | `/?view=admin` | `super@odontosite.com` / `admin1234` |
| 📋 Auditoría de fases | `/` → vista **Fases 1–5** | — |

> En el **template de producción** las vistas mapean a rutas reales: la web pública vive en `/[slug]` y el panel en `/admin`. En este entorno de demo todo se sirve desde `/` con un conmutador superior (equivalente funcional; las ~37 rutas de API son idénticas).

---

## 🚀 Guía para el dueño (no programador)

```bash
# 1. Instalar dependencias (solo la primera vez)
bun install        # o: npm install

# 2. Crear la base de datos y cargar los datos demo
bun run db:push     # crea las tablas (SQLite en dev)
bun run db:seed     # carga la clínica demo con 8 servicios, 2 profesionales, citas y pedidos

# 3. Levantar el servidor
bun run dev         # o: npm run dev  → http://localhost:3000

# 4. Abrir en el navegador
#    http://localhost:3000/?site=demo    → web pública
#    http://localhost:3000/?view=admin    → panel admin
#    Usuario: admin@demo.com · Contraseña: demo1234
```

### Qué puedes hacer con el demo (5 minutos)
1. **Web pública:** navega el sitio, añade servicios al carrito → “Enviar pedido por WhatsApp” (el pedido cae en la bandeja del panel).
2. **Reserva:** botón *Reservar* → elige servicio, profesional, fecha y hora real → confirma → recibe un **link de cancelación** (pruébalo).
3. **Panel:** inicia sesión → *Citas* (calendario día/semana/mes, bloqueos, confirmar/cancelar), *Pedidos* (genera una **factura PDF** y envíala por email), *Contenido* (edita el Hero y mira el preview), *Tema* (cambia paleta/tipografía y guárdala), *Servicios* (crea uno con atributos nuevos).
4. **Super-admin:** crea un odontólogo nuevo (tenant + OWNER) y visita su web al instante.

---

## 🧱 Stack y por qué

| Pieza | Elección | Por qué |
|---|---|---|
| Framework | **Next.js 16 (App Router) + TypeScript** | SSR/hybrid, API Routes, estándar de mercado. |
| UI | **Tailwind 4 + shadcn/ui** | Sistema de diseño accesible y consistente. |
| Estado | **Zustand** (cart, auth, theme, ui) + **TanStack Query** (servidor) | Slices simples, cache/invalidación de datos. |
| BD / ORM | **Prisma** (SQLite en dev → PostgreSQL en prod) | Tipado end-to-end; migración = cambiar `provider`. |
| Auth | **JWT (jose) + bcryptjs** en cookie httpOnly | Contrato exacto de endpoints; aislado para migrar a NextAuth v2 sin tocar dominio. |
| Validación | **Zod** (`.passthrough()` → metadata extensible) | Contratos compartidos cliente/servidor. |
| Calendario | **FullCalendar 6** | Vistas día/semana/mes maduras. |
| PDF | **@react-pdf/renderer** | Factura profesional; misma interfaz `InvoiceProvider` para el SRI en v2. |
| Virtualización | **@tanstack/react-virtual** | Listas de miles de pedidos sin degradar el DOM. |
| Fechas | **date-fns** + utilerías propias **UTC-5 Ecuador** (sin DST) | Determinismo horario total. |
| Email | Interfaz `EmailProvider` (`Console` en dev, `SMTP` en v2) | Auditoría sin dependencias externas. |

## 📐 Arquitectura (hexagonal)

```
src/
├─ domain/           NÚCLEO → entidades, Value Objects (Money, TimeRange),
│                    factories (Service, Appointment, Order, Invoice, Tenant),
│                    schemas Zod, motor de slots puro
├─ application/      CASOS DE USO → booking, orders, invoices, services, tenants
├─ infrastructure/   ADAPTADORES → Prisma (db), auth JWT, storage local,
│                    email (console/smtp), pdf (InvoiceProvider/LocalPdf)
├─ app/api/          ~37 rutas REST ([slug]/*, admin/*, super-admin/*)
├─ components/       public-site/ · admin/ · audit/ · shell/ · ui (shadcn)
├─ store/            Zustand: cart · auth · theme · ui
└─ lib/              quito-time, pagination (cursor), theme, i18n, whatsapp…
```

**Reglas de calidad implementadas:** cero hardcoding (todo en `constants.ts` o `tenant.config`) · extensibilidad vía `metadata JSONB` + `.passthrough()` · paginación por cursor en TODAS las listas · tolerancia a fallos (`safeJsonParse`, defaults en componentes) · multi-tenant estricto (todas las queries filtran `tenantId`).

## 💸 Facturación

- Numeración secuencial atómica: tabla `Sequence` con `UNIQUE(tenantId, prefix)` → `001-001-000000123`.
- IVA configurable por tenant (default **15%** Ecuador), precios en USD.
- **NO es comprobante electrónico ante el SRI**: la interfaz `InvoiceProvider` permite añadir `SriInvoiceProvider` en v2 sin tocar el núcleo.
- Emails de factura/reserva via `ConsoleEmailProvider` (dev: quedan en consola + preview en el panel).

## 🧭 Rutas API (resumen)

**Públicas** `/api/[slug]/*`: `content`, `tenant`, `services`, `professionals`, `locations`, `availability`, `appointments` (POST), `appointments/[id]/cancel?token=`, `orders` (POST).
**Admin** `/api/admin/*`: `auth/{login,logout,me}`, `overview`, `content/[section]`, `services`, `professionals`, `locations`, `availability`, `appointments` (+`block`, `confirm`, `cancel`), `orders`, `invoices` (+`pdf`, `send-email`), `tenant`, `upload`.
**Super-admin** `/api/super-admin/tenants` (alta de odontólogos: tenant + OWNER + contenido default).

Explorador interactivo con *Try it* real: **vista Fases 1–5 → Fase 3**.

## 🎨 Personalización por tenant

- **Editor por secciones** (Hero, Servicios, Nosotros, Horarios, Ubicación, Contacto, Testimonios) — cada sección es un componente con formulario propio y preview en vivo.
- **Tema:** 5 paletas curadas + color primario/secundario/acento + 4 tipografías (Inter, Poppins, Playfair Display, Montserrat). Cambios en vivo vía CSS variables (sin recargar).
- **Logo e imágenes** por tenant (`LocalStorageProvider` → `/public/uploads/[tenant]/`, S3/Cloudinary en v2 con la misma interfaz).

## 🛡️ Roles

| Rol | Alcance |
|---|---|
| `SUPER_ADMIN` | Gestión de tenants (crear odontólogos, ver métricas). Sin acceso a datos clínicos. |
| `OWNER` | Todo el panel de su consultorio (contenido, tema, facturación, configuración). |
| `STAFF` | Operativo: citas, pedidos, servicios, profesionales, sedes. Sin facturación/tema/config. |

## 🔌 Migrar a producción (checklist técnico)

1. `DATABASE_URL` → PostgreSQL y `prisma/schema.prisma` → `provider = "postgresql"` (los campos `[JSON]` pueden pasar a `Json`; opcional).
2. `AUTH_SECRET` fuerte + `AUTH_COOKIE_SECURE=1` + HTTPS.
3. `EMAIL_PROVIDER=smtp` + variables `SMTP_*`.
4. Rutas de páginas: montar `/[slug]` (público) y `/admin` (panel) — los componentes ya están separados por vista.
5. Storage → S3/Cloudinary implementando `StorageProvider`.
6. v2 opcional: `SriInvoiceProvider`, NextAuth, pagos online.

## 📁 Respallos offline de las fases

`public/backups/fase-1-plan.html` … `fase-5-render.html` — versiones estáticas de cada preview (por si no hay servidor). También en: `/backups/fase-1-plan.html` desde el navegador.

---

*Demo ficticio: Clínica Dental Sonrisa Andina · RUC 1791234567001 · Quito, Ecuador. Los pedidos de WhatsApp usan un número ficticio; los emails se registran en consola (ConsoleEmailProvider).*
