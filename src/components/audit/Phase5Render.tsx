'use client'

/**
 * FASE 5 — Estrategia de renderizado y listas:
 * 1) Virtualización demo (10/100/1000 elementos) con contador de nodos DOM.
 * 2) Switch de tema en vivo (paletas + tipografías) sin recargar la página.
 */
import { useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Gauge, Type } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { THEME_FONTS, THEME_PALETTES, themeToCssVars } from '@/lib/theme'

const SIZES = [10, 100, 1000] as const

interface DemoItem {
  id: string
  name: string
  detail: string
}

function makeItems(n: number): DemoItem[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `order-${i + 1}`,
    name: `Pedido #${String(1000 + i)}`,
    detail: `Paciente demo ${i + 1} · ${((i * 7) % 90) + 10} servicios · $${(((i * 13) % 400) + 25).toFixed(2)}`,
  }))
}

export default function Phase5Render() {
  return (
    <div className="space-y-8">
      {/* Virtualización */}
      <VirtualizationDemo />

      {/* Tema en vivo */}
      <ThemeSwitchDemo />
    </div>
  )
}

function VirtualizationDemo() {
  const [size, setSize] = useState<(typeof SIZES)[number]>(100)
  const [virtualized, setVirtualized] = useState(true)
  const parentRef = useRef<HTMLDivElement>(null)
  const items = useMemo(() => makeItems(size), [size])

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 5,
    enabled: virtualized,
  })

  const renderedCount = virtualized ? virtualizer.getVirtualItems().length : items.length

  return (
    <section className="bg-white rounded-2xl border p-5 sm:p-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-heading font-bold flex items-center gap-2">
            <Gauge className="size-4.5 t-text-primary" aria-hidden /> Virtualización (@tanstack/react-virtual)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Igual que la bandeja de Pedidos del panel: solo se montan en el DOM los elementos visibles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border p-0.5">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors ${size === s ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'}`}
              >
                {s}
              </button>
            ))}
          </div>
          <Button size="sm" variant={virtualized ? 'default' : 'outline'} className="rounded-full text-xs" onClick={() => setVirtualized((v) => !v)}>
            {virtualized ? 'Virtualización: ON' : 'Virtualización: OFF'}
          </Button>
        </div>
      </header>

      <div className="mt-4 flex items-center gap-2 text-xs">
        <Badge variant="secondary" className="font-mono">
          nodos renderizados: {renderedCount} / {size}
        </Badge>
        <span className="text-muted-foreground">— abre el inspector del navegador y cuenta los hijos del contenedor.</span>
      </div>

      <div
        ref={parentRef}
        className="mt-3 h-72 overflow-y-auto nice-scroll rounded-xl border bg-white divide-y"
        role="list"
        aria-label="Lista demo"
      >
        {virtualized ? (
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((vRow) => {
              const item = items[vRow.index]
              return (
                <div
                  key={item.id}
                  role="listitem"
                  data-row="1"
                  ref={virtualizer.measureElement}
                  data-index={vRow.index}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vRow.start}px)` }}
                  className="px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground">{item.detail}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    #{vRow.index + 1}
                  </Badge>
                </div>
              )
            })}
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} role="listitem" data-row="1" className="px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="text-[11px] text-muted-foreground">{item.detail}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <ul className="mt-4 grid sm:grid-cols-2 gap-2 text-[11px] text-muted-foreground">
        <li>• Servicios en la home: <code className="font-mono">Array.map + React.memo + key={'{service.id}'}</code> (prohibido índice).</li>
        <li>• Citas del calendario: carga por rango visible (<code className="font-mono">from/to</code>), nunca el histórico.</li>
        <li>• Imágenes: <code className="font-mono">next/image</code> con <code className="font-mono">sizes</code> correctos.</li>
        <li>• Listas &gt; 50: virtualización obligatoria (regla de calidad #3).</li>
      </ul>
    </section>
  )
}

function ThemeSwitchDemo() {
  const [palette, setPalette] = useState(THEME_PALETTES[0].id)
  const [font, setFont] = useState('poppins')

  const current = THEME_PALETTES.find((p) => p.id === palette) ?? THEME_PALETTES[0]
  const fontDef = THEME_FONTS.find((f) => f.id === font) ?? THEME_FONTS[0]
  const cssVars = useMemo(
    () => themeToCssVars({ ...current, fontHeading: font, fontBody: font, radius: '1rem' }),
    [current, font],
  )

  return (
    <section className="bg-white rounded-2xl border p-5 sm:p-6">
      <header>
        <h2 className="font-heading font-bold flex items-center gap-2">
          <Type className="size-4.5 t-text-primary" aria-hidden /> Tema en vivo (CSS variables)
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Así funciona el editor del panel: mutación de Zustand → CSS vars → el sitio cambia SIN recargar.
        </p>
      </header>

      <div className="mt-4 grid lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold mb-2">Paleta</p>
            <div className="flex flex-wrap gap-2">
              {THEME_PALETTES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPalette(p.id)}
                  className={`rounded-xl border-2 px-3 py-2 text-xs font-semibold transition-all ${palette === p.id ? 'border-neutral-900' : 'border-neutral-200 hover:border-neutral-300'}`}
                >
                  <span className="flex mb-1.5">
                    {[p.primary, p.secondary, p.accent].map((c) => (
                      <span key={c} className="size-4 rounded-full border-2 border-white -ml-1 first:ml-0" style={{ background: c }} />
                    ))}
                  </span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold mb-2">Tipografía (heading + body)</p>
            <div className="flex flex-wrap gap-2">
              {THEME_FONTS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFont(f.id)}
                  className={`rounded-xl border-2 px-3.5 py-2 text-sm transition-all ${font === f.id ? 'border-neutral-900' : 'border-neutral-200 hover:border-neutral-300'}`}
                  style={{ fontFamily: f.stack }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            --t-primary: {current.primary} · --font-heading: {fontDef.id}
          </p>
        </div>

        {/* Mini sitio con el tema aplicado */}
        <div style={cssVars as React.CSSProperties} className="rounded-2xl border-2 border-dashed overflow-hidden bg-neutral-50">
          <div className="relative p-7 text-white" style={{ background: `linear-gradient(110deg, ${current.primary} 10%, color-mix(in srgb, ${current.primary} 45%, transparent))` }}>
            <p className="text-[10px] uppercase tracking-widest opacity-80">{fontDef.label}</p>
            <h3 className="font-heading text-2xl font-extrabold">Tu mejor sonrisa</h3>
            <p className="mt-1.5 text-sm opacity-85">Cuerpo del texto con la fuente seleccionada.</p>
            <button className="t-btn-primary mt-4 rounded-full px-5 py-2.5 text-xs font-bold">Reservar cita</button>
          </div>
          <div className="p-4 bg-white flex items-center gap-2" style={{ fontFamily: 'var(--font-body)' }}>
            <span className="t-btn-primary rounded-full px-3.5 py-2 text-[11px] font-bold">Botón primario</span>
            <span className="rounded-full border px-3.5 py-2 text-[11px] font-semibold" style={{ borderColor: current.primary, color: current.primary }}>
              Outline
            </span>
            <span className="ml-auto font-heading font-extrabold" style={{ color: current.primary }}>
              $35.00
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
