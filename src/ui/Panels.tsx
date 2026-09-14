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
  TASK_ACORNS,
  type LedgerEvent,
} from '../sim'
import { useGame } from '../store/game'
import { Amount, CoinIcon } from './Coin'
import { BUILDINGS, WORLD_NAMES } from '../scene/registry'
import { pendingEvents } from './events'

type Tone = 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'sky'

/* ───────────────────────── Contenedor: panel de juego ───────────────────────── */

function Sheet({ title, tone = 'blue', children }: { title: string; tone?: Tone; children: ReactNode }) {
  const setView = useGame((s) => s.setView)
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end pointer-events-none px-3 pb-[max(12px,env(safe-area-inset-bottom))] md:px-5">
      <div className={`sheet-enter pointer-events-auto relative mx-auto w-full max-w-md g-panel g-panel--${tone} md:mx-0 md:ml-auto md:mb-4`}>
        <div className="g-ribbon">{title}</div>
        <button type="button" className="g-close" aria-label="Cerrar" onClick={() => setView('isla')}>
          ✕
        </button>
        <div className="max-h-[52dvh] md:max-h-[70dvh] overflow-y-auto px-4 pt-9 pb-4">{children}</div>
      </div>
    </div>
  )
}

function Tortuga({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 items-start g-inset p-3.5 text-[15px] leading-relaxed text-ink font-semibold">
      <span className="g-icon g-icon--green shrink-0 !w-11 !h-11" aria-hidden="true">
        🐢
      </span>
      <p className="m-0">{children}</p>
    </div>
  )
}

function Big({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="g-inset p-3.5">
      <div className="g-label">{label}</div>
      <Amount cents={cents} size="xl" className="text-ink mt-1" />
    </div>
  )
}

function GButton({ children, onClick, disabled, tone = '', block = true, size = '' }: { children: ReactNode; onClick: () => void; disabled?: boolean; tone?: string; block?: boolean; size?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`g-btn ${tone} ${size} ${block ? 'g-btn--block' : ''}`}>
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
    <ul className="mt-2 grid gap-1.5">
      {events
        .slice()
        .reverse()
        .slice(0, 10)
        .map((e, i) => (
          <li key={i} className="g-row !py-2 text-[14px] font-semibold">
            <span className="text-lg" aria-hidden="true">
              {KIND_ICON[e.kind]}
            </span>
            <span className="flex-1 text-ink-l">{e.label}</span>
            {e.kind === 'inflacion' ? (
              <span className="font-display font-extrabold text-ink tabular-nums">{formatPct(e.amountCents)}</span>
            ) : e.amountCents !== 0 ? (
              <span className={`font-display font-extrabold tabular-nums ${e.amountCents < 0 ? 'text-red' : 'text-green'}`}>
                {e.amountCents > 0 ? '+' : ''}
                {formatCents(e.amountCents)}
              </span>
            ) : null}
          </li>
        ))}
    </ul>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="g-title text-[15px] mt-5 mb-2">{children}</h3>
}

/* ───────────────────────── Patrimonio ───────────────────────── */

function PatrimonioPanel() {
  const game = useGame((s) => s.game)!
  const setView = useGame((s) => s.setView)
  const total = game.huchaCents + game.bankCents
  const rows: { icon: string; name: string; cents: number | null; world: number; view?: 'cofre' | 'banco' | 'casa'; tone: string }[] = [
    { icon: '🪙', name: 'Cofre de la cueva', cents: game.huchaCents, world: 1, view: 'cofre', tone: 'g-icon--orange' },
    { icon: '🏦', name: 'Banco de la Isla', cents: game.bankUnlocked ? game.bankCents : null, world: 1, view: 'banco', tone: 'g-icon--green' },
    { icon: '📜', name: 'Bonos', cents: null, world: 2, tone: 'g-icon--blue' },
    { icon: '📈', name: 'Acciones', cents: null, world: 3, tone: 'g-icon--purple' },
    { icon: '🧺', name: 'Fondo Isla', cents: null, world: 4, tone: 'g-icon--purple' },
  ]
  return (
    <Sheet title="Tu patrimonio" tone="orange">
      <div className="g-inset p-4 text-center">
        <div className="g-label">Todo tu dinero</div>
        <Amount cents={total} size="xl" className="text-ink mt-1 !text-4xl" />
        {game.mailboxCents > 0 && (
          <div className="text-[13px] font-bold text-orange-d mt-1">+ {formatCents(game.mailboxCents)} sin recoger en el buzón</div>
        )}
      </div>
      <SectionTitle>Dónde está cada parte</SectionTitle>
      <ul className="grid gap-2">
        {rows.map((r) => {
          const locked = game.world < r.world || (r.cents === null && r.world === 1)
          const pct = total > 0 && r.cents ? Math.round((r.cents / total) * 100) : 0
          return (
            <li key={r.name} className={`g-row ${locked ? 'g-row--muted' : ''}`}>
              <span className={`g-icon ${locked ? '' : r.tone}`} aria-hidden="true">
                {locked ? '🔒' : r.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-display font-extrabold text-ink text-[15px] leading-tight">{r.name}</div>
                {locked ? (
                  <div className="text-[12px] font-bold text-ink-3">{r.world === 1 ? 'Abre al terminar el año 1' : `Se abre en el Mundo ${r.world}`}</div>
                ) : (
                  <div className="g-bar g-bar--sm g-bar--orange mt-1">
                    <i style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
              {!locked && (
                <div className="text-right">
                  <Amount cents={r.cents ?? 0} size="md" />
                  <div className="text-[11px] font-bold text-ink-3 tabular-nums">{pct} %</div>
                </div>
              )}
              {!locked && r.view && (
                <button type="button" onClick={() => setView(r.view!)} className="g-btn g-btn--blue g-btn--sm">
                  Ir
                </button>
              )}
            </li>
          )
        })}
      </ul>
      <p className="text-[13px] font-semibold text-ink-l mt-3 mb-0">
        El patrimonio es todo lo que tienes: lo que guardas y lo que has puesto a trabajar. Lo que gastas en la tienda se convierte en cosas, no en patrimonio.
      </p>
    </Sheet>
  )
}

/* ───────────────────────── Eventos ───────────────────────── */

function EventosPanel() {
  const game = useGame((s) => s.game)!
  const nowMs = useGame((s) => s.nowMs)
  const acornsFound = useGame((s) => s.acornsFound)
  const seenDiary = useGame((s) => s.seenDiary)
  const seenBankOpen = useGame((s) => s.seenBankOpen)
  const seenWorld = useGame((s) => s.seenWorld)
  const seenMissions = useGame((s) => s.seenMissions)
  const seen = { seenDiary, seenBankOpen, seenWorld, seenMissions }
  const setView = useGame((s) => s.setView)
  const collect = useGame((s) => s.collect)
  const month = currentMonth(game, nowMs)
  const acornsLeft = game.taskDoneMonth < month ? TASK_ACORNS - acornsFound.length : 0
  const events = pendingEvents(game, acornsLeft, seen)
  return (
    <Sheet title="Eventos" tone="orange">
      {events.length === 0 ? (
        <Tortuga>Nada pendiente. La isla sigue trabajando por ti; mañana habrá paga nueva y bellotas frescas.</Tortuga>
      ) : (
        <ul className="grid gap-2">
          {events.map((e) => (
            <li key={e.id} className="g-row">
              <span className={`g-icon g-icon--${e.tone}`} aria-hidden="true">
                {e.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-display font-extrabold text-ink text-[15px] leading-tight">{e.title}</div>
                <div className="text-[12.5px] font-semibold text-ink-l leading-snug">{e.detail}</div>
              </div>
              {e.id === 'paga' ? (
                <button type="button" onClick={collect} className="g-btn g-btn--orange g-btn--sm">
                  Recoger
                </button>
              ) : (
                <button type="button" onClick={() => setView(e.view)} className="g-btn g-btn--blue g-btn--sm">
                  Ir
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}

/* ───────────────────────── Lugares ───────────────────────── */

function CasaPanel() {
  const game = useGame((s) => s.game)!
  const collect = useGame((s) => s.collect)
  const setView = useGame((s) => s.setView)
  return (
    <Sheet title="Tu casa" tone="red">
      <div className="grid grid-cols-2 gap-3">
        <Big label="En el buzón" cents={game.mailboxCents} />
        <Big label="En el cofre" cents={game.huchaCents} />
      </div>
      <div className="mt-3">
        {game.mailboxCents > 0 ? (
          <GButton onClick={collect} tone="g-btn--orange">
            Recoger {formatCents(game.mailboxCents)}
          </GButton>
        ) : (
          <p className="text-ink-3 text-sm font-bold text-center m-0">El buzón está vacío. La siguiente paga de {formatCents(PAGA_CENTS)} llega mañana.</p>
        )}
      </div>
      <div className="mt-4">
        <Tortuga>
          Cada mes de isla (cada día tuyo) te llega la paga al buzón. Lo que recojas va al cofre de la cueva. Desde allí decides: gastarlo,
          guardarlo o llevarlo al banco.
        </Tortuga>
      </div>
      <MyThings />
      <SectionTitle>Últimos movimientos</SectionTitle>
      <Ledger events={game.ledger} />
      <div className="mt-3">
        <GButton onClick={() => setView('cofre')} tone="g-btn--cream">
          Ir al cofre
        </GButton>
      </div>
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
        <h3 className="g-title text-[15px] m-0">Mis cosas</h3>
        <button type="button" onClick={() => setView('tienda')} className="text-sm font-extrabold text-blue-d">
          Ver catálogo →
        </button>
      </div>
      {owned.length === 0 && eaten === 0 ? (
        <div className="g-inset p-4 text-ink-l text-sm font-semibold">Todavía no tienes nada. Lo que compres en la tienda aparecerá en tu isla y aquí.</div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {owned.map((d) => (
            <div key={d.id} className="item-card item-card--owned !p-2 !gap-1">
              <div className="item-card__icon !h-14 !text-3xl">{d.icon}</div>
              <div className="font-display font-extrabold text-[12px] text-ink text-center leading-tight">{d.name}</div>
            </div>
          ))}
          {eaten > 0 && (
            <div className="item-card !p-2 !gap-1">
              <div className="item-card__icon !h-14 !text-3xl">🍦</div>
              <div className="font-display font-extrabold text-[12px] text-ink text-center leading-tight">×{eaten}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CofrePanel() {
  const game = useGame((s) => s.game)!
  const setView = useGame((s) => s.setView)
  return (
    <Sheet title="El cofre" tone="orange">
      <div className="grid grid-cols-2 gap-3">
        <Big label="En el cofre" cents={game.huchaCents} />
        <Big label="En el banco" cents={game.bankCents} />
      </div>
      <div className="mt-4">
        <Tortuga>
          El cofre guarda tu dinero a buen recaudo, pero no lo hace crecer. Y cada año los precios de la tienda suben un poco. Si un dinero
          no lo vas a usar pronto, el banco es mejor sitio.
        </Tortuga>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <GButton onClick={() => setView('banco')}>Al banco</GButton>
        <GButton onClick={() => setView('tienda')} tone="g-btn--cream">
          A la tienda
        </GButton>
      </div>
      <SectionTitle>Últimos movimientos</SectionTitle>
      <Ledger events={game.ledger} />
    </Sheet>
  )
}

function TiendaPanel() {
  const game = useGame((s) => s.game)!
  const buy = useGame((s) => s.buy)
  const hadInflation = game.inflationHistoryBps.length > 0
  const lastInf = game.inflationHistoryBps[game.inflationHistoryBps.length - 1]
  return (
    <Sheet title="Tienda" tone="red">
      <div className="flex items-center justify-between mb-3">
        <span className="g-label">Tienes en el cofre</span>
        <Amount cents={game.huchaCents} size="lg" />
      </div>
      {hadInflation && (
        <div className="mb-3">
          <Tortuga>Este año los precios han subido un {formatPct(lastInf)}. Es la inflación: el precio viejo está tachado para que lo veas.</Tortuga>
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
                <div className="font-display font-extrabold text-ink text-[17px] leading-tight">{def.name}</div>
                <div className="text-ink-3 text-[12px] font-semibold leading-snug mt-0.5">{def.description}</div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="price-tag">
                  <CoinIcon size={14} />
                  {formatCents(st.priceCents)}
                </span>
                {changed && <span className="text-ink-3 text-xs font-bold line-through tabular-nums">{formatCents(st.previousPriceCents)}</span>}
              </div>
              <div className="text-[10px] font-bold text-ink-3 -mt-1">IVA {def.ivaPct} % incluido</div>
              <button type="button" disabled={!can && !owned} onClick={() => !owned && buy(def.id)} className={`g-btn g-btn--sm ${owned ? 'g-btn--cream' : 'g-btn--orange'}`}>
                {owned ? 'En tu isla' : can ? 'Comprar' : 'Te falta'}
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
      <Sheet title="Banco · en obras" tone="sky">
        <div className="g-inset p-4 text-center">
          <div className="text-4xl mb-1">🏗️</div>
          <div className="g-title text-lg">En construcción</div>
          <div className="text-ink-l font-bold text-sm mt-1">Abre al terminar el año 1: {daysLeft <= 1 ? 'mañana' : `en ${daysLeft} días`}.</div>
        </div>
        <div className="mt-4">
          <Tortuga>
            El banco guarda tu dinero como el cofre, pero cada mes te da un poquito más solo por tenerlo allí. Mientras tanto, ve ahorrando:
            cuando abra, tendrás algo que llevar.
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
    <Sheet title="Banco de la Isla" tone="green">
      <div className="grid grid-cols-2 gap-3">
        <Big label="En el banco" cents={game.bankCents} />
        <Big label="En el cofre" cents={game.huchaCents} />
      </div>
      <p className="text-ink-l font-bold text-sm mt-3 mb-0">
        Paga un {formatPct(BANK_RATE_BPS)} al año, repartido cada mes.{' '}
        {game.bankCents > 0 && (
          <>
            Mañana te dará <b className="text-ink">{formatCents(nextInterest, { alwaysDecimals: true })}</b>.
          </>
        )}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 g-inset p-1.5">
        {(['meter', 'sacar'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`h-11 rounded-2xl font-display font-extrabold uppercase tracking-wide text-[14px] transition ${mode === m ? 'bg-white text-ink shadow-[0_3px_0_var(--color-cream-d)]' : 'text-ink-l'}`}
          >
            {m === 'meter' ? 'Meter' : 'Sacar'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3">
        {QUICK.map((q) => (
          <button key={q} type="button" disabled={q > source} onClick={() => act(q)} className="g-btn g-btn--cream g-btn--sm !px-0 tabular-nums">
            {formatCents(q)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 mt-2 items-center">
        <div className="min-w-0 flex items-center gap-2 h-12 px-3 g-inset">
          <CoinIcon size={16} />
          <input
            id="bank-amount"
            inputMode="decimal"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Otra cantidad"
            className="min-w-0 flex-1 bg-transparent outline-none font-display font-extrabold text-ink placeholder:text-ink-3/70"
          />
        </div>
        <button type="button" disabled={!customOk} onClick={() => act(parsed)} className="g-btn g-btn--sm">
          {mode === 'meter' ? 'Meter' : 'Sacar'}
        </button>
        <button type="button" disabled={source <= 0} onClick={() => act(source)} className="g-btn g-btn--cream g-btn--sm">
          Todo
        </button>
      </div>

      <div className="mt-4">
        <Tortuga>
          Aquí el dinero está tan seguro como en el cofre y lo puedes sacar cuando quieras. La diferencia: cada mes crece un poquito. Poquito,
          pero siempre.
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
    <Sheet title="Doña Tortuga" tone="sky">
      <div className="grid grid-cols-2 gap-2 g-inset p-1.5 mb-3">
        {(['diario', 'ayuda'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`h-11 rounded-2xl font-display font-extrabold uppercase tracking-wide text-[14px] transition ${tab === t ? 'bg-white text-ink shadow-[0_3px_0_var(--color-cream-d)]' : 'text-ink-l'}`}
          >
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
          <div className="grid gap-3">
            {entries.map((e) => (
              <article key={e.year} className="g-inset p-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="g-title text-lg m-0">Año {e.year}</h3>
                  <span className="g-label">Inflación {formatPct(e.inflationBps)}</span>
                </div>
                {diaryParagraphs(e).map((p, i) => (
                  <p key={i} className="text-[15px] font-semibold leading-relaxed text-ink mt-2 mb-0">
                    {p}
                  </p>
                ))}
              </article>
            ))}
          </div>
        )
      ) : (
        <div className="grid gap-2.5 text-[15px] font-semibold leading-relaxed text-ink">
          {[
            ['Un día real es un mes de isla', 'Cada tres días cambia la estación y cada doce se cierra un año. La isla sigue aunque no entres.'],
            ['Cada día', 'Llega la paga a tu casa (tócala para recogerla), hay cinco bellotas escondidas por la isla y tú decides qué haces con tu dinero: gastarlo en la tienda, guardarlo en el cofre o llevarlo al banco.'],
            ['Muévete por la isla', 'Toca un edificio para ir hasta él. Arrastra con un dedo para girar la isla y usa dos dedos para acercarte.'],
            ['Los solares en obras', 'Son edificios que se abrirán cuando llegues a su mundo. Completa las misiones para avanzar.'],
          ].map(([t, d]) => (
            <div key={t} className="g-inset p-3.5">
              <div className="g-title text-[15px]">{t}</div>
              <p className="m-0 text-ink-l">{d}</p>
            </div>
          ))}
          <div className="g-inset p-3.5">
            <div className="g-title text-[15px]">La moneda</div>
            <p className="m-0 text-ink-l flex items-center gap-1.5 flex-wrap">
              El dinero de la isla es el euroLuky <CoinIcon size={16} />. Se parece a un euro, pero solo vale aquí.
            </p>
          </div>
        </div>
      )}
    </Sheet>
  )
}

function MisionesPanel() {
  const game = useGame((s) => s.game)!
  const setView = useGame((s) => s.setView)
  const board = missionsFor(game)
  return (
    <Sheet title={`Mundo ${board.world} · ${board.worldName}`} tone="purple">
      <div className="flex items-center gap-3 mb-3">
        <div className="g-bar flex-1">
          <i style={{ width: `${(board.completed / board.total) * 100}%` }} />
        </div>
        <span className="font-display font-extrabold text-ink tabular-nums">
          {board.completed}/{board.total}
        </span>
      </div>
      <Tortuga>
        Completa las misiones para abrir el siguiente mundo: <b>{board.reward}</b>. No hay prisa: la isla no se va a ninguna parte.
      </Tortuga>
      <ul className="grid gap-2 mt-3">
        {board.missions.map((mi) => (
          <li key={mi.id} className={`g-row ${mi.done ? 'g-row--muted' : ''}`}>
            <span className={`g-icon ${mi.done ? 'g-icon--green' : ''}`} aria-hidden="true">
              {mi.done ? '✓' : mi.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className={`font-display font-extrabold text-[15px] leading-tight ${mi.done ? 'text-green-d line-through' : 'text-ink'}`}>{mi.title}</div>
              {!mi.done && <div className="text-ink-l text-[12.5px] font-semibold leading-snug mt-0.5">{mi.hint}</div>}
              {!mi.done && mi.goal > 1 && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="g-bar g-bar--sm flex-1">
                    <i style={{ width: `${(mi.progress / mi.goal) * 100}%` }} />
                  </div>
                  <span className="text-[11px] font-extrabold text-ink-3 tabular-nums">
                    {mi.goal >= 100 ? `${formatCents(mi.progress)}/${formatCents(mi.goal)}` : `${mi.progress}/${mi.goal}`}
                  </span>
                </div>
              )}
            </div>
            {!mi.done && (
              <button type="button" onClick={() => setView(mi.place)} className="g-btn g-btn--blue g-btn--sm">
                Ir
              </button>
            )}
          </li>
        ))}
      </ul>

      <SectionTitle>La isla, mundo a mundo</SectionTitle>
      <div className="grid gap-2">
        {[1, 2, 3, 4].map((w) => {
          const open = game.world >= w
          return (
            <div key={w} className={`g-inset p-3 ${open ? '' : 'opacity-80'}`}>
              <div className="flex items-baseline justify-between">
                <span className="font-display font-extrabold text-ink">
                  Mundo {w} · {WORLD_NAMES[w]}
                </span>
                <span className={`g-label ${open ? '!text-green-d' : ''}`}>{open ? 'abierto' : 'en obras'}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {BUILDINGS.filter((b) => b.world === w).map((b) => (
                  <span key={b.id} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-extrabold ${open ? 'bg-white text-ink shadow-[0_2px_0_var(--color-cream-d)]' : 'bg-cream-d/50 text-ink-l'}`}>
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
    case 'eventos':
      return <EventosPanel />
    case 'patrimonio':
      return <PatrimonioPanel />
    default:
      return null
  }
}
