import { MONTHS_PER_SEASON, MONTHS_PER_YEAR, MONTH_MS } from './config'
import type { Calendar, Season } from './types'

/** Estaciones por trimestre natural: dic-ene-feb invierno, mar-abr-may primavera, jun-jul-ago verano, sep-oct-nov otoño. */
export const SEASONS: Season[] = ['invierno', 'primavera', 'verano', 'otoño']

/** El año de isla va de enero a diciembre, como el de verdad: la ruleta de la inflación sale al pasar de diciembre a enero. */
export const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/**
 * Número de día LOCAL de un instante: cuántas medianoches (hora del dispositivo) han pasado desde 1970.
 * El mes de isla cambia a medianoche, no 24 h después de crear la isla: si creas la isla por la tarde y entras
 * a la mañana siguiente, ya es el mes siguiente.
 */
function localDayIndex(ms: number): number {
  const d = new Date(ms)
  return Math.floor((ms - d.getTimezoneOffset() * 60_000) / MONTH_MS)
}

/** Índice de mes de isla en un instante dado: días naturales (locales) desde el día de creación. Nunca negativo. */
export function monthAt(nowMs: number, epochMs: number): number {
  return Math.max(0, localDayIndex(nowMs) - localDayIndex(epochMs))
}

/** Milisegundos que faltan para que empiece el siguiente mes de isla (la próxima medianoche local). */
export function msUntilNextMonth(nowMs: number, _epochMs: number): number {
  const d = new Date(nowMs)
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0).getTime()
  return Math.max(1, next - nowMs)
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
