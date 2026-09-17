/**
 * DOMINIO — Motor de slots puro (sin IO). Dado un conjunto de profesionales,
 * sus ventanas de disponibilidad y las citas ocupadas, genera los horarios
 * disponibles para un servicio concreto en una fecha (hora Quito).
 */
import { TimeRange } from './entities'
import { mergeTimeRanges } from './factories'
import { quitoToUtc } from '@/lib/quito-time'

export interface SlotProfessional {
  id: string
  name: string
  windows: { startMinute: number; endMinute: number }[]
}

export interface BusyRange {
  start: Date
  end: Date
  /** a qué profesional pertenece el bloqueo (para no cruzar agendas) */
  professionalId: string
}

export interface GeneratedSlot {
  start: Date
  end: Date
  professionalId: string
  professionalName: string
}

export interface GenerateSlotsInput {
  /** 'YYYY-MM-DD' en hora Quito */
  date: string
  /** duración del servicio en minutos */
  durationMin: number
  /** paso entre slots (min) — parametrizable por tenant */
  stepMin: number
  /** anticipo mínimo para reservar (min) */
  minLeadMin: number
  professionals: SlotProfessional[]
  busy: BusyRange[]
  now?: Date
}

export function generateSlots(input: GenerateSlotsInput): GeneratedSlot[] {
  const now = input.now ?? new Date()
  const minStartMs = now.getTime() + input.minLeadMin * 60_000
  const slots: GeneratedSlot[] = []

  for (const prof of input.professionals) {
    const windows = mergeTimeRanges(
      prof.windows.map((w) => new TimeRange(w.startMinute, w.endMinute)),
    )
    for (const window of windows) {
      for (
        let m = window.startMinute;
        m + input.durationMin <= window.endMinute;
        m += input.stepMin
      ) {
        const start = quitoToUtc(input.date, m)
        const end = quitoToUtc(input.date, m + input.durationMin)
        if (start.getTime() < minStartMs) continue
        const conflicts = input.busy.some(
          (b) => b.professionalId === prof.id && b.start < end && b.end > start,
        )
        if (conflicts) continue
        slots.push({ start, end, professionalId: prof.id, professionalName: prof.name })
      }
    }
  }

  slots.sort((a, b) => a.start.getTime() - b.start.getTime())
  return slots
}
