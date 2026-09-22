import { useGame } from '../store/game'

/** Barra de pruebas: solo en desarrollo o con ?dev en la URL. Permite adelantar el reloj de la isla. */
export function DevBar() {
  const devAdvanceDays = useGame((s) => s.devAdvanceDays)
  const devReset = useGame((s) => s.devReset)
  const offset = useGame((s) => s.devOffsetMs)
  const days = Math.round(offset / 86_400_000)
  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+14px)] z-40 opacity-80 flex items-center gap-1 bg-ink/80 text-white rounded-xl px-2 py-1 text-xs font-mono">
      <span className="opacity-70 mr-1">
        dev {days >= 0 ? '+' : ''}
        {days}d
      </span>
      <button type="button" onClick={() => devAdvanceDays(1)} className="px-2 py-1 rounded bg-white/15 active:bg-white/30">
        +1 día
      </button>
      <button type="button" onClick={() => devAdvanceDays(3)} className="px-2 py-1 rounded bg-white/15 active:bg-white/30">
        +3
      </button>
      <button type="button" onClick={() => devAdvanceDays(12)} className="px-2 py-1 rounded bg-white/15 active:bg-white/30">
        +12
      </button>
      <button
        type="button"
        onClick={() => {
          if (confirm('¿Borrar la isla y empezar de cero?')) devReset()
        }}
        className="px-2 py-1 rounded bg-coral/80 active:bg-coral"
      >
        reset
      </button>
    </div>
  )
}
