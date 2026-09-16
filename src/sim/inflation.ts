/** Inflación anual de la isla: sorteo determinista y subida de precios "de tienda". */
import { INFLATION_WHEEL_BPS } from './config'
import { roundCents } from './money'
import { randInt, rngFor } from './rng'

/**
 * Inflación sorteada para un año de isla (determinista por semilla): una de las casillas de la ruleta.
 * El jugador "gira" la ruleta en pantalla, pero el resultado ya está decidido, así la partida es reproducible.
 */
export function inflationForYear(seed: number, yearIndex: number): number {
  const rng = rngFor(seed, yearIndex, 11)
  return INFLATION_WHEEL_BPS[randInt(rng, 0, INFLATION_WHEEL_BPS.length - 1)]
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

/** Precio de tienda de un artículo en un mes dado, con todas las inflaciones de los años ya cerrados aplicadas. */
export function shopPriceAt(seed: number, basePriceCents: number, month: number): number {
  let p = basePriceCents
  const years = Math.floor(month / 12)
  for (let y = 0; y < years; y++) p = inflatePrice(p, inflationForYear(seed, y))
  return p
}
