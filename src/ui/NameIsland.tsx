import { useState } from 'react'
import { useGame } from '../store/game'
import { CoinIcon } from './Coin'

export function NameIsland() {
  const createIsland = useGame((s) => s.createIsland)
  const [name, setName] = useState('')
  const valid = name.trim().length >= 2

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 safe-top safe-bottom bg-[radial-gradient(ellipse_at_top,#7fd4f5_0%,#3aa5d8_60%,#2b86b3_100%)]">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="g-icon g-icon--orange !w-16 !h-16 !rounded-2xl">
            <CoinIcon size={36} />
          </div>
          <div>
            <h1 className="g-title text-5xl leading-none !text-white" style={{ textShadow: '0 3px 0 #2b86b3' }}>Finfun</h1>
            <p className="text-white/90 font-bold text-sm mt-1">Un día real es un mes de isla.</p>
          </div>
        </div>

        <div className="g-panel g-panel--green p-6 pt-8 relative">
          <div className="g-ribbon">Bienvenido</div>
          <p className="text-ink-l font-semibold text-[15px] leading-relaxed">
            <span className="font-display font-extrabold text-ink">Doña Tortuga:</span> Bienvenido. Esta isla es tuya desde hoy. Cada mes te llegará
            la paga al buzón y tú decides qué hacer con ella. Yo solo diré una cosa, y la diré muchas veces:{' '}
            <em>espera y verás</em>.
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

          <button
            type="button"
            disabled={!valid}
            onClick={() => createIsland(name)}
            className="mt-5 g-btn g-btn--block g-btn--lg"
          >
            Crear mi isla
          </button>
        </div>

        <p className="text-center text-white/85 font-bold text-xs mt-6 leading-relaxed">
          La isla sigue creciendo aunque no entres. Vuelve cuando quieras: tu paga te estará esperando en el buzón.
        </p>
      </div>
    </div>
  )
}
