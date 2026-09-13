/**
 * MISIONES. Objetivos claros que enseñan el juego y marcan el paso de mundo.
 * Se calculan a partir del estado (nunca se guardan): así se pueden cambiar sin migraciones.
 */
import { WORLD2_UNLOCK_ITEM } from './config'
import type { GameState } from './types'

export interface Mission {
  id: string
  title: string
  /** Qué hay que hacer, en una frase para un niño. */
  hint: string
  /** Dónde se hace (lugar del mundo), para poder ir directamente. */
  place: 'casa' | 'cofre' | 'banco' | 'tienda' | 'faro' | 'isla'
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
  const collected = state.ledger.some((e) => e.kind === 'recogida') || state.huchaCents + state.bankCents > 0 || state.purchases.length > 0
  const hasBici = state.purchases.some((p) => p.itemId === WORLD2_UNLOCK_ITEM)
  const missions: Mission[] = [
    m('paga', 'Recoge tu primera paga', 'Toca las monedas que flotan sobre tu casa.', 'casa', '✉️', collected ? 1 : 0, 1),
    m('bellotas', 'Recoge bellotas 3 días', 'Cada día hay 5 bellotas escondidas por la isla. Recógelas y ganarás dinero.', 'isla', '🌰', state.tasksCompleted ?? 0, 3),
    m('deseo', 'Compra algo en la tienda', 'Un helado vale. Gastar también es decidir.', 'tienda', '🛍️', state.purchases.length, 1),
    m('ahorro', 'Guarda 100 en el cofre', 'Junta 100 euroLukys sin gastarlos. Espera y verás.', 'cofre', '🪙', state.huchaCents + state.bankCents, 100_00),
    m('banco', 'Lleva 50 al banco', 'Cuando abra el banco, mete allí al menos 50 euroLukys.', 'banco', '🏦', state.bankCents, 50_00),
    m('bici', 'Compra la bici', 'Cuesta 180. Con ella se abre el camino al Ayuntamiento y a los bonos.', 'tienda', '🚲', hasBici ? 1 : 0, 1),
  ]
  const completed = missions.filter((x) => x.done).length
  return {
    world: 1,
    worldName: 'La Isla',
    missions,
    completed,
    total: missions.length,
    next: missions.find((x) => !x.done) ?? null,
    reward: 'Mundo 2 · El Ayuntamiento: bonos y Don Búho',
  }
}
