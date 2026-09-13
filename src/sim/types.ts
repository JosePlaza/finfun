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
}
