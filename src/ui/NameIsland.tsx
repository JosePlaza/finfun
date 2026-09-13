import { useState } from 'react'
import { useGame } from '../store/game'
import { CoinIcon } from './Coin'

export function NameIsland() {
  const createIsland = useGame((s) => s.createIsland)
  const [name, setName] = useState('')
  const valid = name.trim().length >= 2

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 safe-top safe-bottom bg-[radial-gradient(ellipse_at_top,#e8f3f6_0%,#cfe8ee_60%,#b9dce6_100%)]">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-paper shadow-sm flex items-center justify-center">
            <CoinIcon size={34} />
          </div>
          <div>
            <h1 className="font-display text-4xl leading-none text-ink">Finfun</h1>
            <p className="text-ink-2 text-sm mt-1">Un día real es un mes de isla.</p>
          </div>
        </div>

        <div className="bg-paper rounded-3xl shadow-lg p-6">
          <p className="text-ink-2 text-[15px] leading-relaxed">
            <span className="font-display font-semibold text-ink">Doña Tortuga:</span> Bienvenido. Esta isla es tuya desde hoy. Cada mes te llegará
            la paga al buzón y tú decides qué hacer con ella. Yo solo diré una cosa, y la diré muchas veces:{' '}
            <em>espera y verás</em>.
          </p>

          <label className="block mt-6">
            <span className="block text-xs font-bold tracking-widest uppercase text-ink-3 mb-2">¿Cómo se llama tu isla?</span>
            <input
              id="island-name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 24))}
              onKeyDown={(e) => e.key === 'Enter' && valid && createIsland(name)}
              placeholder="Isla Bellota"
              autoComplete="off"
              enterKeyHint="done"
              className="w-full h-14 px-4 rounded-2xl border-2 border-line bg-paper-2 font-display text-xl text-ink placeholder:text-ink-3/60 focus:outline-none focus:border-leaf"
            />
          </label>

          <button
            type="button"
            disabled={!valid}
            onClick={() => createIsland(name)}
            className="mt-4 w-full h-14 rounded-2xl bg-leaf text-white font-display font-semibold text-lg shadow-md active:scale-[0.98] transition disabled:opacity-40 disabled:active:scale-100"
          >
            Crear mi isla
          </button>
        </div>

        <p className="text-center text-ink-3 text-xs mt-6 leading-relaxed">
          La isla sigue creciendo aunque no entres. Vuelve cuando quieras: tu paga te estará esperando en el buzón.
        </p>
      </div>
    </div>
  )
}
