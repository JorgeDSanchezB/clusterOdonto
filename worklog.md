# Worklog — OdontoSite: Template SaaS Multi-Tenant para Consultorios Odontológicos

Proyecto: SaaS multi-tenant (template reutilizable) para consultorios odontológicos de Ecuador.
Stack real: Next.js 16 (App Router) + TypeScript estricto + Tailwind 4 + shadcn/ui + Prisma (SQLite en dev, portable a PostgreSQL) + Zustand + TanStack Query + Zod.

## Decisiones de arquitectura (Task ID: 1 — agente principal)

- **Ruta única `/`**: el entorno de preview del dueño solo expone la ruta raíz. La app implementa 3 vistas conmutables en `/`: `Web Pública` (sitio del tenant demo), `Panel Admin` (login + dashboard) y `Fases 1-5` (hub de auditoría). Las rutas de API son reales (`/api/[slug]/*`, `/api/admin/*`, `/api/super-admin/*`). En producción el template mapea: `/` → `/[slug]` y vista admin → `/admin`.
- **Auth**: JWT propio con `jose` + cookie httpOnly + bcryptjs, en los endpoints exactos del contrato (`POST /api/admin/auth/login`, `GET /me`, `POST /logout`). `next-auth` v4 no declara compatibilidad con Next 16; la lógica queda aislada para poder intercambiarla sin tocar dominio.
- **DB**: SQLite en dev (única disponible en sandbox). Campos JSON (metadata, config, items) se guardan como String JSON serializado — portable a `Json`/`JSONB` en PostgreSQL sin tocar dominio (los repos hacen (de)serialización).
- **Sin enums de Prisma** (SQLite no los soporta): roles/status como String + validación Zod en el borde.
- **Factura PDF**: `@react-pdf/renderer` (InvoiceProvider/LocalPdfInvoiceProvider). No se envía al SRI (v2: SriInvoiceProvider).
- **Moneda/IVA**: USD, IVA 15% configurable por tenant.
- **Zona horaria**: Ecuador mainland UTC-5 fijo sin DST. Utilidades deterministas (conversiones -05:00 ↔ UTC).

## Convenciones

- IDs: UUID v4 (crypto.randomUUID / Prisma uuid()).
- Paginación: cursor opaco (base64 de `createdAt|id`), `?limit=&cursor=` en TODOS los GET de listas.
- Multi-tenant estricto: todo query admin filtra `tenantId` de la sesión; público resuelve tenant por `slug`.
- Tolerancia a fallos: `safeJsonParse` con defaults; componentes con valores por defecto ante atributos nulos/desconocidos.
- Imágenes de seed en `/public/uploads/demo/` (LocalStorageProvider).

---
Task ID: 1
Agent: agente-principal (Z.ai Code)
Task: Recon del proyecto, plan de fases y decisiones de arquitectura.

Work Log:
- Leído package.json, prisma/schema.prisma, layout, page, globals.css, eslint, next.config, .env, dev.log (servidor dev ya corriendo en :3000, HTTP 200).
- Verificado set completo de shadcn/ui (incluye calendar, sheet, dialog, sonner, table, etc.), TanStack Query 5, Zustand 5, Zod 4, date-fns 4, framer-motion, recharts.
- Definidas decisiones de arquitectura (arriba).

Stage Summary:
- Stack confirmado; servidor dev corriendo; no hay bloqueos. Se procede a instalación de deps faltantes y schema.

---
Task ID: 2
Agent: agente-principal (Z.ai Code)
Task: Implementación completa del template SaaS (backend + frontend + seed).

Work Log:
- Schema Prisma multi-tenant (10 modelos) aplicado con db:push. JSON como String portable.
- 13 imágenes seed generadas con image-generation skill → /public/uploads/demo/.
- Núcleo: lib (constants, quito-time UTC-5, json tolerante, paginación cursor, theme 5 paletas + 4 fuentes, i18n es/en, whatsapp, api-helpers) + domain (entities, VOs Money/TimeRange, schemas Zod .passthrough, factories, slots) + infrastructure (auth JWT jose + bcryptjs, auth-guard RBAC, storage local, email console/smtp, pdf InvoiceProvider + documento) + application use-cases (services, booking, orders, invoices, tenants).
- ~37 API Routes: /api/[slug]/* (públicas), /api/admin/* (protegidas), /api/super-admin/tenants, /api/tenants. Todas las listas con ?limit=&cursor=. Envelope {data, meta} / {error:{code,message}}.
- Seed ejecutado: tenant demo (Sonrisa Andina) + 3 usuarios + 8 servicios con metadata variada + 2 profesionales con disponibilidad L-V 9-18, S 9-13 + 1 sede + contenido por secciones + 6 citas + 2 pedidos + 1 factura.
- Frontend completo: AppShell (switcher Web Pública / Panel Admin / Fases 1-5), sitio público (navbar, hero, servicios+carrito+WhatsApp, nosotros, horarios, ubicación OSM, testimonios, contacto, footer, reserva multi-paso con slot picker, cancelación por token), panel admin (login, resumen, FullCalendar día/semana/mes con carga por rango + bloqueos + confirmar/cancelar, pedidos virtualizados, servicios CRUD + editor metadata KV, profesionales + disponibilidad, sedes, editor contenido por secciones con preview vivo, editor tema en vivo, facturación con preview PDF cliente + descarga servidor + email, configuración, super-admin tenants).
- Hub auditoría: Fase 1 wireframes+arquitectura, Fase 2 ER+tabla metadata real, Fase 3 explorador API con Try it real, Fase 4 laboratorio metadata insertable, Fase 5 virtualización 10/100/1000 + tema en vivo.
- Fixes durante dev: comilla rota en theme.ts; imports pagination en booking.ts; FullCalendar fijado a 6.1.21 (bun había mezclado core v7 con react v6); reglas react-hooks v6 (set-state-in-effect) resueltas con key-remount/startTransition/inicializadores.
- ESLint: 0 errores (3 warnings benignos de useVirtualizer con React Compiler).

Stage Summary:
- App compilando y sirviendo en :3000 (GET / 200). API verificada con curl (login, citas, pedidos, facturas, PDF válido, slots).
- Pendiente: verificación E2E con agent-browser, backups preview.html, README, .env.example, mensaje final.

---
Task ID: 3
Agent: agente-principal (Z.ai Code)
Task: Verificación E2E, fixes críticos y entregables finales.

Work Log:
- E2E con agent-browser: sitio público (desktop+ móvil, sin overflow), reserva completa (servicio→profesional→fecha→slots→datos→confirmación con cancelUrl + email preview), cancelación por token (slot liberado), carrito→pedido→URL wa.me pre-armada, login admin, dashboard con métricas reales, FullCalendar con 7 eventos, pedidos virtualizados, factura con preview PDF (iframe) + descarga + email (ConsoleEmailProvider verificado en consola del servidor), editor de tema en vivo (paleta Vino aplicada al preview), hub de auditoría (Fase 3 tabla API, Fase 5 virtualización 10/100).
- Bugs críticos encontrados y corregidos durante E2E:
  1. PublicSite llamaba setSavedTheme DENTRO de un useMemo → setState en render → bucle infinito que colgaba el navegador. Resuelto: tema efectivo = live ?? resolveTheme(tenant.theme) sin escribir al store.
  2. AdminApp: efecto [status] re-llamaba refresh() en loop (inundó al servidor con miles de peticiones /api/admin/auth/me hasta matarlo). Resuelto: bootstrap único con useRef.
  3. Gate del AdminApp: `idle && !session` caía en la rama spinner → login nunca visible. Resuelto: spinner solo en 'loading'.
  4. Motor de slots: la lista `busy` no filtraba por profesional (una cita de Salazar bloqueaba slots de Pino). Resuelto: BusyRange.professionalId + filtro en generateSlots. Verificado: 09:00/09:30 solo Pino cuando Salazar tiene ortodoncia.
  5. Hydration mismatch: store ui leía window.location durante create(). Resuelto: estado inicial determinista + query params aplicados en efecto post-mount.
- Entregables finales: README.md (guía del dueño), .env.example documentado, .env con AUTH_SECRET fuerte, 5 respaldos offline en public/backups/, lint 0 errores.

Stage Summary:
- App verificada E2E y funcionando en :3000 (GET / 200, sin errores de consola).
- Servidor dev corriendo (única instancia). Base seed con datos demo completos.
- Flujo completo verificado: reserva→cancelación, pedido→WhatsApp, factura→PDF→email, tema en vivo, multi-tenant (creación de tenants por super-admin disponible).
