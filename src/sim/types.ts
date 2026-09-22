export type Season = 'primavera' | 'verano' | 'otoño' | 'invierno'

export interface Calendar {
  /** Índice absoluto del mes desde la creación de la isla (0 = primer mes). */
  month: number
  /** Año de isla, empezando en 1. */
  year: number
  /** Mes dentro del año, 1..12. */
  monthOfYear: number
  season: Season
  /** Índice de estación dentro del año, 0..3. */
  seasonIndex: number
  /** true si este mes es el último del año (mes 12). */
  isYearEnd: boolean
}

export interface ShopItemState {
  id: string
  /** Precio actual en céntimos (sube con la inflación). */
  priceCents: number
  /** Precio del año anterior, para la etiqueta tachada. */
  previousPriceCents: number
}

export interface Purchase {
  itemId: string
  month: number
}

export type LedgerKind =
  | 'paga'
  | 'recogida'
  | 'interes'
  | 'compra'
  | 'tarea'
  | 'inflacion'
  | 'deposito'
  | 'retirada'
  | 'banco-abierto'
  | 'comida'
  | 'huerto'
  | 'bono'
  | 'cupon'
  | 'vencimiento'
  | 'impuestos'
  | 'dividendo'
  | 'tormenta'
  | 'noticia'
  | 'acciones-compra'
  | 'acciones-venta'
  | 'fondo-compra'
  | 'fondo-venta'
  | 'prestamo'
  | 'devolucion'
  | 'rescate'

export interface LedgerEvent {
  kind: LedgerKind
  month: number
  amountCents: number
  label: string
}

export interface DiaryEntry {
  /** Año de isla que se cierra (1 = primer año). */
  year: number
  inflationBps: number
  /** Ejemplo de precio para explicar la inflación. */
  example: { itemId: string; name: string; beforeCents: number; afterCents: number }
  /** Lo que había en la hucha al cerrar el año. */
  huchaCents: number
  /** Lo que habría en el banco si ese dinero hubiera estado allí todo el año. */
  bankIfAllCents: number
  bankCents: number
  bankInterestYearCents: number
  spentYearCents: number
  earnedTasksYearCents: number
  /** Valor de las acciones al cerrar el año y dividendos cobrados (Nivel 3). */
  stocksValueCents?: number
  dividendsYearCents?: number
  firstTime: boolean
}

/** Un año cerrado cuya ruleta de inflación aún no ha girado el jugador. Guarda la foto que necesita el diario. */
export interface PendingYearEnd {
  year: number
  month: number
  huchaCents: number
  bankCents: number
  bankInterestYearCents: number
  spentYearCents: number
  earnedTasksYearCents: number
  stocksValueCents?: number
  dividendsYearCents?: number
}

/** Bono comprado al Ayuntamiento: préstamo a plazo fijo con cupón trimestral. */
export interface Bond {
  id: string
  offerId: string
  principalCents: number
  /** Cupón anual en puntos básicos. */
  couponBps: number
  boughtMonth: number
  maturityMonth: number
  couponsPaid: number
}

/** Cómo paga el jugador a Hacienda: retención en cada cobro o una declaración al cerrar el año. */
export type TaxMode = 'cada-cobro' | 'anual'

export interface Declaration {
  year: number
  mode: TaxMode
  /** Rendimientos brutos del año (intereses + cupones). */
  grossCents: number
  taxCents: number
}

/** Acciones de un negocio en manos del jugador, con su precio medio de compra. */
export interface Holding {
  shares: number
  avgCostCents: number
}

export interface GameState {
  version: 1
  islandName: string
  seed: number
  /** Momento de creación de la isla en ms (hora de servidor si hay Supabase). */
  epochMs: number
  /** Último mes ya procesado. -1 significa que aún no ha empezado el mes 0. */
  processedMonth: number
  world: number
  /** Céntimos en la hucha (disponibles para gastar o colocar). */
  huchaCents: number
  /** Céntimos de paga acumulados en el buzón, pendientes de recoger. */
  mailboxCents: number
  bankCents: number
  bankUnlocked: boolean
  taxesUnlocked: boolean
  shop: ShopItemState[]
  purchases: Purchase[]
  diary: DiaryEntry[]
  ledger: LedgerEvent[]
  inflationHistoryBps: number[]
  /** Mes en el que se hizo la última tarea diaria (-1 = ninguna). */
  taskDoneMonth: number
  /** Acumuladores del año en curso para el diario. */
  yearSpentCents: number
  yearTasksCents: number
  yearBankInterestCents: number
  /** Total de euroLukys ganados con tareas en toda la partida. */
  totalTasksCents: number
  /** Días (meses de isla) en los que se completó la tarea de las bellotas. */
  tasksCompleted: number

  // ───── Comida y vida ─────
  /** Meses de comida que quedan en la despensa. Cada mes se consume uno. */
  foodMonths: number
  /** Meses seguidos sin comer. A los 6, Doña Tortuga te rescata (se pierde lo del cofre). */
  hunger: number
  /** Ya no se usa: la aventura no termina, hay rescate. Se conserva por compatibilidad de partidas. */
  dead: boolean
  deathMonth: number | null
  /** Cesta domiciliada: cuando la despensa se vacía, la isla compra sola la cesta pequeña (cofre, y si no, banco). */
  autoFood: boolean
  /** Rescates de Doña Tortuga (seis meses sin comer) y mes del último (-1 = ninguno). */
  rescues: number
  lastRescueMonth: number
  /** Mes en que se construyó el huerto (null = sin construir). Da una cesta grande cada 3 meses. */
  huertoBuiltMonth: number | null
  /** Mes en que se amplió el huerto (null = sin ampliar). Ampliado da 3 meses de comida cada trimestre. */
  huertoUpgradedMonth: number | null

  // ───── Cierre de año: la ruleta la gira el jugador ─────
  pendingYearEnds: PendingYearEnd[]

  // ───── Nivel 2: bonos y Hacienda ─────
  bonds: Bond[]
  bondsBought: number
  taxMode: TaxMode
  /** ¿Ha pasado el jugador por Hacienda a elegir? */
  taxModeChosen: boolean
  /** Rendimientos brutos del año pendientes de declarar (modo anual). */
  yearPendingTaxableCents: number
  /** Impuestos pagados en el año en curso (retenciones o declaración). */
  yearTaxCents: number
  /** Impuestos que no se pudieron pagar al cerrar el año; se cobran en cuanto hay dinero. */
  taxDebtCents: number
  declarations: Declaration[]
  /** Lecciones aprendidas en la escuela (cuestionario superado). */
  lessonsRead: string[]
  /** Último mes en que se falló el cuestionario de cada lección: hasta el mes siguiente no se puede repetir. */
  quizFailedMonth: Record<string, number>

  // ───── Nivel 3: acciones ─────
  holdings: Record<string, Holding>
  /** Negocios de los que se han comprado acciones alguna vez (misiones). */
  businessesBought: string[]
  /** Dividendos cobrados en el año (para el diario). */
  yearDividendsCents: number
  /** Pérdidas realizadas del año que compensan ganancias ante Hacienda. */
  yearLossCents: number
  /** Tormentas aguantadas con acciones del negocio sin vender hasta las siguientes cuentas. */
  stormsSurvived: number
  /** Tormenta en curso: negocio y acciones que se tenían al publicarse (null si ninguna). */
  stormWatch: { businessId: string; shares: number; sinceMonth: number } | null

  // ───── Nivel 4: La Tormenta y el Fondo Isla ─────
  /** Mes en que llega La Tormenta (se fija al abrir el Nivel 4; null antes). */
  crashMonth: number | null
  /** Acciones totales que se tenían al llegar La Tormenta, para la misión de aguantar. */
  crashWatch: { shares: number; fundUnits: number } | null
  crashSurvived: boolean
  /** Participaciones del Fondo Isla (pueden ser fracciones) y lo pagado por ellas. */
  fundUnits: number
  fundCostCents: number

  // ───── La isla de la Liebre ─────
  /** Mes en que se abrió cada nivel: [0] = Nivel 1 (siempre 0), [1] = Nivel 2… Alimenta la simulación de la Liebre. */
  worldOpened: number[]
  /** Visitas a la isla de la Liebre y mes de la última (-1 = nunca). */
  liebreVisits: number
  liebreLastVisitMonth: number
  /** Préstamo vivo a la Liebre (null si ninguno). */
  liebreLoan: LiebreLoan | null
  /** Préstamos devueltos y cuántos se retrasaron. */
  liebreLoansRepaid: number
  liebreLoansLate: number
  /** Patrimonio al cierre de cada mes (índice = mes). -1 = desconocido (partidas antiguas). */
  netWorthHistory: number[]
  /** Paso del recorrido inicial con Doña Tortuga (0 = empieza; TUTORIAL_DONE = terminado o saltado). */
  tutorialStep: number
  /** Días (meses de isla) distintos en que se ha abierto el juego, y el último visto. */
  daysPlayed: number
  lastSeenMonth: number
  /** Insignias conseguidas, como "familia-nivel" (ver sim/badges.ts). */
  badges: string[]
}

export interface LiebreLoan {
  lentMonth: number
  /** Mes en que promete devolverlo (puede retrasarse una vez). */
  dueMonth: number
  amountCents: number
  repayCents: number
  late: boolean
}
