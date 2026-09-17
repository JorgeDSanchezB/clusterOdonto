'use client'

/**
 * ADMIN — Gestión de servicios con CRUD + editor de metadata pares clave-valor.
 * El formulario manda claves extra directamente al POST (Zod .passthrough()
 * las redirige a metadata): así nace "Ortodoncia invisible" sin tocar el núcleo.
 * Listado paginado por cursor con "Cargar más".
 */
import { useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Loader2, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { api, apiErrMessage, uploadImage } from '@/lib/api-client'
import { formatDuration } from '@/lib/quito-time'

interface ServiceRow {
  id: string
  name: string
  description: string | null
  price: number
  durationMin: number
  imageUrl: string | null
  active: boolean
  metadata: Record<string, unknown>
  sortOrder: number
}

interface KV {
  key: string
  value: string
}

export function ServicesManager() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<ServiceRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<ServiceRow | null>(null)

  const { isLoading, isFetching, data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['admin-services'],
    queryFn: async ({ pageParam }) => {
      const res = await fetch(`/api/admin/services?limit=12${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`)
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error?.message ?? 'Error')
      return body as { data: ServiceRow[]; meta: { nextCursor: string | null } }
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.meta.nextCursor,
  })
  const rows = data?.pages.flatMap((p) => p.data) ?? []

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-services'] })
    void queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/admin/services/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Servicio eliminado')
      setDeleting(null)
      invalidate()
    },
    onError: (e) => toast.error(apiErrMessage(e)),
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2">
        <p className="text-xs text-muted-foreground">{rows.length} servicios cargados · paginación por cursor</p>
        <Button size="sm" className="t-btn-primary rounded-full font-semibold" onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden /> Nuevo servicio
        </Button>
      </div>

      <div className="rounded-2xl border bg-white divide-y overflow-hidden">
        {isLoading && rows.length === 0 ? (
          <div className="py-16 grid place-items-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <Sparkles className="size-10 text-neutral-200 mx-auto" aria-hidden />
            <p className="text-sm text-muted-foreground mt-3">Sin servicios todavía — crea el primero.</p>
          </div>
        ) : (
          rows.map((s) => (
            <div key={s.id} className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors">
              <div className="size-14 rounded-xl bg-muted overflow-hidden shrink-0 grid place-items-center">
                {s.imageUrl ? (
                   
                  <img src={s.imageUrl} alt="" className="size-full object-cover" />
                ) : (
                  <Sparkles className="size-5 text-neutral-300" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">{s.name}</p>
                  {!s.active && <Badge variant="outline" className="text-[10px]">inactivo</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ${s.price.toFixed(2)} · {formatDuration(s.durationMin)} ·{' '}
                  {Object.keys(s.metadata).length} atributo(s) metadata
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => setEditing(s)} aria-label={`Editar ${s.name}`}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleting(s)}
                  aria-label={`Eliminar ${s.name}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {isFetching && <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="size-3 animate-spin" /> Cargando…</p>}

      {hasNextPage && (
        <div className="text-center">
          <Button variant="outline" size="sm" onClick={() => void fetchNextPage()} disabled={isFetching}>
            {isFetching ? 'Cargando…' : 'Cargar más servicios'}
          </Button>
        </div>
      )}

      <ServiceFormDialog
        open={creating}
        onOpenChange={setCreating}
        onDone={invalidate}
      />
      {editing && (
        <ServiceFormDialog
          open
          onOpenChange={() => setEditing(null)}
          onDone={invalidate}
          initial={editing}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Las citas históricas conservan su registro, pero el servicio desaparecerá del catálogo público.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function parseValue(raw: string): string | number | boolean {
  const v = raw.trim()
  if (/^(true|verdadero)$/i.test(v)) return true
  if (/^(false|falso)$/i.test(v)) return false
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v)
  return v
}

function stringifyValue(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  onDone,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onDone: () => void
  initial?: ServiceRow
}) {
  const isEdit = !!initial
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    price: String(initial?.price ?? '35'),
    durationMin: String(initial?.durationMin ?? '45'),
    imageUrl: initial?.imageUrl ?? '',
    active: initial?.active ?? true,
  })
  const [kv, setKv] = useState<KV[]>(
    initial ? Object.entries(initial.metadata).map(([key, value]) => ({ key, value: stringifyValue(value) })) : [],
  )
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const base = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price) || 0,
        durationMin: Math.max(5, Number(form.durationMin) || 30),
        imageUrl: form.imageUrl || null,
        active: form.active,
      }
      // Claves extra → vuelan al payload raíz; Zod .passthrough() las manda a metadata
      const extras: Record<string, unknown> = {}
      for (const { key, value } of kv) {
        const k = key.trim()
        if (k && value.trim() !== '') extras[k] = parseValue(value)
      }
      const payload = { ...base, ...extras }
      if (isEdit) {
        // En edición: metadata explícita (merge con la existente en el backend)
        return api(`/api/admin/services/${initial!.id}`, { method: 'PUT', body: JSON.stringify({ ...base, metadata: { ...initial!.metadata, ...extras } }) })
      }
      return api('/api/admin/services', { method: 'POST', body: JSON.stringify(payload) })
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Servicio actualizado' : 'Servicio creado (con metadata extensible)')
      onOpenChange(false)
      onDone()
    },
    onError: (e) => toast.error(apiErrMessage(e)),
  })

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const { url } = await uploadImage(file, 'services')
      setForm((f) => ({ ...f, imageUrl: url }))
      toast.success('Imagen subida (LocalStorageProvider → /uploads/…)')
    } catch (e) {
      toast.error(apiErrMessage(e))
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto nice-scroll">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEdit ? 'Editar servicio' : 'Nuevo servicio'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs">Nombre *</Label>
              <Input className="mt-1" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ej: Ortodoncia invisible" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Descripción</Label>
              <Textarea className="mt-1 min-h-16" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Precio (USD) *</Label>
              <Input className="mt-1" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Duración (min) *</Label>
              <Input className="mt-1" type="number" min="5" step="5" value={form.durationMin} onChange={(e) => setForm((f) => ({ ...f, durationMin: e.target.value }))} />
            </div>
          </div>

          {/* Imagen */}
          <div>
            <Label className="text-xs">Imagen del servicio</Label>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="size-20 rounded-xl border-2 border-dashed bg-muted grid place-items-center overflow-hidden shrink-0">
                {form.imageUrl ? (
                   
                  <img src={form.imageUrl} alt="" className="size-full object-cover" />
                ) : (
                  <ImagePlus className="size-6 text-neutral-300" aria-hidden />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && void handleUpload(e.target.files[0])}
                />
                <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" aria-hidden />}
                  Subir imagen
                </Button>
                <Input
                  className="h-8 text-xs"
                  placeholder="…o pega una URL /uploads/…"
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Metadata dinámica */}
          <div className="rounded-2xl border border-dashed p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold">Atributos dinámicos (metadata JSONB)</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Claves libres: “sesiones”, “requiere_escaneo_3d”, “alineadores”… El núcleo NO cambia.
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0">{kv.length}</Badge>
            </div>
            {kv.length > 0 && (
              <div className="space-y-1.5">
                {kv.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      className="flex-1 h-9 font-mono text-xs"
                      placeholder="clave_ejemplo"
                      value={row.key}
                      onChange={(e) => setKv((rows) => rows.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)))}
                    />
                    <Input
                      className="flex-1 h-9 font-mono text-xs"
                      placeholder="valor (texto, número o true/false)"
                      value={row.value}
                      onChange={(e) => setKv((rows) => rows.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-neutral-400 hover:text-destructive shrink-0"
                      onClick={() => setKv((rows) => rows.filter((_, j) => j !== i))}
                      aria-label="Quitar atributo"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button type="button" size="sm" variant="outline" onClick={() => setKv((rows) => [...rows, { key: '', value: '' }])}>
              <Plus className="size-3.5" aria-hidden /> Añadir atributo
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-xl border px-4 py-3">
            <div>
              <Label className="text-sm">Visible en la web pública</Label>
              <p className="text-[11px] text-muted-foreground">Los servicios inactivos no aparecen en el catálogo</p>
            </div>
            <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
          </div>

          <Button
            className="w-full t-btn-primary font-semibold"
            disabled={form.name.trim().length < 2 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear servicio'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
