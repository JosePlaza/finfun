import { describe, expect, it } from 'vitest'
import { MONTH_MS, PAGA_CENTS, SHOP_ITEMS } from './config'
import { calendarOf, MONTH_NAMES, monthAt, msUntilNextMonth } from './calendar'
import {
  advanceTo,
  bankAfterOneYear,
  buildHuerto,
  buy,
  buyBond,
  chooseTaxMode,
  collectMailbox,
  completeTask,
  createGame,
  deposit,
  forfeitTask,
  inflationForYear,
  inflatePrice,
  monthlyInterest,
  spinInflation,
  upgradeHuerto,
  withdraw,
  visitLiebre,
  lendToLiebre,
  liebreCanBorrow,
  liebreCtx,
  migrate,
  netWorth,
} from './engine'
import { liebreAt } from './liebre'
import { HUERTO_COST_CENTS, INFLATION_WHEEL_BPS } from './config'
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
  // Sin cesta domiciliada: así las pruebas de despensa y hambre ven el efecto de no comprar comida.
  const g = createGame({ islandName: 'Isla Bellota', seed: 12345, epochMs: EPOCH })
  g.autoFood = false
  return g
}

/** Partida cuidada: cada día recoge la paga, compra comida si hace falta y gira la ruleta si toca. */
function careful(untilMonth: number, from: GameState = fresh(), spin = true): GameState {
  let g = from
  for (let mth = Math.max(0, g.processedMonth); mth <= untilMonth; mth++) {
    g = advanceTo(g, at(mth))
    if (g.mailboxCents > 0) g = must(collectMailbox(g, at(mth)))
    if (g.foodMonths < 2) g = must(buy(g, at(mth), 'cesta-grande'))
    while (spin && g.pendingYearEnds.length) g = must(spinInflation(g))
  }
  return g
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
    expect(calendarOf(0)).toMatchObject({ year: 1, monthOfYear: 1, season: 'invierno', isYearEnd: false }) // enero
    expect(calendarOf(2)).toMatchObject({ season: 'primavera' }) // marzo
    expect(calendarOf(5)).toMatchObject({ year: 1, season: 'verano' }) // junio
    expect(calendarOf(8)).toMatchObject({ season: 'otoño' }) // septiembre
    expect(calendarOf(11)).toMatchObject({ year: 1, monthOfYear: 12, season: 'invierno', isYearEnd: true }) // diciembre
    expect(calendarOf(12)).toMatchObject({ year: 2, monthOfYear: 1, season: 'invierno' }) // enero del año 2
    expect(MONTH_NAMES[calendarOf(11).monthOfYear - 1]).toBe('diciembre')
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
    expect(once.pendingYearEnds).toEqual(daily.pendingYearEnds)
    expect(once.foodMonths).toBe(daily.foodMonths)
    expect(once.hunger).toBe(daily.hunger)
  })
  it('la paga se acumula sin tope', () => {
    const s = advanceTo(fresh(), at(9))
    expect(s.mailboxCents).toBe(10 * PAGA_CENTS)
  })
})

describe('inflación', () => {
  it('se sortea entre las casillas de la ruleta de forma reproducible', () => {
    for (let y = 0; y < 50; y++) {
      const bps = inflationForYear(777, y)
      expect(INFLATION_WHEEL_BPS).toContain(bps)
      expect(inflationForYear(777, y)).toBe(bps)
    }
  })
  it('al cerrar el año la ruleta espera al jugador; al girarla suben los precios y se escribe el diario', () => {
    let s = careful(11, fresh(), false)
    expect(s.pendingYearEnds).toHaveLength(1)
    expect(s.diary).toHaveLength(0)
    expect(s.shop.find((i) => i.id === 'bici')!.priceCents).toBe(180_00)
    const r = spinInflation(s)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.inflationBps).toBe(inflationForYear(s.seed, 0))
    s = r.state
    expect(s.pendingYearEnds).toHaveLength(0)
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
    expect(careful(10).bankUnlocked).toBe(false)
    expect(careful(11).bankUnlocked).toBe(true)
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
    let s = careful(11)
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
  it('comprar la bici abre el Nivel 2, y con él el banco aunque no haya terminado el año', () => {
    let s = advanceTo(fresh(), at(6))
    s = must(collectMailbox(s, at(6)))
    expect(s.bankUnlocked).toBe(false)
    const r = buy(s, at(6), 'bici')
    expect(r.ok).toBe(true)
    expect(must(r).world).toBe(2)
    expect(must(r).bankUnlocked).toBe(true)
    expect(deposit(must(r), at(6), 10_00).ok).toBe(true)
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

describe('comida y vida', () => {
  it('se empieza con comida para tres meses y cada mes se consume una', () => {
    expect(advanceTo(fresh(), at(0)).foodMonths).toBe(3)
    expect(advanceTo(fresh(), at(3)).foodMonths).toBe(0)
    expect(advanceTo(fresh(), at(3)).hunger).toBe(0)
    expect(advanceTo(fresh(), at(5)).hunger).toBe(2)
  })
  it('seis meses sin comer: Doña Tortuga te rescata, se pierde el cofre y la isla sigue', () => {
    const s = advanceTo(fresh(), at(8))
    expect(s.hunger).toBe(5)
    let d = must(collectMailbox(s, at(8)))
    expect(d.huchaCents).toBeGreaterThan(0)
    d = advanceTo(d, at(9))
    expect(d.dead).toBe(false)
    expect(d.rescues).toBe(1)
    expect(d.lastRescueMonth).toBe(9)
    expect(d.huchaCents).toBe(0)
    expect(d.hunger).toBe(0)
    expect(d.foodMonths).toBe(1) // la sopa de Doña Tortuga: un mes de despensa
    expect(d.ledger.some((e) => e.kind === 'rescate')).toBe(true)
    // La isla no se detiene: la paga sigue llegando.
    const later = advanceTo(d, at(11))
    expect(later.mailboxCents).toBeGreaterThan(0)
  })
  it('la cesta domiciliada compra sola la cesta pequeña cuando la despensa se vacía (cofre y luego banco)', () => {
    let g = createGame({ islandName: 'Isla Bellota', seed: 12345, epochMs: EPOCH })
    expect(g.autoFood).toBe(true)
    g = advanceTo(g, at(0))
    g = must(collectMailbox(g, at(0)))
    // Mes 3: despensa a cero → se compra sola con el dinero del cofre.
    g = advanceTo(g, at(4))
    expect(g.hunger).toBe(0)
    expect(g.ledger.some((e) => e.label.startsWith('Cesta domiciliada'))).toBe(true)
    expect(g.huchaCents).toBe(PAGA_CENTS - 5_00)
    // Sin dinero en el cofre ni en el banco, sí hay hambre.
    let poor = createGame({ islandName: 'Isla Pobre', seed: 7, epochMs: EPOCH })
    poor = advanceTo(poor, at(5)) // la paga se queda en el buzón: el cofre está vacío
    expect(poor.hunger).toBe(2)
    // Con el dinero en el banco, la cesta se cobra del banco.
    let banked = createGame({ islandName: 'Isla Banco', seed: 7, epochMs: EPOCH })
    banked.bankUnlocked = true
    banked = advanceTo(banked, at(0))
    banked = must(collectMailbox(banked, at(0)))
    banked = must(deposit(banked, at(0), PAGA_CENTS))
    banked = advanceTo(banked, at(4))
    expect(banked.hunger).toBe(0)
    expect(banked.bankCents).toBeLessThan(PAGA_CENTS)
    expect(banked.ledger.some((e) => e.label.includes('cobrada del banco'))).toBe(true)
  })
  it('las cestas llenan la despensa y quitan el hambre', () => {
    let s = advanceTo(fresh(), at(5))
    s = must(collectMailbox(s, at(5)))
    s = must(buy(s, at(5), 'cesta-grande'))
    expect(s.foodMonths).toBe(2)
    expect(s.hunger).toBe(0)
    s = must(buy(s, at(5), 'cesta-pequena'))
    expect(s.foodMonths).toBe(3)
    expect(s.huchaCents).toBe(6 * PAGA_CENTS - 9_50 - 5_00)
    expect(buy(s, at(5), 'cesta-pequena').ok).toBe(true) // la comida se puede comprar las veces que haga falta
  })
  it('el huerto cuesta 1000 y da una cesta grande cada tres meses', () => {
    // Sin comprar comida ni domiciliar la cesta, hay rescates antes de poder ahorrar 1000.
    expect(advanceTo(fresh(), at(40)).rescues).toBeGreaterThan(0)
    // Partida cuidada: compra comida a tiempo y ahorra para el huerto.
    let g = careful(40)
    expect(g.rescues).toBe(0)
    expect(g.huchaCents).toBeGreaterThanOrEqual(HUERTO_COST_CENTS)
    const r = buildHuerto(g, at(40))
    expect(r.ok).toBe(true)
    g = must(r)
    expect(g.huertoBuiltMonth).toBe(40)
    expect(buildHuerto(g, at(40)).ok).toBe(false)
    const food = g.foodMonths
    g = advanceTo(g, at(42))
    expect(g.foodMonths).toBe(food - 2)
    g = advanceTo(g, at(43))
    expect(g.foodMonths).toBe(food - 3 + 2)
    // Ampliado: 3 meses cada trimestre, la despensa ya no baja.
    expect(upgradeHuerto(g, at(43)).ok).toBe(false) // sin dinero
    g = structuredClone(g)
    g.huchaCents = 1500_00
    g = must(upgradeHuerto(g, at(43)))
    expect(g.huertoUpgradedMonth).toBe(43)
    const f2 = g.foodMonths
    g = advanceTo(g, at(46))
    expect(g.foodMonths).toBe(f2 - 3 + 3)
  })
})

describe('Nivel 2: bonos y Hacienda', () => {
  function world2() {
    let s = careful(11)
    s = must(buy(s, at(11), 'bici'))
    expect(s.world).toBe(2)
    expect(s.taxesUnlocked).toBe(true)
    expect(s.huchaCents).toBeGreaterThan(100_00)
    return s
  }
  it('un bono paga cupón trimestral con retención y devuelve el principal al vencer', () => {
    let s = world2()
    const r = buyBond(s, at(11), 'farolas', 100_00)
    expect(r.ok).toBe(true)
    s = must(r)
    expect(s.bonds).toHaveLength(1)
    const hucha = s.huchaCents
    s = advanceTo(s, at(14)) // primer cupón: 100 * 3 % / 4 = 0,75 bruto → 0,61 neto (19 % retenido)
    const cupon = s.ledger.find((e) => e.kind === 'cupon')!
    expect(cupon.amountCents).toBe(61)
    expect(s.huchaCents).toBe(hucha + 61) // la paga sigue en el buzón, no en el cofre
    s = advanceTo(s, at(17))
    expect(s.bonds).toHaveLength(0)
    expect(s.ledger.some((e) => e.kind === 'vencimiento' && e.amountCents === 100_00)).toBe(true)
  })
  it('no deja comprar bonos con cantidades raras ni sin dinero', () => {
    const s = world2()
    expect(buyBond(s, at(11), 'farolas', 5_00).ok).toBe(false)
    expect(buyBond(s, at(11), 'farolas', 15_00).ok).toBe(false)
    expect(buyBond(s, at(11), 'farolas', 5000_00).ok).toBe(false)
  })
  it('en modo anual no se retiene nada y se paga todo al cerrar el año', () => {
    let s = world2()
    if (s.bankCents > 0) s = must(withdraw(s, at(11), s.bankCents)) // sin banco: el único rendimiento es el cupón
    s = must(chooseTaxMode(s, at(11), 'anual'))
    s = must(buyBond(s, at(11), 'puente', 100_00))
    s = advanceTo(s, at(14))
    expect(s.ledger.find((e) => e.kind === 'cupon')!.amountCents).toBe(1_00) // 100 * 4 % / 4, bruto
    expect(s.yearPendingTaxableCents).toBe(1_00)
    s = careful(23, s, false)
    const tax = s.ledger.find((e) => e.kind === 'impuestos')!
    expect(tax.amountCents).toBe(-76) // 19 % de cuatro cupones de 1 euroLuky
    expect(s.declarations).toHaveLength(1)
    expect(s.yearPendingTaxableCents).toBe(0)
  })
})

describe('La isla de la Liebre', () => {
  function world2() {
    let s = careful(11)
    s = must(buy(s, at(11), 'bici'))
    return s
  }
  it('apunta el mes en que se abre cada nivel y guarda el patrimonio mes a mes', () => {
    const s = world2()
    expect(s.worldOpened[0]).toBe(0)
    expect(s.worldOpened[1]).toBe(11)
    expect(s.netWorthHistory.length).toBe(12)
    expect(s.netWorthHistory[11]).toBeGreaterThan(0)
  })
  it('una partida antigua reconstruye su historia de patrimonio con los cierres de año', () => {
    const s = careful(26)
    const old = structuredClone(s) as Partial<GameState>
    delete old.netWorthHistory
    const fixed = migrate(old as GameState)
    expect(fixed.netWorthHistory.length).toBe(27)
    expect(fixed.netWorthHistory.every((v) => v >= 0)).toBe(true)
    // El cierre del año 1 coincide con lo que dice el diario, y hoy con el patrimonio real.
    const d1 = fixed.diary.find((d) => d.year === 1)!
    expect(fixed.netWorthHistory[11]).toBe(d1.huchaCents + d1.bankCents)
    expect(fixed.netWorthHistory[26]).toBe(netWorth(fixed, 26))
    // Una historia con huecos (-1) también se rellena.
    const holes = structuredClone(s)
    holes.netWorthHistory = holes.netWorthHistory.map((v, i) => (i === 26 ? v : -1))
    const filled = migrate(holes)
    expect(filled.netWorthHistory.every((v) => v >= 0)).toBe(true)
  })
  it('la visita solo se puede hacer desde el Nivel 2 y cuenta para la misión', () => {
    expect(visitLiebre(fresh(), at(0)).ok).toBe(false)
    const s = must(visitLiebre(world2(), at(11)))
    expect(s.liebreVisits).toBe(1)
    expect(s.liebreLastVisitMonth).toBe(11)
  })
  it('el préstamo se concede cuando ella pasa hambre y vuelve con interés (a veces con retraso)', () => {
    let s = world2()
    // Buscamos el primer mes en que la Liebre necesita comida.
    let m = 11
    while (!liebreCanBorrow(s, m) && m < 60) {
      m++
      s = advanceTo(s, at(m))
    }
    expect(m).toBeLessThan(60)
    const before = s.huchaCents
    s = must(lendToLiebre(s, at(m)))
    expect(s.huchaCents).toBe(before - 5_00)
    expect(s.liebreLoan?.dueMonth).toBe(m + 1)
    expect(lendToLiebre(s, at(m)).ok).toBe(false)
    // Como mucho tres meses después ha devuelto 6 (menos la retención del interés).
    s = advanceTo(s, at(m + 4))
    expect(s.liebreLoan).toBeNull()
    expect(s.liebreLoansRepaid).toBe(1)
    const back = s.ledger.find((e) => e.kind === 'devolucion')
    expect(back).toBeDefined()
    expect(back!.amountCents).toBeGreaterThanOrEqual(5_81)
    expect(back!.amountCents).toBeLessThanOrEqual(6_00)
  })
  it('la simulación de la Liebre usa el nivel real del jugador', () => {
    const s = world2()
    const ctx = liebreCtx(s)
    expect(ctx.worldOpened).toEqual([0, 11])
    expect(liebreAt(ctx, 11).receivedCents).toBe(PAGA_CENTS * 12)
  })
})

describe('pistas de bellotas', () => {
  it('resolver termina la tarea del día sin premio y no cuenta como completada', () => {
    const s0 = advanceTo(fresh(), at(0))
    const r = forfeitTask(s0, at(0))
    expect(r.ok).toBe(true)
    const s1 = must(r)
    expect(s1.huchaCents).toBe(0)
    expect(s1.tasksCompleted).toBe(0)
    expect(completeTask(s1, at(0)).ok).toBe(false)
    expect(forfeitTask(s1, at(0)).ok).toBe(false)
    expect(completeTask(s1, at(1)).ok).toBe(true) // mañana, bellotas nuevas
  })
})

describe('formato', () => {
  it('céntimos a texto español', () => {
    expect(formatCents(30_00)).toBe('30')
    expect(formatCents(30_41)).toBe('30,41')
    expect(formatCents(1830_06)).toBe('1830,06')
  })
})
