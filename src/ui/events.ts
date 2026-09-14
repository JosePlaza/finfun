/** EVENTOS PENDIENTES: cosas que el jugador puede hacer ahora mismo. Se derivan del estado, no se guardan. */
import { missionsFor, TASK_ACORNS, formatCents, type GameState } from '../sim'
import type { View } from '../store/game'

export interface PendingEvent {
  id: string
  icon: string
  title: string
  detail: string
  /** Dónde lleva el botón "Ir". */
  view: View
  tone: 'orange' | 'green' | 'blue' | 'purple'
}

export function pendingEvents(game: GameState, acornsLeft: number, seen: { seenDiary: number; seenBankOpen: boolean; seenWorld: number; seenMissions: number }): PendingEvent[] {
  const out: PendingEvent[] = []
  if (game.mailboxCents > 0) {
    out.push({ id: 'paga', icon: '✉️', title: 'Tienes paga en el buzón', detail: `+${formatCents(game.mailboxCents)} esperando en tu casa`, view: 'casa', tone: 'orange' })
  }
  if (acornsLeft > 0) {
    out.push({ id: 'bellotas', icon: '🌰', title: 'Bellotas escondidas', detail: `Quedan ${acornsLeft} de ${TASK_ACORNS}. Recógelas y gana dinero.`, view: 'isla', tone: 'green' })
  }
  if (game.bankUnlocked && !seen.seenBankOpen) {
    out.push({ id: 'banco', icon: '🏦', title: '¡El banco ha abierto!', detail: 'Ya puedes llevar tu dinero y verlo crecer.', view: 'banco', tone: 'blue' })
  }
  if (game.diary.length > seen.seenDiary) {
    out.push({ id: 'diario', icon: '📖', title: 'Doña Tortuga ha escrito en su diario', detail: `Cierre del año ${game.diary[game.diary.length - 1].year}. Léelo en el faro.`, view: 'faro', tone: 'blue' })
  }
  const board = missionsFor(game)
  if (board.completed > seen.seenMissions) {
    out.push({ id: 'mision', icon: '📜', title: '¡Misión completada!', detail: `${board.completed} de ${board.total} misiones del mundo.`, view: 'misiones', tone: 'purple' })
  }
  if (game.world > seen.seenWorld) {
    out.push({ id: 'mundo', icon: '🎉', title: `Se abre el Mundo ${game.world}`, detail: 'Hay obras nuevas en la isla.', view: 'misiones', tone: 'purple' })
  }
  return out
}
