import {
  BANK_RATE_BPS,
  BANK_UNLOCK_MONTH,
  INFLATION_MAX_BPS,
  INFLATION_MIN_BPS,
  MONTHS_PER_YEAR,
  PAGA_CENTS,
  RETENTION_BPS,
  SHOP_ITEMS,
  TASK_MAX_CENTS,
  TASK_MIN_CENTS,
  WORLD2_UNLOCK_ITEM,
} from './config'
import { calendarOf, describeMonth, monthAt } from './calendar'
import { applyBps, roundCents } from './money'
import { randInt, rngFor } from './rng'
import type { DiaryEntry, GameState, LedgerEvent } from './types'

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
  }
}

function clone(state: GameState): GameState {
  return structuredClone(state)
}

function log(state: GameState, ev: LedgerEvent) {
  state.ledger.push(ev)
  if (state.ledger.length > LEDGER_MAX) state.ledger.splice(0, state.ledger.length - LEDGER_MAX)
}

/** Inflación sorteada para un año de isla (determinista por semilla). */
export function inflationForYear(seed: number, yearIndex: number): number {
  const rng = rngFor(seed, yearIndex, 11)
  return randInt(rng, INFLATION_MIN_BPS, INFLATION_MAX_BPS)
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

/** Interés mensual del banco sobre un saldo, ya con la retención si Hacienda está activa. */
export function monthlyInterest(bankCents: number, taxesUnlocked: boolean): { gross: number; retained: number; net: number } {
  const gross = roundCents((bankCents * BANK_RATE_BPS) / 10_000 / MONTHS_PER_YEAR)
  const retained = taxesUnlocked ? applyBps(gross, RETENTION_BPS) : 0
  return { gross, retained, net: gross - retained }
}

/** Cuánto habría en el banco tras 12 meses si un saldo hubiera estado allí todo el año. */
export function bankAfterOneYear(cents: number, taxesUnlocked: boolean): number {
  let b = cents
  for (let i = 0; i < MONTHS_PER_YEAR; i++) b += monthlyInterest(b, taxesUnlocked).net
  return b
}

function processMonth(state: GameState, month: number) {
  // 1. Llega la paga al buzón.
  state.mailboxCents += PAGA_CENTS
  log(state, { kind: 'paga', month, amountCents: PAGA_CENTS, label: `Paga de ${describeMonth(month)}` })

  // 2. El banco abona su interés.
  if (state.bankUnlocked && state.bankCents > 0) {
    const { net, retained } = monthlyInterest(state.bankCents, state.taxesUnlocked)
    if (net > 0) {
      state.bankCents += net
      state.yearBankInterestCents += net
      log(state, {
        kind: 'interes',
        month,
        amountCents: net,
        label: retained > 0 ? `Interés del banco (Hacienda retuvo ${retained} cts)` : 'Interés del banco',
      })
    }
  }

  // 3. Cierre de año: inflación, diario y desbloqueos.
  const cal = calendarOf(month)
  if (cal.isYearEnd) {
    const yearIndex = cal.year - 1
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
    log(state, { kind: 'inflacion', month, amountCents: inflationBps, label: `Inflación del año ${cal.year}` })

    const entry: DiaryEntry = {
      year: cal.year,
      inflationBps,
      example,
      huchaCents: state.huchaCents + state.mailboxCents,
      bankIfAllCents: bankAfterOneYear(state.huchaCents + state.mailboxCents, state.taxesUnlocked),
      bankCents: state.bankCents,
      bankInterestYearCents: state.yearBankInterestCents,
      spentYearCents: state.yearSpentCents,
      earnedTasksYearCents: state.yearTasksCents,
      firstTime: state.diary.length === 0,
    }
    state.diary.push(entry)
    state.yearSpentCents = 0
    state.yearTasksCents = 0
    state.yearBankInterestCents = 0
  }

  if (!state.bankUnlocked && month + 1 >= BANK_UNLOCK_MONTH) {
    state.bankUnlocked = true
    log(state, { kind: 'banco-abierto', month, amountCents: 0, label: 'Abre el Banco de la Isla' })
  }

  state.processedMonth = month
}

/** Avanza la simulación hasta el instante dado. Idempotente: llamarla varias veces con la misma hora no cambia nada. */
export function advanceTo(input: GameState, nowMs: number): GameState {
  const target = monthAt(nowMs, input.epochMs)
  if (target <= input.processedMonth) return input
  const state = clone(input)
  for (let m = state.processedMonth + 1; m <= target; m++) processMonth(state, m)
  return state
}

export function currentMonth(state: GameState, nowMs: number): number {
  return monthAt(nowMs, state.epochMs)
}

// ---------- Acciones del jugador ----------

export type ActionResult = { ok: true; state: GameState } | { ok: false; reason: string }

export function collectMailbox(input: GameState, nowMs: number): ActionResult {
  const state = clone(advanceTo(input, nowMs))
  if (state.mailboxCents <= 0) return { ok: false, reason: 'El buzón está vacío.' }
  const amount = state.mailboxCents
  state.huchaCents += amount
  state.mailboxCents = 0
  log(state, { kind: 'recogida', month: currentMonth(state, nowMs), amountCents: amount, label: 'Recogiste la paga del buzón' })
  return { ok: true, state }
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
  return { ok: true, state }
}

export function withdraw(input: GameState, nowMs: number, cents: number): ActionResult {
  const state = clone(advanceTo(input, nowMs))
  cents = Math.floor(cents)
  if (cents <= 0) return { ok: false, reason: 'Elige una cantidad.' }
  if (cents > state.bankCents) return { ok: false, reason: 'No tienes tanto en el banco.' }
  state.bankCents -= cents
  state.huchaCents += cents
  log(state, { kind: 'retirada', month: currentMonth(state, nowMs), amountCents: cents, label: 'Sacaste dinero del banco' })
  return { ok: true, state }
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
  log(state, { kind: 'compra', month, amountCents: -item.priceCents, label: `Compraste: ${def.name}` })
  if (itemId === WORLD2_UNLOCK_ITEM && state.world < 2) state.world = 2
  return { ok: true, state }
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
  log(state, { kind: 'tarea', month, amountCents: reward, label: 'Recogiste bellotas' })
  return { ok: true, state }
}

/** Patrimonio total en céntimos (lo que se puede tocar). */
export function netWorth(state: GameState): number {
  return state.huchaCents + state.mailboxCents + state.bankCents
}
