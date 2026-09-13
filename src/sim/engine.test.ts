import { describe, expect, it } from 'vitest'
import { MONTH_MS, PAGA_CENTS, SHOP_ITEMS } from './config'
import { calendarOf, monthAt, msUntilNextMonth } from './calendar'
import {
  advanceTo,
  bankAfterOneYear,
  buy,
  collectMailbox,
  completeTask,
  createGame,
  deposit,
  inflationForYear,
  inflatePrice,
  monthlyInterest,
  withdraw,
} from './engine'
import { formatCents } from './money'
import type { ActionResult, GameState } from './index'
import { diaryParagraphs } from './diary'

const EPOCH = Date.UTC(2026, 8, 13, 10, 0, 0)
const at = (months: number, extraMs = 0) => EPOCH + months * MONTH_MS + extraMs

function must(r: ActionResult): GameState {
  if (!r.ok) throw new Error(r.reason)
  return r.state
}

function fresh() {
  return createGame({ islandName: 'Isla Bellota', seed: 12345, epochMs: EPOCH })
}

describe('calendario', () => {
  it('un día real es un mes de isla', () => {
    expect(monthAt(EPOCH, EPOCH)).toBe(0)
    expect(monthAt(at(0, MONTH_MS - 1), EPOCH)).toBe(0)
    expect(monthAt(at(1), EPOCH)).toBe(1)
    expect(monthAt(at(25, 1000), EPOCH)).toBe(25)
  })
  it('nunca devuelve meses negativos', () => {
    expect(monthAt(EPOCH - 5000, EPOCH)).toBe(0)
  })
  it('estaciones y años', () => {
    expect(calendarOf(0)).toMatchObject({ year: 1, monthOfYear: 1, season: 'primavera', isYearEnd: false })
    expect(calendarOf(5)).toMatchObject({ year: 1, season: 'verano' })
    expect(calendarOf(11)).toMatchObject({ year: 1, monthOfYear: 12, season: 'invierno', isYearEnd: true })
    expect(calendarOf(12)).toMatchObject({ year: 2, monthOfYear: 1, season: 'primavera' })
  })
  it('cuenta atrás hasta el siguiente mes', () => {
    expect(msUntilNextMonth(EPOCH, EPOCH)).toBe(MONTH_MS)
    expect(msUntilNextMonth(at(3, 1000), EPOCH)).toBe(MONTH_MS - 1000)
  })
})

describe('avance determinista', () => {
  it('el primer mes deja la paga en el buzón', () => {
    const s = advanceTo(fresh(), EPOCH)
    expect(s.processedMonth).toBe(0)
    expect(s.mailboxCents).toBe(PAGA_CENTS)
    expect(s.huchaCents).toBe(0)
  })
  it('es idempotente', () => {
    const a = advanceTo(fresh(), at(4))
    const b = advanceTo(a, at(4))
    expect(b).toBe(a)
  })
  it('estar días sin entrar produce lo mismo que entrar cada día sin tocar nada', () => {
    let daily = fresh()
    for (let m = 0; m <= 30; m++) daily = advanceTo(daily, at(m, 500))
    const once = advanceTo(fresh(), at(30, 500))
    expect(once.mailboxCents).toBe(daily.mailboxCents)
    expect(once.shop).toEqual(daily.shop)
    expect(once.diary).toEqual(daily.diary)
    expect(once.inflationHistoryBps).toEqual(daily.inflationHistoryBps)
  })
  it('la paga se acumula sin tope', () => {
    const s = advanceTo(fresh(), at(9))
    expect(s.mailboxCents).toBe(10 * PAGA_CENTS)
  })
})

describe('inflación', () => {
  it('se sortea entre 1,5 % y 4 % de forma reproducible', () => {
    for (let y = 0; y < 50; y++) {
      const bps = inflationForYear(777, y)
      expect(bps).toBeGreaterThanOrEqual(150)
      expect(bps).toBeLessThanOrEqual(400)
      expect(inflationForYear(777, y)).toBe(bps)
    }
  })
  it('al cerrar el año suben los precios y se escribe el diario', () => {
    const s = advanceTo(fresh(), at(11))
    expect(s.diary).toHaveLength(1)
    const bici = s.shop.find((i) => i.id === 'bici')!
    const base = SHOP_ITEMS.find((i) => i.id === 'bici')!.basePriceCents
    expect(bici.previousPriceCents).toBe(base)
    expect(bici.priceCents).toBeGreaterThan(base)
    expect(bici.priceCents).toBeLessThanOrEqual(Math.round(base * 1.04) + 50)
    expect(bici.priceCents % 100).toBe(0) // precio de tienda: entero
    expect(s.diary[0].example.afterCents).toBe(bici.priceCents)
    expect(s.diary[0].firstTime).toBe(true)
    const text = diaryParagraphs(s.diary[0]).join(' ')
    expect(text).toContain('inflación')
    expect(text).toContain(formatCents(base))
  })
  it('con 1,7 % la bici pasa de 180 a 183 y el helado se queda en 2', () => {
    expect(inflatePrice(180_00, 170)).toBe(183_00)
    expect(inflatePrice(2_00, 170)).toBe(2_00)
    expect(inflatePrice(2_00, 400)).toBe(2_10)
    expect(inflatePrice(25_00, 250)).toBe(26_00)
  })
})

describe('banco', () => {
  it('abre al cerrar el primer año', () => {
    expect(advanceTo(fresh(), at(10)).bankUnlocked).toBe(false)
    expect(advanceTo(fresh(), at(11)).bankUnlocked).toBe(true)
  })
  it('no admite depósitos antes de abrir', () => {
    const r = deposit(advanceTo(fresh(), at(2)), at(2), 100)
    expect(r.ok).toBe(false)
  })
  it('paga un 2,5 % anual por meses y no crea dinero de la nada', () => {
    const { gross, net } = monthlyInterest(120_00, false)
    expect(gross).toBe(25) // 120 € * 2,5 % / 12 = 0,25
    expect(net).toBe(25)
    const oneYear = bankAfterOneYear(100_00, false)
    expect(oneYear).toBeGreaterThan(102_40)
    expect(oneYear).toBeLessThan(102_60)
  })
  it('con Hacienda activa retiene el 19 %', () => {
    const { gross, retained, net } = monthlyInterest(4800_00, true)
    expect(gross).toBe(10_00)
    expect(retained).toBe(1_90)
    expect(net).toBe(8_10)
  })
  it('depositar, cobrar intereses y retirar', () => {
    let s = advanceTo(fresh(), at(11))
    s = must(collectMailbox(s, at(11)))
    const hucha = s.huchaCents
    const dep = deposit(s, at(11), 200_00)
    expect(dep.ok).toBe(true)
    s = must(dep)
    expect(s.huchaCents).toBe(hucha - 200_00)
    s = advanceTo(s, at(12))
    expect(s.bankCents).toBeGreaterThan(200_00)
    const w = withdraw(s, at(12), s.bankCents)
    expect(w.ok).toBe(true)
  })
})

describe('tienda y tareas', () => {
  it('no deja comprar sin dinero y sí con él', () => {
    let s = advanceTo(fresh(), at(0))
    expect(buy(s, at(0), 'cometa').ok).toBe(false)
    s = must(collectMailbox(s, at(0)))
    const r = buy(s, at(0), 'cometa')
    expect(r.ok).toBe(true)
    s = must(r)
    expect(s.huchaCents).toBe(PAGA_CENTS - 25_00)
    expect(buy(s, at(0), 'cometa').ok).toBe(false) // ya la tiene
  })
  it('comprar la bici abre el Mundo 2', () => {
    let s = advanceTo(fresh(), at(6))
    s = must(collectMailbox(s, at(6)))
    const r = buy(s, at(6), 'bici')
    expect(r.ok).toBe(true)
    expect(must(r).world).toBe(2)
  })
  it('la tarea diaria se hace una vez por mes de isla y paga 1–3 euroLukys', () => {
    const s0 = advanceTo(fresh(), at(0))
    const r1 = completeTask(s0, at(0))
    expect(r1.ok).toBe(true)
    const s1 = must(r1)
    expect(s1.huchaCents).toBeGreaterThanOrEqual(1_00)
    expect(s1.huchaCents).toBeLessThanOrEqual(3_00)
    expect(completeTask(s1, at(0, 1000)).ok).toBe(false)
    expect(completeTask(s1, at(1)).ok).toBe(true)
  })
})

describe('formato', () => {
  it('céntimos a texto español', () => {
    expect(formatCents(30_00)).toBe('30')
    expect(formatCents(30_41)).toBe('30,41')
    expect(formatCents(1830_06)).toBe('1830,06')
  })
})
