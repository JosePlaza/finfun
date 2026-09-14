import { calendarOf, currentMonth, MONTH_NAMES, TASK_ACORNS } from '../sim'
import { useGame } from '../store/game'
import { Amount } from './Coin'
import { pendingEvents } from './events'

const SEASON_EMOJI: Record<string, string> = { primavera: '🌸', verano: '☀️', otoño: '🍂', invierno: '❄️' }

/**
 * HUD del juego. Arriba a la izquierda: la isla y la fecha, y debajo los botones de Misiones y Eventos
 * (con bullet rojo cuando hay algo pendiente). Arriba a la derecha: el patrimonio, que se desglosa al pulsar.
 * No hay menú inferior: por la isla se navega tocando los edificios.
 */
export function TopBar() {
  const game = useGame((s) => s.game)!
  const nowMs = useGame((s) => s.nowMs)
  const view = useGame((s) => s.view)
  const setView = useGame((s) => s.setView)
  const acornsFound = useGame((s) => s.acornsFound)
  const seenDiary = useGame((s) => s.seenDiary)
  const seenBankOpen = useGame((s) => s.seenBankOpen)
  const seenWorld = useGame((s) => s.seenWorld)
  const seenMissions = useGame((s) => s.seenMissions)
  const seen = { seenDiary, seenBankOpen, seenWorld, seenMissions }
  const month = currentMonth(game, nowMs)
  const cal = calendarOf(month)
  const total = game.huchaCents + game.bankCents
  const acornsLeft = game.taskDoneMonth < month ? TASK_ACORNS - acornsFound.length : 0
  const events = pendingEvents(game, acornsLeft, seen)
  const onIsland = view === 'isla'

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 safe-top px-3">
      <div className="flex items-start justify-between gap-2">
        {/* Nombre de la isla y fecha */}
        <div className="pointer-events-auto g-pill !cursor-default !px-4 !py-1.5 flex-col !items-start !gap-0">
          <div className="g-title text-[16px] leading-tight truncate max-w-[44vw]">{game.islandName}</div>
          <div className="text-[12px] font-bold text-ink-l leading-tight font-sans">
            {SEASON_EMOJI[cal.season]} Año {cal.year} · {MONTH_NAMES[cal.monthOfYear - 1]}
          </div>
        </div>

        {/* Patrimonio */}
        <button type="button" onClick={() => setView(view === 'patrimonio' ? 'isla' : 'patrimonio')} className="pointer-events-auto g-pill">
          <Amount cents={total} size="lg" className="text-ink" />
          <span className="text-ink-3 text-lg leading-none -ml-1" aria-hidden="true">▸</span>
        </button>
      </div>

      {/* Botones verticales: Misiones y Eventos */}
      {onIsland && (
        <div className="mt-3 flex flex-col items-start gap-3.5">
          <button type="button" onClick={() => setView('misiones')} className="pointer-events-auto g-hud-btn g-hud-btn--purple" aria-label="Misiones" title="Misiones">
            <span className="g-hud-btn__icon" aria-hidden="true">📜</span>
          </button>
          <button type="button" onClick={() => setView('eventos')} className="pointer-events-auto g-hud-btn g-hud-btn--orange" aria-label="Eventos pendientes" title="Eventos">
            <span className="g-hud-btn__icon" aria-hidden="true">🔔</span>
            {events.length > 0 && <span className="g-badge">{events.length}</span>}
          </button>
        </div>
      )}
    </div>
  )
}
