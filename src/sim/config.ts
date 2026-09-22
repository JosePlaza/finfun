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

/** La tarea diaria (recoger las cinco bellotas) paga 2 euroLukys. */
export const TASK_MIN_CENTS = 2_00
export const TASK_MAX_CENTS = 2_00
export const TASK_ACORNS = 5

/** Comida: meses de despensa que da cada cesta y comida con la que se empieza. */
export const FOOD_START_MONTHS = 3
/** Meses seguidos sin comer hasta que Doña Tortuga te rescata (y se pierde lo del cofre). */
export const HUNGER_DEATH_MONTHS = 6
/** Artículo que compra sola la cesta domiciliada. */
export const AUTO_FOOD_ITEM = 'cesta-pequena'
/** El huerto: cuesta 1000 euroLukys y da una cesta grande (2 meses) cada 3 meses. */
export const HUERTO_COST_CENTS = 1000_00
export const HUERTO_EVERY_MONTHS = 3
export const HUERTO_FOOD_MONTHS = 2
/** Mejora del huerto: 1500 euroLukys y pasa a dar 3 meses de comida cada trimestre = la despensa se llena sola. */
export const HUERTO_UPGRADE_COST_CENTS = 1500_00
export const HUERTO_UPGRADED_FOOD_MONTHS = 3

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

/* ───────────────────────── Recorrido inicial ───────────────────────── */

/** Número de pasos del recorrido con Doña Tortuga; `tutorialStep >= TUTORIAL_DONE` = terminado. */
export const TUTORIAL_DONE = 8

/* ───────────────────────── Compartir ───────────────────────── */

/** Dirección pública del juego (la del QR de Ajustes → Compartir Finfun). */
export const SHARE_URL = 'https://finfun-l2xi.vercel.app/'

/* ───────────────────────── La Liebre ───────────────────────── */

/** El préstamo de la Liebre: pide 5 eL cuando pasa hambre y promete devolver 6 al mes siguiente. */
export const LIEBRE_LOAN_CENTS = 5_00
export const LIEBRE_LOAN_REPAY_CENTS = 6_00
/** Una de cada cinco veces se retrasa dos meses. */
export const LIEBRE_LOAN_LATE_CHANCE = 0.2
export const LIEBRE_LOAN_LATE_MONTHS = 2
/** El nivel desde el que se puede visitar su isla. */
export const LIEBRE_VISIT_WORLD = 2

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

/**
 * Cuestionario de una lección: una sola pregunta con cuatro opciones. La PRIMERA opción es la correcta (la
 * interfaz las baraja). `hint` es la pista de Doña Tortuga al fallar: orienta sin dar la respuesta.
 */
export interface Quiz {
  question: string
  options: [string, string, string, string]
  hint: string
}

export const QUIZZES: Record<string, Quiz> = {
  inflacion: {
    question: 'La bici costaba 180 eL y este año cuesta 185. ¿Qué ha pasado?',
    options: [
      'Han subido los precios: con los mismos euroLukys compras un poco menos.',
      'La bici es mejor que el año pasado.',
      'La tienda se ha equivocado al poner el precio.',
      'Tu paga ha bajado.',
    ],
    hint: 'Fíjate en el precio tachado que aparece en la tienda cada enero. La bici es la misma… lo que cambia es el precio.',
  },
  'interes-compuesto': {
    question: 'Dejas 100 eL en el banco y no los tocas en muchos años. ¿Qué pasa con el interés que te dan?',
    options: [
      'Cada año te dan un poco más, porque también hay interés sobre el interés anterior.',
      'Cada año te dan exactamente lo mismo.',
      'Cada año te dan un poco menos.',
      'Solo te dan interés el primer año.',
    ],
    hint: 'Piensa en una bola de nieve que rueda cuesta abajo: ¿se queda igual de grande?',
  },
  bono: {
    question: 'Compras el Bono Puente: 100 eL a 12 meses al 4 %. ¿Qué es un bono?',
    options: [
      'Prestar dinero a cambio de que te lo devuelvan con un cupón.',
      'Un regalo que le haces al Ayuntamiento.',
      'Comprar un trozo del puente.',
      'Una cuenta del banco con otro nombre.',
    ],
    hint: 'El Ayuntamiento te devuelve los 100 eL al final. Si te los devuelve… ¿qué ha sido ese dinero mientras tanto?',
  },
  impuestos: {
    question: 'El banco te da 10 eL de interés y en el cofre solo llegan 8,10. ¿Dónde han ido los otros 1,90?',
    options: [
      'A Hacienda: el 19 % de lo que ganas paga las cosas comunes de la isla.',
      'Se los ha quedado el banco como comisión.',
      'Se los ha llevado la inflación.',
      'Es un error del banco.',
    ],
    hint: '¿Quién paga las farolas y la escuela de la isla? Don Búho te lo cuenta en la torre.',
  },
  riesgo: {
    question: 'Necesitas 50 eL dentro de dos meses para la cesta y el colegio. ¿Dónde los guardas?',
    options: [
      'En el banco o el cofre: lo que necesitas pronto no se arriesga.',
      'En acciones del Astillero, que pueden subir mucho.',
      'En el negocio que más subió el mes pasado.',
      'Todo en oro.',
    ],
    hint: 'Lo que puede dar más también puede dar menos. ¿Puedes permitirte que en dos meses haya menos?',
  },
  accion: {
    question: 'Tienes 10 acciones de la Panadería, que tiene 100 en total. ¿Qué significa?',
    options: [
      'Que eres dueño del 10 % de la Panadería y de esa parte de lo que gane.',
      'Que la Panadería te regala pan.',
      'Que la Panadería te debe dinero.',
      'Que trabajas en la Panadería.',
    ],
    hint: 'Mira el cartel del negocio: pone "Tuyo: 10 %". Una acción es un trocito de algo.',
  },
  dividendo: {
    question: 'El Puerto pesquero llevaba tres trimestres pagando dividendo y este trimestre no ha pagado nada. ¿Por qué?',
    options: [
      'Porque ha habido tormenta y el negocio no ha ganado: el dividendo depende de que haya beneficio.',
      'Porque se ha olvidado.',
      'Porque vendiste tus acciones demasiado tarde.',
      'Porque Hacienda se lo ha quedado entero.',
    ],
    hint: 'El cupón de un bono estaba prometido. El dividendo, no. ¿De qué depende?',
  },
  cesta: {
    question: 'Tienes 100 eL para invertir en acciones. ¿Qué es más prudente?',
    options: [
      'Repartirlo entre varios negocios distintos, para que un mal golpe en uno no lo sea en todos.',
      'Ponerlo todo en el negocio que más te gusta.',
      'Ponerlo todo en el que más subió este mes.',
      'Comprar y vender cada día para aprovechar los cambios.',
    ],
    hint: 'Si llevas todos los huevos en una cesta y tropiezas… ¿cuántos se rompen?',
  },
  ciclos: {
    question: 'Este año el Taller de juguetes está de moda y su precio ha subido mucho. ¿Qué suele pasar si compras ahora por eso?',
    options: [
      'Que llegas tarde: las modas pasan y el que compra arriba suele comprar caro.',
      'Que seguirá subiendo siempre.',
      'Que cobrarás el doble de dividendo.',
      'Que el oro bajará.',
    ],
    hint: 'Las modas van y vienen. Si compras algo porque está arriba… ¿hacia dónde le queda más camino?',
  },
  fondo: {
    question: 'Metes 100 eL en el Fondo Isla. ¿Qué has comprado?',
    options: ['Un trocito de todos los negocios de la isla a la vez.', 'Solo acciones de la Panadería.', 'Un bono del Ayuntamiento.', 'Lingotes de oro.'],
    hint: 'El fondo es como una cesta ya preparada. Mira el edificio del fondo: ¿de cuántos negocios habla?',
  },
  tormenta: {
    question: 'Llega La Tormenta y todas las acciones caen un 30 % en un día. La Panadería sigue vendiendo el mismo pan. ¿Qué haces?',
    options: [
      'Nada: los negocios siguen ganando igual, solo ha cambiado el precio de hoy; quien vende ahora convierte la bajada en pérdida.',
      'Vender todo antes de que baje más.',
      'Pedir un préstamo a la Liebre para comprar más.',
      'Dejar de comprar comida para no gastar.',
    ],
    hint: '¿Ha cambiado la Panadería, o solo lo que la gente asustada paga hoy por ella?',
  },
  paciencia: {
    question: '¿Cuál es la mejor forma de jugar a Finfun?',
    options: [
      'Diez minutos al día, muchos días: lo importante pasa poco a poco.',
      'Muchas horas cada día para avanzar deprisa.',
      'Entrar una vez al mes y hacerlo todo de golpe.',
      'Copiar todo lo que haga la Liebre.',
    ],
    hint: 'Aquí un día tuyo es un mes de la isla. Lo importante no pasa deprisa… pasa cada día.',
  },
  independencia: {
    question: 'El huerto ampliado da tres meses de comida cada trimestre, justo lo que comes. ¿Por qué eso se llama independencia financiera?',
    options: [
      'Porque lo que producen tus inversiones cubre lo que necesitas para vivir, sin gastar la paga.',
      'Porque ya no necesitas al banco.',
      'Porque puedes dejar de jugar.',
      'Porque el huerto es gratis.',
    ],
    hint: 'Si el huerto te da de comer cada mes… ¿qué pasa con la paga? ¿La necesitas para comer?',
  },
  comida: {
    question: 'Tienes 12 eL, la despensa vacía y en la tienda hay un cómic que te encanta (4 eL) y la cesta pequeña (5 eL). ¿Qué compras primero?',
    options: ['La cesta: primero lo necesario y con lo que sobre, el deseo.', 'El cómic, que es más barato.', 'Nada, mejor ahorrarlo todo.', 'Acciones, que dan más.'],
    hint: 'Con la despensa vacía pierdes corazones. ¿Qué es necesario y qué es un deseo?',
  },
}

export const LESSONS: Lesson[] = [
  {
    id: 'inflacion',
    title: 'La inflación',
    icon: '📈',
    body: 'Casi todos los años los precios suben un poco. Con los mismos euroLukys compras un poco menos. Por eso el dinero quieto en el cofre pierde valor: hay que ponerlo a trabajar.',
  },
  {
    id: 'interes-compuesto',
    title: 'El interés compuesto',
    icon: '🌱',
    body: 'El banco paga interés sobre lo que tienes… incluido el interés que ya te dio antes. Es una bola de nieve: al principio crece despacio y luego cada vez más rápido. Cuanto antes empieces, más grande será.',
  },
  {
    id: 'bono',
    title: 'Qué es un bono',
    icon: '📜',
    body: 'Comprar un bono es prestar dinero. El Ayuntamiento te paga un cupón fijo cada trimestre y al final del plazo te devuelve lo prestado. Cuanto más tiempo prestas, más cupón te pagan.',
  },
  {
    id: 'impuestos',
    title: 'Los impuestos',
    icon: '🦉',
    body: 'Hacienda se lleva un 19 % de lo que ganas con tu dinero (intereses y cupones). Con eso se pagan las farolas y la escuela. Si pagas una vez al año en vez de en cada cobro, el dinero sigue creciendo mientras tanto.',
  },
  {
    id: 'riesgo',
    title: 'Riesgo y recompensa',
    icon: '⚖️',
    body: 'Lo que puede dar más también puede dar menos. El banco y los bonos son seguros y dan poco. Las acciones (Nivel 3) dan más… algunos años. Nunca pongas en lo arriesgado el dinero que necesitas pronto.',
  },
  {
    id: 'accion',
    title: 'Qué es una acción',
    icon: '📈',
    body: 'Una acción es un trocito de un negocio. Si la Panadería tiene 100 acciones y tú tienes 10, el 10 % de la Panadería es tuyo: una parte de lo que gana es para ti. El precio de la acción sube y baja según lo que gana el negocio… y según lo nerviosa que esté la gente.',
  },
  {
    id: 'dividendo',
    title: 'El dividendo no está prometido',
    icon: '🎁',
    body: 'El cupón de un bono estaba prometido. El dividendo de una acción, no: depende de cómo le haya ido al negocio ese trimestre. Si hay tormenta en el Puerto, ese trimestre no hay dividendo. A cambio, cuando el negocio va bien, el dividendo crece.',
  },
  {
    id: 'cesta',
    title: 'No pongas todos los huevos en la misma cesta',
    icon: '🧺',
    body: 'Si toda tu cartera es el Puerto y llega una tormenta, lo notas entero. Si tienes un poco de cada negocio, unos compensan a otros: unos años gana la Heladería, otros la Granja. Repartir no te hace ganar más, te hace dormir mejor.',
  },
  {
    id: 'ciclos',
    title: 'Modas y refugios',
    icon: '🪙',
    body: 'El Taller de juguetes depende de las modas, que nadie puede predecir: comprar lo que está arriba porque está arriba suele salir caro. El oro de la Cantera es lo contrario: no gana ni reparte nada, pero cuando todos tienen miedo lo quieren y sube. Un poco de oro amortigua las tormentas; mucho oro es una cartera que no crece.',
  },
  {
    id: 'fondo',
    title: 'Qué es un fondo',
    icon: '🏠',
    body: 'El Fondo Isla tiene un trocito igual de todos los negocios. Compras participaciones y ya estás repartido sin pensar. Es de acumulación: los dividendos que cobra no salen, se reinvierten y hacen subir la participación. Cobra una comisión pequeña cada año por hacerlo.',
  },
  {
    id: 'tormenta',
    title: 'Cuando todo cae',
    icon: '⛈️',
    body: 'Algún día todos los precios caen a la vez. Los negocios siguen ganando dinero, pero la gente vende asustada. Quien vende en la caída pierde de verdad; quien aguanta ve cómo los precios vuelven poco a poco y sigue cobrando dividendos mientras tanto.',
  },
  {
    id: 'paciencia',
    title: 'Espera y verás',
    icon: '🐢',
    body: 'Finfun no se juega durante horas: se juega diez minutos al día, muchos días. Aquí un día tuyo es un mes de la isla, y lo importante (los intereses, los dividendos, la despensa que se llena sola) no pasa deprisa: pasa cada día, un poco. Este juego entrena dos músculos que sirven para toda la vida: la paciencia y la constancia. Quien quiere tenerlo todo hoy, acaba como la Liebre.',
  },
  {
    id: 'independencia',
    title: 'Independencia financiera',
    icon: '🏝️',
    body: 'Cuando lo que producen tus inversiones paga lo que necesitas para vivir, eres libre: trabajas si quieres, no porque te haga falta. En la isla, el huerto ampliado da tres meses de comida cada trimestre: la despensa se llena sola. Eso es la independencia financiera, en pequeño.',
  },
  {
    id: 'comida',
    title: 'Primero lo necesario',
    icon: '🧺',
    body: 'Antes de invertir, asegúrate de que hay comida en la despensa. La cesta domiciliada se compra sola cuando hace falta, como los recibos de casa: pero solo si hay dinero. La cesta grande sale más barata por mes, y el huerto da comida sola cada tres meses: es una inversión que se come.',
  },
]
