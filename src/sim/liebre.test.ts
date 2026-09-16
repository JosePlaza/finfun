import { describe, expect, it } from 'vitest'
import { liebreAt, worldAt, type LiebreCtx } from './liebre'
import { PAGA_CENTS } from './config'

const ctx = (seed: number, worldOpened: number[] = [0], crashMonth: number | null = null): LiebreCtx => ({ seed, crashMonth, worldOpened })

describe('La Liebre', () => {
  it('cobra lo mismo que el jugador, gasta casi todo y acumula cosas sin ahorrar', () => {
    const s = liebreAt(ctx(3), 23)
    expect(s.receivedCents).toBe(PAGA_CENTS * 24)
    expect(s.spentCents).toBeGreaterThan(s.receivedCents * 0.8)
    expect(s.items.length).toBeGreaterThan(2)
    expect(s.huchaCents).toBeLessThan(200_00)
    expect(s.netWorthSeries.length).toBe(24)
    // Sin mercado no tiene acciones.
    expect(Object.keys(s.holdings).length).toBe(0)
  })
  it('pasa hambre a veces pero nunca pierde más de 3 corazones', () => {
    let hungry = 0
    for (let m = 0; m <= 60; m++) {
      const s = liebreAt(ctx(4), m)
      expect(s.hunger).toBeLessThanOrEqual(3)
      if (s.hungryNow) hungry++
    }
    expect(hungry).toBeGreaterThan(3)
    expect(hungry).toBeLessThan(45)
  })
  it('es determinista e incremental', () => {
    const a = liebreAt(ctx(9), 30)
    const b = liebreAt(ctx(9), 30)
    expect(a).toEqual(b)
    expect(liebreAt(ctx(9), 10).netWorthSeries).toEqual(a.netWorthSeries.slice(0, 11))
  })
  it('el nivel sigue a los meses de apertura', () => {
    const c = ctx(1, [0, 5, 12, 20])
    expect(worldAt(c, 0)).toBe(1)
    expect(worldAt(c, 5)).toBe(2)
    expect(worldAt(c, 19)).toBe(3)
    expect(worldAt(c, 40)).toBe(4)
  })
  it('con el Mercado abierto compra lo que sube, y en La Tormenta vende todo', () => {
    const c = ctx(7, [0, 2, 6, 24], 30)
    const before = liebreAt(c, 29)
    expect(before.ops.some((o) => o.kind === 'compra')).toBe(true)
    const crash = liebreAt(c, 30)
    expect(crash.soldInCrash).toBe(true)
    expect(Object.keys(crash.holdings).length).toBe(0)
    if (Object.keys(before.holdings).length > 0) expect(crash.ops.some((o) => o.kind === 'panico')).toBe(true)
    // Sin Tormenta en ese mes no vende por pánico.
    const calm = liebreAt(ctx(7, [0, 2, 6, 24], null), 30)
    expect(calm.soldInCrash).toBe(false)
  })
})
