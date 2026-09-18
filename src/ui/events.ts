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
    out.push({ id: 'hambre', icon: '😟', title: '¡No hay comida en casa!', detail: `Llevas ${game.hunger} ${game.hunger === 1 ? 'mes' : 'meses'} sin comer. Quedan ${left} antes del rescate (perderías lo del cofre). Compra una cesta en la tienda.`, view: 'tienda', tone: 'red' })
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
    out.push({ id: 'bellotas', icon: '🌰', title: 'Bellotas escondidas', detail: `Quedan ${acornsLeft} de ${TASK_ACORNS}. Recógelas y gana dinero. Pista: te señala una. Resolver: las enseña todas, sin premio.`, view: 'isla', tone: 'green' })
  }
  const lastHuerto = game.ledger.filter((e) => e.kind === 'huerto' && e.amountCents === 0).slice(-1)[0]
  if (lastHuerto && lastHuerto.month === game.processedMonth) {
    out.push({ id: 'huerto', icon: '🌾', title: 'El huerto ha dado una cesta', detail: 'Ya está en tu despensa: dos meses más de comida sin pagar nada.', view: 'huerto', tone: 'green' })
  }
  const lastCoupon = game.ledger.filter((e) => e.kind === 'cupon' || e.kind === 'vencimiento').slice(-1)[0]
  if (lastCoupon && lastCoupon.month === game.processedMonth) {
    out.push({ id: 'cupon', icon: '🏛️', title: lastCoupon.kind === 'cupon' ? 'Ha llegado un cupón' : 'El Ayuntamiento te ha devuelto un bono', detail: `+${formatCents(lastCoupon.amountCents)} en el cofre. ${lastCoupon.label}.`, view: 'ayuntamiento', tone: 'blue' })
  }
  game.ledger
    .filter((e) => (e.kind === 'dividendo' || e.kind === 'tormenta' || (e.kind === 'noticia' && !e.label.startsWith('La Liebre no puede'))) && e.month === game.processedMonth)
    .forEach((e, i) => {
      if (e.kind === 'tormenta' && e.label.startsWith('LA TORMENTA')) out.push({ id: `crash-${e.month}`, icon: '⛈️', title: '¡La Tormenta!', detail: 'Todos los precios han caído a la vez. Los negocios siguen ganando. No vendas: los precios vuelven.', view: 'mercado', tone: 'red' })
      else if (e.kind === 'tormenta') out.push({ id: `tormenta-${e.month}-${i}`, icon: '⛈️', title: e.label.startsWith('Mala cosecha') ? 'Mala cosecha en la Granja' : 'Tormenta en el Puerto', detail: `${e.label} Si tienes acciones, aguanta.`, view: 'mercado', tone: 'red' })
      else if (e.kind === 'noticia') out.push({ id: `noticia-${e.month}-${i}`, icon: '📰', title: 'Noticias de la isla', detail: e.label, view: 'mercado', tone: 'blue' })
      else out.push({ id: `div-${e.label}`, icon: '🎁', title: 'Ha llegado un dividendo', detail: `+${formatCents(e.amountCents)} en el cofre. ${e.label}.`, view: 'mercado', tone: 'purple' })
    })
  const rescue = game.ledger.filter((e) => e.kind === 'rescate').slice(-1)[0]
  if (rescue && rescue.month === game.processedMonth) {
    out.push({ id: `rescate-${rescue.month}`, icon: '🍲', title: 'Doña Tortuga te ha rescatado', detail: rescue.label, view: 'tienda', tone: 'red' })
  }
  const loanBack = game.ledger.filter((e) => e.kind === 'devolucion').slice(-1)[0]
  if (loanBack && loanBack.month === game.processedMonth) {
    out.push({ id: 'devolucion', icon: '🐰', title: 'La Liebre te ha devuelto el préstamo', detail: `+${formatCents(loanBack.amountCents)} en el cofre. Prestaste 5 y vuelven 6: eso es el interés.`, view: 'cofre', tone: 'green' })
  }
  if (game.liebreLoan?.late && game.ledger.some((e) => e.kind === 'noticia' && e.month === game.processedMonth && e.label.startsWith('La Liebre no puede'))) {
    out.push({ id: 'retraso', icon: '🐰', title: 'La Liebre se retrasa', detail: 'No puede devolverte el préstamo todavía. Prestar a alguien poco fiable tiene este riesgo; por eso cobras más que en el banco.', view: 'liebre', tone: 'orange' })
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
