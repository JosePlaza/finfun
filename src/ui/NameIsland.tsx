import { useState } from 'react'
import { useGame } from '../store/game'
import { BG_DESKTOP_SRC, BG_SRC, LOGO_SRC } from './Auth'

export function NameIsland() {
  const createIsland = useGame((s) => s.createIsland)
  const [name, setName] = useState('')
  const valid = name.trim().length >= 2

  return (
    <div className="auth h-full overflow-y-auto">
      <div className="auth__bg" style={{ ['--bg-movil' as string]: `url(${BG_SRC})`, ['--bg-escritorio' as string]: `url(${BG_DESKTOP_SRC})` }} aria-hidden="true" />
      <div className="relative min-h-full flex flex-col items-center md:items-start justify-start px-5 md:pl-[8vw] pt-[4vh] md:pt-[5vh] safe-top safe-bottom">
        <div className="w-full max-w-sm flex flex-col items-center">
          <img src={LOGO_SRC} alt="Finfun" className="auth__logo w-[58vw] max-w-[320px] h-auto" draggable={false} />
          <p className="auth__tag mt-3 mb-6">Un día real es un mes de isla</p>

          <div className="g-panel g-panel--green p-5 pt-9 relative w-full">
            <div className="g-ribbon">Bienvenido</div>
            <p className="text-ink-l font-semibold text-[15px] leading-relaxed">
              <span className="font-display font-extrabold text-ink">Doña Tortuga:</span> Bienvenido. Esta isla es tuya desde hoy. Cada mes te llegará la paga al buzón y tú decides
              qué hacer con ella. Yo solo diré una cosa, y la diré muchas veces: <em>espera y verás</em>.
            </p>

            <label className="block mt-6">
              <span className="g-label block mb-2">¿Cómo se llama tu isla?</span>
              <input
                id="island-name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 24))}
                onKeyDown={(e) => e.key === 'Enter' && valid && createIsland(name)}
                placeholder="Isla Bellota"
                autoComplete="off"
                enterKeyHint="done"
                className="w-full h-14 px-4 g-inset font-display font-extrabold text-xl text-ink placeholder:text-ink-3/60 focus:outline-none"
              />
            </label>

            <button type="button" disabled={!valid} onClick={() => createIsland(name)} className="mt-5 g-btn g-btn--block g-btn--lg">
              Crear mi isla
            </button>
          </div>

          <p className="auth__footer text-center text-white font-bold text-xs mt-5 mb-4 leading-relaxed max-w-xs">
            La isla sigue creciendo aunque no entres. Vuelve cuando quieras: tu paga te estará esperando en el buzón.
          </p>
        </div>
      </div>
    </div>
  )
}
