import { describe, expect, it } from 'vitest'
import { BUSINESSES, BUSINESS_BY_ID, COMMISSION_CENTS, marketAt, MAX_MONTHLY_MOVE_BPS, priceAt, priceSeries, quarterFor } from './market'
import { advanceTo, buy, buyShares, collectMailbox, createGame, sellShares, spinInflation, type ActionResult, type GameState } from './index'
import { MONTH_MS } from './config'

const EPOCH = Date.UTC(2026, 0, 1)
const at = (m: number) => EPOCH + m * MONTH_MS
function must(r: ActionResult): GameState {
  if (!r.ok) throw new Error(r.reason)
  return r.state
}

describe('mercado: precios', () => {
  it('es determinista y arranca en el precio base', () => {
    for (const def of BUSINESSES) {
      expect(priceAt(7, def.id, 0)).toBe(def.basePriceCents)
      expect(priceAt(7, def.id, 30)).toBe(priceAt(7, def.id, 30))
    }
  })
  it('un mes normal nunca se mueve más del tope; la tormenta puede pasarse', () => {
    for (const seed of [1, 2, 3, 44, 555]) {
      for (const def of BUSINESSES) {
        const s = priceSeries(seed, def, 60)
        for (let m = 1; m <= 60; m++) {
          const move = Math.abs(s[m] / s[m - 1] - 1)
          const q = Math.floor(m / 3)
          const storm = m % 3 === 2 && quarterFor(seed, def, q).storm
          if (!storm) expect(move).toBeLessThanOrEqual(MAX_MONTHLY_MOVE_BPS / 10_000 + 0.001)
          else expect(move).toBeLessThanOrEqual(0.36)
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
      expect(quarterFor(5, pan, q).dividendCents).toBeGreaterThan(0)
      expect(quarterFor(5, ast, q).dividendCents).toBe(0)
      expect(quarterFor(5, hel, q).dividendCents > 0).toBe(q % 4 === 2)
    }
  })
  it('el puerto tiene tormentas de vez en cuando y entonces no reparte', () => {
    const puerto = BUSINESS_BY_ID.puerto
    let storms = 0
    for (let q = 0; q < 120; q++) {
      const qu = quarterFor(9, puerto, q)
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
    const mk = marketAt(3, 14, 3)
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
    const price = priceAt(g.seed, 'panaderia', 12)
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
    while (priceAt(g.seed, 'panaderia', m) === avg && m < 40) m++
    g = advanceTo(g, at(m))
    const price = priceAt(g.seed, 'panaderia', m)
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
