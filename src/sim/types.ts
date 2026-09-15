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
  /** Meses seguidos sin comer. A los 6 la aventura termina. */
  hunger: number
  dead: boolean
  deathMonth: number | null
  /** Mes en que se construyó el huerto (null = sin construir). Da una cesta grande cada 3 meses. */
  huertoBuiltMonth: number | null

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
  /** Lecciones leídas en la escuela. */
  lessonsRead: string[]
}
