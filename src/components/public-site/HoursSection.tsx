'use client'

/** PÚBLICO — Horarios: fusión de la disponibilidad real de los profesionales. */
import { CalendarDays, Clock, Info } from 'lucide-react'
import { WEEKDAY_LABELS, WEEKDAY_SHORT } from '@/lib/constants'
import type { HoursContent } from '@/domain/entities'
import { useUiStore } from '@/store/ui'
import { translator } from '@/lib/i18n'

export function HoursSection({ content, hours }: { content: HoursContent | undefined; hours: { weekday: number; open: string; close: string }[] }) {
  const lang = useUiStore((s) => s.lang)
  const t = translator(lang)

  // Ordenar lunes→domingo
  const ordered = [...hours].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7))
  const hasHours = ordered.length > 0
  const openDays = new Set(ordered.map((h) => h.weekday))

  return (
    <section id="horarios" className="py-20 sm:py-24 t-bg-soft/60">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <header className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.18em] t-text-primary flex items-center justify-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden /> Agenda
          </p>
          <h2 className="font-heading mt-2 text-3xl sm:text-4xl font-extrabold text-neutral-900">{t('hours.title')}</h2>
        </header>

        {hasHours ? (
          <div className="mt-10 grid gap-2.5 sm:grid-cols-2 max-w-3xl mx-auto">
            {ordered.map((h) => (
              <div
                key={h.weekday}
                className={`flex items-center justify-between rounded-2xl border px-5 py-3.5 bg-white ${
                  h.weekday === 6 ? 't-border shadow-sm' : 'border-neutral-200'
                }`}
              >
                <span className="text-sm font-semibold text-neutral-800">{WEEKDAY_LABELS[h.weekday]}</span>
                <span className="inline-flex items-center gap-1.5 text-sm text-neutral-600 tabular-nums">
                  <Clock className="size-3.5 text-neutral-400" aria-hidden />
                  {h.open} – {h.close}
                </span>
              </div>
            ))}
            {openDays.size < 7 && (
              <div className="sm:col-span-2 flex items-center justify-between rounded-2xl border border-dashed border-neutral-300 px-5 py-3.5 bg-white/60">
                <span className="text-sm text-neutral-400">
                  {[0, 1, 2, 3, 4, 5, 6].filter((d) => !openDays.has(d)).map((d) => WEEKDAY_SHORT[d]).join(' · ')}
                </span>
                <span className="text-sm font-medium text-neutral-400">{t('hours.closed')}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-8 text-center text-sm text-muted-foreground">Horarios disponibles próximamente.</p>
        )}

        {content?.note && (
          <p className="mt-6 flex items-start gap-2 justify-center text-xs text-neutral-500 max-w-xl mx-auto text-center">
            <Info className="size-3.5 mt-0.5 shrink-0" aria-hidden /> {content.note}
          </p>
        )}
      </div>
    </section>
  )
}
