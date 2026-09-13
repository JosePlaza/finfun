/**
 * Parámetros de la economía de Finfun. Todo el dinero se guarda en céntimos de euroLuky (enteros)
 * para que la simulación sea exacta y determinista.
 */

/** Un mes de isla dura un día real. */
export const MONTH_MS = 24 * 60 * 60 * 1000

export const MONTHS_PER_YEAR = 12
export const MONTHS_PER_SEASON = 3

/** Paga mensual: 30 euroLukys. */
export const PAGA_CENTS = 30_00

/** Tipo anual del Banco de la Isla (2,5 %), en puntos básicos. */
export const BANK_RATE_BPS = 250

/** Inflación anual sorteada entre 1,5 % y 4 % (puntos básicos). */
export const INFLATION_MIN_BPS = 150
export const INFLATION_MAX_BPS = 400

/** Retención de Hacienda sobre rendimientos (19 %). Se activa en el Mundo 2. */
export const RETENTION_BPS = 1900

/** La tarea diaria (recoger bellotas) paga entre 1 y 3 euroLukys. */
export const TASK_MIN_CENTS = 1_00
export const TASK_MAX_CENTS = 3_00
export const TASK_ACORNS = 5

/** El banco se abre al cerrar el primer año de isla. */
export const BANK_UNLOCK_MONTH = 12

export type ItemKind = 'consumible' | 'objeto'

export interface ShopItemDef {
  id: string
  name: string
  basePriceCents: number
  kind: ItemKind
  /** Dónde aparece en la isla al comprarlo (solo objetos). */
  description: string
  /** IVA que muestra la etiqueta, en %. Solo informativo. */
  ivaPct: number
}

export const SHOP_ITEMS: ShopItemDef[] = [
  { id: 'helado', name: 'Helado', basePriceCents: 2_00, kind: 'consumible', description: 'Se derrite, pero qué rico.', ivaPct: 10 },
  { id: 'cometa', name: 'Cometa', basePriceCents: 25_00, kind: 'objeto', description: 'Vuela sobre la meseta cuando hay viento.', ivaPct: 21 },
  { id: 'balon', name: 'Balón', basePriceCents: 40_00, kind: 'objeto', description: 'Para la explanada junto a la casa.', ivaPct: 21 },
  { id: 'bici', name: 'Bici', basePriceCents: 180_00, kind: 'objeto', description: 'Con ella se abre el camino al Ayuntamiento.', ivaPct: 21 },
  { id: 'telescopio', name: 'Telescopio', basePriceCents: 450_00, kind: 'objeto', description: 'Para mirar el continente desde el acantilado.', ivaPct: 21 },
]

/** El objeto cuya compra desbloquea el Mundo 2. */
export const WORLD2_UNLOCK_ITEM = 'bici'
