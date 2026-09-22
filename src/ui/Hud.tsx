import { bondsTotal, calendarOf, currentMonth, HUNGER_DEATH_MONTHS, MONTH_NAMES, stocksValue, fundValue, TASK_ACORNS, TUTORIAL_DONE } from '../sim'
import { COACH_STEPS } from './coachSteps'
import { useGame } from '../store/game'
import { Amount } from './Coin'
import { pendingEvents } from './events'
import { AvatarHead } from './AvatarHead'

const SEASON_EMOJI: Record<string, string> = { primavera: '🌸', verano: '☀️', otoño: '🍂', invierno: '❄️' }

/**
 * HUD del juego. Arriba a la izquierda: la isla y la fecha, y debajo los botones de Misiones y Eventos
 * (con bullet rojo cuando hay algo pendiente). Arriba a la derecha: la salud y el patrimonio (que se desglosa al pulsar). Debajo, dos botones a cada lado a la misma altura: Misiones y Eventos a la izquierda, Perfil y Ajustes a la derecha.
 * No hay menú inferior: por la isla se navega tocando los edificios.
 */
export function TopBar() {
  const game = useGame((s) => s.game)!
  const nowMs = useGame((s) => s.nowMs)
  const view = useGame((s) => s.view)
  const setView = useGame((s) => s.setView)
  const trip = useGame((s) => s.trip)
  const returnHome = useGame((s) => s.returnHome)
  const avatar = useGame((s) => s.avatar)
  const camOffCenter = useGame((s) => s.camOffCenter)
  const recenter = useGame((s) => s.recenter)
  const coachHud = game.tutorialStep < TUTORIAL_DONE ? COACH_STEPS[game.tutorialStep]?.hud : undefined
  const acornsFound = useGame((s) => s.acornsFound)
  const seenDiary = useGame((s) => s.seenDiary)
  const seenBankOpen = useGame((s) => s.seenBankOpen)
  const seenWorld = useGame((s) => s.seenWorld)
  const seenMissions = useGame((s) => s.seenMissions)
  const seenMarketMonth = useGame((s) => s.seenMarketMonth)
  const seen = { seenDiary, seenBankOpen, seenWorld, seenMissions, seenMarketMonth }
  const month = currentMonth(game, nowMs)
  const cal = calendarOf(month)
  const total = game.huchaCents + game.bankCents + bondsTotal(game) + stocksValue(game, month) + fundValue(game, month)
  const acornsLeft = game.taskDoneMonth < month ? TASK_ACORNS - acornsFound.length : 0
  const events = pendingEvents(game, acornsLeft, seen)
  const onIsland = view === 'isla' && trip === 'home'

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 safe-top px-3">
      {/* Rejilla de dos columnas: arriba las píldoras, debajo dos botones a cada lado, siempre a la misma altura. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-3">
        {/* Nombre de la isla y fecha */}
        <div className="pointer-events-auto g-pill !cursor-default !px-4 !py-1.5 flex-col !items-start !gap-0 justify-self-start max-w-full min-w-0 overflow-hidden">
          <div className="g-title text-[16px] leading-tight truncate max-w-full">{game.islandName}</div>
          <div className="text-[12px] font-bold text-ink-l leading-tight font-sans whitespace-nowrap">
            {SEASON_EMOJI[cal.season]} Año {cal.year} · {MONTH_NAMES[cal.monthOfYear - 1]}
          </div>
        </div>

        <div className="flex items-start gap-2 justify-self-end">
          {/* Salud: seis corazones; cada mes sin comer se apaga uno */}
          <Hearts hunger={game.hunger} foodMonths={game.foodMonths} onTap={() => setView('tienda')} />
          {/* Patrimonio */}
          <button type="button" onClick={() => setView(view === 'patrimonio' ? 'isla' : 'patrimonio')} className="pointer-events-auto g-pill">
            {/* En la píldora, sin céntimos: el detalle está en el desglose. */}
            <Amount cents={Math.floor(total / 100) * 100} size="md" className="text-ink" />
            <span className="text-ink-3 text-lg leading-none -ml-1" aria-hidden="true">
              ▸
            </span>
          </button>
        </div>

        {onIsland && (
          <>
            {/* Izquierda: Misiones y Eventos */}
            <div className="flex flex-col items-start gap-3.5">
              <button
                type="button"
                onClick={() => setView('misiones')}
                className={`pointer-events-auto g-hud-btn g-hud-btn--purple ${coachHud === 'misiones' ? 'g-hud-btn--pulse' : ''}`}
                aria-label="Misiones"
                title="Misiones"
              >
                <span className="g-hud-btn__icon" aria-hidden="true">
                  📜
                </span>
              </button>
              <button
                type="button"
                onClick={() => setView('eventos')}
                className={`pointer-events-auto g-hud-btn g-hud-btn--orange ${coachHud === 'eventos' ? 'g-hud-btn--pulse' : ''}`}
                aria-label="Eventos pendientes"
                title="Eventos"
              >
                <span className="g-hud-btn__icon" aria-hidden="true">
                  🔔
                </span>
                {events.length > 0 && <span className="g-badge">{events.length}</span>}
              </button>
            </div>
            {/* Derecha: Perfil (el avatar del jugador) y Ajustes */}
            <div className="flex flex-col items-end gap-3.5 justify-self-end">
              <button
                type="button"
                onClick={() => setView('perfil')}
                className="pointer-events-auto g-hud-btn g-hud-btn--green g-hud-btn--avatar"
                aria-label="Perfil"
                title="Perfil"
              >
                <AvatarHead id={avatar} size={52} />
              </button>
              <button type="button" onClick={() => setView('ajustes')} className="pointer-events-auto g-hud-btn g-hud-btn--blue" aria-label="Ajustes" title="Ajustes">
                <span className="g-hud-btn__icon" aria-hidden="true">
                  ⚙️
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* La cámara se ha ido lejos del centro: un botón para volver a la vista general */}
      {onIsland && camOffCenter && (
        <div className="mt-3 flex justify-center">
          <button type="button" onClick={recenter} className="pointer-events-auto g-btn g-btn--cream g-btn--sm">
            ⌖ Centrar isla
          </button>
        </div>
      )}

      {/* En la isla de la Liebre: cartel y botón de volver */}
      {trip !== 'home' && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <div className="pointer-events-auto g-pill !cursor-default !px-4 !py-1.5 whitespace-nowrap">
            <span aria-hidden="true">🐰</span>
            <span className="g-title text-[13px] whitespace-nowrap">{trip === 'there' ? 'Isla de la Liebre' : trip === 'going' ? 'Cruzando el mar…' : 'Volviendo a casa…'}</span>
          </div>
          {trip === 'there' && (
            <button type="button" onClick={returnHome} className="pointer-events-auto g-btn g-btn--cream g-btn--sm">
              Volver a casa
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** Indicador de salud: seis corazones. Con comida en la despensa están todos; cada mes sin comer se pierde uno. */
function Hearts({ hunger, foodMonths, onTap }: { hunger: number; foodMonths: number; onTap: () => void }) {
  const alive = Math.max(0, HUNGER_DEATH_MONTHS - hunger)
  const warning = hunger > 0 || foodMonths === 0
  const label =
    hunger > 0
      ? `${alive} de ${HUNGER_DEATH_MONTHS} corazones: ${hunger} ${hunger === 1 ? 'mes' : 'meses'} sin comer`
      : `Salud completa. Comida para ${foodMonths} ${foodMonths === 1 ? 'mes' : 'meses'}`
  return (
    <button type="button" onClick={onTap} className={`pointer-events-auto g-pill g-hearts ${warning ? 'g-hearts--warn' : ''}`} aria-label={label} title={label}>
      {Array.from({ length: HUNGER_DEATH_MONTHS }, (_, i) => (
        <span key={i} className={`g-heart ${i < alive ? '' : 'g-heart--lost'}`} aria-hidden="true">
          ♥
        </span>
      ))}
    </button>
  )
}
