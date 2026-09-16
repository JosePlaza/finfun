/**
 * DOÑA TORTUGA GUÍA: la tarjeta del recorrido inicial. Señala el sitio de cada paso (haz en la isla, botón que
 * pulsa), espera a que el jugador haga la acción y pasa al siguiente. Con un panel abierto se pliega a un aviso
 * pequeño arriba para no tapar nada. "Saltar" lo termina; se puede repetir desde Ajustes.
 */
import { useEffect, useRef, useState } from 'react'
import { TUTORIAL_DONE } from '../sim'
import { BUILDING_BY_ID } from '../scene/registry'
import { useGame } from '../store/game'
import { COACH_STEPS } from './coach'

export function Coach() {
  const game = useGame((s) => s.game)
  const view = useGame((s) => s.view)
  const trip = useGame((s) => s.trip)
  const acornsFound = useGame((s) => s.acornsFound)
  const coachVisited = useGame((s) => s.coachVisited)
  const celebration = useGame((s) => s.celebration)
  const wheelOpen = useGame((s) => s.wheelOpen)
  const setTutorialStep = useGame((s) => s.setTutorialStep)
  const skipTutorial = useGame((s) => s.skipTutorial)
  const setFocusPoint = useGame((s) => s.setFocusPoint)
  const hintAcorn = useGame((s) => s.hintAcorn)
  const [justDone, setJustDone] = useState(false)
  const advancing = useRef(false)

  const stepIndex = game?.tutorialStep ?? TUTORIAL_DONE
  const step = COACH_STEPS[stepIndex]
  const active = !!game && stepIndex < TUTORIAL_DONE && !!step

  // Al entrar en un paso: la cámara vuela a su edificio, o se enciende la pista de la bellota.
  useEffect(() => {
    if (!active || !step) return
    advancing.current = false
    setJustDone(false)
    if (step.target) {
      const def = BUILDING_BY_ID[step.target]
      setFocusPoint([def.x, def.z])
    } else if (step.id === 'bellotas') {
      hintAcorn()
    } else setFocusPoint(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex])

  // ¿Ya está hecha la acción del paso? Un momento de "¡Bien!" y al siguiente.
  useEffect(() => {
    if (!active || !step || !step.done || advancing.current || !game) return
    const ok = step.done(game, { view, acornsFound: acornsFound.length, visited: new Set(coachVisited) })
    if (!ok) return
    advancing.current = true
    setJustDone(true)
    const t = setTimeout(() => setTutorialStep(stepIndex + 1), 900)
    return () => clearTimeout(t)
  }, [active, step, game, view, acornsFound, coachVisited, stepIndex, setTutorialStep])

  if (!active || !step || trip !== 'home' || celebration || wheelOpen) return null

  const panelOpen = view !== 'isla'
  const total = COACH_STEPS.length

  if (panelOpen) {
    // Aviso plegado, arriba, para que se vea qué toca hacer sin tapar el panel.
    return (
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 safe-top flex justify-center px-3">
        <div className="coach-mini pointer-events-auto" style={{ marginTop: 'calc(env(safe-area-inset-top, 0px) + 72px)' }}>
          <span className="coach-mini__avatar" aria-hidden="true">
            🐢
          </span>
          <span>{justDone ? '¡Muy bien!' : (step.action ?? step.title)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))] md:px-5">
      <div className="coach pointer-events-auto w-full max-w-md md:ml-auto md:mr-0">
        <div className="coach__avatar" aria-hidden="true">
          🐢
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="font-display font-extrabold text-ink text-[16px] leading-tight">{step.title}</div>
            <div className="text-[11px] font-extrabold text-ink-3 tabular-nums shrink-0">
              {stepIndex + 1} / {total}
            </div>
          </div>
          <p className="m-0 mt-1 text-[14px] font-semibold text-ink-l leading-snug">{step.text}</p>
          {step.action && (
            <div className={`coach__action ${justDone ? 'coach__action--done' : ''}`}>
              <span aria-hidden="true">{justDone ? '✅' : '👉'}</span> {justDone ? '¡Muy bien!' : step.action}
            </div>
          )}
          <div className="flex items-center justify-between gap-2 mt-2.5">
            <button type="button" onClick={skipTutorial} className="text-[12px] font-extrabold text-ink-3 underline underline-offset-2">
              Saltar
            </button>
            {step.next && (
              <button type="button" onClick={() => setTutorialStep(stepIndex + 1)} className="g-btn g-btn--sm g-btn--orange">
                {step.next}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
