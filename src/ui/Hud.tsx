import { calendarOf, currentMonth, MONTH_NAMES } from '../sim'
import { useGame, type Panel } from '../store/game'
import { Amount } from './Coin'

const SEASON_EMOJI: Record<string, string> = { primavera: '🌸', verano: '☀️', otoño: '🍂', invierno: '❄️' }

export function TopBar() {
  const game = useGame((s) => s.game)!
  const nowMs = useGame((s) => s.nowMs)
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
    </div>
  )
}

const TABS: { id: Exclude<Panel, null>; label: string; icon: string }[] = [
  { id: 'hucha', label: 'Hucha', icon: '🐷' },
  { id: 'tienda', label: 'Tienda', icon: '🏪' },
  { id: 'banco', label: 'Banco', icon: '🏦' },
  { id: 'diario', label: 'Diario', icon: '📖' },
  { id: 'ayuda', label: 'Ayuda', icon: '🐢' },
]

export function BottomNav() {
  const panel = useGame((s) => s.panel)
  const setPanel = useGame((s) => s.setPanel)
  const game = useGame((s) => s.game)!
  const badge = (id: string) => id === 'hucha' && game.mailboxCents > 0

  return (
    <nav className="absolute inset-x-0 bottom-0 safe-bottom px-3 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-md bg-paper/95 backdrop-blur rounded-3xl shadow-lg px-1.5 py-1.5 grid grid-cols-5 gap-1">
        {TABS.map((t) => {
          const active = panel === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setPanel(active ? null : t.id)}
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
