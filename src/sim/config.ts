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
/** Las casillas de la ruleta de inflación: el sorteo cae siempre en una de ellas. */
export const INFLATION_WHEEL_BPS = [150, 200, 250, 300, 350, 400]

/** Retención de Hacienda sobre rendimientos (19 %). Se activa en el Nivel 2. */
export const RETENTION_BPS = 1900

/** La tarea diaria (recoger bellotas) paga entre 1 y 3 euroLukys. */
export const TASK_MIN_CENTS = 1_00
export const TASK_MAX_CENTS = 3_00
export const TASK_ACORNS = 5

/** El banco se abre al cerrar el primer año de isla. */
export const BANK_UNLOCK_MONTH = 12

/** Comida: meses de despensa que da cada cesta y comida con la que se empieza. */
export const FOOD_START_MONTHS = 3
export const HUNGER_DEATH_MONTHS = 6
/** El huerto: cuesta 1000 euroLukys y da una cesta grande (2 meses) cada 3 meses. */
export const HUERTO_COST_CENTS = 1000_00
export const HUERTO_EVERY_MONTHS = 3
export const HUERTO_FOOD_MONTHS = 2

export type ItemKind = 'consumible' | 'objeto' | 'comida'

export interface ShopItemDef {
  id: string
  name: string
  basePriceCents: number
  kind: ItemKind
  /** Dónde aparece en la isla al comprarlo (solo objetos). */
  description: string
  /** IVA que muestra la etiqueta, en %. Solo informativo. */
  ivaPct: number
  /** Icono del catálogo. */
  icon: string
  /** Solo comida: meses de despensa que aporta. */
  foodMonths?: number
}

export const SHOP_ITEMS: ShopItemDef[] = [
  // Comida
  { id: 'cesta-pequena', name: 'Cesta pequeña', basePriceCents: 5_00, kind: 'comida', description: 'Comida para un mes.', ivaPct: 4, icon: '🧺', foodMonths: 1 },
  { id: 'cesta-grande', name: 'Cesta grande', basePriceCents: 9_50, kind: 'comida', description: 'Dos meses. Sale más barata.', ivaPct: 4, icon: '🍎', foodMonths: 2 },
  // Caprichos (se gastan)
  { id: 'chuches', name: 'Chuches', basePriceCents: 1_00, kind: 'consumible', description: 'Un puñado para la tarde.', ivaPct: 10, icon: '🍬' },
  { id: 'helado', name: 'Helado', basePriceCents: 2_00, kind: 'consumible', description: 'Se derrite, pero qué rico.', ivaPct: 10, icon: '🍦' },
  { id: 'comic', name: 'Cómic', basePriceCents: 4_00, kind: 'consumible', description: 'Una aventura en cada número.', ivaPct: 4, icon: '📖' },
  { id: 'cine', name: 'Cine', basePriceCents: 6_00, kind: 'consumible', description: 'Sesión de tarde en la Posada.', ivaPct: 10, icon: '🎬' },
  // Cosas que se quedan en la isla
  { id: 'cometa', name: 'Cometa', basePriceCents: 25_00, kind: 'objeto', description: 'Vuela sobre la casa con viento.', ivaPct: 21, icon: '🪁' },
  { id: 'balon', name: 'Balón', basePriceCents: 40_00, kind: 'objeto', description: 'Para la explanada de la casa.', ivaPct: 21, icon: '⚽' },
  { id: 'patinete', name: 'Patinete', basePriceCents: 95_00, kind: 'objeto', description: 'Para bajar la cuesta del faro.', ivaPct: 21, icon: '🛴' },
  { id: 'tienda-campana', name: 'Tienda de campaña', basePriceCents: 120_00, kind: 'objeto', description: 'Noches mirando las estrellas.', ivaPct: 21, icon: '⛺' },
  { id: 'columpio', name: 'Columpio', basePriceCents: 150_00, kind: 'objeto', description: 'De madera, para el jardín.', ivaPct: 21, icon: '🪢' },
  { id: 'bici', name: 'Bici', basePriceCents: 180_00, kind: 'objeto', description: 'Abre el camino al Ayuntamiento.', ivaPct: 21, icon: '🚲' },
  { id: 'guitarra', name: 'Guitarra', basePriceCents: 260_00, kind: 'objeto', description: 'Tres acordes y una canción.', ivaPct: 21, icon: '🎸' },
  { id: 'camara', name: 'Cámara', basePriceCents: 320_00, kind: 'objeto', description: 'Guarda los atardeceres.', ivaPct: 21, icon: '📷' },
  { id: 'telescopio', name: 'Telescopio', basePriceCents: 450_00, kind: 'objeto', description: 'Mira el continente desde el faro.', ivaPct: 21, icon: '🔭' },
  { id: 'consola', name: 'Consola', basePriceCents: 600_00, kind: 'objeto', description: 'Cuesta lo que veinte pagas.', ivaPct: 21, icon: '🎮' },
  { id: 'canoa', name: 'Canoa', basePriceCents: 900_00, kind: 'objeto', description: 'Rema hasta el islote de la Liebre.', ivaPct: 21, icon: '🛶' },
]

/** El objeto cuya compra desbloquea el Nivel 2. */
export const WORLD2_UNLOCK_ITEM = 'bici'

/* ───────────────────────── Nivel 2: bonos del Ayuntamiento ───────────────────────── */

export interface BondOffer {
  id: string
  name: string
  /** Plazo en meses de isla. */
  months: number
  /** Cupón anual en puntos básicos; se paga cada trimestre. */
  couponBps: number
  minCents: number
  /** Para qué usa el dinero el Ayuntamiento (el niño presta para algo concreto). */
  purpose: string
  icon: string
}

export const BOND_OFFERS: BondOffer[] = [
  { id: 'farolas', name: 'Bono Farolas', months: 6, couponBps: 300, minCents: 10_00, purpose: 'Farolas nuevas para el paseo del puerto.', icon: '🏮' },
  { id: 'puente', name: 'Bono Puente', months: 12, couponBps: 400, minCents: 10_00, purpose: 'Un puente de madera hasta el islote.', icon: '🌉' },
  { id: 'escuela', name: 'Bono Escuela', months: 24, couponBps: 500, minCents: 10_00, purpose: 'Ampliar la escuela con una biblioteca.', icon: '📚' },
]
/** Cada cuántos meses paga cupón un bono. */
export const BOND_COUPON_EVERY = 3
/** Comisión de compra de bonos: ninguna (el Ayuntamiento no cobra). */

/* ───────────────────────── Nivel 2: lecciones de la escuela ───────────────────────── */

export interface Lesson {
  id: string
  title: string
  body: string
  icon: string
}

export const LESSONS: Lesson[] = [
  { id: 'inflacion', title: 'La inflación', icon: '📈', body: 'Casi todos los años los precios suben un poco. Con los mismos euroLukys compras un poco menos. Por eso el dinero quieto en el cofre pierde valor: hay que ponerlo a trabajar.' },
  { id: 'interes-compuesto', title: 'El interés compuesto', icon: '🌱', body: 'El banco paga interés sobre lo que tienes… incluido el interés que ya te dio antes. Es una bola de nieve: al principio crece despacio y luego cada vez más rápido. Cuanto antes empieces, más grande será.' },
  { id: 'bono', title: 'Qué es un bono', icon: '📜', body: 'Comprar un bono es prestar dinero. El Ayuntamiento te paga un cupón fijo cada trimestre y al final del plazo te devuelve lo prestado. Cuanto más tiempo prestas, más cupón te pagan.' },
  { id: 'impuestos', title: 'Los impuestos', icon: '🦉', body: 'Hacienda se lleva un 19 % de lo que ganas con tu dinero (intereses y cupones). Con eso se pagan las farolas y la escuela. Si pagas una vez al año en vez de en cada cobro, el dinero sigue creciendo mientras tanto.' },
  { id: 'riesgo', title: 'Riesgo y recompensa', icon: '⚖️', body: 'Lo que puede dar más también puede dar menos. El banco y los bonos son seguros y dan poco. Las acciones (Nivel 3) dan más… algunos años. Nunca pongas en lo arriesgado el dinero que necesitas pronto.' },
  { id: 'accion', title: 'Qué es una acción', icon: '📈', body: 'Una acción es un trocito de un negocio. Si la Panadería tiene 100 acciones y tú tienes 10, el 10 % de la Panadería es tuyo: una parte de lo que gana es para ti. El precio de la acción sube y baja según lo que gana el negocio… y según lo nerviosa que esté la gente.' },
  { id: 'dividendo', title: 'El dividendo no está prometido', icon: '🎁', body: 'El cupón de un bono estaba prometido. El dividendo de una acción, no: depende de cómo le haya ido al negocio ese trimestre. Si hay tormenta en el Puerto, ese trimestre no hay dividendo. A cambio, cuando el negocio va bien, el dividendo crece.' },
  { id: 'comida', title: 'Primero lo necesario', icon: '🧺', body: 'Antes de invertir, asegúrate de que hay comida en la despensa. La cesta grande sale más barata por mes, y el huerto da comida sola cada tres meses: es una inversión que se come.' },
]
