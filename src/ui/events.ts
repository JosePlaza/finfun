/** EVENTOS PENDIENTES: cosas que el jugador puede hacer ahora mismo. Se derivan del estado, no se guardan. */
import { HUNGER_DEATH_MONTHS, missionsFor, TASK_ACORNS, formatCents, type GameState } from '../sim'
import type { View } from '../store/game'

export interface PendingEvent {
  id: string
  icon: string
  title: string
  detail: string
  /** Dónde lleva el botón "Ir". */
  view: View
  tone: 'orange' | 'green' | 'blue' | 'purple' | 'red'
}

export function pendingEvents(game: GameState, acornsLeft: number, seen: { seenDiary: number; seenBankOpen: boolean; seenWorld: number; seenMissions: number }): PendingEvent[] {
  const out: PendingEvent[] = []
  // Lo urgente primero: la comida y la ruleta del año.
  if (game.hunger > 0) {
    const left = HUNGER_DEATH_MONTHS - game.hunger
    out.push({ id: 'hambre', icon: '😟', title: '¡No hay comida en casa!', detail: `Llevas ${game.hunger} ${game.hunger === 1 ? 'mes' : 'meses'} sin comer. Quedan ${left}. Compra una cesta en la tienda.`, view: 'tienda', tone: 'red' })
  } else if (game.foodMonths <= 1) {
    out.push({ id: 'despensa', icon: '🧺', title: 'La despensa se acaba', detail: game.foodMonths === 0 ? 'Hoy se ha comido lo último. Compra comida antes de mañana.' : 'Queda comida para un mes. Ve a la tienda.', view: 'tienda', tone: 'orange' })
  }
  if (game.pendingYearEnds.length > 0) {
    const y = game.pendingYearEnds[0].year
    out.push({ id: 'ruleta', icon: '🎡', title: `Se cierra el año ${y}`, detail: 'Gira la ruleta de la inflación para saber cuánto suben los precios.', view: 'faro', tone: 'purple' })
  }
  if (game.mailboxCents > 0) {
    out.push({ id: 'paga', icon: '✉️', title: 'Tienes paga en el buzón', detail: `+${formatCents(game.mailboxCents)} esperando en tu casa`, view: 'casa', tone: 'orange' })
  }
  if (acornsLeft > 0) {
    out.push({ id: 'bellotas', icon: '🌰', title: 'Bellotas escondidas', detail: `Quedan ${acornsLeft} de ${TASK_ACORNS}. Recógelas y gana dinero.`, view: 'isla', tone: 'green' })
  }
  if (game.bankUnlocked && !seen.seenBankOpen) {
    out.push({ id: 'banco', icon: '🏦', title: '¡El banco ha abierto!', detail: 'Ya puedes llevar tu dinero y verlo crecer.', view: 'banco', tone: 'blue' })
  }
  const lastHuerto = game.ledger.filter((e) => e.kind === 'huerto' && e.amountCents === 0).slice(-1)[0]
  if (lastHuerto && lastHuerto.month === game.processedMonth) {
    out.push({ id: 'huerto', icon: '🌾', title: 'El huerto ha dado una cesta', detail: 'Ya está en tu despensa: dos meses más de comida sin pagar nada.', view: 'huerto', tone: 'green' })
  }
  const lastCoupon = game.ledger.filter((e) => e.kind === 'cupon' || e.kind === 'vencimiento').slice(-1)[0]
  if (lastCoupon && lastCoupon.month === game.processedMonth) {
    out.push({ id: 'cupon', icon: '🏛️', title: lastCoupon.kind === 'cupon' ? 'Ha llegado un cupón' : 'El Ayuntamiento te ha devuelto un bono', detail: `+${formatCents(lastCoupon.amountCents)} en el cofre. ${lastCoupon.label}.`, view: 'ayuntamiento', tone: 'blue' })
  }
  if (game.diary.length > seen.seenDiary) {
    out.push({ id: 'diario', icon: '📖', title: 'Doña Tortuga ha escrito en su diario', detail: `Cierre del año ${game.diary[game.diary.length - 1].year}. Léelo en el faro.`, view: 'faro', tone: 'blue' })
  }
  const board = missionsFor(game)
  if (board.completed > seen.seenMissions) {
    out.push({ id: 'mision', icon: '📜', title: '¡Misión completada!', detail: `${board.completed} de ${board.total} misiones del nivel.`, view: 'misiones', tone: 'purple' })
  }
  if (game.world > seen.seenWorld) {
    out.push({ id: 'mundo', icon: '🎉', title: `Se abre el Nivel ${game.world}`, detail: 'Hay obras nuevas en la isla.', view: 'misiones', tone: 'purple' })
  }
  return out
}
