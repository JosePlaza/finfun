/**
 * LA LIEBRE: la vecina que cobra la misma paga, sufre la misma inflación y ve el mismo mercado
 * que el jugador… pero decide distinto. Su historia se calcula mes a mes a partir de la semilla,
 * sin estado guardado (como los precios del mercado), así la partida sigue siendo reproducible.
 *
 * Reglas, legibles para un niño:
 *  - Cada mes come de la despensa; solo compra comida cuando está vacía, y dos de cada tres veces.
 *    El resto pasa hambre (pierde corazones) pero nunca muere: Doña Tortuga le lleva sopa.
 *  - Se gasta la paga en caprichos (chuches, helado, cómic, cine) y, con lo que le queda, en la cosa
 *    más cara que pueda pagar. Nunca abre cuenta en el banco ni compra bonos.
 *  - Nivel 3 (Mercado abierto): mete la mitad de lo que le queda en el negocio que MÁS SUBIÓ el mes
 *    pasado (persigue la moda) y vende todo lo que baje más de un 10 % en un mes.
 *  - Nivel 4: el mes de La Tormenta vende todo, asustada.
 */
import { FOOD_START_MONTHS, PAGA_CENTS, SHOP_ITEMS, type ShopItemDef } from './config'
import { shopPriceAt } from './inflation'
import { BUSINESSES, COMMISSION_CENTS, priceAt, SHARES_PER_BUSINESS, type MarketCtx } from './market'
import { roundCents } from './money'
import { rngFor } from './rng'

export interface LiebreCtx extends MarketCtx {
  /** Mes en que el jugador abrió cada nivel: worldOpened[0] = Nivel 1 (0), worldOpened[1] = Nivel 2… */
  worldOpened: number[]
}

export interface LiebreOp {
  month: number
  kind: 'compra' | 'venta' | 'panico'
  businessId: string
  shares: number
  priceCents: number
  /** Solo ventas: ganancia (o pérdida) respecto a su precio medio. */
  gainCents?: number
}

export interface LiebreState {
  month: number
  huchaCents: number
  foodMonths: number
  /** Corazones perdidos ahora mismo (0..3). */
  hunger: number
  /** ¿Pasó hambre este mes? (para el préstamo) */
  hungryNow: boolean
  hungryMonths: number
  /** Cosas que ha comprado (objetos, se quedan en su isla), en orden. */
  items: { itemId: string; month: number; priceCents: number }[]
  /** Caprichos que se ha gastado (cuenta). */
  treats: number
  spentCents: number
  receivedCents: number
  holdings: Record<string, { shares: number; avgCostCents: number }>
  stocksValueCents: number
  netWorthCents: number
  /** Patrimonio al cierre de cada mes, desde el 0. */
  netWorthSeries: number[]
  /** Operaciones en el Mercado (las últimas 12). */
  ops: LiebreOp[]
  /** Comisiones pagadas y pérdidas realizadas en el Mercado. */
  commissionsCents: number
  realizedLossCents: number
  soldInCrash: boolean
}

/** Nivel del jugador en el mes dado, según los meses de apertura. */
export function worldAt(ctx: LiebreCtx, month: number): number {
  let w = 1
  for (let i = 1; i < ctx.worldOpened.length; i++) if (ctx.worldOpened[i] <= month) w = i + 1
  return w
}

const TREATS = SHOP_ITEMS.filter((i) => i.kind === 'consumible').sort((a, b) => b.basePriceCents - a.basePriceCents)
const OBJECTS = SHOP_ITEMS.filter((i) => i.kind === 'objeto').sort((a, b) => b.basePriceCents - a.basePriceCents)
const SMALL_BASKET = SHOP_ITEMS.find((i) => i.id === 'cesta-pequena') as ShopItemDef
export const LIEBRE_MAX_HUNGER = 3
export const LIEBRE_FOOD_CHANCE = 2 / 3

const cache = new Map<string, LiebreState[]>()

function key(ctx: LiebreCtx): string {
  return `${ctx.seed}:${ctx.crashMonth ?? 'x'}:${ctx.worldOpened.join(',')}`
}

function initial(): LiebreState {
  return {
    month: -1,
    huchaCents: 0,
    foodMonths: FOOD_START_MONTHS,
    hunger: 0,
    hungryNow: false,
    hungryMonths: 0,
    items: [],
    treats: 0,
    spentCents: 0,
    receivedCents: 0,
    holdings: {},
    stocksValueCents: 0,
    netWorthCents: 0,
    netWorthSeries: [],
    ops: [],
    commissionsCents: 0,
    realizedLossCents: 0,
    soldInCrash: false,
  }
}

function cloneState(s: LiebreState): LiebreState {
  return { ...s, items: [...s.items], holdings: Object.fromEntries(Object.entries(s.holdings).map(([k, v]) => [k, { ...v }])), netWorthSeries: [...s.netWorthSeries], ops: [...s.ops] }
}

function stocksValue(ctx: LiebreCtx, holdings: LiebreState['holdings'], month: number): number {
  let v = 0
  for (const [id, h] of Object.entries(holdings)) v += h.shares * priceAt(ctx, id, month)
  return v
}

function sellAll(ctx: LiebreCtx, s: LiebreState, id: string, month: number, kind: 'venta' | 'panico') {
  const h = s.holdings[id]
  if (!h || h.shares <= 0) return
  const price = priceAt(ctx, id, month)
  const gross = h.shares * price
  const gain = (price - h.avgCostCents) * h.shares
  s.huchaCents += gross - COMMISSION_CENTS
  s.commissionsCents += COMMISSION_CENTS
  if (gain < 0) s.realizedLossCents += -gain
  s.ops.push({ month, kind, businessId: id, shares: h.shares, priceCents: price, gainCents: gain })
  delete s.holdings[id]
}

function step(ctx: LiebreCtx, prev: LiebreState, month: number): LiebreState {
  const s = cloneState(prev)
  s.month = month
  s.hungryNow = false
  const rng = rngFor(ctx.seed, month, 707)
  const world = worldAt(ctx, month)

  // 1. Paga.
  s.huchaCents += PAGA_CENTS
  s.receivedCents += PAGA_CENTS

  // 2. Comer. Si no hay, hambre (nunca muere).
  if (s.foodMonths > 0) {
    s.foodMonths -= 1
    if (s.hunger > 0 && rng() < 0.5) s.hunger -= 1
  } else {
    s.hungryNow = true
    s.hungryMonths += 1
    s.hunger = Math.min(LIEBRE_MAX_HUNGER, s.hunger + 1)
  }
  // Solo compra comida cuando la despensa está vacía, y no siempre se acuerda.
  if (s.foodMonths === 0 && rng() < LIEBRE_FOOD_CHANCE) {
    const price = shopPriceAt(ctx.seed, SMALL_BASKET.basePriceCents, month)
    if (s.huchaCents >= price) {
      s.huchaCents -= price
      s.spentCents += price
      s.foodMonths += SMALL_BASKET.foodMonths ?? 1
    }
  }

  // 3. Mercado (Nivel 3+): vende lo que cae, persigue lo que sube. La Tormenta: vende todo.
  if (world >= 3 && month > 0) {
    const crash = ctx.crashMonth !== null && month === ctx.crashMonth
    if (crash) {
      for (const id of Object.keys(s.holdings)) sellAll(ctx, s, id, month, 'panico')
      s.soldInCrash = true
    } else {
      for (const id of Object.keys(s.holdings)) {
        const now = priceAt(ctx, id, month)
        const before = priceAt(ctx, id, month - 1)
        if (now < before * 0.9) sellAll(ctx, s, id, month, 'venta')
      }
    }
  }

  // 4. Caprichos: uno de cada, del más caro al más barato, mientras le llegue.
  for (const t of TREATS) {
    const price = shopPriceAt(ctx.seed, t.basePriceCents, month)
    if (s.huchaCents >= price) {
      s.huchaCents -= price
      s.spentCents += price
      s.treats += 1
    }
  }

  // 5. Mercado: la mitad de lo que le queda va al negocio que más subió el mes pasado (si no es el mes de La Tormenta).
  if (world >= 3 && month > 0 && !(ctx.crashMonth !== null && month === ctx.crashMonth)) {
    const open = BUSINESSES.filter((b) => b.world <= world && !b.refuge)
    let best: { id: string; rise: number } | null = null
    for (const b of open) {
      const rise = priceAt(ctx, b.id, month) / priceAt(ctx, b.id, month - 1) - 1
      if (rise > 0.02 && (!best || rise > best.rise)) best = { id: b.id, rise }
    }
    if (best) {
      const price = priceAt(ctx, best.id, month)
      const budget = Math.floor(s.huchaCents / 2) - COMMISSION_CENTS
      const owned = s.holdings[best.id]?.shares ?? 0
      const n = Math.min(SHARES_PER_BUSINESS - owned, Math.floor(budget / price))
      if (n >= 1) {
        const cost = n * price
        s.huchaCents -= cost + COMMISSION_CENTS
        s.commissionsCents += COMMISSION_CENTS
        const h = s.holdings[best.id] ?? { shares: 0, avgCostCents: 0 }
        h.avgCostCents = roundCents((h.avgCostCents * h.shares + cost) / (h.shares + n))
        h.shares += n
        s.holdings[best.id] = h
        s.ops.push({ month, kind: 'compra', businessId: best.id, shares: n, priceCents: price })
      }
    }
  }

  // 6. La cosa más cara que pueda pagar y no tenga ya.
  const owned = new Set(s.items.map((i) => i.itemId))
  for (const o of OBJECTS) {
    if (owned.has(o.id)) continue
    const price = shopPriceAt(ctx.seed, o.basePriceCents, month)
    if (s.huchaCents >= price) {
      s.huchaCents -= price
      s.spentCents += price
      s.items.push({ itemId: o.id, month, priceCents: price })
      break
    }
  }

  if (s.ops.length > 12) s.ops = s.ops.slice(-12)
  s.stocksValueCents = stocksValue(ctx, s.holdings, month)
  s.netWorthCents = s.huchaCents + s.stocksValueCents
  s.netWorthSeries.push(s.netWorthCents)
  return s
}

/** Estado de la Liebre al cierre del mes `month` (0 = primer mes). Cacheado por contexto. */
export function liebreAt(ctx: LiebreCtx, month: number): LiebreState {
  const k = key(ctx)
  let series = cache.get(k)
  if (!series) {
    series = []
    cache.set(k, series)
  }
  const m = Math.max(0, month)
  for (let i = series.length; i <= m; i++) series.push(step(ctx, i === 0 ? initial() : series[i - 1], i))
  return series[m]
}

/** Frases de Doña Tortuga para la pizarra "Tú y la Liebre", según el nivel. */
export function liebreLesson(world: number, mine: number, hers: number, herItems: number): string {
  if (world <= 2) {
    if (mine > hers) return `La Liebre ha cobrado exactamente lo mismo que tú. Ella tiene ${herItems} cosas y casi nada guardado; tú tienes más. Cada eL que guardaste sigue siendo tuyo, y además trabaja.`
    return `La Liebre tiene ${herItems} cosas y tú, por ahora, más o menos lo mismo que ella. Mira dónde va tu paga cada mes: eso decide quién estará mejor dentro de un año.`
  }
  if (world === 3) {
    return 'La Liebre compra lo que subió ayer y vende lo que bajó hoy: llega tarde a las subidas y se come las bajadas, y paga comisión cada vez. Tú miras las cuentas y esperas. Compara las dos líneas.'
  }
  return 'En La Tormenta la Liebre vendió todo el primer día: convirtió una bajada en una pérdida de verdad. Quien aguantó cobró sus dividendos y vio volver los precios. La calma también es una decisión.'
}
