'use client'

/**
 * ADMIN — Editor de tema: 5 paletas + colores personalizados + 4 tipografías.
 * Cada cambio muta el slice `live` de Zustand → el sitio público cambia AL
 * INSTANTE (sin recargar). "Guardar" persiste en tenant.config (BD).
 */
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, Palette, RotateCcw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api, apiErrMessage } from '@/lib/api-client'
import { THEME_FONTS, THEME_PALETTES, themeToCssVars } from '@/lib/theme'
import { useThemeStore } from '@/store/theme'
import { useUiStore } from '@/store/ui'
import type { ThemeConfig } from '@/domain/entities'

interface TenantAdmin {
  name: string
  config: {
    theme: ThemeConfig
    slotStepMinutes: number
    minLeadMinutes: number
    maxAdvanceDays: number
    invoicePrefix: string
  }
}

export function ThemeEditor() {
  const queryClient = useQueryClient()
  const setLive = useThemeStore((s) => s.setLive)
  const resetLive = useThemeStore((s) => s.resetLive)
  const live = useThemeStore((s) => s.live)

  const { data: tenant } = useQuery({
    queryKey: ['admin-tenant'],
    queryFn: () => api<TenantAdmin | null>('/api/admin/tenant'),
  })

  // Sincronizar el editor con el tema guardado al cargar
  useEffect(() => {
    if (tenant?.config?.theme) {
      resetLive()
    }
  }, [tenant?.config?.theme?.palette, tenant?.config?.theme?.primary, resetLive])

  const current: ThemeConfig = live ?? tenant?.config?.theme ?? ({} as ThemeConfig)

  const apply = (patch: Partial<ThemeConfig>) => setLive(patch)

  const saveMutation = useMutation({
    mutationFn: async () => {
      const config = {
        ...(tenant?.config ?? {}),
        theme: current,
      }
      return api('/api/admin/tenant', { method: 'PUT', body: JSON.stringify({ config }) })
    },
    onSuccess: () => {
      toast.success('Tema guardado — se aplica a la web pública del consultorio')
      void queryClient.invalidateQueries({ queryKey: ['admin-tenant'] })
      void queryClient.invalidateQueries({ queryKey: ['public-tenant'] })
    },
    onError: (e) => toast.error(apiErrMessage(e)),
  })

  const cssVars = themeToCssVars(current)
  const setView = useUiStore((s) => s.setView)

  return (
    <div className="grid xl:grid-cols-2 gap-6 items-start">
      <div className="bg-white rounded-2xl border p-5 sm:p-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Palette className="size-4 t-text-primary" aria-hidden /> Paletas predefinidas
          </h3>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {THEME_PALETTES.map((p) => {
              const active = (current.palette ?? '') === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => apply({ palette: p.id, primary: p.primary, primaryForeground: p.primaryForeground, secondary: p.secondary, accent: p.accent })}
                  className={`rounded-2xl border-2 p-3.5 text-left transition-all ${active ? 'border-neutral-900 shadow-sm' : 'border-neutral-200 hover:border-neutral-300'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex">
                      {[p.primary, p.secondary, p.accent].map((c) => (
                        <span key={c} className="size-5 rounded-full border-2 border-white -ml-1.5 first:ml-0" style={{ background: c }} />
                      ))}
                    </span>
                    {active && <Check className="size-4 ml-auto text-neutral-900" aria-hidden />}
                  </div>
                  <p className="mt-2 text-sm font-semibold">{p.label}</p>
                  <p className="text-[11px] text-muted-foreground">{p.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Color personalizado</h3>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {(
              [
                ['primary', 'Primario'],
                ['secondary', 'Suave'],
                ['accent', 'Acento'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label className="text-xs">{label}</Label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    className="size-9 rounded-lg border cursor-pointer bg-white p-0.5"
                    value={(current[key] as string) ?? '#0f766e'}
                    onChange={(e) => apply({ [key]: e.target.value } as Partial<ThemeConfig>)}
                    aria-label={`Color ${label}`}
                  />
                  <Input className="h-9 font-mono text-xs" value={(current[key] as string) ?? ''} onChange={(e) => apply({ [key]: e.target.value } as Partial<ThemeConfig>)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Tipografías curadas</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Títulos (headings)</Label>
              <Select value={current.fontHeading ?? 'poppins'} onValueChange={(v) => apply({ fontHeading: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THEME_FONTS.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label} — {f.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Cuerpo (texto)</Label>
              <Select value={current.fontBody ?? 'inter'} onValueChange={(v) => apply({ fontBody: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THEME_FONTS.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button className="t-btn-primary rounded-full font-semibold" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" aria-hidden />} Guardar tema
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => resetLive()}>
            <RotateCcw className="size-4" aria-hidden /> Descartar cambios
          </Button>
          <Button variant="ghost" className="rounded-full" onClick={() => setView('public')}>
            🌐 Ver en la web pública
          </Button>
        </div>
      </div>

      {/* Preview en vivo con las mismas variables CSS del sitio */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Preview en vivo (mutación Zustand — sin recargar)
        </p>
        <div style={cssVars as React.CSSProperties} className="rounded-2xl border-2 border-dashed overflow-hidden bg-neutral-50">
          <div className="relative p-8 text-white" style={{ background: `linear-gradient(110deg, ${current.primary} 10%, color-mix(in srgb, ${current.primary} 45%, transparent))` }}>
            <p className="text-[10px] uppercase tracking-widest opacity-80">Tu clínica dental</p>
            <h3 className="font-heading mt-1 text-2xl font-extrabold">Tu mejor sonrisa comienza aquí</h3>
            <p className="mt-2 text-sm opacity-85 max-w-sm">Odontología integral con atención personalizada en Quito.</p>
            <button className="t-btn-primary mt-4 rounded-full px-5 py-2.5 text-xs font-bold">Reservar cita</button>
          </div>
          <div className="p-5 bg-white" style={{ fontFamily: `var(--font-body)` }}>
            <div className="flex items-center gap-2 text-xs">
              <span className="t-btn-primary rounded-full px-3 py-1.5 font-semibold">Botón primario</span>
              <span className="rounded-full border px-3 py-1.5" style={{ borderColor: current.primary, color: current.primary }}>
                Botón outline
              </span>
              <span className="ml-auto font-heading font-bold" style={{ color: current.primary }}>
                $35.00
              </span>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground font-mono">
              heading: {current.fontHeading} · body: {current.fontBody} · radio: {current.radius}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
