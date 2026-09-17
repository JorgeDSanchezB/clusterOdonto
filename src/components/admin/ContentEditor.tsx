'use client'

/**
 * ADMIN — Editor visual POR SECCIONES (SiteContent JSONB).
 * Cada sección tiene su formulario y un preview en vivo que usa LOS MISMOS
 * componentes del sitio público. Guardar → PUT /api/admin/content/[section].
 */
import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, ImagePlus, Loader2, Plus, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api, apiErrMessage, uploadImage } from '@/lib/api-client'
import { HeroSection } from '@/components/public-site/HeroSection'
import { ServiceCard } from '@/components/public-site/ServiceCard'
import type { Testimonial } from '@/domain/entities'
import { CONTENT_SECTIONS } from '@/lib/constants'

type SectionId = (typeof CONTENT_SECTIONS)[number]
const SECTION_TABS: { id: SectionId; label: string }[] = [
  { id: 'hero', label: 'Hero' },
  { id: 'services', label: 'Servicios' },
  { id: 'about', label: 'Nosotros' },
  { id: 'hours', label: 'Horarios' },
  { id: 'location', label: 'Ubicación' },
  { id: 'contact', label: 'Contacto' },
  { id: 'testimonials', label: 'Testimonios' },
]

export function ContentEditor() {
  const queryClient = useQueryClient()
  const [section, setSection] = useState<SectionId>('hero')

  const { data: content, isLoading } = useQuery({
    queryKey: ['admin-content'],
    queryFn: () => api<Record<string, Record<string, unknown>>>('/api/admin/content'),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: { section: string; data: unknown }) =>
      api(`/api/admin/content/${payload.section}`, { method: 'PUT', body: JSON.stringify(payload.data) }),
    onSuccess: () => {
      toast.success('Sección guardada — refresca la web pública para verla')
      void queryClient.invalidateQueries({ queryKey: ['admin-content'] })
      void queryClient.invalidateQueries({ queryKey: ['public-content'] })
    },
    onError: (e) => toast.error(apiErrMessage(e)),
  })

  if (isLoading) {
    return (
      <div className="py-16 grid place-items-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Tabs value={section} onValueChange={(v) => setSection(v as SectionId)}>
        <TabsList className="flex-wrap h-auto">
          {SECTION_TABS.map((s) => (
            <TabsTrigger key={s.id} value={s.id} className="text-xs">
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid xl:grid-cols-2 gap-6 items-start">
        <div className="bg-white rounded-2xl border p-5 sm:p-6">
          {section === 'hero' && <HeroForm key={`hero-${JSON.stringify(content?.hero)}`} data={content?.hero} onSave={(d) => saveMutation.mutate({ section, data: d })} saving={saveMutation.isPending} />}
          {section === 'services' && <TitleSubForm key={`svc-${JSON.stringify(content?.services)}`} data={content?.services} defaults={{ title: 'Nuestros servicios', subtitle: '' }} onSave={(d) => saveMutation.mutate({ section, data: d })} saving={saveMutation.isPending} />}
          {section === 'about' && <AboutForm key={`about-${JSON.stringify(content?.about)}`} data={content?.about} onSave={(d) => saveMutation.mutate({ section, data: d })} saving={saveMutation.isPending} />}
          {section === 'hours' && <NoteForm key={`hours-${JSON.stringify(content?.hours)}`} label="Nota de horarios (opcional)" data={content?.hours} onSave={(d) => saveMutation.mutate({ section, data: d })} saving={saveMutation.isPending} />}
          {section === 'location' && <NoteForm key={`loc-${JSON.stringify(content?.location)}`} label="Nota de ubicación (opcional)" data={content?.location} onSave={(d) => saveMutation.mutate({ section, data: d })} saving={saveMutation.isPending} />}
          {section === 'contact' && <ContactForm key={`contact-${JSON.stringify(content?.contact)}`} data={content?.contact} onSave={(d) => saveMutation.mutate({ section, data: d })} saving={saveMutation.isPending} />}
          {section === 'testimonials' && <TestimonialsForm key={`testi-${JSON.stringify(content?.testimonials)}`} data={content?.testimonials} onSave={(d) => saveMutation.mutate({ section, data: d })} saving={saveMutation.isPending} />}
        </div>

        {/* Preview en vivo — mismos componentes del sitio público */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Eye className="size-3.5" aria-hidden /> Preview en vivo (componentes reales)
          </p>
          <div className="rounded-2xl border-2 border-dashed overflow-hidden bg-neutral-50 max-h-[38rem] overflow-y-auto nice-scroll">
            {section === 'hero' ? (
              <HeroSection content={content?.hero as never} onBook={() => toast.info('Preview — botón Reservar')} />
            ) : section === 'services' ? (
              <SectionPreview title={(content?.services?.title as string) ?? 'Nuestros servicios'} subtitle={content?.services?.subtitle as string} />
            ) : section === 'about' ? (
              <SectionPreview title={(content?.about?.title as string) ?? 'Sobre nosotros'} subtitle={content?.about?.text as string} />
            ) : section === 'testimonials' ? (
              <TestimonialsPreview items={((content?.testimonials?.items as Testimonial[]) ?? []).slice(0, 2)} />
            ) : (
              <SectionPreview
                title={SECTION_TABS.find((s) => s.id === section)?.label ?? section}
                subtitle={
                  (content?.[section]?.note as string) ||
                  (content?.[section]?.whatsappMessage as string) ||
                  'Contenido simple de esta sección.'
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Formularios por sección ───────────────────────────────────────────────

function HeroForm({ data, onSave, saving }: { data?: Record<string, unknown>; onSave: (d: unknown) => void; saving: boolean }) {
  const [f, setF] = useState({
    badge: (data?.badge as string) ?? '',
    title: (data?.title as string) ?? '',
    subtitle: (data?.subtitle as string) ?? '',
    ctaLabel: (data?.ctaLabel as string) ?? 'Reservar cita',
    ctaSecondaryLabel: (data?.ctaSecondaryLabel as string) ?? 'Ver servicios',
    backgroundImageUrl: (data?.backgroundImageUrl as string) ?? '',
    highlights: ((data?.highlights as string[]) ?? []).join('\n'),
  })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const { url } = await uploadImage(file, 'hero')
      setF((p) => ({ ...p, backgroundImageUrl: url }))
      toast.success('Imagen de fondo lista')
    } catch (e) {
      toast.error(apiErrMessage(e))
    } finally {
      setUploading(false)
    }
  }

  return (
    <FormShell
      title="Hero (portada)"
      saving={saving}
      onSave={() =>
        onSave({
          ...f,
          highlights: f.highlights.split('\n').map((s) => s.trim()).filter(Boolean),
        })
      }
    >
      <Field label="Insignia (badge)">
        <Input value={f.badge} onChange={(e) => setF((p) => ({ ...p, badge: e.target.value }))} placeholder="Clínica acreditada · Quito" />
      </Field>
      <Field label="Título principal *">
        <Input value={f.title} onChange={(e) => setF((p) => ({ ...p, title: e.target.value }))} placeholder="Tu mejor sonrisa comienza aquí" />
      </Field>
      <Field label="Subtítulo">
        <Textarea className="min-h-16" value={f.subtitle} onChange={(e) => setF((p) => ({ ...p, subtitle: e.target.value }))} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Texto botón principal">
          <Input value={f.ctaLabel} onChange={(e) => setF((p) => ({ ...p, ctaLabel: e.target.value }))} />
        </Field>
        <Field label="Texto botón secundario">
          <Input value={f.ctaSecondaryLabel} onChange={(e) => setF((p) => ({ ...p, ctaSecondaryLabel: e.target.value }))} />
        </Field>
      </div>
      <Field label="Imagen de fondo">
        <div className="flex gap-2">
          <Input value={f.backgroundImageUrl} onChange={(e) => setF((p) => ({ ...p, backgroundImageUrl: e.target.value }))} placeholder="/uploads/…" />
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
          <Button type="button" variant="outline" size="icon" disabled={uploading} onClick={() => fileRef.current?.click()} aria-label="Subir imagen">
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          </Button>
        </div>
      </Field>
      <Field label="Puntos de confianza (uno por línea)">
        <Textarea className="min-h-20 font-mono text-xs" value={f.highlights} onChange={(e) => setF((p) => ({ ...p, highlights: e.target.value }))} placeholder={'⭐ 4.9 — más de 2.000 pacientes\n🛡 15 años de experiencia'} />
      </Field>
    </FormShell>
  )
}

function TitleSubForm({ data, defaults, onSave, saving }: { data?: Record<string, unknown>; defaults: { title: string; subtitle: string }; onSave: (d: unknown) => void; saving: boolean }) {
  const [f, setF] = useState({
    title: (data?.title as string) ?? defaults.title,
    subtitle: (data?.subtitle as string) ?? defaults.subtitle,
  })
  return (
    <FormShell title="Encabezado de la sección" saving={saving} onSave={() => onSave(f)}>
      <Field label="Título">
        <Input value={f.title} onChange={(e) => setF((p) => ({ ...p, title: e.target.value }))} />
      </Field>
      <Field label="Subtítulo">
        <Textarea className="min-h-16" value={f.subtitle} onChange={(e) => setF((p) => ({ ...p, subtitle: e.target.value }))} />
      </Field>
    </FormShell>
  )
}

function AboutForm({ data, onSave, saving }: { data?: Record<string, unknown>; onSave: (d: unknown) => void; saving: boolean }) {
  const stats = (data?.stats as { label: string; value: string }[]) ?? []
  const [f, setF] = useState({
    title: (data?.title as string) ?? '',
    text: (data?.text as string) ?? '',
    imageUrl: (data?.imageUrl as string) ?? '',
    stat1label: stats[0]?.label ?? '',
    stat1value: stats[0]?.value ?? '',
    stat2label: stats[1]?.label ?? '',
    stat2value: stats[1]?.value ?? '',
    stat3label: stats[2]?.label ?? '',
    stat3value: stats[2]?.value ?? '',
  })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const upload = async (file: File) => {
    setUploading(true)
    try {
      const { url } = await uploadImage(file, 'about')
      setF((p) => ({ ...p, imageUrl: url }))
    } catch (e) {
      toast.error(apiErrMessage(e))
    } finally {
      setUploading(false)
    }
  }

  return (
    <FormShell
      title="Sección Nosotros"
      saving={saving}
      onSave={() =>
        onSave({
          title: f.title,
          text: f.text,
          imageUrl: f.imageUrl,
          stats: [f.stat1label, f.stat2label, f.stat3label].map((label, i) => ({
            label,
            value: [f.stat1value, f.stat2value, f.stat3value][i],
          })).filter((s) => s.label && s.value),
        })
      }
    >
      <Field label="Título">
        <Input value={f.title} onChange={(e) => setF((p) => ({ ...p, title: e.target.value }))} />
      </Field>
      <Field label="Historia">
        <Textarea className="min-h-28" value={f.text} onChange={(e) => setF((p) => ({ ...p, text: e.target.value }))} />
      </Field>
      <Field label="Imagen">
        <div className="flex gap-2">
          <Input value={f.imageUrl} onChange={(e) => setF((p) => ({ ...p, imageUrl: e.target.value }))} />
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
          <Button type="button" variant="outline" size="icon" disabled={uploading} onClick={() => fileRef.current?.click()} aria-label="Subir imagen">
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          </Button>
        </div>
      </Field>
      <div className="grid grid-cols-3 gap-2">
        {([1, 2, 3] as const).map((n) => (
          <div key={n} className="space-y-1.5">
            <Input placeholder={`Valor ${n}`} value={f[`stat${n}value` as keyof typeof f] as string} onChange={(e) => setF((p) => ({ ...p, [`stat${n}value`]: e.target.value }))} />
            <Input placeholder={`Etiqueta ${n}`} value={f[`stat${n}label` as keyof typeof f] as string} onChange={(e) => setF((p) => ({ ...p, [`stat${n}label`]: e.target.value }))} />
          </div>
        ))}
      </div>
    </FormShell>
  )
}

function NoteForm({ label, data, onSave, saving }: { label: string; data?: Record<string, unknown>; onSave: (d: unknown) => void; saving: boolean }) {
  const [note, setNote] = useState((data?.note as string) ?? '')
  return (
    <FormShell title={label} saving={saving} onSave={() => onSave({ note })}>
      <Field label="Nota visible bajo la sección">
        <Textarea className="min-h-20" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </FormShell>
  )
}

function ContactForm({ data, onSave, saving }: { data?: Record<string, unknown>; onSave: (d: unknown) => void; saving: boolean }) {
  const [f, setF] = useState({
    note: (data?.note as string) ?? '',
    whatsappMessage: (data?.whatsappMessage as string) ?? '',
  })
  return (
    <FormShell
      title="Sección Contacto"
      saving={saving}
      onSave={() => onSave({ ...f })}
    >
      <Field label="Nota">
        <Textarea className="min-h-16" value={f.note} onChange={(e) => setF((p) => ({ ...p, note: e.target.value }))} />
      </Field>
      <Field label="Mensaje inicial de WhatsApp (botón de contacto)">
        <Textarea className="min-h-16" value={f.whatsappMessage} onChange={(e) => setF((p) => ({ ...p, whatsappMessage: e.target.value }))} />
      </Field>
    </FormShell>
  )
}

function TestimonialsForm({ data, onSave, saving }: { data?: Record<string, unknown>; onSave: (d: unknown) => void; saving: boolean }) {
  const [items, setItems] = useState<Testimonial[]>(((data?.items as Testimonial[]) ?? []).map((it) => ({ ...it })))
  const [title, setTitle] = useState((data?.title as string) ?? '')
  const [subtitle, setSubtitle] = useState((data?.subtitle as string) ?? '')

  const update = (i: number, patch: Partial<Testimonial>) => setItems((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  return (
    <FormShell
      title="Testimonios"
      saving={saving}
      onSave={() => onSave({ title, subtitle, items })}
    >
      <Field label="Título">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Subtítulo">
        <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
      </Field>
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="rounded-xl border p-3 space-y-2">
            <div className="flex gap-2">
              <Input placeholder="Nombre" value={it.name} onChange={(e) => update(i, { name: e.target.value })} />
              <Input placeholder="Rol (opcional)" className="max-w-36" value={it.role ?? ''} onChange={(e) => update(i, { role: e.target.value })} />
              <Button type="button" size="icon" variant="ghost" className="text-neutral-400 hover:text-destructive shrink-0" onClick={() => setItems((rows) => rows.filter((_, j) => j !== i))} aria-label="Quitar">
                <X className="size-4" />
              </Button>
            </div>
            <Textarea className="min-h-14" placeholder="Testimonio" value={it.text} onChange={(e) => update(i, { text: e.target.value })} />
            <div className="flex items-center gap-2">
              <Label className="text-[11px]">Estrellas</Label>
              <Input type="number" min={1} max={5} className="w-16 h-8" value={it.rating} onChange={(e) => update(i, { rating: Number(e.target.value) })} />
            </div>
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => setItems((rows) => [...rows, { name: '', text: '', rating: 5, initials: '' }])}>
          <Plus className="size-3.5" aria-hidden /> Añadir testimonio
        </Button>
      </div>
    </FormShell>
  )
}

// ── Previews ──────────────────────────────────────────────────────────────

function SectionPreview({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="p-8 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] t-text-primary">Preview</p>
      <h2 className="font-heading mt-2 text-2xl font-extrabold">{title}</h2>
      {subtitle && <p className="mt-3 text-sm text-neutral-500 max-w-md mx-auto leading-relaxed">{subtitle}</p>}
    </div>
  )
}

function TestimonialsPreview({ items }: { items: Testimonial[] }) {
  if (items.length === 0) return <SectionPreview title="Sin testimonios aún" subtitle="Añade testimonios en el formulario." />
  return (
    <div className="p-6 grid gap-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border bg-white p-4">
          <p className="text-sm text-neutral-600">{it.text}</p>
          <p className="mt-2 text-xs font-semibold">{'⭐'.repeat(Math.max(1, Math.min(5, it.rating || 5)))} · {it.name}</p>
        </div>
      ))}
    </div>
  )
}

// ── UI helpers ─────────────────────────────────────────────────────────────

function FormShell({ title, children, onSave, saving }: { title: string; children: React.ReactNode; onSave: () => void; saving: boolean }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{title}</h3>
        <Button type="submit" size="sm" className="t-btn-primary rounded-full font-semibold" disabled={saving}>
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" aria-hidden />} Guardar
        </Button>
      </div>
      {children}
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

/** Card de servicio estático para preview (mismo componente del sitio). */
export function ServicePreviewCard() {
  const svc = useMemo(
    () => ({
      id: 'preview',
      name: 'Limpieza y Profilaxis',
      description: 'Eliminación de placa y sarro con ultrasonido.',
      price: 35,
      durationMin: 45,
      imageUrl: '/uploads/demo/svc-limpieza.png',
      metadata: { incluye: 'Pulido y flúor', cada_meses: 6 } as Record<string, unknown>,
      active: true,
      sortOrder: 0,
    }),
    [],
  )
  return <ServiceCard service={svc} static />
}
