import { describe, expect, it } from 'vitest'
import { BUSINESSES, BUSINESS_BY_ID, COMMISSION_CENTS, CRASH_AFTER_MONTHS, discoveriesUntil, fundNavSeries, marketAt, MAX_MONTHLY_MOVE_BPS, priceAt, priceSeries, quarterFor, type MarketCtx } from './market'
import { advanceTo, buy, buyFund, buyShares, collectMailbox, createGame, fundValue, marketCtx, sellFund, sellShares, spinInflation, type ActionResult, type GameState } from './index'
import { MONTH_MS } from './config'

const EPOCH = Date.UTC(2026, 0, 1)
const at = (m: number) => EPOCH + m * MONTH_MS
function must(r: ActionResult): GameState {
  if (!r.ok) throw new Error(r.reason)
  return r.state
}
const ctx = (seed: number, crashMonth: number | null = null): MarketCtx => ({ seed, crashMonth })

describe('mercado: precios', () => {
  it('es determinista y arranca en el precio base', () => {
    for (const def of BUSINESSES) {
      expect(priceAt(ctx(7), def.id, 0)).toBe(def.basePriceCents)
      expect(priceAt(ctx(7), def.id, 30)).toBe(priceAt(ctx(7), def.id, 30))
    }
  })
  it('un mes normal nunca se mueve más del tope; la tormenta puede pasarse', () => {
    for (const seed of [1, 2, 3, 44, 555]) {
      for (const def of BUSINESSES) {
        const s = priceSeries(ctx(seed), def, 60)
        for (let m = 1; m <= 60; m++) {
          const move = Math.abs(s[m] / s[m - 1] - 1)
          const q = Math.floor(m / 3)
          const storm = m % 3 === 2 && quarterFor(ctx(seed), def, q).storm
          const jump = def.discovery && m % 12 === 2 && discoveriesUntil(ctx(seed), def, Math.floor(m / 12)) > discoveriesUntil(ctx(seed), def, Math.floor(m / 12) - 1)
          if (!storm && !jump) expect(move).toBeLessThanOrEqual(MAX_MONTHLY_MOVE_BPS / 10_000 + 0.001)
          else expect(move).toBeLessThanOrEqual(2.5)
          expect(s[m]).toBeGreaterThanOrEqual(1_00)
        }
      }
    }
  })
  it('la panadería reparte cada trimestre, la heladería solo tras el verano y el astillero nunca', () => {
    const pan = BUSINESS_BY_ID.panaderia
    const hel = BUSINESS_BY_ID.heladeria
    const ast = BUSINESS_BY_ID.astillero
    for (let q = 0; q < 8; q++) {
      expect(quarterFor(ctx(5), pan, q).dividendCents).toBeGreaterThan(0)
      expect(quarterFor(ctx(5), ast, q).dividendCents).toBe(0)
      expect(quarterFor(ctx(5), hel, q).dividendCents > 0).toBe(q % 4 === 2)
    }
  })
  it('el puerto tiene tormentas de vez en cuando y entonces no reparte', () => {
    const puerto = BUSINESS_BY_ID.puerto
    let storms = 0
    for (let q = 0; q < 120; q++) {
      const qu = quarterFor(ctx(9), puerto, q)
      if (qu.storm) {
        storms++
        expect(qu.dividendCents).toBe(0)
        expect(qu.epsCents).toBe(0)
      }
    }
    expect(storms).toBeGreaterThan(8)
    expect(storms).toBeLessThan(40)
  })
  it('el estado del mercado trae historia, cuentas y rentabilidad', () => {
    const mk = marketAt(ctx(3), 14, 3)
    expect(mk).toHaveLength(4)
    for (const b of mk) {
      expect(b.history.length).toBe(12)
      expect(b.history[b.history.length - 1]).toBe(b.priceCents)
      expect(b.yieldBps).toBeGreaterThanOrEqual(0)
    }
    expect(mk.find((b) => b.def.id === 'astillero')!.yieldBps).toBe(0)
  })
})

describe('mercado: comprar y vender', () => {
  function level3(): GameState {
    let g = createGame({ islandName: 'Test', seed: 21, epochMs: EPOCH })
    for (let m = 0; m <= 12; m++) {
      g = advanceTo(g, at(m))
      if (g.mailboxCents > 0) g = must(collectMailbox(g, at(m)))
      if (g.foodMonths < 2) g = must(buy(g, at(m), 'cesta-grande'))
      while (g.pendingYearEnds.length) g = must(spinInflation(g))
    }
    g = structuredClone(g)
    g.world = 3
    g.taxesUnlocked = true
    g.bankUnlocked = true
    g.huchaCents = 1000_00
    return g
  }
  it('comprar descuenta precio más comisión, lleva el precio medio y respeta las 100 acciones', () => {
    let g = level3()
    const price = priceAt(marketCtx(g), 'panaderia', 12)
    g = must(buyShares(g, at(12), 'panaderia', 10))
    expect(g.huchaCents).toBe(1000_00 - price * 10 - COMMISSION_CENTS)
    expect(g.holdings.panaderia).toEqual({ shares: 10, avgCostCents: price })
    expect(buyShares(g, at(12), 'panaderia', 91).ok).toBe(false)
    expect(g.businessesBought).toEqual(['panaderia'])
  })
  it('vender calcula la ganancia sobre el precio medio y retiene el 19 % solo si hay ganancia', () => {
    let g = level3()
    g = must(buyShares(g, at(12), 'panaderia', 10))
    const avg = g.holdings.panaderia.avgCostCents
    // Buscamos un mes futuro con precio distinto para ver ganancia o pérdida.
    let m = 13
    while (priceAt(marketCtx(g), 'panaderia', m) === avg && m < 40) m++
    g = advanceTo(g, at(m))
    const price = priceAt(marketCtx(g), 'panaderia', m)
    const before = g.huchaCents
    g = must(sellShares(g, at(m), 'panaderia', 10))
    const gain = (price - avg) * 10
    const retained = gain > 0 ? Math.floor(gain * 0.19 + 0.5) : 0
    expect(g.huchaCents).toBe(before + price * 10 - COMMISSION_CENTS - retained)
    expect(g.holdings.panaderia).toBeUndefined()
    if (gain < 0) expect(g.yearLossCents).toBe(-gain)
  })
  it('los dividendos llegan al cofre en los meses de cuentas', () => {
    let g = level3()
    g = must(buyShares(g, at(12), 'panaderia', 20))
    g = advanceTo(g, at(14)) // marzo del año 2: cuentas
    const div = g.ledger.find((e) => e.kind === 'dividendo')
    expect(div).toBeDefined()
    expect(div!.amountCents).toBeGreaterThan(0)
    expect(g.yearDividendsCents).toBe(div!.amountCents)
  })
  it('no se puede comprar por encima de lo que hay ni negocios de niveles futuros', () => {
    const g = level3()
    expect(buyShares(g, at(12), 'panaderia', 100).ok).toBe(false)
    expect(buyShares(g, at(12), 'molino', 1).ok).toBe(false)
    expect(sellShares(g, at(12), 'panaderia', 1).ok).toBe(false)
  })
})

describe('Nivel 4: negocios nuevos, La Tormenta y el Fondo Isla', () => {
  it('la granja solo reparte en otoño y a veces pierde la cosecha; el molino siempre', () => {
    const granja = BUSINESS_BY_ID.granja
    const molino = BUSINESS_BY_ID.molino
    let bad = 0
    for (let q = 0; q < 80; q++) {
      const g = quarterFor(ctx(11), granja, q)
      if (g.quarterOfYear !== 3) expect(g.dividendCents).toBe(0)
      if (g.storm) {
        bad++
        expect(g.quarterOfYear).toBe(3)
      }
      expect(quarterFor(ctx(11), molino, q).dividendCents).toBeGreaterThan(0)
    }
    expect(bad).toBeGreaterThan(1)
  })
  it('el oro de la cantera no gana ni reparte, sigue la inflación y sube en La Tormenta', () => {
    const oro = BUSINESS_BY_ID.cantera
    for (let q = 0; q < 40; q++) {
      const c = quarterFor(ctx(11), oro, q)
      expect(c.epsCents).toBe(0)
      expect(c.dividendCents).toBe(0)
    }
    // Sin tormenta: en 10 años sube al ritmo de la inflación media (≈3 %/año), sin sustos.
    const calm = priceSeries(ctx(11, null), oro, 120)
    expect(calm[120] / calm[0]).toBeGreaterThan(1.2)
    expect(calm[120] / calm[0]).toBeLessThan(1.5)
    for (let m = 1; m <= 120; m++) expect(Math.abs(calm[m] / calm[m - 1] - 1)).toBeLessThan(0.09)
    // Con Tormenta en el mes 40: ese mes sube (≥ +12 %) y un año después la prima se ha deshecho.
    const storm = priceSeries(ctx(11, 40), oro, 52)
    expect(storm[40] / storm[39]).toBeGreaterThan(1.12)
    expect(storm[52] / calm[52]).toBeLessThan(1.06)
    expect(storm[52] / calm[52]).toBeGreaterThan(0.94)
  })
  it('el observatorio acaba descubriendo algo en alguna semilla y su beneficio se multiplica', () => {
    const obs = BUSINESS_BY_ID.observatorio
    let found = false
    for (let seed = 1; seed < 30 && !found; seed++) {
      const n = discoveriesUntil(ctx(seed), obs, 20)
      if (n > 0) {
        found = true
        const before = quarterFor(ctx(seed), obs, 0).epsCents
        const after = quarterFor(ctx(seed), obs, 83).epsCents
        expect(after).toBeGreaterThan(before * 2)
      }
    }
    expect(found).toBe(true)
  })
  it('La Tormenta hunde todos los precios ese mes y la posada más; después se recuperan', () => {
    const c = ctx(5, 40)
    let recovery = 0
    const hit = BUSINESSES.filter((b) => !b.refuge)
    for (const def of hit) {
      const s = priceSeries(c, def, 52)
      const drop = s[40] / s[39] - 1
      expect(drop).toBeLessThanOrEqual(def.id === 'posada' ? -0.39 : -0.29)
      recovery += s[52] / s[40]
    }
    // Un año después, de media, la isla ha recuperado buena parte de la caída.
    expect(recovery / hit.length).toBeGreaterThan(1.15)
    // Sin Tormenta fijada, ese mes es normal.
    const s0 = priceSeries(ctx(5, null), BUSINESS_BY_ID.molino, 41)
    expect(Math.abs(s0[40] / s0[39] - 1)).toBeLessThan(0.09)
  })
  it('el fondo empieza en 10, sigue a la media y acumula los dividendos', () => {
    const s = fundNavSeries(ctx(8), 36)
    expect(s[0]).toBe(10_00)
    for (let m = 1; m <= 36; m++) {
      expect(s[m]).toBeGreaterThan(0)
      expect(Math.abs(s[m] / s[m - 1] - 1)).toBeLessThan(0.2)
    }
  })
  function level4(): GameState {
    let g = createGame({ islandName: 'Test', seed: 21, epochMs: EPOCH })
    for (let m = 0; m <= 12; m++) {
      g = advanceTo(g, at(m))
      if (g.mailboxCents > 0) g = must(collectMailbox(g, at(m)))
      if (g.foodMonths < 2) g = must(buy(g, at(m), 'cesta-grande'))
      while (g.pendingYearEnds.length) g = must(spinInflation(g))
    }
    g = structuredClone(g)
    g.world = 4
    g.taxesUnlocked = true
    g.bankUnlocked = true
    g.huchaCents = 2000_00
    g.foodMonths = 40
    return g
  }
  it('al abrir el Nivel 4 queda fijada La Tormenta y llega seis meses después; aguantar cuenta', () => {
    let g = level4()
    g = must(buyShares(g, at(12), 'molino', 5)) // done() fija crashMonth
    expect(g.crashMonth).toBe(12 + CRASH_AFTER_MONTHS)
    g = advanceTo(g, at(g.crashMonth!))
    expect(g.ledger.some((e) => e.kind === 'tormenta' && e.label.startsWith('LA TORMENTA'))).toBe(true)
    expect(g.crashWatch).toEqual({ shares: 5, fundUnits: 0 })
    g = advanceTo(g, at(g.crashMonth! + 3))
    expect(g.crashSurvived).toBe(true)
    expect(g.crashWatch).toBeNull()
  })
  it('meter y sacar del Fondo Isla: participaciones, coste y ganancia proporcional', () => {
    let g = level4()
    g = must(buyFund(g, at(12), 100_00))
    expect(g.fundUnits).toBeGreaterThan(0)
    expect(g.fundCostCents).toBe(100_00)
    expect(fundValue(g, 12)).toBe(100_00)
    expect(buyFund(g, at(12), 5000_00).ok).toBe(false)
    g = advanceTo(g, at(30))
    const value = fundValue(g, 30)
    const hucha = g.huchaCents
    g = must(sellFund(g, at(30), 'all'))
    expect(g.fundUnits).toBe(0)
    expect(g.fundCostCents).toBe(0)
    expect(g.huchaCents).toBeGreaterThanOrEqual(hucha + Math.min(value, 100_00) - 1)
    expect(sellFund(g, at(30), 'all').ok).toBe(false)
  })
})
