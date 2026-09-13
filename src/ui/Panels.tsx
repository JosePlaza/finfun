import { useState, type ReactNode } from 'react'
import {
  BANK_RATE_BPS,
  BANK_UNLOCK_MONTH,
  calendarOf,
  currentMonth,
  diaryParagraphs,
  formatCents,
  formatPct,
  monthlyInterest,
  PAGA_CENTS,
  SHOP_ITEMS,
  type LedgerEvent,
} from '../sim'
import { useGame } from '../store/game'
import { Amount, CoinIcon } from './Coin'

/* ---------- Contenedor: hoja inferior ---------- */

function Sheet({ title, tone, children, onClose }: { title: string; tone: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end pointer-events-none">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-ink/15 pointer-events-auto" />
      <div className="sheet-enter pointer-events-auto relative mx-auto w-full max-w-md bg-paper rounded-t-[28px] shadow-2xl max-h-[78dvh] flex flex-col">
        <div className={`h-1.5 w-12 rounded-full mx-auto mt-3 ${tone}`} />
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h2 className="font-display font-semibold text-2xl text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="w-10 h-10 rounded-full bg-paper-2 text-ink-2 text-xl leading-none active:scale-95">
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-[calc(96px+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  )
}

function Tortuga({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 items-start bg-leaf-soft rounded-2xl p-3.5 text-[15px] leading-relaxed text-ink">
      <span className="text-2xl leading-none mt-0.5" aria-hidden="true">
        🐢
      </span>
      <p className="m-0">{children}</p>
    </div>
  )
}

function Big({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="bg-paper-2 rounded-2xl p-4">
      <div className="text-[11px] font-bold tracking-widest uppercase text-ink-3">{label}</div>
      <Amount cents={cents} size="xl" className="text-ink mt-1" />
    </div>
  )
}

function Primary({ children, onClick, disabled, tone = 'bg-leaf' }: { children: ReactNode; onClick: () => void; disabled?: boolean; tone?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-13 min-h-[52px] w-full rounded-2xl ${tone} text-white font-display font-semibold text-lg shadow active:scale-[0.98] transition disabled:opacity-40 disabled:active:scale-100`}
    >
      {children}
    </button>
  )
}

const KIND_ICON: Record<LedgerEvent['kind'], string> = {
  paga: '✉️',
  recogida: '🐷',
  interes: '🏦',
  compra: '🛍️',
  tarea: '🌰',
  inflacion: '📈',
  deposito: '➡️',
  retirada: '⬅️',
  'banco-abierto': '🎉',
}

function Ledger({ events }: { events: LedgerEvent[] }) {
  if (events.length === 0) return null
  return (
    <ul className="mt-2 divide-y divide-line">
      {events
        .slice()
        .reverse()
        .slice(0, 12)
        .map((e, i) => (
          <li key={i} className="flex items-center gap-3 py-2.5 text-[14px]">
            <span className="text-lg" aria-hidden="true">
              {KIND_ICON[e.kind]}
            </span>
            <span className="flex-1 text-ink-2">{e.label}</span>
            {e.kind === 'inflacion' ? (
              <span className="font-semibold text-ink tabular-nums">{formatPct(e.amountCents)}</span>
            ) : e.amountCents !== 0 ? (
              <span className={`font-semibold tabular-nums ${e.amountCents < 0 ? 'text-coral' : 'text-leaf'}`}>
                {e.amountCents > 0 ? '+' : ''}
                {formatCents(e.amountCents)}
              </span>
            ) : null}
          </li>
        ))}
    </ul>
  )
}

/* ---------- Paneles ---------- */

function HuchaPanel({ onClose }: { onClose: () => void }) {
  const game = useGame((s) => s.game)!
  const collect = useGame((s) => s.collect)
  return (
    <Sheet title="Hucha" tone="bg-acorn" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Big label="En la hucha" cents={game.huchaCents} />
        <Big label="En el buzón" cents={game.mailboxCents} />
      </div>
      {game.mailboxCents > 0 ? (
        <div className="mt-3">
          <Primary onClick={collect} tone="bg-coin text-[#3d2c07]">
            Recoger {formatCents(game.mailboxCents)} del buzón
          </Primary>
        </div>
      ) : (
        <p className="text-ink-3 text-sm mt-3 mb-0">La siguiente paga de {formatCents(PAGA_CENTS)} llega mañana.</p>
      )}
      <div className="mt-4">
        <Tortuga>
          La hucha guarda tu dinero, pero no lo hace crecer. Y cada año los precios de la tienda suben un poco. Si un dinero no lo vas a
          usar pronto, el banco es mejor sitio.
        </Tortuga>
      </div>
      <h3 className="font-display font-semibold text-ink mt-5 mb-1">Últimos movimientos</h3>
      <Ledger events={game.ledger} />
    </Sheet>
  )
}

function TiendaPanel({ onClose }: { onClose: () => void }) {
  const game = useGame((s) => s.game)!
  const buy = useGame((s) => s.buy)
  const hadInflation = game.inflationHistoryBps.length > 0
  const lastInf = game.inflationHistoryBps[game.inflationHistoryBps.length - 1]
  return (
    <Sheet title="Tienda" tone="bg-coral" onClose={onClose}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-ink-2 text-sm">Tienes en la hucha</span>
        <Amount cents={game.huchaCents} size="lg" />
      </div>
      {hadInflation && (
        <div className="mb-3">
          <Tortuga>
            Este año los precios han subido un {formatPct(lastInf)}. Es la inflación: el precio viejo está tachado para que lo veas.
          </Tortuga>
        </div>
      )}
      <ul className="grid gap-2.5">
        {SHOP_ITEMS.map((def) => {
          const st = game.shop.find((s) => s.id === def.id)!
          const owned = def.kind === 'objeto' && game.purchases.some((p) => p.itemId === def.id)
          const can = game.huchaCents >= st.priceCents && !owned
          const changed = st.previousPriceCents !== st.priceCents
          return (
            <li key={def.id} className="bg-paper-2 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-display font-semibold text-ink text-[17px]">{def.name}</div>
                <div className="text-ink-3 text-[12.5px] leading-snug">{def.description}</div>
                <div className="flex items-baseline gap-2 mt-1">
                  {changed && <span className="text-ink-3 text-sm line-through tabular-nums">{formatCents(st.previousPriceCents)}</span>}
                  <Amount cents={st.priceCents} size="md" />
                  <span className="text-[10px] text-ink-3">IVA {def.ivaPct} % incl.</span>
                </div>
              </div>
              <button
                type="button"
                disabled={!can}
                onClick={() => buy(def.id)}
                className={`shrink-0 h-12 px-4 rounded-xl font-display font-semibold active:scale-95 transition ${
                  owned ? 'bg-leaf-soft text-leaf' : can ? 'bg-coral text-white shadow' : 'bg-line/60 text-ink-3'
                }`}
              >
                {owned ? 'Tuyo' : 'Comprar'}
              </button>
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}

const QUICK = [5_00, 10_00, 20_00, 50_00]

function BancoPanel({ onClose }: { onClose: () => void }) {
  const game = useGame((s) => s.game)!
  const nowMs = useGame((s) => s.nowMs)
  const deposit = useGame((s) => s.deposit)
  const withdraw = useGame((s) => s.withdraw)
  const [mode, setMode] = useState<'meter' | 'sacar'>('meter')
  const [custom, setCustom] = useState('')

  if (!game.bankUnlocked) {
    const month = currentMonth(game, nowMs)
    const daysLeft = Math.max(1, BANK_UNLOCK_MONTH - 1 - month)
    return (
      <Sheet title="Banco de la Isla" tone="bg-slate" onClose={onClose}>
        <div className="bg-slate-soft rounded-2xl p-4 text-center">
          <div className="text-4xl mb-1">🏗️</div>
          <div className="font-display font-semibold text-ink text-lg">En construcción</div>
          <div className="text-ink-2 text-sm mt-1">
            Abre al terminar el año 1: {daysLeft <= 1 ? 'mañana' : `en ${daysLeft} días`}.
          </div>
        </div>
        <div className="mt-4">
          <Tortuga>
            El banco guarda tu dinero como la hucha, pero cada mes te da un poquito más solo por tenerlo allí. Mientras tanto, ve
            ahorrando: cuando abra, tendrás algo que llevar.
          </Tortuga>
        </div>
      </Sheet>
    )
  }

  const source = mode === 'meter' ? game.huchaCents : game.bankCents
  const parsed = Math.round(parseFloat(custom.replace(',', '.')) * 100)
  const customOk = Number.isFinite(parsed) && parsed > 0 && parsed <= source
  const act = (cents: number) => {
    if (mode === 'meter') deposit(cents)
    else withdraw(cents)
    setCustom('')
  }
  const nextInterest = monthlyInterest(game.bankCents, game.taxesUnlocked).net

  return (
    <Sheet title="Banco de la Isla" tone="bg-leaf" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Big label="En el banco" cents={game.bankCents} />
        <Big label="En la hucha" cents={game.huchaCents} />
      </div>
      <p className="text-ink-2 text-sm mt-3 mb-0">
        Paga un {formatPct(BANK_RATE_BPS)} al año, repartido cada mes.{' '}
        {game.bankCents > 0 && (
          <>
            Mañana te dará <b className="text-ink">{formatCents(nextInterest, { alwaysDecimals: true })}</b>.
          </>
        )}
      </p>

      <div className="mt-4 grid grid-cols-2 bg-paper-2 rounded-2xl p-1">
        {(['meter', 'sacar'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`h-11 rounded-xl font-display font-semibold transition ${mode === m ? 'bg-paper shadow text-ink' : 'text-ink-2'}`}
          >
            {m === 'meter' ? 'Meter dinero' : 'Sacar dinero'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            disabled={q > source}
            onClick={() => act(q)}
            className="h-12 rounded-xl bg-paper-2 font-display font-semibold text-ink disabled:opacity-35 active:scale-95 transition tabular-nums"
          >
            {formatCents(q)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 mt-2">
        <div className="min-w-0 flex items-center gap-2 h-12 px-3 rounded-xl bg-paper-2 border border-line">
          <CoinIcon size={16} />
          <input
            id="bank-amount"
            inputMode="decimal"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Otra cantidad"
            className="min-w-0 flex-1 bg-transparent outline-none font-display text-ink placeholder:text-ink-3/70"
          />
        </div>
        <button
          type="button"
          disabled={!customOk}
          onClick={() => act(parsed)}
          className="h-12 px-3.5 rounded-xl bg-leaf text-white font-display font-semibold disabled:opacity-35 active:scale-95 transition"
        >
          {mode === 'meter' ? 'Meter' : 'Sacar'}
        </button>
        <button
          type="button"
          disabled={source <= 0}
          onClick={() => act(source)}
          className="h-12 px-3 rounded-xl bg-paper-2 text-ink-2 font-display font-semibold disabled:opacity-35 active:scale-95 transition"
        >
          Todo
        </button>
      </div>

      <div className="mt-4">
        <Tortuga>
          Aquí el dinero está tan seguro como en la hucha y lo puedes sacar cuando quieras. La diferencia: cada mes crece un poquito.
          Poquito, pero siempre.
        </Tortuga>
      </div>
    </Sheet>
  )
}

function DiarioPanel({ onClose }: { onClose: () => void }) {
  const game = useGame((s) => s.game)!
  const nowMs = useGame((s) => s.nowMs)
  const cal = calendarOf(currentMonth(game, nowMs))
  const daysToYearEnd = Math.max(1, 12 - cal.monthOfYear)
  const entries = game.diary.slice().reverse()
  return (
    <Sheet title="Diario de Doña Tortuga" tone="bg-sky" onClose={onClose}>
      {entries.length === 0 ? (
        <Tortuga>
          Escribo una página al terminar cada año de isla. La primera, {daysToYearEnd <= 1 ? 'mañana' : `dentro de ${daysToYearEnd} días`}. Te
          contaré qué ha pasado con tu dinero… y qué habría pasado si lo hubieras puesto en otro sitio.
        </Tortuga>
      ) : (
        <div className="grid gap-4">
          {entries.map((e) => (
            <article key={e.year} className="bg-sky-soft rounded-2xl p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display font-semibold text-ink text-lg m-0">Año {e.year}</h3>
                <span className="text-xs font-bold tracking-widest uppercase text-ink-3">Inflación {formatPct(e.inflationBps)}</span>
              </div>
              {diaryParagraphs(e).map((p, i) => (
                <p key={i} className="text-[15px] leading-relaxed text-ink mt-2 mb-0">
                  {p}
                </p>
              ))}
            </article>
          ))}
        </div>
      )}
    </Sheet>
  )
}

function AyudaPanel({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Cómo funciona" tone="bg-leaf" onClose={onClose}>
      <div className="grid gap-3 text-[15px] leading-relaxed text-ink">
        <div className="bg-paper-2 rounded-2xl p-4">
          <div className="font-display font-semibold text-lg">Un día real es un mes de isla</div>
          <p className="m-0 text-ink-2">Cada tres días cambia la estación y cada doce se cierra un año. La isla sigue aunque no entres.</p>
        </div>
        <div className="bg-paper-2 rounded-2xl p-4">
          <div className="font-display font-semibold text-lg">Cada día</div>
          <p className="m-0 text-ink-2">
            Llega la paga al buzón (tócalo para recogerla), puedes buscar cinco bellotas escondidas por la isla y decidir qué haces con tu
            dinero: gastarlo en la tienda, guardarlo en la hucha o llevarlo al banco cuando abra.
          </p>
        </div>
        <div className="bg-paper-2 rounded-2xl p-4">
          <div className="font-display font-semibold text-lg">La moneda</div>
          <p className="m-0 text-ink-2 flex items-center gap-1.5 flex-wrap">
            El dinero de la isla es el euroLuky <CoinIcon size={16} />. Se parece a un euro, pero solo vale aquí.
          </p>
        </div>
        <div className="bg-paper-2 rounded-2xl p-4">
          <div className="font-display font-semibold text-lg">Mueve la isla</div>
          <p className="m-0 text-ink-2">Arrastra con un dedo para girarla y usa dos dedos para acercarte o alejarte.</p>
        </div>
      </div>
    </Sheet>
  )
}

export function Panels() {
  const panel = useGame((s) => s.panel)
  const setPanel = useGame((s) => s.setPanel)
  const close = () => setPanel(null)
  switch (panel) {
    case 'hucha':
      return <HuchaPanel onClose={close} />
    case 'tienda':
      return <TiendaPanel onClose={close} />
    case 'banco':
      return <BancoPanel onClose={close} />
    case 'diario':
      return <DiarioPanel onClose={close} />
    case 'ayuda':
      return <AyudaPanel onClose={close} />
    default:
      return null
  }
}
