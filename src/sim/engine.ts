import {
  BANK_RATE_BPS,
  BANK_UNLOCK_MONTH,
  BOND_COUPON_EVERY,
  BOND_OFFERS,
  FOOD_START_MONTHS,
  HUERTO_COST_CENTS,
  HUERTO_EVERY_MONTHS,
  HUERTO_FOOD_MONTHS,
  HUERTO_UPGRADE_COST_CENTS,
  HUERTO_UPGRADED_FOOD_MONTHS,
  HUNGER_DEATH_MONTHS,
  INFLATION_WHEEL_BPS,
  LESSONS,
  MONTHS_PER_YEAR,
  PAGA_CENTS,
  RETENTION_BPS,
  SHOP_ITEMS,
  TASK_MAX_CENTS,
  TASK_MIN_CENTS,
  WORLD2_UNLOCK_ITEM,
} from './config'
import { calendarOf, describeMonth, monthAt } from './calendar'
import { applyBps, formatCents, roundCents } from './money'
import { randInt, rngFor } from './rng'
import type { DiaryEntry, GameState, LedgerEvent, TaxMode } from './types'
import { missionsFor } from './missions'
import { BUSINESS_BY_ID, BUSINESSES, COMMISSION_CENTS, CRASH_AFTER_MONTHS, discoveryThisYear, fundNavAt, isHotYear, isResultsMonth, priceAt, quarterFor, SHARES_PER_BUSINESS, type MarketCtx } from './market'

const LEDGER_MAX = 80

export function createGame(params: { islandName: string; seed: number; epochMs: number }): GameState {
  return {
    version: 1,
    islandName: params.islandName.trim() || 'Mi isla',
    seed: params.seed >>> 0,
    epochMs: params.epochMs,
    processedMonth: -1,
    world: 1,
    huchaCents: 0,
    mailboxCents: 0,
    bankCents: 0,
    bankUnlocked: false,
    taxesUnlocked: false,
    shop: SHOP_ITEMS.map((i) => ({ id: i.id, priceCents: i.basePriceCents, previousPriceCents: i.basePriceCents })),
    purchases: [],
    diary: [],
    ledger: [],
    inflationHistoryBps: [],
    taskDoneMonth: -1,
    yearSpentCents: 0,
    yearTasksCents: 0,
    yearBankInterestCents: 0,
    totalTasksCents: 0,
    tasksCompleted: 0,
    foodMonths: FOOD_START_MONTHS,
    hunger: 0,
    dead: false,
    deathMonth: null,
    huertoBuiltMonth: null,
    huertoUpgradedMonth: null,
    pendingYearEnds: [],
    bonds: [],
    bondsBought: 0,
    taxMode: 'cada-cobro',
    taxModeChosen: false,
    yearPendingTaxableCents: 0,
    yearTaxCents: 0,
    taxDebtCents: 0,
    declarations: [],
    lessonsRead: [],
    holdings: {},
    businessesBought: [],
    yearDividendsCents: 0,
    yearLossCents: 0,
    stormsSurvived: 0,
    stormWatch: null,
    crashMonth: null,
    crashWatch: null,
    crashSurvived: false,
    fundUnits: 0,
    fundCostCents: 0,
  }
}

/** Contexto que necesita el mercado: semilla y mes de La Tormenta. */
export function marketCtx(state: GameState): MarketCtx {
  return { seed: state.seed, crashMonth: state.crashMonth ?? null }
}

/**
 * Pone al día una partida guardada con una versión anterior del juego: añade los campos que no
 * existían con sus valores por defecto. Devuelve el mismo objeto si no falta nada.
 */
export function migrate(state: GameState): GameState {
  const needs =
    state.foodMonths === undefined ||
    state.pendingYearEnds === undefined ||
    state.bonds === undefined ||
    state.lessonsRead === undefined ||
    state.declarations === undefined ||
    state.holdings === undefined ||
    state.fundUnits === undefined ||
    (state.world >= 2 && !state.bankUnlocked) ||
    SHOP_ITEMS.some((d) => !state.shop.some((i) => i.id === d.id))
  return needs ? clone(state) : state
}

/** Copia profunda con valores por defecto para los campos añadidos después de la primera versión. */
function clone(state: GameState): GameState {
  const c = structuredClone(state)
  c.tasksCompleted ??= 0
  c.foodMonths ??= FOOD_START_MONTHS
  c.hunger ??= 0
  c.dead ??= false
  c.deathMonth ??= null
  c.huertoBuiltMonth ??= null
  c.huertoUpgradedMonth ??= null
  c.pendingYearEnds ??= []
  c.bonds ??= []
  c.bondsBought ??= 0
  c.taxMode ??= 'cada-cobro'
  c.taxModeChosen ??= false
  c.yearPendingTaxableCents ??= 0
  c.yearTaxCents ??= 0
  c.taxDebtCents ??= 0
  c.declarations ??= []
  c.lessonsRead ??= []
  c.holdings ??= {}
  c.businessesBought ??= []
  c.yearDividendsCents ??= 0
  c.yearLossCents ??= 0
  c.stormsSurvived ??= 0
  c.stormWatch ??= null
  c.crashMonth ??= null
  c.crashWatch ??= null
  c.crashSurvived ??= false
  c.fundUnits ??= 0
  c.fundCostCents ??= 0
  // Regla añadida después: en el Nivel 2 el banco siempre está abierto.
  if (c.world >= 2 && !c.bankUnlocked) c.bankUnlocked = true
  // Las cestas de comida se añadieron a la tienda más tarde: las partidas viejas las reciben aquí.
  for (const def of SHOP_ITEMS) {
    if (!c.shop.some((i) => i.id === def.id)) c.shop.push({ id: def.id, priceCents: def.basePriceCents, previousPriceCents: def.basePriceCents })
  }
  return c
}

function log(state: GameState, ev: LedgerEvent) {
  state.ledger.push(ev)
  if (state.ledger.length > LEDGER_MAX) state.ledger.splice(0, state.ledger.length - LEDGER_MAX)
}

/**
 * Inflación sorteada para un año de isla (determinista por semilla): una de las casillas de la ruleta.
 * El jugador "gira" la ruleta en pantalla, pero el resultado ya está decidido, así la partida es reproducible.
 */
export function inflationForYear(seed: number, yearIndex: number): number {
  const rng = rngFor(seed, yearIndex, 11)
  return INFLATION_WHEEL_BPS[randInt(rng, 0, INFLATION_WHEEL_BPS.length - 1)]
}

/** Recompensa de la tarea diaria de un mes (determinista). */
export function taskRewardForMonth(seed: number, month: number): number {
  const rng = rngFor(seed, month, 23)
  return randInt(rng, TASK_MIN_CENTS / 100, TASK_MAX_CENTS / 100) * 100
}

/**
 * Sube un precio con la inflación y lo deja "de tienda": los artículos de 10 o más euroLukys
 * se redondean a enteros (180 → 183) y los baratos a décimas (2 → 2,10) cuando toque.
 */
export function inflatePrice(priceCents: number, inflationBps: number): number {
  const exact = priceCents + (priceCents * inflationBps) / 10_000
  const step = priceCents >= 10_00 ? 100 : 10
  return Math.max(priceCents, roundCents(exact / step) * step)
}

/**
 * Interés mensual del banco sobre un saldo. Si Hacienda está activa y el jugador paga "en cada cobro",
 * se retiene el 19 % al instante; en modo anual se cobra bruto y se declara al cerrar el año.
 */
export function monthlyInterest(bankCents: number, taxesUnlocked: boolean, taxMode: TaxMode = 'cada-cobro'): { gross: number; retained: number; net: number } {
  const gross = roundCents((bankCents * BANK_RATE_BPS) / 10_000 / MONTHS_PER_YEAR)
  const retained = taxesUnlocked && taxMode === 'cada-cobro' ? applyBps(gross, RETENTION_BPS) : 0
  return { gross, retained, net: gross - retained }
}

/** Cuánto habría en el banco tras 12 meses si un saldo hubiera estado allí todo el año. */
export function bankAfterOneYear(cents: number, taxesUnlocked: boolean, taxMode: TaxMode = 'cada-cobro'): number {
  let b = cents
  for (let i = 0; i < MONTHS_PER_YEAR; i++) b += monthlyInterest(b, taxesUnlocked, taxMode).net
  return b
}

/** Cupón trimestral de un bono. */
export function bondCoupon(principalCents: number, couponBps: number): number {
  return roundCents((principalCents * couponBps) / 10_000 / (MONTHS_PER_YEAR / BOND_COUPON_EVERY))
}

/** Rendimiento bruto cobrado: aplica la retención según el modo y lleva la cuenta para la declaración. */
function earnTaxable(state: GameState, gross: number): { retained: number; net: number } {
  if (!state.taxesUnlocked || gross <= 0) return { retained: 0, net: gross }
  if (state.taxMode === 'cada-cobro') {
    // Las pérdidas del año en acciones compensan: solo se retiene sobre lo que sobra.
    const offset = Math.min(gross, state.yearLossCents)
    state.yearLossCents -= offset
    const retained = applyBps(gross - offset, RETENTION_BPS)
    state.yearTaxCents += retained
    return { retained, net: gross - retained }
  }
  state.yearPendingTaxableCents += gross
  return { retained: 0, net: gross }
}

/** Valor a precio de hoy de las acciones del jugador. */
export function stocksValue(state: GameState, month: number): number {
  let total = 0
  const ctx = marketCtx(state)
  for (const [id, h] of Object.entries(state.holdings ?? {})) total += h.shares * priceAt(ctx, id, month)
  return total
}

/** Valor a precio de hoy de las participaciones del Fondo Isla. */
export function fundValue(state: GameState, month: number): number {
  if (!state.fundUnits) return 0
  return roundCents(state.fundUnits * fundNavAt(marketCtx(state), month))
}

/** Cobra a Hacienda lo que se debe: primero del cofre, luego del banco; el resto queda como deuda. */
function payTax(state: GameState, cents: number): number {
  let left = cents
  const fromHucha = Math.min(left, state.huchaCents)
  state.huchaCents -= fromHucha
  left -= fromHucha
  const fromBank = Math.min(left, state.bankCents)
  state.bankCents -= fromBank
  left -= fromBank
  return cents - left
}

/** El jugador pide ver dónde estaban todas las bellotas: la tarea de hoy se da por terminada sin premio. */
export function forfeitTask(input: GameState, nowMs: number): ActionResult {
  const state = clone(advanceTo(input, nowMs))
  const month = currentMonth(state, nowMs)
  if (state.taskDoneMonth >= month) return { ok: false, reason: 'Hoy ya no quedan bellotas por recoger.' }
  state.taskDoneMonth = month
  log(state, { kind: 'tarea', month, amountCents: 0, label: 'Pediste ver las bellotas: hoy sin premio' })
  return done(state)
}

/** Patrimonio en bonos (lo prestado, pendiente de devolver). */
export function bondsTotal(state: GameState): number {
  return state.bonds.reduce((a, b) => a + b.principalCents, 0)
}

function processMonth(state: GameState, month: number) {
  // Si la aventura terminó, la isla se detiene.
  if (state.dead) {
    state.processedMonth = month
    return
  }
  const cal = calendarOf(month)

  // 1. Llega la paga al buzón.
  state.mailboxCents += PAGA_CENTS
  log(state, { kind: 'paga', month, amountCents: PAGA_CENTS, label: `Paga de ${describeMonth(month)}` })

  // 2. Primero la cosecha: el huerto da comida cada tres meses: 2 meses, o 3 si está ampliado (la despensa se llena sola).
  if (state.huertoBuiltMonth !== null) {
    const since = month - state.huertoBuiltMonth
    if (since > 0 && since % HUERTO_EVERY_MONTHS === 0) {
      const upgraded = state.huertoUpgradedMonth !== null
      const food = upgraded ? HUERTO_UPGRADED_FOOD_MONTHS : HUERTO_FOOD_MONTHS
      state.foodMonths += food
      log(state, { kind: 'huerto', month, amountCents: 0, label: upgraded ? `El huerto ampliado llena la despensa (+${food} meses de comida)` : `El huerto da una cesta grande (+${food} meses de comida)` })
    }
  }

  // 3. Comida: cada mes se come una ración de la despensa (el primer mes no cuenta).
  if (month > 0) {
    if (state.foodMonths > 0) {
      state.foodMonths -= 1
      state.hunger = 0
    } else {
      state.hunger += 1
      if (state.hunger >= HUNGER_DEATH_MONTHS) {
        state.dead = true
        state.deathMonth = month
        log(state, { kind: 'comida', month, amountCents: 0, label: 'Sin comida durante seis meses: la aventura termina' })
        state.processedMonth = month
        return
      }
    }
  }

  // 4. El banco abona su interés.
  if (state.bankUnlocked && state.bankCents > 0) {
    const gross = monthlyInterest(state.bankCents, false).gross
    const { net, retained } = earnTaxable(state, gross)
    if (net > 0) {
      state.bankCents += net
      state.yearBankInterestCents += net
      log(state, {
        kind: 'interes',
        month,
        amountCents: net,
        label: retained > 0 ? `Interés del banco (Hacienda retuvo ${formatCents(retained, { alwaysDecimals: true })})` : 'Interés del banco',
      })
    }
  }

  // 5. Bonos: cupón trimestral y devolución al vencimiento. Van al cofre.
  for (const bond of state.bonds) {
    const held = month - bond.boughtMonth
    if (held <= 0) continue
    const offer = BOND_OFFERS.find((o) => o.id === bond.offerId)
    const name = offer?.name ?? 'Bono'
    if (held % BOND_COUPON_EVERY === 0 && month <= bond.maturityMonth) {
      const gross = bondCoupon(bond.principalCents, bond.couponBps)
      const { net, retained } = earnTaxable(state, gross)
      state.huchaCents += net
      bond.couponsPaid += 1
      log(state, {
        kind: 'cupon',
        month,
        amountCents: net,
        label: retained > 0 ? `Cupón del ${name} (Hacienda retuvo ${formatCents(retained, { alwaysDecimals: true })})` : `Cupón del ${name}`,
      })
    }
    if (month === bond.maturityMonth) {
      state.huchaCents += bond.principalCents
      log(state, { kind: 'vencimiento', month, amountCents: bond.principalCents, label: `El Ayuntamiento devuelve el ${name}` })
    }
  }
  state.bonds = state.bonds.filter((b) => month < b.maturityMonth)

  // 5a. La Tormenta: un mes, todo cae a la vez. Se apunta lo que se tenía para la misión de aguantar.
  if (state.crashMonth !== null && month === state.crashMonth) {
    log(state, { kind: 'tormenta', month, amountCents: 0, label: 'LA TORMENTA: todos los precios de la isla caen de golpe. Los negocios siguen ganando; los precios se recuperan con el tiempo.' })
    const shares = Object.values(state.holdings).reduce((a, h) => a + h.shares, 0)
    state.crashWatch = { shares, fundUnits: state.fundUnits }
    for (const def of BUSINESSES) {
      if (def.refuge && def.world <= state.world) log(state, { kind: 'noticia', month, amountCents: 0, label: `Con el miedo, todos buscan refugio: el oro de la ${def.name} sube mientras lo demás cae.` })
    }
  }
  // El miedo se pasa: el oro vuelve a su precio de siempre.
  if (state.crashMonth !== null) {
    for (const def of BUSINESSES) {
      if (def.refuge && def.world <= state.world && month === state.crashMonth + def.refuge.fadeMonths)
        log(state, { kind: 'noticia', month, amountCents: 0, label: 'El miedo se ha ido: el oro vuelve a su precio de siempre. El refugio protege en la tormenta, no hace rico a nadie.' })
    }
  }
  if (state.crashWatch && state.crashMonth !== null && month === state.crashMonth + 3) {
    const shares = Object.values(state.holdings).reduce((a, h) => a + h.shares, 0)
    if (shares >= state.crashWatch.shares && state.fundUnits >= state.crashWatch.fundUnits - 1e-9) {
      state.crashSurvived = true
      log(state, { kind: 'noticia', month, amountCents: 0, label: 'Aguantaste La Tormenta sin vender. Mira los precios: ya vuelven.' })
    }
    state.crashWatch = null
  }

  // 5b. Noticias de año nuevo (Nivel 4): modas y descubrimientos.
  if (state.world >= 4 && month % MONTHS_PER_YEAR === 0 && month > 0) {
    const ctx = marketCtx(state)
    const yearIndex = Math.floor(month / MONTHS_PER_YEAR)
    for (const def of BUSINESSES) {
      if (def.world > state.world) continue
      if (def.fashion) {
        const hot = isHotYear(ctx, def, yearIndex)
        log(state, { kind: 'noticia', month, amountCents: 0, label: hot ? `Este año los juguetes del ${def.name} están de moda: todo el mundo los quiere.` : `Este año nadie se acuerda de los juguetes del ${def.name}. Las modas pasan.` })
      }
      if (def.discovery && discoveryThisYear(ctx, def, yearIndex)) log(state, { kind: 'noticia', month, amountCents: 0, label: def.discovery.label })
    }
  }

  // 5c. Cuentas trimestrales de los negocios: dividendos al cofre y noticias (tormentas).
  if (state.world >= 3 && isResultsMonth(month)) {
    const q = Math.floor(month / 3)
    const ctx = marketCtx(state)
    for (const def of BUSINESSES) {
      if (def.world > state.world) continue
      const quarter = quarterFor(ctx, def, q)
      const holding = state.holdings[def.id]
      if (quarter.storm && def.storm) {
        log(state, { kind: 'tormenta', month, amountCents: 0, label: def.storm.label })
        if (holding && holding.shares > 0 && !state.stormWatch) state.stormWatch = { businessId: def.id, shares: holding.shares, sinceMonth: month }
      }
      if (holding && holding.shares > 0 && quarter.dividendCents > 0) {
        const gross = quarter.dividendCents * holding.shares
        const { net, retained } = earnTaxable(state, gross)
        state.huchaCents += net
        state.yearDividendsCents += net
        log(state, {
          kind: 'dividendo',
          month,
          amountCents: net,
          label: retained > 0 ? `Dividendo de ${def.name} (Hacienda retuvo ${formatCents(retained, { alwaysDecimals: true })})` : `Dividendo de ${def.name}`,
        })
      }
    }
    // Aguantar una tormenta: seguir con las mismas acciones (o más) hasta las siguientes cuentas.
    if (state.stormWatch && state.stormWatch.sinceMonth < month) {
      const h = state.holdings[state.stormWatch.businessId]
      if (h && h.shares >= state.stormWatch.shares) state.stormsSurvived += 1
      state.stormWatch = null
    }
  }

  // 6. Deuda con Hacienda pendiente de otros años: se cobra en cuanto hay dinero.
  if (state.taxDebtCents > 0) {
    const paid = payTax(state, state.taxDebtCents)
    if (paid > 0) {
      state.taxDebtCents -= paid
      log(state, { kind: 'impuestos', month, amountCents: -paid, label: 'Pagas a Hacienda lo que debías' })
    }
  }

  // 7. Cierre de año: declaración anual, y la ruleta de inflación queda esperando al jugador.
  if (cal.isYearEnd) {
    if (state.taxesUnlocked && state.taxMode === 'anual' && state.yearPendingTaxableCents > 0) {
      // Las pérdidas en acciones del año restan de la base.
      const base = Math.max(0, state.yearPendingTaxableCents - state.yearLossCents)
      const tax = applyBps(base, RETENTION_BPS)
      const paid = payTax(state, tax)
      state.taxDebtCents += tax - paid
      state.yearTaxCents += tax
      log(state, { kind: 'impuestos', month, amountCents: -tax, label: `Declaración del año ${cal.year}: 19 % de ${formatCents(base)}` })
    }
    if (state.taxesUnlocked) {
      state.declarations.push({ year: cal.year, mode: state.taxMode, grossCents: state.yearPendingTaxableCents + (state.taxMode === 'cada-cobro' ? roundCents((state.yearTaxCents * 10_000) / RETENTION_BPS) : 0), taxCents: state.yearTaxCents })
    }
    state.pendingYearEnds.push({
      year: cal.year,
      month,
      huchaCents: state.huchaCents + state.mailboxCents,
      bankCents: state.bankCents,
      bankInterestYearCents: state.yearBankInterestCents,
      spentYearCents: state.yearSpentCents,
      earnedTasksYearCents: state.yearTasksCents,
      stocksValueCents: stocksValue(state, month) + fundValue(state, month),
      dividendsYearCents: state.yearDividendsCents,
    })
    state.yearSpentCents = 0
    state.yearTasksCents = 0
    state.yearBankInterestCents = 0
    state.yearPendingTaxableCents = 0
    state.yearTaxCents = 0
    state.yearDividendsCents = 0
    state.yearLossCents = 0
  }

  if (!state.bankUnlocked && month + 1 >= BANK_UNLOCK_MONTH) {
    state.bankUnlocked = true
    log(state, { kind: 'banco-abierto', month, amountCents: 0, label: 'Abre el Banco de la Isla' })
  }

  state.processedMonth = month
}

/**
 * El jugador gira la ruleta del año pendiente más antiguo: se aplica la inflación a los precios y
 * Doña Tortuga escribe la página del diario. Devuelve el porcentaje que ha salido.
 */
export function spinInflation(input: GameState): ActionResult & { inflationBps?: number } {
  const state = clone(input)
  const pending = state.pendingYearEnds.shift()
  if (!pending) return { ok: false, reason: 'No hay ningún año por cerrar.' }
  const yearIndex = pending.year - 1
  const inflationBps = inflationForYear(state.seed, yearIndex)
  state.inflationHistoryBps.push(inflationBps)

  const bici = state.shop.find((s) => s.id === WORLD2_UNLOCK_ITEM) ?? state.shop[0]
  const example = {
    itemId: bici.id,
    name: SHOP_ITEMS.find((d) => d.id === bici.id)?.name ?? bici.id,
    beforeCents: bici.priceCents,
    afterCents: inflatePrice(bici.priceCents, inflationBps),
  }
  for (const item of state.shop) {
    item.previousPriceCents = item.priceCents
    item.priceCents = inflatePrice(item.priceCents, inflationBps)
  }
  log(state, { kind: 'inflacion', month: pending.month, amountCents: inflationBps, label: `Inflación del año ${pending.year}` })

  const entry: DiaryEntry = {
    year: pending.year,
    inflationBps,
    example,
    huchaCents: pending.huchaCents,
    bankIfAllCents: bankAfterOneYear(pending.huchaCents, state.taxesUnlocked, state.taxMode),
    bankCents: pending.bankCents,
    bankInterestYearCents: pending.bankInterestYearCents,
    spentYearCents: pending.spentYearCents,
    earnedTasksYearCents: pending.earnedTasksYearCents,
    stocksValueCents: pending.stocksValueCents ?? 0,
    dividendsYearCents: pending.dividendsYearCents ?? 0,
    firstTime: state.diary.length === 0,
  }
  state.diary.push(entry)
  return { ok: true, state, inflationBps }
}

/** Avanza la simulación hasta el instante dado. Idempotente: llamarla varias veces con la misma hora no cambia nada. */
export function advanceTo(input: GameState, nowMs: number): GameState {
  const target = monthAt(nowMs, input.epochMs)
  if (target <= input.processedMonth) return input
  const state = clone(input)
  for (let m = state.processedMonth + 1; m <= target; m++) processMonth(state, m)
  progressWorld(state)
  return state
}

/** Si están hechas todas las misiones del nivel actual (a partir del 2), se abre el siguiente. */
export function progressWorld(state: GameState) {
  if (state.world >= 2 && state.world < 4) {
    const b = missionsFor(state)
    if (b.completed >= b.total) state.world += 1
  }
  // Al abrir el Nivel 4 queda fijado el mes de La Tormenta: única por partida.
  if (state.world >= 4 && state.crashMonth === null) state.crashMonth = state.processedMonth + CRASH_AFTER_MONTHS
}

export function currentMonth(state: GameState, nowMs: number): number {
  return monthAt(nowMs, state.epochMs)
}

// ---------- Acciones del jugador ----------

export type ActionResult = { ok: true; state: GameState } | { ok: false; reason: string }

function done(state: GameState): ActionResult {
  progressWorld(state)
  return { ok: true, state }
}

export function collectMailbox(input: GameState, nowMs: number): ActionResult {
  const state = clone(advanceTo(input, nowMs))
  if (state.mailboxCents <= 0) return { ok: false, reason: 'El buzón está vacío.' }
  const amount = state.mailboxCents
  state.huchaCents += amount
  state.mailboxCents = 0
  log(state, { kind: 'recogida', month: currentMonth(state, nowMs), amountCents: amount, label: 'Recogiste la paga del buzón' })
  return done(state)
}

export function deposit(input: GameState, nowMs: number, cents: number): ActionResult {
  const state = clone(advanceTo(input, nowMs))
  if (!state.bankUnlocked) return { ok: false, reason: 'El banco todavía no ha abierto.' }
  cents = Math.floor(cents)
  if (cents <= 0) return { ok: false, reason: 'Elige una cantidad.' }
  if (cents > state.huchaCents) return { ok: false, reason: 'No tienes tanto en la hucha.' }
  state.huchaCents -= cents
  state.bankCents += cents
  log(state, { kind: 'deposito', month: currentMonth(state, nowMs), amountCents: cents, label: 'Llevaste dinero al banco' })
  return done(state)
}

export function withdraw(input: GameState, nowMs: number, cents: number): ActionResult {
  const state = clone(advanceTo(input, nowMs))
  cents = Math.floor(cents)
  if (cents <= 0) return { ok: false, reason: 'Elige una cantidad.' }
  if (cents > state.bankCents) return { ok: false, reason: 'No tienes tanto en el banco.' }
  state.bankCents -= cents
  state.huchaCents += cents
  log(state, { kind: 'retirada', month: currentMonth(state, nowMs), amountCents: cents, label: 'Sacaste dinero del banco' })
  return done(state)
}

export function buy(input: GameState, nowMs: number, itemId: string): ActionResult {
  const state = clone(advanceTo(input, nowMs))
  const item = state.shop.find((s) => s.id === itemId)
  const def = SHOP_ITEMS.find((d) => d.id === itemId)
  if (!item || !def) return { ok: false, reason: 'Ese artículo no existe.' }
  if (def.kind === 'objeto' && state.purchases.some((p) => p.itemId === itemId)) {
    return { ok: false, reason: 'Ya lo tienes en la isla.' }
  }
  if (item.priceCents > state.huchaCents) {
    return { ok: false, reason: `Te faltan ${((item.priceCents - state.huchaCents) / 100).toLocaleString('es-ES')} euroLukys.` }
  }
  const month = currentMonth(state, nowMs)
  state.huchaCents -= item.priceCents
  state.yearSpentCents += item.priceCents
  state.purchases.push({ itemId, month })
  if (def.kind === 'comida') {
    state.foodMonths += def.foodMonths ?? 1
    state.hunger = 0
    log(state, { kind: 'comida', month, amountCents: -item.priceCents, label: `${def.name}: +${def.foodMonths} ${def.foodMonths === 1 ? 'mes' : 'meses'} de comida` })
  } else {
    log(state, { kind: 'compra', month, amountCents: -item.priceCents, label: `Compraste: ${def.name}` })
  }
  if (itemId === WORLD2_UNLOCK_ITEM && state.world < 2) openWorld2(state)
  return done(state)
}

/**
 * El Nivel 2 abre el Ayuntamiento y Hacienda: desde ahora los rendimientos tributan. Y si el banco aún
 * estaba en obras (abre al cerrar el primer año), abre también: en el Nivel 2 no puede haber bonos sin banco.
 */
function openWorld2(state: GameState) {
  state.world = 2
  state.taxesUnlocked = true
  if (!state.bankUnlocked) {
    state.bankUnlocked = true
    log(state, { kind: 'banco-abierto', month: state.processedMonth, amountCents: 0, label: 'Abre el Banco de la Isla (llegaste al Nivel 2)' })
  }
}

export function buildHuerto(input: GameState, nowMs: number): ActionResult {
  const state = clone(advanceTo(input, nowMs))
  if (state.huertoBuiltMonth !== null) return { ok: false, reason: 'El huerto ya está construido.' }
  if (state.huchaCents < HUERTO_COST_CENTS) return { ok: false, reason: `Te faltan ${formatCents(HUERTO_COST_CENTS - state.huchaCents)} euroLukys.` }
  const month = currentMonth(state, nowMs)
  state.huchaCents -= HUERTO_COST_CENTS
  state.yearSpentCents += HUERTO_COST_CENTS
  state.huertoBuiltMonth = month
  log(state, { kind: 'huerto', month, amountCents: -HUERTO_COST_CENTS, label: 'Construyes el huerto con animales' })
  return done(state)
}

export function upgradeHuerto(input: GameState, nowMs: number): ActionResult {
  const state = clone(advanceTo(input, nowMs))
  if (state.huertoBuiltMonth === null) return { ok: false, reason: 'Primero hay que construir el huerto.' }
  if (state.huertoUpgradedMonth !== null) return { ok: false, reason: 'El huerto ya está ampliado.' }
  if (state.huchaCents < HUERTO_UPGRADE_COST_CENTS) return { ok: false, reason: `Te faltan ${formatCents(HUERTO_UPGRADE_COST_CENTS - state.huchaCents)} euroLukys.` }
  const month = currentMonth(state, nowMs)
  state.huchaCents -= HUERTO_UPGRADE_COST_CENTS
  state.yearSpentCents += HUERTO_UPGRADE_COST_CENTS
  state.huertoUpgradedMonth = month
  log(state, { kind: 'huerto', month, amountCents: -HUERTO_UPGRADE_COST_CENTS, label: 'Amplías el huerto: la despensa se llenará sola' })
  return done(state)
}

export function buyBond(input: GameState, nowMs: number, offerId: string, cents: number): ActionResult {
  const state = clone(advanceTo(input, nowMs))
  if (state.world < 2) return { ok: false, reason: 'El Ayuntamiento abre en el Nivel 2.' }
  const offer = BOND_OFFERS.find((o) => o.id === offerId)
  if (!offer) return { ok: false, reason: 'Ese bono no existe.' }
  cents = Math.floor(cents)
  if (cents < offer.minCents) return { ok: false, reason: `Como mínimo ${formatCents(offer.minCents)} euroLukys.` }
  if (cents % 10_00 !== 0) return { ok: false, reason: 'Los bonos se compran de 10 en 10.' }
  if (cents > state.huchaCents) return { ok: false, reason: `Te faltan ${formatCents(cents - state.huchaCents)} euroLukys.` }
  const month = currentMonth(state, nowMs)
  state.huchaCents -= cents
  state.bondsBought += 1
  state.bonds.push({ id: `${offer.id}-${month}-${state.bondsBought}`, offerId: offer.id, principalCents: cents, couponBps: offer.couponBps, boughtMonth: month, maturityMonth: month + offer.months, couponsPaid: 0 })
  log(state, { kind: 'bono', month, amountCents: -cents, label: `Prestas al Ayuntamiento: ${offer.name}` })
  return done(state)
}

export function chooseTaxMode(input: GameState, nowMs: number, mode: TaxMode): ActionResult {
  const state = clone(advanceTo(input, nowMs))
  if (state.world < 2) return { ok: false, reason: 'Hacienda abre en el Nivel 2.' }
  state.taxMode = mode
  state.taxModeChosen = true
  return done(state)
}

export function buyShares(input: GameState, nowMs: number, businessId: string, shares: number): ActionResult {
  const state = clone(advanceTo(input, nowMs))
  const def = BUSINESS_BY_ID[businessId]
  if (!def || def.world > state.world) return { ok: false, reason: 'Ese negocio todavía no cotiza.' }
  shares = Math.floor(shares)
  if (shares <= 0) return { ok: false, reason: 'Elige cuántas acciones.' }
  const month = currentMonth(state, nowMs)
  const price = priceAt(marketCtx(state), businessId, month)
  const holding = state.holdings[businessId] ?? { shares: 0, avgCostCents: 0 }
  if (holding.shares + shares > SHARES_PER_BUSINESS) return { ok: false, reason: `${def.name} solo tiene ${SHARES_PER_BUSINESS} acciones.` }
  const cost = price * shares + COMMISSION_CENTS
  if (cost > state.huchaCents) return { ok: false, reason: `Te faltan ${formatCents(cost - state.huchaCents)} euroLukys (con la comisión de ${formatCents(COMMISSION_CENTS, { alwaysDecimals: true })}).` }
  state.huchaCents -= cost
  // Precio medio de compra: lo pagado (sin comisión) entre todas las acciones.
  const totalCost = holding.avgCostCents * holding.shares + price * shares
  holding.shares += shares
  holding.avgCostCents = roundCents(totalCost / holding.shares)
  state.holdings[businessId] = holding
  if (!state.businessesBought.includes(businessId)) state.businessesBought.push(businessId)
  log(state, { kind: 'acciones-compra', month, amountCents: -cost, label: `Compras ${shares} ${shares === 1 ? 'acción' : 'acciones'} de ${def.name} a ${formatCents(price)}` })
  return done(state)
}

export function sellShares(input: GameState, nowMs: number, businessId: string, shares: number): ActionResult {
  const state = clone(advanceTo(input, nowMs))
  const def = BUSINESS_BY_ID[businessId]
  const holding = state.holdings[businessId]
  if (!def || !holding || holding.shares <= 0) return { ok: false, reason: 'No tienes acciones de ese negocio.' }
  shares = Math.floor(shares)
  if (shares <= 0 || shares > holding.shares) return { ok: false, reason: `Tienes ${holding.shares} acciones.` }
  const month = currentMonth(state, nowMs)
  const price = priceAt(marketCtx(state), businessId, month)
  const gross = price * shares
  const gain = (price - holding.avgCostCents) * shares
  let retained = 0
  if (gain > 0) retained = earnTaxable(state, gain).retained
  else if (gain < 0) state.yearLossCents += -gain
  const net = gross - COMMISSION_CENTS - retained
  state.huchaCents += net
  holding.shares -= shares
  if (holding.shares === 0) delete state.holdings[businessId]
  const gainText = gain > 0 ? `ganas ${formatCents(gain)}` : gain < 0 ? `pierdes ${formatCents(-gain)}` : 'ni ganas ni pierdes'
  log(state, { kind: 'acciones-venta', month, amountCents: net, label: `Vendes ${shares} ${shares === 1 ? 'acción' : 'acciones'} de ${def.name} a ${formatCents(price)}: ${gainText}${retained > 0 ? ` (Hacienda retuvo ${formatCents(retained, { alwaysDecimals: true })})` : ''}` })
  return done(state)
}

export function buyFund(input: GameState, nowMs: number, cents: number): ActionResult {
  const state = clone(advanceTo(input, nowMs))
  if (state.world < 4) return { ok: false, reason: 'El Fondo Isla abre en el Nivel 4.' }
  cents = Math.floor(cents)
  if (cents < 1_00) return { ok: false, reason: 'Como mínimo 1 euroLuky.' }
  if (cents > state.huchaCents) return { ok: false, reason: `Te faltan ${formatCents(cents - state.huchaCents)} euroLukys.` }
  const month = currentMonth(state, nowMs)
  const nav = fundNavAt(marketCtx(state), month)
  state.huchaCents -= cents
  state.fundUnits += cents / nav
  state.fundCostCents += cents
  log(state, { kind: 'fondo-compra', month, amountCents: -cents, label: `Metes ${formatCents(cents)} en el Fondo Isla (participación a ${formatCents(Math.round(nav), { alwaysDecimals: true })})` })
  return done(state)
}

export function sellFund(input: GameState, nowMs: number, cents: number | 'all'): ActionResult {
  const state = clone(advanceTo(input, nowMs))
  const month = currentMonth(state, nowMs)
  const nav = fundNavAt(marketCtx(state), month)
  const total = roundCents(state.fundUnits * nav)
  if (total <= 0) return { ok: false, reason: 'No tienes nada en el Fondo Isla.' }
  const amount = cents === 'all' ? total : Math.min(Math.floor(cents), total)
  if (amount <= 0) return { ok: false, reason: 'Elige una cantidad.' }
  const fraction = cents === 'all' ? 1 : amount / total
  const costPart = roundCents(state.fundCostCents * fraction)
  const gain = amount - costPart
  let retained = 0
  if (gain > 0) retained = earnTaxable(state, gain).retained
  else if (gain < 0) state.yearLossCents += -gain
  state.huchaCents += amount - retained
  if (cents === 'all') {
    state.fundUnits = 0
    state.fundCostCents = 0
  } else {
    state.fundUnits -= amount / nav
    state.fundCostCents -= costPart
    if (state.fundUnits < 1e-9) {
      state.fundUnits = 0
      state.fundCostCents = 0
    }
  }
  const gainText = gain > 0 ? `ganas ${formatCents(gain)}` : gain < 0 ? `pierdes ${formatCents(-gain)}` : 'ni ganas ni pierdes'
  log(state, { kind: 'fondo-venta', month, amountCents: amount - retained, label: `Sacas ${formatCents(amount)} del Fondo Isla: ${gainText}${retained > 0 ? ` (Hacienda retuvo ${formatCents(retained, { alwaysDecimals: true })})` : ''}` })
  return done(state)
}

export function readLesson(input: GameState, nowMs: number, lessonId: string): ActionResult {
  const state = clone(advanceTo(input, nowMs))
  if (!LESSONS.some((l) => l.id === lessonId)) return { ok: false, reason: 'Esa lección no existe.' }
  if (!state.lessonsRead.includes(lessonId)) state.lessonsRead.push(lessonId)
  return done(state)
}

export function canDoTask(state: GameState, nowMs: number): boolean {
  return state.taskDoneMonth < currentMonth(state, nowMs)
}

export function completeTask(input: GameState, nowMs: number): ActionResult {
  const state = clone(advanceTo(input, nowMs))
  const month = currentMonth(state, nowMs)
  if (state.taskDoneMonth >= month) return { ok: false, reason: 'Hoy ya has recogido las bellotas. Mañana habrá más.' }
  const reward = taskRewardForMonth(state.seed, month)
  state.taskDoneMonth = month
  state.huchaCents += reward
  state.yearTasksCents += reward
  state.totalTasksCents += reward
  state.tasksCompleted += 1
  log(state, { kind: 'tarea', month, amountCents: reward, label: 'Recogiste bellotas' })
  return done(state)
}

/** Patrimonio total en céntimos: cofre, buzón, banco, bonos y acciones a precio de hoy. */
export function netWorth(state: GameState, month = state.processedMonth): number {
  return state.huchaCents + state.mailboxCents + state.bankCents + bondsTotal(state) + stocksValue(state, month) + fundValue(state, month)
}
