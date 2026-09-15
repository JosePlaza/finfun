/**
 * MERCADO DE ACCIONES (funciones puras y deterministas).
 *
 * Cada negocio de la isla tiene 100 acciones. Su precio se mueve una vez al mes y sigue, con algo de
 * ruido, a lo que gana el negocio: cada trimestre publica sus cuentas (beneficio por acción) y el precio
 * se acerca a un "valor justo" que sale de esos beneficios. Así la lección es la que queremos: una acción
 * vale lo que gana el negocio, no lo que dice el precio hoy. Las compras del jugador no mueven el precio.
 *
 * Todo sale de la semilla de la isla: la misma isla siempre tiene la misma historia de precios.
 */
import { MONTHS_PER_YEAR } from './config'
import { roundCents } from './money'
import { rngFor } from './rng'

export type BusinessSeason = 'flat' | 'summer'

export interface BusinessDef {
  id: string
  name: string
  icon: string
  /** Precio inicial por acción. */
  basePriceCents: number
  /** Beneficio por acción de un trimestre normal. */
  epsQuarterCents: number
  /** Qué parte del beneficio trimestral se reparte como dividendo (puntos básicos). 0 = no reparte. */
  payoutBps: number
  /** Trimestres del año en que reparte (0 = ene-mar … 3 = oct-dic). Vacío = nunca. */
  dividendQuarters: number[]
  /** Crecimiento esperado del beneficio al año (puntos básicos). */
  driftBpsYear: number
  /** Ruido mensual máximo del precio (puntos básicos, ±). */
  volBps: number
  season: BusinessSeason
  /** Tormenta: en cada trimestre, probabilidad de que el beneficio sea cero y el precio caiga `dropBps`. */
  storm?: { chance: number; dropBps: number; label: string }
  /** Nivel en que empieza a cotizar. */
  world: number
  /** Cómo se comporta, en una frase para el niño. */
  character: string
}

export const SHARES_PER_BUSINESS = 100
/** Comisión fija por operación de compra o venta. */
export const COMMISSION_CENTS = 50
/** Mes del año (0 = enero) en que se publican las cuentas: el último de cada trimestre. */
export const RESULT_MONTHS = [2, 5, 8, 11]
/** Tope de subida o bajada de un mes normal (sin tormenta). */
export const MAX_MONTHLY_MOVE_BPS = 800

export const BUSINESSES: BusinessDef[] = [
  {
    id: 'panaderia', name: 'Panadería', icon: '🥖', basePriceCents: 20_00, epsQuarterCents: 25, payoutBps: 8000, dividendQuarters: [0, 1, 2, 3],
    driftBpsYear: 200, volBps: 300, season: 'flat', world: 3,
    character: 'Vende pan todos los días. Gana parecido en todas las estaciones y reparte dividendo cada trimestre.',
  },
  {
    id: 'heladeria', name: 'Heladería', icon: '🍦', basePriceCents: 15_00, epsQuarterCents: 22, payoutBps: 9000, dividendQuarters: [2],
    driftBpsYear: 300, volBps: 600, season: 'summer', world: 3,
    character: 'Arrasa en verano y cierra en invierno. Solo reparte dividendo después del verano.',
  },
  {
    id: 'puerto', name: 'Puerto pesquero', icon: '🎣', basePriceCents: 25_00, epsQuarterCents: 55, payoutBps: 9000, dividendQuarters: [0, 1, 2, 3],
    driftBpsYear: 100, volBps: 500, season: 'flat', world: 3,
    storm: { chance: 1 / 6, dropBps: 1500, label: 'Tormenta en el Puerto: los barcos no salen, no hay dividendo y el precio cae.' },
    character: 'Reparte mucho… cuando no hay tormenta. Un trimestre de cada seis se queda a cero.',
  },
  {
    id: 'astillero', name: 'Astillero', icon: '⚓', basePriceCents: 30_00, epsQuarterCents: 30, payoutBps: 0, dividendQuarters: [],
    driftBpsYear: 800, volBps: 600, season: 'flat', world: 3,
    character: 'No reparte nada: lo reinvierte todo para crecer. Su acción sube más a largo plazo.',
  },
]

export const BUSINESS_BY_ID = Object.fromEntries(BUSINESSES.map((b) => [b.id, b])) as Record<string, BusinessDef>

/** Cuentas de un trimestre. */
export interface Quarter {
  /** Índice absoluto del trimestre (0 = ene-mar del año 1). */
  q: number
  year: number
  /** 0..3 dentro del año. */
  quarterOfYear: number
  /** Beneficio por acción del trimestre. 0 si hubo tormenta. */
  epsCents: number
  /** Ventas por acción (para las cuentas: el beneficio es una parte). */
  salesCents: number
  /** Dividendo por acción que se paga al cerrar el trimestre (0 si no toca o hubo tormenta). */
  dividendCents: number
  storm: boolean
}

export interface MarketPoint {
  month: number
  priceCents: number
}

export interface BusinessState {
  def: BusinessDef
  priceCents: number
  previousPriceCents: number
  /** Últimos 12 meses de precio (el último es el actual). */
  history: number[]
  /** Últimas cuentas publicadas. */
  lastQuarter: Quarter
  /** Trimestre en curso (aún sin publicar). */
  currentQuarter: Quarter
  /** Meses que faltan para las próximas cuentas (0 = este mes se publican). */
  monthsToResults: number
  /** Rentabilidad por dividendo anual esperada a este precio (puntos básicos). */
  yieldBps: number
}

function seasonFactor(season: BusinessSeason, quarterOfYear: number): number {
  if (season === 'flat') return 1
  // Verano: ene-mar 0,4 · abr-jun 1,2 · jul-sep 1,8 · oct-dic 0,6 (media 1)
  return [0.4, 1.2, 1.8, 0.6][quarterOfYear]
}

/** Cuentas del trimestre `q` de un negocio: deterministas por semilla. */
export function quarterFor(seed: number, def: BusinessDef, q: number): Quarter {
  const rng = rngFor(seed, q * 31 + hash(def.id), 101)
  const quarterOfYear = ((q % 4) + 4) % 4
  const year = Math.floor(q / 4) + 1
  const growth = Math.pow(1 + def.driftBpsYear / 10_000, q / 4)
  const noise = 1 + (rng() * 2 - 1) * 0.15
  const storm = !!def.storm && rng() < def.storm.chance
  const base = def.epsQuarterCents * growth * seasonFactor(def.season, quarterOfYear) * noise
  const epsCents = storm ? 0 : Math.max(0, roundCents(base))
  const salesCents = roundCents(base * 4 * (storm ? 0.3 : 1))
  const pays = def.dividendQuarters.includes(quarterOfYear) && !storm
  const dividendCents = pays ? roundCents((epsCents * def.payoutBps) / 10_000) : 0
  return { q, year, quarterOfYear, epsCents, salesCents, dividendCents, storm }
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/** Valor "justo" de la acción según los beneficios: mezcla del último trimestre publicado anualizado y del último año. */
function fairPrice(seed: number, def: BusinessDef, q: number): number {
  const pe = def.basePriceCents / (4 * def.epsQuarterCents)
  if (q < 0) return def.basePriceCents
  const cur = quarterFor(seed, def, q).epsCents
  let trailing = 0
  for (let i = 0; i < 4; i++) trailing += q - i >= 0 ? quarterFor(seed, def, q - i).epsCents : def.epsQuarterCents * seasonFactor(def.season, (((q - i) % 4) + 4) % 4)
  // Con tormenta el trimestre actual vale 0 y el valor justo baja; el resto lo hace el golpe explícito.
  return pe * (0.5 * cur * 4 + 0.5 * trailing)
}

const cache = new Map<string, number[]>()

/** Precio por acción de cada mes desde el 0 hasta `month` (incluido). Cacheado por semilla y negocio. */
export function priceSeries(seed: number, def: BusinessDef, month: number): number[] {
  const key = `${seed}:${def.id}`
  let s = cache.get(key)
  if (!s) {
    s = [def.basePriceCents]
    cache.set(key, s)
  }
  for (let m = s.length; m <= month; m++) {
    const prev = s[m - 1]
    const q = Math.floor(m / 3)
    const rng = rngFor(seed, m * 7 + hash(def.id), 202)
    const noise = (rng() * 2 - 1) * (def.volBps / 10_000)
    const results = RESULT_MONTHS.includes(m % MONTHS_PER_YEAR)
    // Hasta que se publican las cuentas, el mercado solo conoce el trimestre anterior.
    const fair = fairPrice(seed, def, results ? q : q - 1)
    // El precio se acerca al valor justo (más deprisa el mes de cuentas) y tiembla un poco cada mes.
    const pull = results ? 0.6 : 0.15
    let next = prev + (fair - prev) * pull + prev * noise
    const stormNow = results && quarterFor(seed, def, q).storm
    if (stormNow && def.storm) next = Math.min(next, prev * (1 - def.storm.dropBps / 10_000))
    // Tope de movimiento mensual (la tormenta puede pasarse).
    const cap = stormNow ? 0.35 : MAX_MONTHLY_MOVE_BPS / 10_000
    next = Math.max(prev * (1 - cap), Math.min(prev * (1 + cap), next))
    s.push(Math.max(1_00, roundCents(next)))
  }
  return s.slice(0, month + 1)
}

export function priceAt(seed: number, businessId: string, month: number): number {
  const def = BUSINESS_BY_ID[businessId]
  if (!def) return 0
  return priceSeries(seed, def, month)[month]
}

/** Estado del mercado en un mes: para el panel del Mercado y las fichas. */
export function marketAt(seed: number, month: number, world: number): BusinessState[] {
  return BUSINESSES.filter((b) => b.world <= world).map((def) => {
    const series = priceSeries(seed, def, month)
    const priceCents = series[month]
    const previousPriceCents = series[Math.max(0, month - 1)]
    const q = Math.floor(month / 3)
    const lastPublished = RESULT_MONTHS.includes(month % MONTHS_PER_YEAR) ? q : q - 1
    const lastQuarter = quarterFor(seed, def, Math.max(0, lastPublished))
    const currentQuarter = quarterFor(seed, def, q)
    const monthsToResults = 2 - (month % 3)
    // Dividendo anual esperado a este precio: suma de los cuatro trimestres normales.
    let annual = 0
    for (let i = 0; i < 4; i++) {
      const qq = quarterFor(seed, def, q + i)
      if (!qq.storm) annual += qq.dividendCents
      else annual += def.dividendQuarters.includes(qq.quarterOfYear) ? roundCents((def.epsQuarterCents * def.payoutBps) / 10_000) : 0
    }
    const yieldBps = priceCents > 0 ? Math.round((annual / priceCents) * 10_000) : 0
    return { def, priceCents, previousPriceCents, history: series.slice(Math.max(0, month - 11), month + 1), lastQuarter, currentQuarter, monthsToResults, yieldBps }
  })
}

/** ¿Este mes se publican cuentas (y se pagan dividendos)? */
export function isResultsMonth(month: number): boolean {
  return RESULT_MONTHS.includes(month % MONTHS_PER_YEAR)
}
