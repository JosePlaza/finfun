/**
 * MISIONES. Objetivos claros que enseñan el juego y marcan el paso de nivel.
 * Se calculan a partir del estado (nunca se guardan): así se pueden cambiar sin migraciones.
 */
import { LESSONS, WORLD2_UNLOCK_ITEM } from './config'
import type { GameState } from './types'
import { bondsTotal } from './engine'

export interface Mission {
  id: string
  title: string
  /** Qué hay que hacer, en una frase para un niño. */
  hint: string
  /** Dónde se hace (lugar del nivel), para poder ir directamente. */
  place: 'casa' | 'cofre' | 'banco' | 'tienda' | 'faro' | 'isla' | 'huerto' | 'ayuntamiento' | 'hacienda' | 'escuela'
  progress: number
  goal: number
  done: boolean
  /** Icono del juego. */
  icon: string
}

export interface MissionBoard {
  world: number
  worldName: string
  missions: Mission[]
  completed: number
  total: number
  /** La primera misión pendiente, para el aviso del HUD. */
  next: Mission | null
  /** Qué se abre al completar todas. */
  reward: string
}

function m(id: string, title: string, hint: string, place: Mission['place'], icon: string, progress: number, goal: number): Mission {
  const p = Math.min(progress, goal)
  return { id, title, hint, place, icon, progress: p, goal, done: p >= goal }
}

export function missionsFor(state: GameState): MissionBoard {
  if (state.world >= 3) return world3Board(state)
  if (state.world === 2) return world2Board(state)
  return world1Board(state)
}

function world1Board(state: GameState): MissionBoard {
  const collected = state.ledger.some((e) => e.kind === 'recogida') || state.huchaCents + state.bankCents > 0 || state.purchases.length > 0
  const hasBici = state.purchases.some((p) => p.itemId === WORLD2_UNLOCK_ITEM)
  const food = state.purchases.filter((p) => p.itemId.startsWith('cesta')).length
  const missions: Mission[] = [
    m('paga', 'Recoge tu primera paga', 'Toca las monedas que flotan sobre tu casa.', 'casa', '✉️', collected ? 1 : 0, 1),
    m('comida', 'Llena la despensa', 'Compra una cesta de comida en la tienda. Sin comer, la aventura se acaba.', 'tienda', '🧺', food, 1),
    m('bellotas', 'Recoge bellotas 3 días', 'Cada día hay 5 bellotas escondidas por la isla. Recógelas y ganarás dinero.', 'isla', '🌰', state.tasksCompleted ?? 0, 3),
    m('deseo', 'Compra algo que te apetezca', 'Un helado vale. Gastar también es decidir.', 'tienda', '🛍️', state.purchases.filter((p) => !p.itemId.startsWith('cesta')).length, 1),
    m('ahorro', 'Guarda 100 en el cofre', 'Junta 100 euroLukys sin gastarlos. Espera y verás.', 'cofre', '🪙', state.huchaCents + state.bankCents, 100_00),
    m('banco', 'Lleva 50 al banco', 'Cuando abra el banco, mete allí al menos 50 euroLukys.', 'banco', '🏦', state.bankCents, 50_00),
    m('bici', 'Compra la bici', 'Cuesta 180. Con ella se abre el camino al Ayuntamiento y a los bonos.', 'tienda', '🚲', hasBici ? 1 : 0, 1),
  ]
  return board(1, 'La Isla', missions, 'Nivel 2 · El Ayuntamiento: bonos y Don Búho')
}

function world2Board(state: GameState): MissionBoard {
  const coupons = state.ledger.filter((e) => e.kind === 'cupon').length
  const missions: Mission[] = [
    m('bono', 'Compra tu primer bono', 'En el Ayuntamiento: prestas dinero y te pagan un cupón cada trimestre.', 'ayuntamiento', '📜', state.bondsBought ?? 0, 1),
    m('cupon', 'Cobra un cupón', 'A los tres meses de comprar un bono llega el primer cupón al cofre.', 'ayuntamiento', '🪙', coupons, 1),
    m('hacienda', 'Visita a Don Búho', 'Decide en Hacienda si pagas en cada cobro o una vez al año.', 'hacienda', '🦉', state.taxModeChosen ? 1 : 0, 1),
    m('lecciones', 'Lee 3 lecciones', 'En la escuela, Doña Tortuga explica lo que pasa con tu dinero.', 'escuela', '🏫', (state.lessonsRead ?? []).length, 3),
    m('prestamista', 'Ten 200 prestados a la vez', 'Suma 200 euroLukys en bonos vivos.', 'ayuntamiento', '🏛️', bondsTotal(state), 200_00),
    m('patrimonio', 'Llega a 600 de patrimonio', 'Cofre, banco y bonos juntos. Cada parte suma.', 'cofre', '💰', state.huchaCents + state.bankCents + bondsTotal(state), 600_00),
  ]
  return board(2, 'El Ayuntamiento', missions, 'Nivel 3 · El Mercado: acciones y dividendos')
}

function world3Board(state: GameState): MissionBoard {
  const missions: Mission[] = [
    m('huerto', 'Construye el huerto', 'Cuesta 1000 y da una cesta grande cada tres meses: una inversión que se come.', 'huerto', '🌾', state.huertoBuiltMonth !== null ? 1 : 0, 1),
    m('lecciones-todas', 'Lee todas las lecciones', 'La escuela tiene una lección por cada idea importante.', 'escuela', '🏫', (state.lessonsRead ?? []).length, LESSONS.length),
  ]
  return board(3, 'El Mercado', missions, 'Nivel 4 · La Tormenta (próximamente)')
}

function board(world: number, worldName: string, missions: Mission[], reward: string): MissionBoard {
  const completed = missions.filter((x) => x.done).length
  return { world, worldName, missions, completed, total: missions.length, next: missions.find((x) => !x.done) ?? null, reward }
}
