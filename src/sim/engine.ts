import {
  BANK_RATE_BPS,
  BOND_COUPON_EVERY,
  BOND_OFFERS,
  FOOD_START_MONTHS,
  HUERTO_COST_CENTS,
  HUERTO_EVERY_MONTHS,
  HUERTO_FOOD_MONTHS,
  HUERTO_UPGRADE_COST_CENTS,
  HUERTO_UPGRADED_FOOD_MONTHS,
  HUNGER_DEATH_MONTHS,
  AUTO_FOOD_ITEM,
  LESSONS,
  LIEBRE_LOAN_CENTS,
  LIEBRE_LOAN_LATE_CHANCE,
  LIEBRE_LOAN_LATE_MONTHS,
  LIEBRE_LOAN_REPAY_CENTS,
  LIEBRE_VISIT_WORLD,
  MONTHS_PER_YEAR,
  PAGA_CENTS,
  RETENTION_BPS,
  SHOP_ITEMS,
  TASK_MAX_CENTS,
  TASK_MIN_CENTS,
  TUTORIAL_DONE,
  WORLD2_UNLOCK_ITEM,
} from './config'
import { calendarOf, describeMonth, monthAt } from './calendar'
import { applyBps, formatCents, roundCents } from './money'
import { randInt, rngFor } from './rng'
import { inflatePrice, inflationForYear } from './inflation'
import { liebreAt, type LiebreCtx } from './liebre'
export { inflatePrice, inflationForYear } from './inflation'
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
    bankUnlocked: true,
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
    autoFood: true,
    rescues: 0,
    lastRescueMonth: -1,
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
    worldOpened: [0],
    liebreVisits: 0,
    liebreLastVisitMonth: -1,
    liebreLoan: null,
    liebreLoansRepaid: 0,
    liebreLoansLate: 0,
    netWorthHistory: [],
    tutorialStep: 0,
  }
}

/** Contexto de la Liebre: el del mercado más los meses en que se abrió cada nivel. */
export function liebreCtx(state: GameState): LiebreCtx {
  return { ...marketCtx(state), worldOpened: state.worldOpened ?? [0] }
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
    state.autoFood === undefined ||
    state.dead === true ||
    state.worldOpened === undefined ||
    state.netWorthHistory === undefined ||
    state.tutorialStep === undefined ||
    state.netWorthHistory.some((v) => v < 0) ||
    !state.bankUnlocked ||
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
  c.autoFood ??= true
  c.rescues ??= 0
  c.lastRescueMonth ??= -1
  // Ya no hay muerte: una partida que había terminado vuelve a la vida con el rescate.
  if (c.dead) {
    c.dead = false
    c.hunger = 0
    c.foodMonths = Math.max(c.foodMonths, 1)
  }
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
  // Partidas anteriores a la Liebre: no sabemos cuándo abrieron cada nivel; damos por abiertos desde el principio.
  if (!c.worldOpened) {
    c.worldOpened = [0]
    for (let w = 2; w <= c.world; w++) c.worldOpened.push(0)
  }
  c.liebreVisits ??= 0
  c.liebreLastVisitMonth ??= -1
  c.liebreLoan ??= null
  c.liebreLoansRepaid ??= 0
  c.liebreLoansLate ??= 0
  // Partidas anteriores al recorrido inicial: se da por hecho (ya saben jugar).
  c.tutorialStep ??= TUTORIAL_DONE
  // Partidas anteriores: reconstruimos la historia de patrimonio con lo que sabemos (cierres de año del diario y
  // el valor de hoy), uniendo los puntos en línea recta. Desde ahora se guarda mes a mes.
  if (!c.netWorthHistory || c.netWorthHistory.some((v) => v < 0)) {
    const known = c.netWorthHistory ?? []
    const anchors: [number, number][] = [[0, known[0] >= 0 ? known[0] : 0]]
    known.forEach((v, m) => {
      if (m > 0 && v >= 0) anchors.push([m, v])
    })
    for (const d of c.diary ?? []) anchors.push([d.year * MONTHS_PER_YEAR - 1, d.huchaCents + d.bankCents + (d.stocksValueCents ?? 0)])
    for (const p of c.pendingYearEnds ?? []) anchors.push([p.month, p.huchaCents + p.bankCents + (p.stocksValueCents ?? 0)])
    const last = Math.max(0, c.processedMonth)
    anchors.push([last, netWorth(c, last)])
    anchors.sort((a, b) => a[0] - b[0])
    c.netWorthHistory = []
    for (let m = 0; m <= last; m++) {
      let i = 0
      while (i < anchors.length - 1 && anchors[i + 1][0] < m) i++
      const [m0, v0] = anchors[i]
      const [m1, v1] = anchors[Math.min(i + 1, anchors.length - 1)]
      const t = m1 > m0 ? (m - m0) / (m1 - m0) : 1
      c.netWorthHistory.push(Math.round(v0 + (v1 - v0) * Math.min(1, Math.max(0, t))))
    }
  }
  // Regla añadida después: el banco está abierto desde el primer día.
  if (!c.bankUnlocked) c.bankUnlocked = true
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

/** Recompensa de la tarea diaria de un mes (determinista). */
export function taskRewardForMonth(seed: number, month: number): number {
  const rng = rngFor(seed, month, 23)
  return randInt(rng, TASK_MIN_CENTS / 100, TASK_MAX_CENTS / 100) * 100
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
    // 3a. Cesta domiciliada: si la despensa está vacía, la isla compra sola la cesta pequeña. Primero del
    // cofre; si no llega, del banco (como un recibo domiciliado). Sin dinero en ninguno, empieza el hambre.
    if (state.foodMonths <= 0 && state.autoFood) {
      const item = state.shop.find((i) => i.id === AUTO_FOOD_ITEM)
      const def = SHOP_ITEMS.find((i) => i.id === AUTO_FOOD_ITEM)
      if (item && def) {
        const price = item.priceCents
        const from = state.huchaCents >= price ? 'cofre' : state.bankUnlocked && state.bankCents >= price ? 'banco' : null
        if (from) {
          if (from === 'cofre') state.huchaCents -= price
          else state.bankCents -= price
          state.yearSpentCents += price
          state.foodMonths += def.foodMonths ?? 1
          log(state, { kind: 'comida', month, amountCents: -price, label: `Cesta domiciliada: ${def.name} cobrada del ${from} (+${def.foodMonths ?? 1} mes de comida)` })
        }
      }
    }
    if (state.foodMonths > 0) {
      state.foodMonths -= 1
      state.hunger = 0
    } else {
      state.hunger += 1
      if (state.hunger >= HUNGER_DEATH_MONTHS) {
        // 3b. Rescate: Doña Tortuga te encuentra desmayado y te lleva sopa. Se pierde lo que había en el
        // cofre (el banco, los bonos y las acciones se quedan) y la despensa vuelve a tener un mes.
        const lost = state.huchaCents
        state.huchaCents = 0
        state.hunger = 0
        state.foodMonths = 1
        state.rescues += 1
        state.lastRescueMonth = month
        log(state, { kind: 'rescate', month, amountCents: -lost, label: lost > 0 ? `Doña Tortuga te rescata: seis meses sin comer. El cofre (${formatCents(lost)}) se fue en médicos y sopa` : 'Doña Tortuga te rescata: seis meses sin comer. El cofre estaba vacío' })
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

  // 4b. El préstamo de la Liebre: devuelve 6 por 5… casi siempre a tiempo.
  if (state.liebreLoan && month >= state.liebreLoan.dueMonth) {
    const loan = state.liebreLoan
    const lateRoll = rngFor(state.seed, loan.lentMonth, 808)()
    if (!loan.late && lateRoll < LIEBRE_LOAN_LATE_CHANCE) {
      loan.late = true
      loan.dueMonth = month + LIEBRE_LOAN_LATE_MONTHS
      state.liebreLoansLate += 1
      log(state, { kind: 'noticia', month, amountCents: 0, label: `La Liebre no puede devolverte los ${formatCents(loan.repayCents)} todavía: "¡Te los doy en dos meses, prometido!"` })
    } else {
      const interest = loan.repayCents - loan.amountCents
      const { net, retained } = earnTaxable(state, interest)
      state.huchaCents += loan.amountCents + net
      state.liebreLoansRepaid += 1
      state.liebreLoan = null
      log(state, {
        kind: 'devolucion',
        month,
        amountCents: loan.amountCents + net,
        label: `La Liebre te devuelve el préstamo${loan.late ? ' (con retraso)' : ''}${retained > 0 ? ` · Hacienda retuvo ${formatCents(retained, { alwaysDecimals: true })}` : ''}`,
      })
    }
  }

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

  state.processedMonth = month
  // Patrimonio al cierre del mes, para la pizarra "Tú y la Liebre" (una entrada por mes desde el 0).
  state.netWorthHistory ??= []
  while (state.netWorthHistory.length < month) state.netWorthHistory.push(state.netWorthHistory[state.netWorthHistory.length - 1] ?? 0)
  state.netWorthHistory[month] = netWorth(state, month)
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

/** Apunta el mes en que se abre el nivel actual (la Liebre cambia de reglas con el nivel del jugador). */
function noteWorldOpened(state: GameState) {
  state.worldOpened ??= [0]
  while (state.worldOpened.length < state.world) state.worldOpened.push(Math.max(0, state.processedMonth))
}

/** Si están hechas todas las misiones del nivel actual (a partir del 2), se abre el siguiente. */
export function progressWorld(state: GameState) {
  if (state.world >= 2 && state.world < 4) {
    const b = missionsFor(state)
    if (b.completed >= b.total) {
      state.world += 1
      noteWorldOpened(state)
    }
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

/** El Nivel 2 abre el Ayuntamiento y Hacienda: desde ahora los rendimientos tributan. */
function openWorld2(state: GameState) {
  state.world = 2
  noteWorldOpened(state)
  state.taxesUnlocked = true
}

/** Activa o desactiva la cesta domiciliada (la isla compra sola la cesta pequeña cuando la despensa se vacía). */
export function setAutoFood(input: GameState, nowMs: number, on: boolean): ActionResult {
  const state = clone(advanceTo(input, nowMs))
  state.autoFood = on
  const month = currentMonth(state, nowMs)
  log(state, { kind: 'comida', month, amountCents: 0, label: on ? 'Cesta domiciliada: la despensa se rellenará sola cuando se vacíe' : 'Cesta domiciliada desactivada: compra tú la comida cada mes' })
  return done(state)
}

/** Avanza (o termina) el recorrido inicial. Al terminarlo, la lección "Espera y verás" queda leída. */
export function setTutorialStep(input: GameState, step: number): ActionResult {
  const state = clone(input)
  state.tutorialStep = Math.max(0, Math.min(TUTORIAL_DONE, step))
  if (state.tutorialStep >= TUTORIAL_DONE && !state.lessonsRead.includes('paciencia')) state.lessonsRead.push('paciencia')
  return done(state)
}

/** Visitar la isla de la Liebre (desde el Nivel 2). Solo cuenta la visita: no cuesta nada. */
export function visitLiebre(input: GameState, nowMs: number): ActionResult {
  const state = clone(advanceTo(input, nowMs))
  if (state.world < LIEBRE_VISIT_WORLD) return { ok: false, reason: 'La barca de la Liebre llega en el Nivel 2.' }
  const month = currentMonth(state, nowMs)
  state.liebreVisits += 1
  state.liebreLastVisitMonth = month
  return done(state)
}

/** ¿Puede pedirte un préstamo la Liebre este mes? Solo si pasa hambre y no te debe nada. */
export function liebreCanBorrow(state: GameState, month: number): boolean {
  if (state.world < LIEBRE_VISIT_WORLD || state.liebreLoan) return false
  const l = liebreAt(liebreCtx(state), month)
  return l.hungryNow || l.foodMonths === 0
}

/** Prestar 5 eL a la Liebre: promete devolver 6 el mes que viene. */
export function lendToLiebre(input: GameState, nowMs: number): ActionResult {
  const state = clone(advanceTo(input, nowMs))
  const month = currentMonth(state, nowMs)
  if (state.liebreLoan) return { ok: false, reason: 'La Liebre ya te debe un préstamo.' }
  if (!liebreCanBorrow(state, month)) return { ok: false, reason: 'Hoy la Liebre no necesita nada.' }
  if (state.huchaCents < LIEBRE_LOAN_CENTS) return { ok: false, reason: `Te faltan ${formatCents(LIEBRE_LOAN_CENTS - state.huchaCents)} euroLukys en el cofre.` }
  state.huchaCents -= LIEBRE_LOAN_CENTS
  state.liebreLoan = { lentMonth: month, dueMonth: month + 1, amountCents: LIEBRE_LOAN_CENTS, repayCents: LIEBRE_LOAN_REPAY_CENTS, late: false }
  log(state, { kind: 'prestamo', month, amountCents: -LIEBRE_LOAN_CENTS, label: `Prestas ${formatCents(LIEBRE_LOAN_CENTS)} a la Liebre: te devolverá ${formatCents(LIEBRE_LOAN_REPAY_CENTS)}` })
  return done(state)
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
