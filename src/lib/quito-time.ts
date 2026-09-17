/**
 * Utilidades deterministas de hora para Ecuador continental (UTC-5, sin DST).
 * TODA la lógica de agenda (slots, citas, calendario) pasa por aquí para
 * evitar sorpresas de zona horaria del servidor o del navegador.
 */
import { MONTH_LABELS, QUITO_UTC_OFFSET_MINUTES, WEEKDAY_LABELS } from './constants'

/** milisegundos a sumar al "tiempo de pared" de Quito para obtener UTC. */
const QUITO_OFFSET_MS = -QUITO_UTC_OFFSET_MINUTES * 60_000 // +5h

export interface QuitoParts {
  year: number
  month: number // 1–12
  day: number
  weekday: number // 0=domingo … 6=sábado
  minutes: number // minutos desde medianoche
  dateStr: string // 'YYYY-MM-DD'
  hhmm: string // 'HH:MM'
}

/** Convierte 'YYYY-MM-DD' + minutos-desde-medianoche (hora Quito) → Date UTC. */
export function quitoToUtc(dateStr: string, minutesFromMidnight: number): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) throw new Error(`Fecha inválida: ${dateStr}`)
  const hh = Math.floor(minutesFromMidnight / 60)
  const mm = minutesFromMidnight % 60
  return new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0) + QUITO_OFFSET_MS)
}

/** Instante UTC → partes de tiempo de pared en Quito. */
export function utcToQuito(date: Date): QuitoParts {
  const shifted = new Date(date.getTime() - QUITO_OFFSET_MS)
  const year = shifted.getUTCFullYear()
  const month = shifted.getUTCMonth() + 1
  const day = shifted.getUTCDate()
  const minutes = shifted.getUTCHours() * 60 + shifted.getUTCMinutes()
  return {
    year,
    month,
    day,
    weekday: shifted.getUTCDay(),
    minutes,
    dateStr: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    hhmm: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
  }
}

/** Hoy en Quito como 'YYYY-MM-DD'. */
export function todayInQuito(): string {
  return utcToQuito(new Date()).dateStr
}

/** Suma N días a un 'YYYY-MM-DD' (aritmética en Quito, sin DST). */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const base = quitoToUtc(dateStr, 0)
  return utcToQuito(new Date(base.getTime() + days * 86_400_000)).dateStr
}

/** Día de semana (0–6) de un 'YYYY-MM-DD' en horario de Quito. */
export function weekdayOfDateStr(dateStr: string): number {
  return utcToQuito(quitoToUtc(dateStr, 0)).weekday
}

/** 540 → '09:00'. Tolerante con valores fuera de rango. */
export function minutesToHHMM(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** '09:00' → 540. Devuelve null si el formato no es válido. */
export function hhmmToMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 23 || m > 59) return null
  return h * 60 + m
}

/** Formateo amigable: 'lunes, 12 de mayo de 2025' */
export function formatQuitoDateLong(date: Date): string {
  const p = utcToQuito(date)
  const wd = WEEKDAY_LABELS[p.weekday]
  const mo = MONTH_LABELS[p.month - 1]
  return `${wd}, ${p.day} de ${mo} de ${p.year}`
}

/** Formateo compacto: '12 may 2025' */
export function formatQuitoDateShort(date: Date): string {
  const p = utcToQuito(date)
  const mo = MONTH_LABELS[p.month - 1].slice(0, 3)
  return `${p.day} ${mo} ${p.year}`
}

/** '12 de mayo, 09:00' (para chips de slots y detalles) */
export function formatQuitoDateTime(date: Date): string {
  const p = utcToQuito(date)
  return `${p.day} de ${MONTH_LABELS[p.month - 1]}, ${p.hhmm}`
}

/** Duración legible: 90 → '1 h 30 min' */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}
