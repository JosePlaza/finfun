import { useState, type ReactNode } from 'react'
import {
  BANK_RATE_BPS,
  BANK_UNLOCK_MONTH,
  calendarOf,
  currentMonth,
  diaryParagraphs,
  formatCents,
  formatPct,
  missionsFor,
  monthlyInterest,
  PAGA_CENTS,
  SHOP_ITEMS,
  type LedgerEvent,
} from '../sim'
import { useGame } from '../store/game'
import { Amount, CoinIcon } from './Coin'
import { BUILDINGS, WORLD_NAMES } from '../scene/registry'

/* ---------- Contenedor: hoja inferior ---------- */

function Sheet({ title, tone, children, kicker }: { title: string; tone: string; children: ReactNode; kicker?: string }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end pointer-events-none">
      <div className="sheet-enter pointer-events-auto relative mx-auto w-full max-w-md bg-paper rounded-t-[28px] shadow-2xl max-h-[54dvh] flex flex-col md:mx-0 md:ml-auto md:mr-5 md:mb-[calc(env(safe-area-inset-bottom)+96px)] md:rounded-[28px] md:max-h-[72dvh]">
        <div className={`h-1.5 w-12 rounded-full mx-auto mt-3 ${tone}`} />
        <div className="px-5 pt-2 pb-2">
          {kicker && <div className="text-[11px] font-bold tracking-widest uppercase text-ink-3">{kicker}</div>}
          <h2 className="font-display font-semibold text-2xl text-ink leading-tight">{title}</h2>
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
  recogida: '🪙',
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

function CasaPanel() {
  const game = useGame((s) => s.game)!
  const collect = useGame((s) => s.collect)
  const setView = useGame((s) => s.setView)
  return (
    <Sheet title="Tu casa" kicker="Aquí llega la paga" tone="bg-coral">
      <div className="grid grid-cols-2 gap-3">
        <Big label="En el buzón" cents={game.mailboxCents} />
        <Big label="En el cofre" cents={game.huchaCents} />
      </div>
      {game.mailboxCents > 0 ? (
        <div className="mt-3">
          <Primary onClick={collect} tone="bg-coin text-[#3d2c07]">
            Recoger {formatCents(game.mailboxCents)} del buzón
          </Primary>
        </div>
      ) : (
        <p className="text-ink-3 text-sm mt-3 mb-0">El buzón está vacío. La siguiente paga de {formatCents(PAGA_CENTS)} llega mañana.</p>
      )}
      <div className="mt-4">
        <Tortuga>
          Cada mes de isla (cada día tuyo) te llega la paga al buzón. Lo que recojas va al cofre de la cueva. Desde allí decides:
          gastarlo en la barca, guardarlo o llevarlo al banco.
        </Tortuga>
      </div>
      <button type="button" onClick={() => setView('cofre')} className="mt-3 w-full h-12 rounded-2xl bg-paper-2 font-display font-semibold text-ink active:scale-[0.98] transition">
        Ir al cofre →
      </button>
      <MyThings />
      <h3 className="font-display font-semibold text-ink mt-5 mb-1">Últimos movimientos</h3>
      <Ledger events={game.ledger} />
    </Sheet>
  )
}

function CofrePanel() {
  const game = useGame((s) => s.game)!
  const setView = useGame((s) => s.setView)
  return (
    <Sheet title="El cofre del tesoro" kicker="Tu ahorro" tone="bg-acorn">
      <div className="grid grid-cols-2 gap-3">
        <Big label="En el cofre" cents={game.huchaCents} />
        <Big label="En el banco" cents={game.bankCents} />
      </div>
      <div className="mt-4">
        <Tortuga>
          El cofre guarda tu dinero a buen recaudo, pero no lo hace crecer. Y cada año los precios de la barca suben un poco.
          Si un dinero no lo vas a usar pronto, el banco es mejor sitio.
        </Tortuga>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button type="button" onClick={() => setView('banco')} className="h-12 rounded-2xl bg-leaf text-white font-display font-semibold active:scale-[0.98] transition">
          Llevar al banco
        </button>
        <button type="button" onClick={() => setView('tienda')} className="h-12 rounded-2xl bg-paper-2 text-ink font-display font-semibold active:scale-[0.98] transition">
          Ir a la barca
        </button>
      </div>
      <h3 className="font-display font-semibold text-ink mt-5 mb-1">Últimos movimientos</h3>
      <Ledger events={game.ledger} />
    </Sheet>
  )
}

/** Lo que el jugador ha comprado: se ve en la isla y aquí, como colección. */
function MyThings() {
  const game = useGame((s) => s.game)!
  const setView = useGame((s) => s.setView)
  const owned = SHOP_ITEMS.filter((d) => d.kind === 'objeto' && game.purchases.some((p) => p.itemId === d.id))
  const eaten = game.purchases.filter((p) => p.itemId === 'helado').length
  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-display font-semibold text-ink m-0">Mis cosas</h3>
        <button type="button" onClick={() => setView('tienda')} className="text-sm font-bold text-coral">
          Ver catálogo →
        </button>
      </div>
      {owned.length === 0 && eaten === 0 ? (
        <div className="bg-paper-2 rounded-2xl p-4 text-ink-2 text-sm">
          Todavía no tienes nada. Lo que compres en la tienda aparecerá en tu isla y aquí.
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {owned.map((d) => (
            <div key={d.id} className="item-card item-card--owned !p-2 !gap-1">
              <div className="item-card__icon !h-14 !text-3xl">{d.icon}</div>
              <div className="font-display font-semibold text-[12px] text-ink text-center leading-tight">{d.name}</div>
            </div>
          ))}
          {eaten > 0 && (
            <div className="item-card !p-2 !gap-1">
              <div className="item-card__icon !h-14 !text-3xl">🍦</div>
              <div className="font-display font-semibold text-[12px] text-ink text-center leading-tight">×{eaten}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MisionesPanel() {
  const game = useGame((s) => s.game)!
  const setView = useGame((s) => s.setView)
  const board = missionsFor(game)
  return (
    <Sheet title={`Mundo ${board.world} · ${board.worldName}`} kicker={`Misiones · ${board.completed} de ${board.total}`} tone="bg-sky">
      <div className="progress mb-3">
        <i style={{ width: `${(board.completed / board.total) * 100}%` }} />
      </div>
      <Tortuga>
        Completa las misiones para abrir el siguiente mundo: <b>{board.reward}</b>. No hay prisa: la isla no se va a ninguna parte.
      </Tortuga>
      <ul className="grid gap-2.5 mt-3">
        {board.missions.map((mi) => (
          <li key={mi.id} className={`rounded-2xl p-3.5 flex items-center gap-3 ${mi.done ? 'bg-leaf-soft' : 'bg-paper-2'}`}>
            <div className={`w-12 h-12 rounded-xl grid place-items-center text-2xl shrink-0 ${mi.done ? 'bg-leaf text-white' : 'bg-paper'}`}>
              {mi.done ? '✓' : mi.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-display font-semibold text-[16px] leading-tight ${mi.done ? 'text-leaf line-through' : 'text-ink'}`}>{mi.title}</div>
              {!mi.done && <div className="text-ink-2 text-[12.5px] leading-snug mt-0.5">{mi.hint}</div>}
              {!mi.done && mi.goal > 1 && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="progress flex-1 !h-2">
                    <i style={{ width: `${(mi.progress / mi.goal) * 100}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-ink-3 tabular-nums">
                    {mi.goal >= 100 ? `${formatCents(mi.progress)} / ${formatCents(mi.goal)}` : `${mi.progress} / ${mi.goal}`}
                  </span>
                </div>
              )}
            </div>
            {!mi.done && (
              <button
                type="button"
                onClick={() => setView(mi.place)}
                className="shrink-0 h-10 px-3 rounded-xl bg-sky text-white font-display font-semibold text-sm active:scale-95 transition"
              >
                Ir
              </button>
            )}
          </li>
        ))}
      </ul>

      <h3 className="font-display font-semibold text-ink mt-5 mb-1">La isla, mundo a mundo</h3>
      <p className="text-ink-2 text-sm mt-0 mb-2">Los solares en obras son edificios que se abrirán al llegar a su mundo.</p>
      <div className="grid gap-2">
        {[1, 2, 3, 4].map((w) => {
          const open = game.world >= w
          return (
            <div key={w} className={`rounded-2xl p-3 ${open ? 'bg-leaf-soft' : 'bg-paper-2'}`}>
              <div className="flex items-baseline justify-between">
                <span className="font-display font-semibold text-ink">Mundo {w} · {WORLD_NAMES[w]}</span>
                <span className={`text-[11px] font-bold tracking-widest uppercase ${open ? 'text-leaf' : 'text-ink-3'}`}>{open ? 'abierto' : 'en obras'}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {BUILDINGS.filter((b) => b.world === w).map((b) => (
                  <span key={b.id} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-semibold ${open ? 'bg-paper text-ink' : 'bg-line/60 text-ink-2'}`}>
                    <span aria-hidden="true">{b.icon}</span> {b.name}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}

function TiendaPanel() {
  const game = useGame((s) => s.game)!
  const buy = useGame((s) => s.buy)
  const hadInflation = game.inflationHistoryBps.length > 0
  const lastInf = game.inflationHistoryBps[game.inflationHistoryBps.length - 1]
  return (
    <Sheet title="La tienda" kicker="Catálogo" tone="bg-coral">
      <div className="flex items-center justify-between mb-3">
        <span className="text-ink-2 text-sm">Tienes en el cofre</span>
        <Amount cents={game.huchaCents} size="lg" />
      </div>
      {hadInflation && (
        <div className="mb-3">
          <Tortuga>
            Este año los precios han subido un {formatPct(lastInf)}. Es la inflación: el precio viejo está tachado para que lo veas.
          </Tortuga>
        </div>
      )}
      <ul className="grid grid-cols-2 gap-2.5">
        {SHOP_ITEMS.map((def) => {
          const st = game.shop.find((s) => s.id === def.id)!
          const owned = def.kind === 'objeto' && game.purchases.some((p) => p.itemId === def.id)
          const can = game.huchaCents >= st.priceCents && !owned
          const changed = st.previousPriceCents !== st.priceCents
          return (
            <li key={def.id} className={`item-card ${owned ? 'item-card--owned' : can ? 'item-card--can' : ''}`}>
              {owned && <span className="ribbon">Tuyo ✓</span>}
              <div className="item-card__icon">{def.icon}</div>
              <div>
                <div className="font-display font-semibold text-ink text-[17px] leading-tight">{def.name}</div>
                <div className="text-ink-3 text-[12px] leading-snug mt-0.5">{def.description}</div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="price-tag">
                  <CoinIcon size={14} />
                  {formatCents(st.priceCents)}
                </span>
                {changed && <span className="text-ink-3 text-xs line-through tabular-nums">{formatCents(st.previousPriceCents)}</span>}
              </div>
              <div className="text-[10px] text-ink-3 -mt-1">IVA {def.ivaPct} % incluido</div>
              <button
                type="button"
                disabled={!can}
                onClick={() => buy(def.id)}
                className={`h-11 rounded-xl font-display font-semibold active:scale-95 transition ${
                  owned ? 'bg-leaf/15 text-leaf' : can ? 'bg-coral text-white shadow' : 'bg-line/70 text-ink-3'
                }`}
              >
                {owned ? 'En tu isla' : can ? 'Comprar' : 'Te falta dinero'}
              </button>
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}

const QUICK = [5_00, 10_00, 20_00, 50_00]

function BancoPanel() {
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
      <Sheet title="Banco de la Isla" kicker="En construcción" tone="bg-slate">
        <div className="bg-slate-soft rounded-2xl p-4 text-center">
          <div className="text-4xl mb-1">🏗️</div>
          <div className="font-display font-semibold text-ink text-lg">En construcción</div>
          <div className="text-ink-2 text-sm mt-1">
            Abre al terminar el año 1: {daysLeft <= 1 ? 'mañana' : `en ${daysLeft} días`}.
          </div>
        </div>
        <div className="mt-4">
          <Tortuga>
            El banco guarda tu dinero como el cofre, pero cada mes te da un poquito más solo por tenerlo allí. Mientras tanto, ve
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
    <Sheet title="Banco de la Isla" kicker="Cuenta remunerada · 2,5 % al año" tone="bg-leaf">
      <div className="grid grid-cols-2 gap-3">
        <Big label="En el banco" cents={game.bankCents} />
        <Big label="En el cofre" cents={game.huchaCents} />
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
          Aquí el dinero está tan seguro como en el cofre y lo puedes sacar cuando quieras. La diferencia: cada mes crece un poquito.
          Poquito, pero siempre.
        </Tortuga>
      </div>
    </Sheet>
  )
}

function FaroPanel() {
  const game = useGame((s) => s.game)!
  const nowMs = useGame((s) => s.nowMs)
  const [tab, setTab] = useState<'diario' | 'ayuda'>('diario')
  const cal = calendarOf(currentMonth(game, nowMs))
  const daysToYearEnd = Math.max(1, 12 - cal.monthOfYear)
  const entries = game.diary.slice().reverse()
  return (
    <Sheet title="El faro de Doña Tortuga" kicker="Diario y ayuda" tone="bg-sky">
      <div className="grid grid-cols-2 bg-paper-2 rounded-2xl p-1 mb-3">
        {(['diario', 'ayuda'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`h-10 rounded-xl font-display font-semibold transition ${tab === t ? 'bg-paper shadow text-ink' : 'text-ink-2'}`}>
            {t === 'diario' ? 'Diario' : 'Cómo se juega'}
          </button>
        ))}
      </div>
      {tab === 'diario' ? (
        entries.length === 0 ? (
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
        )
      ) : (
        <div className="grid gap-3 text-[15px] leading-relaxed text-ink">
          <div className="bg-paper-2 rounded-2xl p-4">
            <div className="font-display font-semibold text-lg">Un día real es un mes de isla</div>
            <p className="m-0 text-ink-2">Cada tres días cambia la estación y cada doce se cierra un año. La isla sigue aunque no entres.</p>
          </div>
          <div className="bg-paper-2 rounded-2xl p-4">
            <div className="font-display font-semibold text-lg">Cada día</div>
            <p className="m-0 text-ink-2">
              Llega la paga al buzón de tu casa (tócalo para recogerla), puedes buscar cinco bellotas escondidas por la isla y decidir qué
              haces con tu dinero: gastarlo en la barca, guardarlo en el cofre o llevarlo al banco cuando abra.
            </p>
          </div>
          <div className="bg-paper-2 rounded-2xl p-4">
            <div className="font-display font-semibold text-lg">La moneda</div>
            <p className="m-0 text-ink-2 flex items-center gap-1.5 flex-wrap">
              El dinero de la isla es el euroLuky <CoinIcon size={16} />. Se parece a un euro, pero solo vale aquí.
            </p>
          </div>
          <div className="bg-paper-2 rounded-2xl p-4">
            <div className="font-display font-semibold text-lg">Muévete por la isla</div>
            <p className="m-0 text-ink-2">Toca un edificio para ir hasta él. Arrastra con un dedo para girar la isla y usa dos dedos para acercarte.</p>
          </div>
        </div>
      )}
    </Sheet>
  )
}

export function Panels() {
  const view = useGame((s) => s.view)
  switch (view) {
    case 'casa':
      return <CasaPanel />
    case 'cofre':
      return <CofrePanel />
    case 'banco':
      return <BancoPanel />
    case 'tienda':
      return <TiendaPanel />
    case 'faro':
      return <FaroPanel />
    case 'misiones':
      return <MisionesPanel />
    default:
      return null
  }
}
