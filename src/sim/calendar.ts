import { MONTHS_PER_SEASON, MONTHS_PER_YEAR, MONTH_MS } from './config'
import type { Calendar, Season } from './types'

/** Estaciones por trimestre natural: dic-ene-feb invierno, mar-abr-may primavera, jun-jul-ago verano, sep-oct-nov otoño. */
export const SEASONS: Season[] = ['invierno', 'primavera', 'verano', 'otoño']

/** El año de isla va de enero a diciembre, como el de verdad: la ruleta de la inflación sale al pasar de diciembre a enero. */
export const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** Índice de mes de isla en un instante dado. Nunca negativo. */
export function monthAt(nowMs: number, epochMs: number): number {
  return Math.max(0, Math.floor((nowMs - epochMs) / MONTH_MS))
}

/** Milisegundos que faltan para que empiece el siguiente mes de isla. */
export function msUntilNextMonth(nowMs: number, epochMs: number): number {
  const elapsed = nowMs - epochMs
  const intoMonth = ((elapsed % MONTH_MS) + MONTH_MS) % MONTH_MS
  return MONTH_MS - intoMonth
}

export function calendarOf(month: number): Calendar {
  const monthOfYear0 = month % MONTHS_PER_YEAR
  // Diciembre cierra el año pero ya es invierno: la estación se desplaza un mes respecto al año.
  const seasonIndex = Math.floor(((monthOfYear0 + 1) % MONTHS_PER_YEAR) / MONTHS_PER_SEASON)
  return {
    month,
    year: Math.floor(month / MONTHS_PER_YEAR) + 1,
    monthOfYear: monthOfYear0 + 1,
    season: SEASONS[seasonIndex],
    seasonIndex,
    isYearEnd: monthOfYear0 === MONTHS_PER_YEAR - 1,
  }
}

/** "marzo del año 2" */
export function describeMonth(month: number): string {
  const c = calendarOf(month)
  return `${MONTH_NAMES[c.monthOfYear - 1]} del año ${c.year}`
}
