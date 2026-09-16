/**
 * MERCADO DE ACCIONES (funciones puras y deterministas).
 *
 * Cada negocio de la isla tiene 100 acciones. Su precio se mueve una vez al mes y sigue, con algo de
 * ruido, a lo que gana el negocio: cada trimestre publica sus cuentas (beneficio por acción) y el precio
 * se acerca a un "valor justo" que sale de esos beneficios. Así la lección es la que queremos: una acción
 * vale lo que gana el negocio, no lo que dice el precio hoy. Las compras del jugador no mueven el precio.
 *
 * Todo sale de la semilla de la isla (y del mes de La Tormenta, único por partida): la misma isla
 * siempre tiene la misma historia de precios.
 */
import { MONTHS_PER_YEAR } from './config'
import { roundCents } from './money'
import { rngFor } from './rng'

/** Factores por trimestre del año (0 = ene-mar … 3 = oct-dic); la media es 1. */
export type BusinessSeason = 'flat' | 'summer' | 'tourism' | 'autumn'

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
  /** Solo reparte si el beneficio del trimestre llega a esta fracción del normal (cíclicos en la parte baja no reparten). */
  minEpsRatioForDividend?: number
  /** Crecimiento esperado del beneficio al año (puntos básicos). */
  driftBpsYear: number
  /** Ruido mensual máximo del precio (puntos básicos, ±). */
  volBps: number
  season: BusinessSeason
  /** Golpe: en cada trimestre (o solo en `quarters`), probabilidad de beneficio cero y caída `dropBps`. */
  storm?: { chance: number; dropBps: number; label: string; quarters?: number[] }
  /** Ciclo económico predecible: el beneficio oscila ±amp a lo largo de `years` años. */
  cycle?: { years: number; amp: number }
  /**
   * Activo refugio (oro): no gana ni reparte; su precio sigue la inflación y sube cuando hay miedo.
   * `crashJumpBps` = subida el mes de La Tormenta, que se va desvaneciendo en `fadeMonths` meses.
   */
  refuge?: { crashJumpBps: number; fadeMonths: number }
  /** Nombre de la unidad que se compra ("acción" por defecto; "lingote" en el oro). */
  unit?: string
  /** Modas: cada año se sortea si está de moda (×hot) u olvidado (×cold). */
  fashion?: { hot: number; cold: number }
  /** Descubrimiento: cada año, probabilidad de multiplicar el beneficio ×mul para siempre. */
  discovery?: { chancePerYear: number; mul: number; label: string }
  /** Cuánto cae en La Tormenta (por defecto 30 %). */
  crashDropBps?: number
  /** Nivel en que empieza a cotizar. */
  world: number
  /** Cómo se comporta, en una frase para el niño. */
  character: string
}

export const SHARES_PER_BUSINESS = 100
/** Comisión fija por operación de compra o venta de acciones. */
export const COMMISSION_CENTS = 50
/** Mes del año (0 = enero) en que se publican las cuentas: el último de cada trimestre. */
export const RESULT_MONTHS = [2, 5, 8, 11]
/** Tope de subida o bajada de un mes normal (sin golpes). */
export const MAX_MONTHLY_MOVE_BPS = 800
/** La Tormenta: caída general por defecto, y meses tras abrir el Nivel 4 en que llega. */
export const CRASH_DROP_BPS = 3000
export const CRASH_AFTER_MONTHS = 6

export const BUSINESSES: BusinessDef[] = [
  // ───────── Nivel 3 ─────────
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
  // ───────── Nivel 4 ─────────
  {
    id: 'molino', name: 'Molino', icon: '🌬️', basePriceCents: 40_00, epsQuarterCents: 55, payoutBps: 9000, dividendQuarters: [0, 1, 2, 3],
    driftBpsYear: 50, volBps: 200, season: 'flat', world: 4,
    character: 'Aburrido a propósito: energía para toda la isla, dividendo seguro cada trimestre y un precio que casi no se mueve.',
  },
  {
    id: 'posada', name: 'Posada del Puerto', icon: '🛎️', basePriceCents: 22_00, epsQuarterCents: 30, payoutBps: 9000, dividendQuarters: [2],
    driftBpsYear: 200, volBps: 600, season: 'tourism', crashDropBps: 4000, world: 4,
    character: 'Llena en verano, medio vacía el resto del año. Paga un solo dividendo, grande, en septiembre. Cuando hay crisis, la gente deja de viajar.',
  },
  {
    id: 'granja', name: 'Granja', icon: '🌾', basePriceCents: 18_00, epsQuarterCents: 24, payoutBps: 9000, dividendQuarters: [3],
    driftBpsYear: 150, volBps: 400, season: 'autumn', world: 4,
    storm: { chance: 1 / 4, dropBps: 2000, label: 'Mala cosecha en la Granja: plaga o sequía, este año no hay dividendo y el precio cae.', quarters: [3] },
    character: 'Todo el año depende de la cosecha de otoño. Un otoño de cada cuatro sale mal.',
  },
  {
    id: 'cantera', name: 'Cantera de Oro', icon: '🪙', basePriceCents: 30_00, epsQuarterCents: 0, payoutBps: 0, dividendQuarters: [],
    driftBpsYear: 300, volBps: 400, season: 'flat', refuge: { crashJumpBps: 2000, fadeMonths: 9 }, unit: 'lingote', world: 4,
    character: 'Lingotes de oro. No ganan ni reparten nada: valen lo que la gente quiera pagar. Suben despacio, al ritmo de los precios, y de golpe cuando todos tienen miedo. Un refugio para las tormentas, no para hacerse rico.',
  },
  {
    id: 'taller', name: 'Taller de juguetes', icon: '🧸', basePriceCents: 16_00, epsQuarterCents: 20, payoutBps: 7000, dividendQuarters: [0, 1, 2, 3], minEpsRatioForDividend: 0.9,
    driftBpsYear: 300, volBps: 800, season: 'flat', fashion: { hot: 1.6, cold: 0.6 }, world: 4,
    character: 'Modas: un año todos quieren sus juguetes y al siguiente nadie. El precio más nervioso de la isla.',
  },
  {
    id: 'observatorio', name: 'Observatorio', icon: '🔭', basePriceCents: 12_00, epsQuarterCents: 4, payoutBps: 0, dividendQuarters: [],
    driftBpsYear: 100, volBps: 800, season: 'flat', discovery: { chancePerYear: 1 / 8, mul: 3, label: '¡El Observatorio ha descubierto un cometa! Su beneficio se triplica para siempre.' }, world: 4,
    character: 'Casi nunca gana nada… hasta que descubre algo y se multiplica por tres para siempre. Alto riesgo: un trocito pequeño de la cartera, no más.',
  },
]

export const BUSINESS_BY_ID = Object.fromEntries(BUSINESSES.map((b) => [b.id, b])) as Record<string, BusinessDef>

/** Lo que el mercado necesita saber de la partida: la semilla y el mes de La Tormenta (null = aún no fijado). */
export interface MarketCtx {
  seed: number
  crashMonth: number | null
}

/** Cuentas de un trimestre. */
export interface Quarter {
  /** Índice absoluto del trimestre (0 = ene-mar del año 1). */
  q: number
  year: number
  /** 0..3 dentro del año. */
  quarterOfYear: number
  /** Beneficio por acción del trimestre. 0 si hubo golpe. */
  epsCents: number
  /** Ventas por acción (para las cuentas: el beneficio es una parte). */
  salesCents: number
  /** Dividendo por acción que se paga al cerrar el trimestre (0 si no toca o hubo golpe). */
  dividendCents: number
  /** Golpe propio del negocio este trimestre (tormenta, mala cosecha). */
  storm: boolean
  /** Fase del ciclo (-1 valle … +1 pico), solo cíclicos. */
  cyclePhase?: number
  /** Modas: ¿de moda este año? */
  hot?: boolean
  /** Descubrimientos acumulados hasta este año. */
  discoveries?: number
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

const SEASONS: Record<BusinessSeason, number[]> = {
  flat: [1, 1, 1, 1],
  summer: [0.4, 1.2, 1.8, 0.6],
  tourism: [0.5, 1.0, 2.0, 0.5],
  autumn: [0.6, 0.8, 1.0, 1.6],
}

function seasonFactor(season: BusinessSeason, quarterOfYear: number): number {
  return SEASONS[season][quarterOfYear]
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/** ¿Está de moda este año? (Taller) */
export function isHotYear(ctx: MarketCtx, def: BusinessDef, yearIndex: number): boolean {
  if (!def.fashion) return false
  return rngFor(ctx.seed, yearIndex * 17 + hash(def.id), 303)() < 0.5
}

/** Descubrimientos acumulados hasta el año dado incluido (Observatorio). El primer año nunca descubre. */
export function discoveriesUntil(ctx: MarketCtx, def: BusinessDef, yearIndex: number): number {
  if (!def.discovery) return 0
  let n = 0
  for (let y = 1; y <= yearIndex; y++) if (rngFor(ctx.seed, y * 23 + hash(def.id), 404)() < def.discovery.chancePerYear) n++
  return n
}

/** ¿Este año hay descubrimiento nuevo? */
export function discoveryThisYear(ctx: MarketCtx, def: BusinessDef, yearIndex: number): boolean {
  return yearIndex >= 1 && discoveriesUntil(ctx, def, yearIndex) > discoveriesUntil(ctx, def, yearIndex - 1)
}

/** Fase del ciclo de obras (-1 … +1) en el trimestre q. */
export function cyclePhase(def: BusinessDef, q: number): number {
  if (!def.cycle) return 0
  return Math.sin((2 * Math.PI * q) / (4 * def.cycle.years))
}

/** Cuentas del trimestre `q` de un negocio: deterministas por semilla (y La Tormenta, para la Posada). */
export function quarterFor(ctx: MarketCtx, def: BusinessDef, q: number): Quarter {
  const rng = rngFor(ctx.seed, q * 31 + hash(def.id), 101)
  const quarterOfYear = ((q % 4) + 4) % 4
  const yearIndex = Math.floor(q / 4)
  const year = yearIndex + 1
  // El oro no tiene cuentas: no gana, no vende, no reparte.
  if (def.refuge) return { q, year, quarterOfYear, epsCents: 0, salesCents: 0, dividendCents: 0, storm: false }
  const growth = Math.pow(1 + def.driftBpsYear / 10_000, q / 4)
  const noise = 1 + (rng() * 2 - 1) * 0.15
  const stormRoll = rng()
  const storm = !!def.storm && (!def.storm.quarters || def.storm.quarters.includes(quarterOfYear)) && stormRoll < def.storm.chance
  let mul = seasonFactor(def.season, quarterOfYear)
  const phase = cyclePhase(def, q)
  if (def.cycle) mul *= 1 + def.cycle.amp * phase
  const hot = def.fashion ? isHotYear(ctx, def, yearIndex) : undefined
  if (def.fashion) mul *= hot ? def.fashion.hot : def.fashion.cold
  const discoveries = def.discovery ? discoveriesUntil(ctx, def, yearIndex) : undefined
  if (def.discovery && discoveries) mul *= Math.pow(def.discovery.mul, discoveries)
  // La Tormenta: el trimestre en que llega, los negocios de turismo se quedan casi sin clientes.
  const crashQ = ctx.crashMonth !== null ? Math.floor(ctx.crashMonth / 3) : null
  const crashHit = crashQ === q && def.season === 'tourism'
  const base = def.epsQuarterCents * growth * mul * noise * (crashHit ? 0.3 : 1)
  const epsCents = storm ? 0 : Math.max(0, roundCents(base))
  const salesCents = roundCents(base * 4 * (storm ? 0.3 : 1))
  const enough = epsCents >= def.epsQuarterCents * growth * (def.minEpsRatioForDividend ?? 0)
  const pays = def.dividendQuarters.includes(quarterOfYear) && !storm && enough
  const dividendCents = pays ? roundCents((epsCents * def.payoutBps) / 10_000) : 0
  return { q, year, quarterOfYear, epsCents, salesCents, dividendCents, storm, cyclePhase: def.cycle ? phase : undefined, hot, discoveries }
}

/** Valor "justo" de la acción según los beneficios: mezcla del último trimestre publicado anualizado y del último año. */
function fairPrice(ctx: MarketCtx, def: BusinessDef, q: number): number {
  if (def.refuge || def.epsQuarterCents <= 0) return def.basePriceCents
  const pe = def.basePriceCents / (4 * def.epsQuarterCents)
  if (q < 0) return def.basePriceCents
  const cur = quarterFor(ctx, def, q).epsCents
  let trailing = 0
  for (let i = 0; i < 4; i++) trailing += q - i >= 0 ? quarterFor(ctx, def, q - i).epsCents : def.epsQuarterCents * seasonFactor(def.season, (((q - i) % 4) + 4) % 4)
  return pe * (0.5 * cur * 4 + 0.5 * trailing)
}

const cache = new Map<string, number[]>()

/** Prima de miedo del oro en el mes `m`: máxima el mes de La Tormenta, se desvanece en `fadeMonths`. */
export function refugeFear(ctx: MarketCtx, def: BusinessDef, m: number): number {
  if (!def.refuge || ctx.crashMonth === null || m < ctx.crashMonth) return 0
  return (def.refuge.crashJumpBps / 10_000) * Math.max(0, 1 - (m - ctx.crashMonth) / def.refuge.fadeMonths)
}

/**
 * Precio del oro: sigue un valor que sube al ritmo de la inflación media (driftBpsYear), con poco ruido,
 * y el mes de La Tormenta salta hacia arriba (todo el mundo busca refugio); después la prima se va deshaciendo.
 */
function refugePrice(ctx: MarketCtx, def: BusinessDef, m: number, prev: number, noise: number): number {
  const fair = def.basePriceCents * Math.pow(1 + def.driftBpsYear / 10_000, m / MONTHS_PER_YEAR)
  const target = fair * (1 + refugeFear(ctx, def, m))
  const crash = ctx.crashMonth !== null && m === ctx.crashMonth
  let next = prev + (target - prev) * (crash ? 1 : 0.25) + prev * noise
  const cap = crash ? 0.3 : MAX_MONTHLY_MOVE_BPS / 10_000
  next = Math.max(prev * (1 - cap), Math.min(prev * (1 + cap), next))
  return Math.max(1_00, roundCents(next))
}

/** Precio por acción de cada mes desde el 0 hasta `month` (incluido). Cacheado por contexto y negocio. */
export function priceSeries(ctx: MarketCtx, def: BusinessDef, month: number): number[] {
  const key = `${ctx.seed}:${ctx.crashMonth ?? 'x'}:${def.id}`
  let s = cache.get(key)
  if (!s) {
    s = [def.basePriceCents]
    cache.set(key, s)
  }
  for (let m = s.length; m <= month; m++) {
    const prev = s[m - 1]
    const q = Math.floor(m / 3)
    const rng = rngFor(ctx.seed, m * 7 + hash(def.id), 202)
    const noise = (rng() * 2 - 1) * (def.volBps / 10_000)
    if (def.refuge) {
      s.push(refugePrice(ctx, def, m, prev, noise))
      continue
    }
    const results = RESULT_MONTHS.includes(m % MONTHS_PER_YEAR)
    // Hasta que se publican las cuentas, el mercado solo conoce el trimestre anterior.
    const fair = fairPrice(ctx, def, results ? q : q - 1)
    const pull = results ? 0.6 : 0.15
    let next = prev + (fair - prev) * pull + prev * noise
    const stormNow = results && quarterFor(ctx, def, q).storm
    if (stormNow && def.storm) next = Math.min(next, prev * (1 - def.storm.dropBps / 10_000))
    // Descubrimiento: el mes de las primeras cuentas del año en que ocurre, el precio salta.
    const jump = results && m % MONTHS_PER_YEAR === RESULT_MONTHS[0] && def.discovery && discoveryThisYear(ctx, def, Math.floor(m / MONTHS_PER_YEAR))
    // La Tormenta: todo cae a la vez; después el precio vuelve solo hacia su valor justo.
    const crash = ctx.crashMonth !== null && m === ctx.crashMonth
    if (crash) next = Math.min(next, prev * (1 - (def.crashDropBps ?? CRASH_DROP_BPS) / 10_000))
    const cap = stormNow || crash ? 0.45 : jump ? 2.5 : MAX_MONTHLY_MOVE_BPS / 10_000
    next = Math.max(prev * (1 - cap), Math.min(prev * (1 + cap), next))
    s.push(Math.max(1_00, roundCents(next)))
  }
  return s.slice(0, month + 1)
}

export function priceAt(ctx: MarketCtx, businessId: string, month: number): number {
  const def = BUSINESS_BY_ID[businessId]
  if (!def) return 0
  return priceSeries(ctx, def, month)[month]
}

/** Estado del mercado en un mes: para el panel del Mercado y las fichas. */
export function marketAt(ctx: MarketCtx, month: number, world: number): BusinessState[] {
  return BUSINESSES.filter((b) => b.world <= world).map((def) => {
    const series = priceSeries(ctx, def, month)
    const priceCents = series[month]
    const previousPriceCents = series[Math.max(0, month - 1)]
    const q = Math.floor(month / 3)
    const lastPublished = RESULT_MONTHS.includes(month % MONTHS_PER_YEAR) ? q : q - 1
    const lastQuarter = quarterFor(ctx, def, Math.max(0, lastPublished))
    const currentQuarter = quarterFor(ctx, def, q)
    const monthsToResults = 2 - (month % 3)
    // Dividendo anual esperado a este precio: los próximos cuatro trimestres, sin contar golpes.
    let annual = 0
    for (let i = 0; i < 4; i++) {
      const qq = quarterFor(ctx, def, q + i)
      if (!qq.storm) annual += qq.dividendCents
      else if (def.dividendQuarters.includes(qq.quarterOfYear)) annual += roundCents((def.epsQuarterCents * seasonFactor(def.season, qq.quarterOfYear) * def.payoutBps) / 10_000)
    }
    const yieldBps = priceCents > 0 ? Math.round((annual / priceCents) * 10_000) : 0
    return { def, priceCents, previousPriceCents, history: series.slice(Math.max(0, month - 11), month + 1), lastQuarter, currentQuarter, monthsToResults, yieldBps }
  })
}

/** ¿Este mes se publican cuentas (y se pagan dividendos)? */
export function isResultsMonth(month: number): boolean {
  return RESULT_MONTHS.includes(month % MONTHS_PER_YEAR)
}

/* ───────────────────────── Fondo Isla (acumulación) ───────────────────────── */

/** Precio inicial de la participación. */
export const FUND_BASE_CENTS = 10_00
/** Comisión anual de gestión (0,3 %), descontada mes a mes del valor de la participación. */
export const FUND_FEE_BPS_YEAR = 30

const fundCache = new Map<string, number[]>()

/** Negocios que lleva el fondo: todos menos el oro (es un fondo de negocios, no de metales). */
export const FUND_BUSINESSES = BUSINESSES.filter((b) => !b.refuge)

/**
 * Valor liquidativo de la participación mes a mes. El fondo tiene un trocito igual de todos los negocios (sin el oro):
 * sigue la media de sus variaciones de precio y, como es de acumulación, los dividendos que cobran sus
 * negocios no salen del fondo: se reinvierten y suben la participación. Cada mes descuenta su comisión.
 */
export function fundNavSeries(ctx: MarketCtx, month: number): number[] {
  const key = `${ctx.seed}:${ctx.crashMonth ?? 'x'}`
  let s = fundCache.get(key)
  if (!s) {
    s = [FUND_BASE_CENTS]
    fundCache.set(key, s)
  }
  for (let m = s.length; m <= month; m++) {
    let sum = 0
    for (const def of FUND_BUSINESSES) {
      const series = priceSeries(ctx, def, m)
      let r = series[m] / series[m - 1]
      if (RESULT_MONTHS.includes(m % MONTHS_PER_YEAR)) {
        const qq = quarterFor(ctx, def, Math.floor(m / 3))
        r += qq.dividendCents / series[m - 1] // dividendo reinvertido
      }
      sum += r
    }
    const avg = sum / FUND_BUSINESSES.length
    const fee = 1 - FUND_FEE_BPS_YEAR / 10_000 / MONTHS_PER_YEAR
    s.push(Math.max(1, Math.round(s[m - 1] * avg * fee * 100) / 100))
  }
  return s.slice(0, month + 1)
}

export function fundNavAt(ctx: MarketCtx, month: number): number {
  return fundNavSeries(ctx, month)[month]
}
