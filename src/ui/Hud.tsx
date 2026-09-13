import { calendarOf, currentMonth, MONTH_NAMES } from '../sim'
import { useGame, type View } from '../store/game'
import { Amount } from './Coin'

const SEASON_EMOJI: Record<string, string> = { primavera: '🌸', verano: '☀️', otoño: '🍂', invierno: '❄️' }

export function TopBar() {
  const game = useGame((s) => s.game)!
  const nowMs = useGame((s) => s.nowMs)
  const view = useGame((s) => s.view)
  const setView = useGame((s) => s.setView)
  const cal = calendarOf(currentMonth(game, nowMs))
  const total = game.huchaCents + game.bankCents

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 safe-top px-3">
      <div className="flex items-start justify-between gap-2">
        <div className="pointer-events-auto bg-paper/90 backdrop-blur rounded-2xl px-3.5 py-2 shadow-sm">
          <div className="font-display font-semibold text-ink leading-tight text-[17px] truncate max-w-[42vw]">{game.islandName}</div>
          <div className="text-[12px] text-ink-2 leading-tight mt-0.5">
            {SEASON_EMOJI[cal.season]} Año {cal.year} · {MONTH_NAMES[cal.monthOfYear - 1]}
          </div>
        </div>
        <div className="pointer-events-auto bg-paper/90 backdrop-blur rounded-2xl px-3.5 py-2 shadow-sm text-right">
          <div className="text-[10px] font-bold tracking-widest uppercase text-ink-3">Tu dinero</div>
          <Amount cents={total} size="lg" className="text-ink" />
        </div>
      </div>
      {view !== 'isla' && (
        <button
          type="button"
          onClick={() => setView('isla')}
          className="pointer-events-auto mt-2 inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-ink text-white font-display font-semibold text-[15px] shadow active:scale-95 transition"
        >
          <span aria-hidden="true">←</span> Volver a la isla
        </button>
      )}
    </div>
  )
}

const TABS: { id: Exclude<View, 'isla'>; label: string; icon: string }[] = [
  { id: 'casa', label: 'Casa', icon: '🏠' },
  { id: 'cofre', label: 'Cofre', icon: '🪙' },
  { id: 'banco', label: 'Banco', icon: '🏦' },
  { id: 'tienda', label: 'Tienda', icon: '⛵' },
  { id: 'faro', label: 'Faro', icon: '🐢' },
]

export function BottomNav() {
  const view = useGame((s) => s.view)
  const setView = useGame((s) => s.setView)
  const game = useGame((s) => s.game)!
  const badge = (id: string) => id === 'casa' && game.mailboxCents > 0

  return (
    <nav className="absolute inset-x-0 bottom-0 safe-bottom px-3 pointer-events-none z-30">
      <div className="pointer-events-auto mx-auto max-w-md bg-paper/95 backdrop-blur rounded-3xl shadow-lg px-1.5 py-1.5 grid grid-cols-5 gap-1">
        {TABS.map((t) => {
          const active = view === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setView(active ? 'isla' : t.id)}
              className={`relative h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition active:scale-95 ${
                active ? 'bg-leaf-soft text-ink' : 'text-ink-2'
              }`}
            >
              <span className="text-xl leading-none" aria-hidden="true">
                {t.icon}
              </span>
              <span className="text-[11px] font-bold">{t.label}</span>
              {badge(t.id) && <span className="absolute top-2 right-3 w-2.5 h-2.5 rounded-full bg-coral" />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
