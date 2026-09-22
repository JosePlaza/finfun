import { useMemo, useState, type ReactNode } from 'react'
import {
  BANK_RATE_BPS,
  BOND_OFFERS,
  bondCoupon,
  bondsTotal,
  COMMISSION_CENTS,
  FUND_FEE_BPS_YEAR,
  fundNavSeries,
  fundValue,
  marketAt,
  refugeFear,
  marketCtx,
  SHARES_PER_BUSINESS,
  stocksValue,
  type BusinessState,
  calendarOf,
  currentMonth,
  diaryParagraphs,
  formatCents,
  formatPct,
  HUERTO_COST_CENTS,
  HUERTO_EVERY_MONTHS,
  HUERTO_FOOD_MONTHS,
  HUERTO_UPGRADE_COST_CENTS,
  HUERTO_UPGRADED_FOOD_MONTHS,
  HUNGER_DEATH_MONTHS,
  LESSONS,
  QUIZZES,
  quizStatus,
  missionsFor,
  monthlyInterest,
  PAGA_CENTS,
  RETENTION_BPS,
  SHOP_ITEMS,
  TASK_ACORNS,
  type LedgerEvent,
  liebreAt,
  liebreCtx,
  liebreCanBorrow,
  liebreLesson,
  LIEBRE_LOAN_CENTS,
  LIEBRE_LOAN_REPAY_CENTS,
  MONTH_NAMES,
  netWorth,
  BUSINESS_BY_ID,
  SHARE_URL,
} from '../sim'
import { useGame } from '../store/game'
import { Amount, CoinIcon } from './Coin'
import { BUILDING_BY_ID, BUILDINGS, WORLD_NAMES, type BuildingId } from '../scene/registry'
import { pendingEvents } from './events'
import { playEventSfx } from './Music'
import { ShareQr } from './ShareQr'

type Tone = 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'sky'

/* ───────────────────────── Contenedor: panel de juego ───────────────────────── */

function Sheet({ title, tone = 'blue', children }: { title: string; tone?: Tone; children: ReactNode }) {
  const setView = useGame((s) => s.setView)
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end pointer-events-none px-3 pb-[max(12px,env(safe-area-inset-bottom))] md:px-5">
      <div className={`sheet-enter pointer-events-auto relative mx-auto w-full max-w-md g-panel g-panel--${tone} md:mx-0 md:ml-auto md:mb-4`}>
        <div className={`g-ribbon ${title.length > 14 ? 'g-ribbon--long' : ''}`}>{title}</div>
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

function GButton({
  children,
  onClick,
  disabled,
  tone = '',
  block = true,
  size = '',
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  tone?: string
  block?: boolean
  size?: string
}) {
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
  comida: '🧺',
  huerto: '🌾',
  bono: '📜',
  cupon: '🪙',
  vencimiento: '🏛️',
  impuestos: '🦉',
  dividendo: '🎁',
  tormenta: '⛈️',
  'acciones-compra': '📈',
  'acciones-venta': '📉',
  noticia: '📰',
  'fondo-compra': '🏠',
  'fondo-venta': '🏠',
  prestamo: '🐰',
  devolucion: '🐰',
  rescate: '🐢',
}

/** Línea de precio de los últimos meses, sin ejes: solo la forma. */
function Sparkline({ values, up }: { values: number[]; up: boolean }) {
  const w = 120
  const h = 36
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${h - 3 - ((v - min) / span) * (h - 6)}`).join(' ')
  const color = up ? 'var(--color-green)' : 'var(--color-red)'
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function PctChange({ now, before }: { now: number; before: number }) {
  const pct = before > 0 ? ((now - before) / before) * 100 : 0
  const up = pct >= 0
  return (
    <span className={`font-display font-extrabold tabular-nums text-[13px] ${up ? 'text-green-d' : 'text-red-d'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct).toLocaleString('es-ES', { maximumFractionDigits: 1 })} %
    </span>
  )
}

/** Pestañas del kit (Meter/Sacar, Diario/Ayuda…). */
function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="grid gap-2 g-inset p-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`h-11 rounded-2xl font-display font-extrabold uppercase tracking-wide text-[14px] transition ${value === v ? 'bg-white text-ink shadow-[0_3px_0_var(--color-cream-d)]' : 'text-ink-l'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** La despensa: cuánta comida queda y cuánto hambre hay. */
function Pantry({ compact = false }: { compact?: boolean }) {
  const game = useGame((s) => s.game)!
  const setView = useGame((s) => s.setView)
  const months = game.foodMonths
  const hungry = game.hunger > 0
  const tone = hungry ? 'red' : months <= 1 ? 'orange' : 'green'
  const pct = hungry ? 0 : Math.min(100, (months / 6) * 100)
  return (
    <div className={`g-inset p-3.5 ${hungry ? '!bg-red-l/30' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`g-icon g-icon--${tone} !w-10 !h-10`} aria-hidden="true">
            {hungry ? '😟' : '🧺'}
          </span>
          <div>
            <div className="g-label">Despensa</div>
            <div className="font-display font-extrabold text-ink text-[16px] leading-tight">
              {hungry
                ? `Sin comida · ${game.hunger} ${game.hunger === 1 ? 'mes' : 'meses'} sin comer`
                : months === 0
                  ? 'Vacía: hoy se ha comido lo último'
                  : `Comida para ${months} ${months === 1 ? 'mes' : 'meses'}`}
            </div>
          </div>
        </div>
        {!compact && (
          <button type="button" onClick={() => setView('tienda')} className={`g-btn g-btn--sm ${hungry || months <= 1 ? 'g-btn--orange' : 'g-btn--cream'}`}>
            Comprar
          </button>
        )}
      </div>
      <div className={`g-bar g-bar--sm mt-2 ${hungry ? 'g-bar--red' : tone === 'orange' ? 'g-bar--orange' : ''}`}>
        <i style={{ width: `${pct}%` }} />
      </div>
      {hungry && (
        <p className="m-0 mt-2 text-[12.5px] font-bold text-red-d">
          A los {HUNGER_DEATH_MONTHS} meses sin comer Doña Tortuga tendrá que rescatarte y perderás lo del cofre. Quedan {HUNGER_DEATH_MONTHS - game.hunger}. Compra una cesta
          cuanto antes.
        </p>
      )}
      {!hungry && months <= 1 && <p className="m-0 mt-2 text-[12.5px] font-bold text-orange-d">Queda poco. Cada mes de isla se come una ración.</p>}
    </div>
  )
}

/** La cesta domiciliada: interruptor en la tienda. */
function AutoFoodRow() {
  const game = useGame((s) => s.game)!
  const setAutoFood = useGame((s) => s.setAutoFood)
  const on = game.autoFood
  return (
    <div className="g-inset p-3.5 mt-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`g-icon ${on ? 'g-icon--green' : 'g-icon--orange'} shrink-0 !w-10 !h-10`} aria-hidden="true">
          🔁
        </span>
        <div className="min-w-0">
          <div className="font-display font-extrabold text-ink text-[15px] leading-tight">Cesta domiciliada</div>
          <div className="text-[12px] font-semibold text-ink-l leading-snug">
            {on
              ? 'Cuando la despensa se vacíe, la isla compra sola la cesta pequeña con tu dinero (del cofre; si no llega, del banco).'
              : 'Desactivada: la comida la compras tú cada mes. Si te olvidas, hambre.'}
          </div>
        </div>
      </div>
      <button type="button" role="switch" aria-checked={on} aria-label="Cesta domiciliada" className="g-switch shrink-0" onClick={() => setAutoFood(!on)} />
    </div>
  )
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
  const nowMs = useGame((s) => s.nowMs)
  const setView = useGame((s) => s.setView)
  const month = currentMonth(game, nowMs)
  const bonds = bondsTotal(game)
  const stocks = stocksValue(game, month)
  const fund = fundValue(game, month)
  const invested = Object.values(game.holdings ?? {}).reduce((a, h) => a + h.shares * h.avgCostCents, 0)
  const total = game.huchaCents + game.bankCents + bonds + stocks + fund
  const rows: {
    icon: string
    name: string
    cents: number | null
    world: number
    view?: 'cofre' | 'banco' | 'casa' | 'ayuntamiento' | 'mercado' | 'fondo'
    tone: string
    note?: string
  }[] = [
    { icon: '🪙', name: 'Cofre de la cueva', cents: game.huchaCents, world: 1, view: 'cofre', tone: 'g-icon--orange' },
    { icon: '🏦', name: 'Banco de la Isla', cents: game.bankUnlocked ? game.bankCents : null, world: 1, view: 'banco', tone: 'g-icon--green' },
    { icon: '📜', name: 'Bonos del Ayuntamiento', cents: game.world >= 2 ? bonds : null, world: 2, view: 'ayuntamiento', tone: 'g-icon--blue' },
    {
      icon: '📈',
      name: 'Acciones',
      cents: game.world >= 3 ? stocks : null,
      world: 3,
      view: 'mercado',
      tone: 'g-icon--purple',
      note: stocks > 0 ? `${stocks - invested >= 0 ? 'ganas' : 'pierdes'} ${formatCents(Math.abs(stocks - invested))} sin vender` : undefined,
    },
    {
      icon: '🏠',
      name: 'Fondo Isla',
      cents: game.world >= 4 ? fund : null,
      world: 4,
      view: 'fondo',
      tone: 'g-icon--purple',
      note: fund > 0 ? `${fund - game.fundCostCents >= 0 ? 'ganas' : 'pierdes'} ${formatCents(Math.abs(fund - game.fundCostCents))} sin vender` : undefined,
    },
  ]
  return (
    <Sheet title="Tu patrimonio" tone="orange">
      <div className="g-inset p-4 text-center">
        <div className="g-label">Todo tu dinero</div>
        <Amount cents={total} size="xl" className="text-ink mt-1 !text-4xl" />
        {game.mailboxCents > 0 && <div className="text-[13px] font-bold text-orange-d mt-1">+ {formatCents(game.mailboxCents)} sin recoger en el buzón</div>}
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
                  <div className="text-[12px] font-bold text-ink-3">{`Se abre en el Nivel ${r.world}`}</div>
                ) : (
                  <>
                    <div className="g-bar g-bar--sm g-bar--orange mt-1">
                      <i style={{ width: `${pct}%` }} />
                    </div>
                    {r.note && <div className={`text-[11px] font-bold mt-0.5 ${r.note.startsWith('ganas') ? 'text-green-d' : 'text-red-d'}`}>{r.note}</div>}
                  </>
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
  const openWheel = useGame((s) => s.openWheel)
  const hintAcorn = useGame((s) => s.hintAcorn)
  const revealAcorns = useGame((s) => s.revealAcorns)
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
            <li key={e.id} className="g-card">
              <div className="g-card__head">
                <span className={`g-icon g-icon--${e.tone}`} aria-hidden="true">
                  {e.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-extrabold text-ink text-[15px] leading-tight">{e.title}</div>
                  <div className="text-[12.5px] font-semibold text-ink-l leading-snug">{e.detail}</div>
                </div>
              </div>
              <div className="g-card__foot">
                {e.id === 'paga' ? (
                  <button type="button" onClick={collect} className="g-btn g-btn--orange g-btn--sm">
                    Recoger
                  </button>
                ) : e.id === 'ruleta' ? (
                  <button type="button" onClick={() => openWheel(true)} className="g-btn g-btn--purple g-btn--sm">
                    Girar
                  </button>
                ) : e.id === 'bellotas' ? (
                  <>
                    <button type="button" onClick={revealAcorns} className="g-btn g-btn--cream g-btn--sm" title="Te enseña todas, pero hoy no hay premio">
                      Resolver
                    </button>
                    <button type="button" onClick={hintAcorn} className="g-btn g-btn--blue g-btn--sm" title="Te enseña dónde está una de las que faltan">
                      Pista
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setView(e.view)} className="g-btn g-btn--blue g-btn--sm">
                    Ir
                  </button>
                )}
              </div>
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
        <Pantry />
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
          Cada mes de isla (cada día tuyo) te llega la paga al buzón. Lo que recojas va al cofre de la cueva. Desde allí decides: gastarlo, guardarlo o llevarlo al banco.
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
  const treats = SHOP_ITEMS.filter((d) => d.kind === 'consumible')
    .map((d) => ({ def: d, n: game.purchases.filter((p) => p.itemId === d.id).length }))
    .filter((t) => t.n > 0)
  const eaten = treats.reduce((a, t) => a + t.n, 0)
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
          {treats.map((t) => (
            <div key={t.def.id} className="item-card !p-2 !gap-1">
              <div className="item-card__icon !h-14 !text-3xl">{t.def.icon}</div>
              <div className="font-display font-extrabold text-[12px] text-ink text-center leading-tight">×{t.n}</div>
            </div>
          ))}
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
          El cofre guarda tu dinero a buen recaudo, pero no lo hace crecer. Y cada año los precios de la tienda suben un poco. Si un dinero no lo vas a usar pronto, el banco es
          mejor sitio.
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
      <Pantry compact />
      <AutoFoodRow />
      <SectionTitle>Comida</SectionTitle>
      <ItemGrid kinds={['comida']} />
      <SectionTitle>Cosas que apetecen</SectionTitle>
      <ItemGrid kinds={['consumible', 'objeto']} />
    </Sheet>
  )
}

function ItemGrid({ kinds }: { kinds: string[] }) {
  const game = useGame((s) => s.game)!
  const buy = useGame((s) => s.buy)
  return (
    <ul className="grid grid-cols-2 gap-2.5">
      {SHOP_ITEMS.filter((d) => kinds.includes(d.kind)).map((def) => {
        const st = game.shop.find((s) => s.id === def.id)!
        const owned = def.kind === 'objeto' && game.purchases.some((p) => p.itemId === def.id)
        const can = game.huchaCents >= st.priceCents && !owned
        const changed = st.previousPriceCents !== st.priceCents
        const perMonth = def.kind === 'comida' && def.foodMonths ? st.priceCents / def.foodMonths : null
        return (
          <li key={def.id} className={`item-card ${owned ? 'item-card--owned' : can ? 'item-card--can' : ''}`}>
            {owned && <span className="ribbon">Tuyo ✓</span>}
            <div className="item-card__icon">{def.icon}</div>
            <div>
              <div className="font-display font-extrabold text-ink text-[15px] leading-tight truncate">{def.name}</div>
              <div className="item-card__desc">{def.description}</div>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-auto">
              <span className="price-tag">
                <CoinIcon size={14} />
                {formatCents(st.priceCents)}
              </span>
              {changed && <span className="text-ink-3 text-xs font-bold line-through tabular-nums">{formatCents(st.previousPriceCents)}</span>}
              {perMonth !== null && <span className="text-[10px] font-bold text-ink-3">{formatCents(Math.round(perMonth), { alwaysDecimals: true })} al mes</span>}
            </div>
            <button
              type="button"
              disabled={!can && !owned}
              onClick={() => !owned && buy(def.id)}
              className={`g-btn g-btn--sm ${owned ? 'g-btn--cream' : def.kind === 'comida' ? 'g-btn--green' : 'g-btn--orange'}`}
            >
              {owned ? 'En tu isla' : can ? 'Comprar' : 'Te falta'}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

const QUICK = [5_00, 10_00, 20_00, 50_00]

function BancoPanel() {
  const game = useGame((s) => s.game)!
  const deposit = useGame((s) => s.deposit)
  const withdraw = useGame((s) => s.withdraw)
  const [mode, setMode] = useState<'meter' | 'sacar'>('meter')
  const [custom, setCustom] = useState('')

  const source = mode === 'meter' ? game.huchaCents : game.bankCents
  const parsed = Math.round(parseFloat(custom.replace(',', '.')) * 100)
  const customOk = Number.isFinite(parsed) && parsed > 0 && parsed <= source
  const act = (cents: number) => {
    if (mode === 'meter') deposit(cents)
    else withdraw(cents)
    setCustom('')
  }
  const nextInterest = monthlyInterest(game.bankCents, game.taxesUnlocked, game.taxMode).net

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

      <div className="mt-4">
        <Tabs
          value={mode}
          onChange={setMode}
          options={[
            ['meter', 'Meter'],
            ['sacar', 'Sacar'],
          ]}
        />
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
        <Tortuga>Aquí el dinero está tan seguro como en el cofre y lo puedes sacar cuando quieras. La diferencia: cada mes crece un poquito. Poquito, pero siempre.</Tortuga>
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
      <div className="mb-3">
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            ['diario', 'Diario'],
            ['ayuda', 'Cómo se juega'],
          ]}
        />
      </div>
      {tab === 'diario' ? (
        entries.length === 0 ? (
          <Tortuga>
            Escribo una página al terminar cada año de isla. La primera, {daysToYearEnd <= 1 ? 'mañana' : `dentro de ${daysToYearEnd} días`}. Te contaré qué ha pasado con tu
            dinero… y qué habría pasado si lo hubieras puesto en otro sitio.
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
            [
              'Un día real es un mes de isla',
              'El año de la isla va de enero a diciembre: cada tres días cambia la estación y al pasar de diciembre a enero se cierra el año y sale la ruleta de la inflación. La isla sigue aunque no entres.',
            ],
            [
              'Cada día',
              'Llega la paga a tu casa (tócala para recogerla), hay cinco bellotas escondidas por la isla y tú decides qué haces con tu dinero: gastarlo en la tienda, guardarlo en el cofre o llevarlo al banco.',
            ],
            ['Muévete por la isla', 'Toca un edificio para ir hasta él. Arrastra con un dedo para girar la isla y usa dos dedos para acercarte.'],
            [
              'La despensa',
              'Cada mes se come una ración. Compra cestas en la tienda (la grande sale más barata por mes) o construye el huerto. Seis meses sin comer y la aventura se acaba.',
            ],
            ['La ruleta del año', 'Al cerrar cada año aparece la ruleta de la inflación. La giras tú: lo que salga es lo que suben los precios de la tienda.'],
            ['Los solares en obras', 'Son edificios que se abrirán cuando llegues a su nivel. Tócalos para leer qué harás allí. Completa las misiones para avanzar.'],
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
    <Sheet title={`Nivel ${board.world}`} tone="purple">
      <div className="flex items-center gap-3 mb-3">
        <span className="g-title text-[15px] whitespace-nowrap">{board.worldName}</span>
        <div className="g-bar flex-1">
          <i style={{ width: `${(board.completed / board.total) * 100}%` }} />
        </div>
        <span className="font-display font-extrabold text-ink tabular-nums">
          {board.completed}/{board.total}
        </span>
      </div>
      <Tortuga>
        Completa las misiones para abrir el siguiente nivel: <b>{board.reward}</b>. No hay prisa: la isla no se va a ninguna parte.
      </Tortuga>
      <ul className="grid gap-2 mt-3">
        {board.missions.map((mi) => (
          <li key={mi.id} className={mi.done ? 'g-row g-row--muted' : 'g-card'}>
            <div className={mi.done ? 'contents' : 'g-card__head'}>
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
            </div>
            {!mi.done && (
              <div className="g-card__foot">
                <button type="button" onClick={() => setView(mi.place)} className="g-btn g-btn--blue g-btn--sm">
                  Ir
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <SectionTitle>La isla, nivel a nivel</SectionTitle>
      <div className="grid gap-2">
        {[1, 2, 3, 4].map((w) => {
          const open = game.world >= w
          return (
            <div key={w} className={`g-inset p-3 ${open ? '' : 'opacity-80'}`}>
              <div className="flex items-baseline justify-between">
                <span className="font-display font-extrabold text-ink">
                  Nivel {w} · {WORLD_NAMES[w]}
                </span>
                <span className={`g-label ${open ? '!text-green-d' : ''}`}>{open ? 'abierto' : 'en obras'}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {BUILDINGS.filter((b) => b.world === w).map((b) => (
                  <span
                    key={b.id}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-extrabold ${open ? 'bg-white text-ink shadow-[0_2px_0_var(--color-cream-d)]' : 'bg-cream-d/50 text-ink-l'}`}
                  >
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

/* ───────────────────────── Huerto ───────────────────────── */

function HuertoPanel() {
  const game = useGame((s) => s.game)!
  const nowMs = useGame((s) => s.nowMs)
  const buildHuerto = useGame((s) => s.buildHuerto)
  const upgradeHuerto = useGame((s) => s.upgradeHuerto)
  const setView = useGame((s) => s.setView)
  const built = game.huertoBuiltMonth !== null
  const can = game.huchaCents >= HUERTO_COST_CENTS
  if (!built) {
    const pct = Math.min(100, (game.huchaCents / HUERTO_COST_CENTS) * 100)
    return (
      <Sheet title="Huerto · en venta" tone="green">
        <div className="g-inset p-4 text-center">
          <div className="text-4xl mb-1">🌾</div>
          <div className="g-title text-lg">Un huerto con animales</div>
          <div className="text-ink-l font-bold text-sm mt-1">
            Cuesta <b className="text-ink">{formatCents(HUERTO_COST_CENTS)}</b> euroLukys y da una cesta grande ({HUERTO_FOOD_MONTHS} meses de comida) cada {HUERTO_EVERY_MONTHS}{' '}
            meses, para siempre.
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <span className="g-label">Tienes en el cofre</span>
            <Amount cents={game.huchaCents} size="md" />
          </div>
          <div className="g-bar mt-1.5">
            <i style={{ width: `${pct}%` }} />
          </div>
          <div className="text-[12px] font-bold text-ink-3 mt-1 text-right">{Math.floor(pct)} % del precio</div>
        </div>
        <div className="mt-4">
          <Tortuga>
            Una cesta grande cuesta {formatCents(game.shop.find((i) => i.id === 'cesta-grande')?.priceCents ?? 9_50)} en la tienda. El huerto te da cuatro al año sin pagar nada
            más, y cuando los precios suban, sus cestas valdrán más. Eso es una inversión: pagas hoy y cobras siempre.
          </Tortuga>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <GButton onClick={buildHuerto} disabled={!can} tone="g-btn--green">
            {can ? 'Construir' : `Te faltan ${formatCents(HUERTO_COST_CENTS - game.huchaCents)}`}
          </GButton>
          <GButton onClick={() => setView('cofre')} tone="g-btn--cream">
            Ir al cofre
          </GButton>
        </div>
      </Sheet>
    )
  }
  const month = currentMonth(game, nowMs)
  const since = month - game.huertoBuiltMonth!
  const nextIn = HUERTO_EVERY_MONTHS - (since % HUERTO_EVERY_MONTHS)
  const baskets = Math.floor(since / HUERTO_EVERY_MONTHS)
  const upgraded = game.huertoUpgradedMonth !== null
  const canUpgrade = game.huchaCents >= HUERTO_UPGRADE_COST_CENTS
  return (
    <Sheet title={upgraded ? 'Tu huerto ampliado' : 'Tu huerto'} tone="green">
      {upgraded && (
        <div className="g-inset p-3.5 mb-3 flex items-center gap-3 !bg-green-l/30">
          <span className="g-icon g-icon--green shrink-0" aria-hidden="true">
            🏝️
          </span>
          <div className="text-[13.5px] font-bold text-ink leading-snug">
            Independencia financiera: el huerto da {HUERTO_UPGRADED_FOOD_MONTHS} meses de comida cada {HUERTO_EVERY_MONTHS}. La despensa se llena sola.
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="g-inset p-3.5">
          <div className="g-label">Próxima cesta</div>
          <div className="font-display font-extrabold text-ink text-2xl mt-1">{nextIn === 1 ? 'mañana' : `en ${nextIn} días`}</div>
        </div>
        <div className="g-inset p-3.5">
          <div className="g-label">Cestas dadas</div>
          <div className="font-display font-extrabold text-ink text-2xl mt-1">{baskets}</div>
        </div>
      </div>
      <div className="mt-3">
        <Pantry />
      </div>
      <div className="mt-4">
        <Tortuga>
          La vaca, el cerdo y las gallinas trabajan mientras tú duermes. Cada {HUERTO_EVERY_MONTHS} meses dejan {upgraded ? HUERTO_UPGRADED_FOOD_MONTHS : HUERTO_FOOD_MONTHS} meses
          de comida en tu despensa. Ya has ahorrado {formatCents(baskets * (game.shop.find((i) => i.id === 'cesta-grande')?.priceCents ?? 9_50))} en comida.
        </Tortuga>
      </div>
      {!upgraded && (
        <>
          <SectionTitle>Ampliar el huerto</SectionTitle>
          <div className="g-card">
            <div className="g-card__head">
              <span className="g-icon g-icon--green" aria-hidden="true">
                🐝
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-display font-extrabold text-ink text-[15px] leading-tight">Invernadero, colmenas y otra vaca</div>
                <div className="text-[12.5px] font-semibold text-ink-l leading-snug">
                  Cuesta {formatCents(HUERTO_UPGRADE_COST_CENTS)}. Pasa de {HUERTO_FOOD_MONTHS} a {HUERTO_UPGRADED_FOOD_MONTHS} meses de comida por trimestre: exactamente lo que
                  comes. No volverás a comprar cestas.
                </div>
              </div>
            </div>
            <div className="g-card__foot">
              <button type="button" onClick={upgradeHuerto} disabled={!canUpgrade} className="g-btn g-btn--green g-btn--sm">
                {canUpgrade ? 'Ampliar' : `Te faltan ${formatCents(HUERTO_UPGRADE_COST_CENTS - game.huchaCents)}`}
              </button>
            </div>
          </div>
        </>
      )}
    </Sheet>
  )
}

/* ───────────────────────── Ayuntamiento: bonos ───────────────────────── */

const BOND_QUICK = [10_00, 20_00, 50_00, 100_00]

function AyuntamientoPanel() {
  const game = useGame((s) => s.game)!
  const nowMs = useGame((s) => s.nowMs)
  const buyBond = useGame((s) => s.buyBond)
  const [offerId, setOfferId] = useState(BOND_OFFERS[0].id)
  const [custom, setCustom] = useState('')
  const offer = BOND_OFFERS.find((o) => o.id === offerId)!
  const month = currentMonth(game, nowMs)
  const parsed = Math.round(parseFloat(custom.replace(',', '.')) * 100)
  const customOk = Number.isFinite(parsed) && parsed >= offer.minCents && parsed % 10_00 === 0 && parsed <= game.huchaCents
  const live = game.bonds
  return (
    <Sheet title="Ayuntamiento" tone="blue">
      <div className="flex items-center justify-between">
        <span className="g-label">Tienes en el cofre</span>
        <Amount cents={game.huchaCents} size="lg" />
      </div>
      <Tortuga>
        Comprar un bono es <b>prestar</b>. El Ayuntamiento usa tu dinero para una obra, te paga un cupón fijo cada tres meses y, al terminar el plazo, te lo devuelve entero. A más
        tiempo, más cupón.
      </Tortuga>

      <SectionTitle>Bonos en oferta</SectionTitle>
      <ul className="grid gap-2">
        {BOND_OFFERS.map((o) => {
          const sel = o.id === offerId
          return (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => setOfferId(o.id)}
                className={`g-row w-full text-left ${sel ? '!border-blue !bg-white' : ''}`}
                style={sel ? { boxShadow: '0 0 0 3px var(--color-blue)' } : undefined}
              >
                <span className={`g-icon ${sel ? 'g-icon--blue' : ''}`} aria-hidden="true">
                  {o.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-extrabold text-ink text-[15px] leading-tight">{o.name}</div>
                  <div className="text-[12px] font-semibold text-ink-l leading-snug">{o.purpose}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display font-extrabold text-blue-d text-lg leading-none">{formatPct(o.couponBps)}</div>
                  <div className="text-[11px] font-bold text-ink-3">al año · {o.months} meses</div>
                </div>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="g-inset p-3.5 mt-3">
        <div className="text-[13px] font-bold text-ink-l">
          Con <b className="text-ink">100</b> en el {offer.name}: cupón de <b className="text-ink">{formatCents(bondCoupon(100_00, offer.couponBps), { alwaysDecimals: true })}</b>{' '}
          cada trimestre ({Math.round(offer.months / 3)} cupones) y los 100 de vuelta en {offer.months} meses.
          {game.taxesUnlocked && game.taxMode === 'cada-cobro' && ' Hacienda retiene el 19 % de cada cupón.'}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3">
        {BOND_QUICK.map((q) => (
          <button key={q} type="button" disabled={q > game.huchaCents} onClick={() => buyBond(offer.id, q)} className="g-btn g-btn--cream g-btn--sm !px-0 tabular-nums">
            {formatCents(q)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 mt-2 items-center">
        <div className="min-w-0 flex items-center gap-2 h-12 px-3 g-inset">
          <CoinIcon size={16} />
          <input
            inputMode="numeric"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Otra cantidad (de 10 en 10)"
            className="min-w-0 flex-1 bg-transparent outline-none font-display font-extrabold text-ink placeholder:text-ink-3/70"
          />
        </div>
        <button
          type="button"
          disabled={!customOk}
          onClick={() => {
            buyBond(offer.id, parsed)
            setCustom('')
          }}
          className="g-btn g-btn--sm"
        >
          Prestar
        </button>
      </div>

      <SectionTitle>Tus bonos ({live.length})</SectionTitle>
      {live.length === 0 ? (
        <div className="g-inset p-3.5 text-ink-l text-sm font-semibold">Todavía no has prestado nada. Empieza con 10: es la mejor forma de ver cómo llega el primer cupón.</div>
      ) : (
        <ul className="grid gap-2">
          {live.map((b) => {
            const o = BOND_OFFERS.find((x) => x.id === b.offerId)!
            const left = b.maturityMonth - month
            const nextCoupon = 3 - ((month - b.boughtMonth) % 3 || 3) + 3
            return (
              <li key={b.id} className="g-row">
                <span className="g-icon g-icon--blue" aria-hidden="true">
                  {o.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-extrabold text-ink text-[15px] leading-tight">{o.name}</div>
                  <div className="text-[12px] font-semibold text-ink-l">
                    Cupón {formatCents(bondCoupon(b.principalCents, b.couponBps), { alwaysDecimals: true })} · próximo en {Math.min(nextCoupon, left)} días · vence en {left} días
                  </div>
                  <div className="g-bar g-bar--sm mt-1.5">
                    <i style={{ width: `${((month - b.boughtMonth) / (b.maturityMonth - b.boughtMonth)) * 100}%` }} />
                  </div>
                </div>
                <Amount cents={b.principalCents} size="md" />
              </li>
            )
          })}
        </ul>
      )}
    </Sheet>
  )
}

/* ───────────────────────── Hacienda: Don Búho ───────────────────────── */

function HaciendaPanel() {
  const game = useGame((s) => s.game)!
  const chooseTaxMode = useGame((s) => s.chooseTaxMode)
  const mode = game.taxMode
  const pendingTax = Math.round((game.yearPendingTaxableCents * RETENTION_BPS) / 10_000)
  return (
    <Sheet title="Hacienda" tone="purple">
      <div className="flex gap-3 items-start g-inset p-3.5 text-[15px] leading-relaxed text-ink font-semibold">
        <span className="g-icon g-icon--purple shrink-0 !w-11 !h-11" aria-hidden="true">
          🦉
        </span>
        <p className="m-0">
          <b>Don Búho:</b> De lo que ganas con tu dinero (intereses y cupones) me llevo un <b>{formatPct(RETENTION_BPS)}</b>. Con eso pagamos las farolas y la escuela. Lo que tú
          decides es <b>cuándo</b> me lo das.
        </p>
      </div>

      <SectionTitle>¿Cómo quieres pagar?</SectionTitle>
      <div className="grid gap-2">
        {(
          [
            ['cada-cobro', '🧾', 'En cada cobro', 'Cada vez que cobras un interés o un cupón, se retiene el 19 % al momento. Sencillo y sin sorpresas.'],
            [
              'anual',
              '📅',
              'Una vez al año',
              'Cobras todo bruto y al cerrar el año pagas el 19 % de golpe. Mientras, ese dinero sigue creciendo contigo: es mejor para el interés compuesto… si guardas para pagar.',
            ],
          ] as const
        ).map(([m, icon, title, text]) => {
          const sel = mode === m
          return (
            <button
              key={m}
              type="button"
              onClick={() => chooseTaxMode(m)}
              className={`g-row w-full text-left ${sel ? '!bg-white' : ''}`}
              style={sel ? { boxShadow: '0 0 0 3px var(--color-purple)' } : undefined}
            >
              <span className={`g-icon ${sel ? 'g-icon--purple' : ''}`} aria-hidden="true">
                {icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-display font-extrabold text-ink text-[15px] leading-tight">
                  {title} {sel && <span className="text-purple-d">· elegido</span>}
                </div>
                <div className="text-[12.5px] font-semibold text-ink-l leading-snug mt-0.5">{text}</div>
              </div>
            </button>
          )
        })}
      </div>

      <SectionTitle>Este año</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Big label="Ya pagado" cents={game.yearTaxCents} />
        <div className="g-inset p-3.5">
          <div className="g-label">{mode === 'anual' ? 'Pendiente al cerrar el año' : 'Pendiente'}</div>
          <Amount cents={mode === 'anual' ? pendingTax : 0} size="xl" className="text-ink mt-1" />
        </div>
      </div>
      {game.taxDebtCents > 0 && (
        <p className="m-0 mt-2 text-[13px] font-bold text-red-d">Debes {formatCents(game.taxDebtCents)} de años anteriores: se cobrarán en cuanto haya dinero en el cofre.</p>
      )}

      {game.declarations.length > 0 && (
        <>
          <SectionTitle>Declaraciones</SectionTitle>
          <ul className="grid gap-1.5">
            {game.declarations
              .slice()
              .reverse()
              .map((d) => (
                <li key={d.year} className="g-row !py-2 text-[14px] font-semibold">
                  <span className="text-lg" aria-hidden="true">
                    📄
                  </span>
                  <span className="flex-1 text-ink-l">
                    Año {d.year} · ganaste {formatCents(d.grossCents)} ({d.mode === 'anual' ? 'una vez al año' : 'en cada cobro'})
                  </span>
                  <span className="font-display font-extrabold text-red tabular-nums">−{formatCents(d.taxCents)}</span>
                </li>
              ))}
          </ul>
        </>
      )}
    </Sheet>
  )
}

/* ───────────────────────── Escuela: lecciones y cuestionarios ───────────────────────── */

/** Orden barajado de las cuatro opciones, fijo por partida y lección (así no cambia entre intentos ni al reabrir). */
function quizOrder(seed: number, lessonId: string): number[] {
  let h = (seed ^ 0x9e3779b9) >>> 0
  for (let i = 0; i < lessonId.length; i++) h = (Math.imul(h ^ lessonId.charCodeAt(i), 0x01000193) + 0x7f4a7c15) >>> 0
  const order = [0, 1, 2, 3]
  for (let i = order.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0
    const j = h % (i + 1)
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

const QUIZ_LETTERS = ['A', 'B', 'C', 'D']

function LessonQuiz({ lessonId, onClose }: { lessonId: string; onClose: () => void }) {
  const game = useGame((s) => s.game)!
  const answerQuiz = useGame((s) => s.answerQuiz)
  const quiz = QUIZZES[lessonId]
  const order = useMemo(() => quizOrder(game.seed, lessonId), [game.seed, lessonId])
  const [picked, setPicked] = useState<number | null>(null)
  const [result, setResult] = useState<boolean | null>(null)
  if (!quiz) return null

  const choose = (optionIndex: number) => {
    if (picked !== null) return
    setPicked(optionIndex)
    setResult(answerQuiz(lessonId, optionIndex))
  }

  return (
    <div className="mt-3 g-inset p-3.5">
      <div className="g-label mb-1.5">Ponte a prueba</div>
      <p className="m-0 mb-3 font-display font-extrabold text-ink text-[15.5px] leading-snug">{quiz.question}</p>
      <div className="grid gap-2">
        {order.map((optionIndex, i) => {
          const isPicked = picked === optionIndex
          const cls = result === null ? '' : isPicked ? (result ? 'quiz-opt--ok' : 'quiz-opt--ko') : 'quiz-opt--dim'
          return (
            <button key={optionIndex} type="button" disabled={picked !== null} onClick={() => choose(optionIndex)} className={`quiz-opt ${cls}`}>
              <span className="quiz-opt__letter" aria-hidden="true">
                {QUIZ_LETTERS[i]}
              </span>
              <span>{quiz.options[optionIndex]}</span>
            </button>
          )
        })}
      </div>
      {result === true && (
        <div className="mt-3">
          <Tortuga>¡Eso es! Lección aprendida. Ya tienes un carné más de inversor.</Tortuga>
          <button type="button" onClick={onClose} className="g-btn g-btn--sm g-btn--green mt-2.5">
            Seguir
          </button>
        </div>
      )}
      {result === false && (
        <div className="mt-3">
          <Tortuga>Esa no era. {quiz.hint} Vuelve a leer la lección con calma y mañana lo intentas otra vez.</Tortuga>
          <button type="button" onClick={onClose} className="g-btn g-btn--sm g-btn--cream mt-2.5">
            Entendido
          </button>
        </div>
      )}
    </div>
  )
}

function EscuelaPanel() {
  const game = useGame((s) => s.game)!
  const nowMs = useGame((s) => s.nowMs)
  const [open, setOpen] = useState<string | null>(null)
  const [quizFor, setQuizFor] = useState<string | null>(null)
  const learned = game.lessonsRead
  return (
    <Sheet title="Escuela" tone="sky">
      <div className="flex items-center gap-3 mb-3">
        <div className="g-bar flex-1">
          <i style={{ width: `${(learned.length / LESSONS.length) * 100}%` }} />
        </div>
        <span className="font-display font-extrabold text-ink tabular-nums">
          {learned.length}/{LESSONS.length}
        </span>
      </div>
      <Tortuga>
        Una lección por cada idea importante. Léela con calma y, al final, responde a una pregunta: si aciertas, queda aprendida; si fallas, mañana puedes volver a intentarlo.
      </Tortuga>
      <ul className="grid gap-2 mt-3">
        {LESSONS.map((l) => {
          const status = quizStatus(game, nowMs, l.id)
          const done = status === 'aprendida'
          const isOpen = open === l.id
          return (
            <li key={l.id} className={`g-row flex-col !items-stretch ${done && !isOpen ? 'g-row--muted' : ''}`}>
              <button
                type="button"
                onClick={() => {
                  setOpen(isOpen ? null : l.id)
                  setQuizFor(null)
                }}
                className="flex items-center gap-3 w-full text-left"
              >
                <span className={`g-icon ${done ? 'g-icon--green' : status === 'manana' ? 'g-icon--orange' : 'g-icon--blue'}`} aria-hidden="true">
                  {done ? '🎓' : l.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-extrabold text-ink text-[15px] leading-tight">{l.title}</div>
                  <div className="text-[11.5px] font-extrabold text-ink-3">{done ? 'Aprendida' : status === 'manana' ? 'Para mañana' : 'Por aprender'}</div>
                </div>
                <span className="text-ink-3 font-extrabold">{isOpen ? '▴' : '▾'}</span>
              </button>
              {isOpen && (
                <>
                  <p className="m-0 mt-2 text-[14.5px] font-semibold leading-relaxed text-ink">{l.body}</p>
                  {quizFor === l.id ? (
                    <LessonQuiz lessonId={l.id} onClose={() => setQuizFor(null)} />
                  ) : status === 'disponible' ? (
                    <button type="button" onClick={() => setQuizFor(l.id)} className="g-btn g-btn--sm g-btn--orange mt-3 self-start">
                      Ponme a prueba
                    </button>
                  ) : status === 'manana' ? (
                    <div className="mt-3 text-[13px] font-extrabold text-ink-3">🐢 Hoy ya lo has intentado. Mañana, con la lección fresca, lo vuelves a probar.</div>
                  ) : (
                    <div className="mt-3 text-[13px] font-extrabold text-green-d">🎓 Lección aprendida</div>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}

/* ───────────────────────── Ficha de un edificio (en obras o sin panel propio) ───────────────────────── */

function EdificioPanel() {
  const game = useGame((s) => s.game)!
  const id = useGame((s) => s.infoBuilding)
  const setView = useGame((s) => s.setView)
  if (!id) return null
  const def = BUILDING_BY_ID[id]
  const open = game.world >= def.world
  return (
    <Sheet title={def.name} tone={open ? 'blue' : 'sky'}>
      <div className="g-inset p-4 text-center">
        <div className="text-4xl mb-1">{open ? def.icon : '🏗️'}</div>
        <div className="g-title text-lg">{open ? 'Próximamente' : `Se abre en el Nivel ${def.world} · ${WORLD_NAMES[def.world]}`}</div>
        <div className="text-ink-l font-bold text-sm mt-1">{def.teaches}</div>
      </div>
      <SectionTitle>Qué harás aquí</SectionTitle>
      <p className="m-0 text-[15px] font-semibold leading-relaxed text-ink">{def.about}</p>
      {!open && (
        <div className="mt-4">
          <GButton onClick={() => setView('misiones')} tone="g-btn--purple">
            Ver las misiones para llegar
          </GButton>
        </div>
      )}
    </Sheet>
  )
}

/* ───────────────────────── Mercado de acciones ───────────────────────── */

function BusinessRow({ b, shares, onOpen }: { b: BusinessState; shares: number; onOpen: () => void }) {
  const up = b.priceCents >= b.previousPriceCents
  return (
    <li>
      <button type="button" onClick={onOpen} className="g-card w-full text-left !gap-2">
        <div className="g-card__head">
          <span className="g-icon g-icon--purple" aria-hidden="true">
            {b.def.icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-display font-extrabold text-ink text-[15px] leading-tight">{b.def.name}</div>
            <div className="text-[12px] font-semibold text-ink-l leading-snug">
              {b.yieldBps > 0 ? `Dividendo ${formatPct(b.yieldBps)} al año` : 'No reparte dividendo'}
              {shares > 0 ? ` · tienes ${shares} (${shares} %)` : ''}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-display font-extrabold text-ink text-lg leading-none flex items-center gap-1 justify-end">
              <CoinIcon size={14} />
              {formatCents(b.priceCents, { alwaysDecimals: true })}
            </div>
            <PctChange now={b.priceCents} before={b.previousPriceCents} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Sparkline values={b.history} up={up} />
          <span className="text-[11px] font-bold text-ink-3 text-right">
            {b.monthsToResults === 0 ? 'Hoy publica cuentas' : `Cuentas en ${b.monthsToResults} ${b.monthsToResults === 1 ? 'día' : 'días'}`}
            {b.lastQuarter.storm && <span className="block text-red-d">⛈️ Tormenta este trimestre</span>}
          </span>
        </div>
      </button>
    </li>
  )
}

function MercadoPanel() {
  const game = useGame((s) => s.game)!
  const nowMs = useGame((s) => s.nowMs)
  const showBusiness = useGame((s) => s.showBusiness)
  const [tab, setTab] = useState<'negocios' | 'cartera'>('negocios')
  const month = currentMonth(game, nowMs)
  const market = marketAt(marketCtx(game), month, game.world)
  const stocks = stocksValue(game, month)
  const invested = Object.values(game.holdings ?? {}).reduce((a, h) => a + h.shares * h.avgCostCents, 0)
  const mine = market.filter((b) => (game.holdings[b.def.id]?.shares ?? 0) > 0)
  return (
    <Sheet title="Mercado" tone="purple">
      <div className="flex items-center justify-between mb-3">
        <span className="g-label">Tienes en el cofre</span>
        <Amount cents={game.huchaCents} size="lg" />
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          ['negocios', 'Negocios'],
          ['cartera', 'Mi cartera'],
        ]}
      />
      {tab === 'negocios' ? (
        <>
          <div className="mt-3">
            <Tortuga>
              Cada negocio tiene {SHARES_PER_BUSINESS} acciones. Comprar una es ser dueño del 1 %: una parte de lo que gane es tuya. El precio sigue a lo que gana el negocio… con
              algo de nervios. Cada operación cuesta {formatCents(COMMISSION_CENTS, { alwaysDecimals: true })}.
            </Tortuga>
          </div>
          <ul className="grid gap-2 mt-3">
            {market.map((b) => (
              <BusinessRow key={b.def.id} b={b} shares={game.holdings[b.def.id]?.shares ?? 0} onOpen={() => showBusiness(b.def.id as BuildingId)} />
            ))}
          </ul>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Big label="Valen hoy" cents={stocks} />
            <div className="g-inset p-3.5">
              <div className="g-label">Sin vender</div>
              <div className={`font-display font-extrabold text-2xl mt-1 tabular-nums ${stocks - invested >= 0 ? 'text-green-d' : 'text-red-d'}`}>
                {stocks - invested >= 0 ? '+' : '−'}
                {formatCents(Math.abs(stocks - invested))}
              </div>
            </div>
          </div>
          {mine.length === 0 ? (
            <div className="g-inset p-3.5 mt-3 text-ink-l text-sm font-semibold">Todavía no tienes acciones. Empieza con una o dos de la Panadería: es la más tranquila.</div>
          ) : (
            <ul className="grid gap-2 mt-3">
              {mine.map((b) => {
                const h = game.holdings[b.def.id]
                const gain = (b.priceCents - h.avgCostCents) * h.shares
                return (
                  <li key={b.def.id}>
                    <button type="button" onClick={() => showBusiness(b.def.id as BuildingId)} className="g-row w-full text-left">
                      <span className="g-icon g-icon--purple" aria-hidden="true">
                        {b.def.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-extrabold text-ink text-[15px] leading-tight">
                          {b.def.name} · {h.shares} %
                        </div>
                        <div className="text-[12px] font-semibold text-ink-l">
                          Te costaron {formatCents(h.avgCostCents, { alwaysDecimals: true })} de media · hoy {formatCents(b.priceCents, { alwaysDecimals: true })}
                        </div>
                      </div>
                      <div className="text-right">
                        <Amount cents={h.shares * b.priceCents} size="md" />
                        <div className={`text-[11px] font-extrabold tabular-nums ${gain >= 0 ? 'text-green-d' : 'text-red-d'}`}>
                          {gain >= 0 ? '+' : '−'}
                          {formatCents(Math.abs(gain))}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <SectionTitle>Últimos movimientos</SectionTitle>
          <Ledger
            events={game.ledger.filter(
              (e) => e.kind === 'dividendo' || e.kind === 'tormenta' || e.kind === 'noticia' || e.kind === 'acciones-compra' || e.kind === 'acciones-venta',
            )}
          />
        </>
      )}
    </Sheet>
  )
}

const SHARE_QUICK = [1, 5, 10, 25]

function NegocioPanel() {
  const game = useGame((s) => s.game)!
  const nowMs = useGame((s) => s.nowMs)
  const id = useGame((s) => s.infoBuilding)
  const buyShares = useGame((s) => s.buyShares)
  const sellShares = useGame((s) => s.sellShares)
  const setView = useGame((s) => s.setView)
  const [mode, setMode] = useState<'comprar' | 'vender'>('comprar')
  const [custom, setCustom] = useState('')
  if (!id) return null
  const month = currentMonth(game, nowMs)
  const b = marketAt(marketCtx(game), month, game.world).find((x) => x.def.id === id)
  const def = BUILDING_BY_ID[id]
  if (!b) return null
  const holding = game.holdings[id] ?? { shares: 0, avgCostCents: 0 }
  const up = b.priceCents >= b.previousPriceCents
  const maxBuy = Math.min(SHARES_PER_BUSINESS - holding.shares, Math.floor((game.huchaCents - COMMISSION_CENTS) / b.priceCents))
  const parsed = parseInt(custom, 10)
  const limit = mode === 'comprar' ? maxBuy : holding.shares
  const customOk = Number.isFinite(parsed) && parsed > 0 && parsed <= limit
  const act = (n: number) => {
    if (mode === 'comprar') buyShares(id, n)
    else sellShares(id, n)
    setCustom('')
  }
  const q = b.lastQuarter
  const unit = b.def.unit ?? 'acción'
  const units = unit === 'acción' ? 'acciones' : `${unit}s`
  const gold = !!b.def.refuge
  const fear = gold ? refugeFear(marketCtx(game), b.def, month) : 0
  return (
    <Sheet title={def.name} tone="purple">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="g-label">Precio por {unit}</div>
          <div className="font-display font-extrabold text-ink text-3xl leading-none flex items-center gap-1.5 mt-1">
            <CoinIcon size={22} />
            {formatCents(b.priceCents, { alwaysDecimals: true })}
          </div>
          <div className="mt-1">
            <PctChange now={b.priceCents} before={b.previousPriceCents} /> <span className="text-[11px] font-bold text-ink-3">este mes</span>
          </div>
        </div>
        <Sparkline values={b.history} up={up} />
      </div>
      <p className="text-ink-l font-semibold text-[13.5px] leading-snug mt-2 mb-0">{b.def.character}</p>

      {gold ? (
        <>
          <SectionTitle>Qué hace el oro</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            <div className="g-inset p-2.5 text-center">
              <div className="g-label !text-[10px]">Beneficio</div>
              <div className="font-display font-extrabold text-ink-3 text-[17px]">—</div>
            </div>
            <div className="g-inset p-2.5 text-center">
              <div className="g-label !text-[10px]">Dividendo</div>
              <div className="font-display font-extrabold text-ink-3 text-[17px]">—</div>
            </div>
            <div className="g-inset p-2.5 text-center">
              <div className="g-label !text-[10px]">Miedo</div>
              <div className={`font-display font-extrabold text-[17px] ${fear > 0 ? 'text-orange-d' : 'text-ink-3'}`}>
                {fear > 0 ? `+${formatPct(Math.round(fear * 10_000))}` : 'calma'}
              </div>
            </div>
          </div>
          <p className="text-[12px] font-bold text-ink-3 mt-2 mb-0">
            {fear > 0
              ? 'Hay miedo en la isla y el oro lleva una prima. Cuando la calma vuelva, la prima se irá deshaciendo.'
              : 'Sin cuentas ni dividendos: el oro solo sube despacio con los precios… y de golpe cuando llega una tormenta.'}
          </p>
        </>
      ) : (
        <>
          <SectionTitle>
            Últimas cuentas · {['ene-mar', 'abr-jun', 'jul-sep', 'oct-dic'][q.quarterOfYear]} del año {q.year}
          </SectionTitle>
          {q.storm && b.def.storm && <p className="m-0 mb-2 text-[13px] font-bold text-red-d">⛈️ {b.def.storm.label}</p>}
          {b.def.cycle && q.cyclePhase !== undefined && (
            <p className="m-0 mb-2 text-[13px] font-bold text-ink-l">
              🎢 Ciclo: {q.cyclePhase > 0.5 ? 'en lo alto' : q.cyclePhase < -0.5 ? 'en lo bajo' : q.cyclePhase > 0 ? 'subiendo' : 'bajando'} ({Math.round((q.cyclePhase + 1) * 50)}{' '}
              % del camino).
            </p>
          )}
          {b.def.fashion && q.hot !== undefined && (
            <p className="m-0 mb-2 text-[13px] font-bold text-ink-l">{q.hot ? '🔥 Este año está de moda.' : '🥶 Este año nadie se acuerda de sus juguetes.'}</p>
          )}
          {b.def.discovery && (q.discoveries ?? 0) > 0 && (
            <p className="m-0 mb-2 text-[13px] font-bold text-green-d">
              🌠 Descubrimientos: {q.discoveries}. Su beneficio se multiplicó por {Math.pow(b.def.discovery.mul, q.discoveries!)}.
            </p>
          )}
          <div className="grid grid-cols-3 gap-2">
            <div className="g-inset p-2.5 text-center">
              <div className="g-label !text-[10px]">Ventas / acción</div>
              <div className="font-display font-extrabold text-ink text-[17px] tabular-nums">{formatCents(q.salesCents, { alwaysDecimals: true })}</div>
            </div>
            <div className="g-inset p-2.5 text-center">
              <div className="g-label !text-[10px]">Beneficio / acción</div>
              <div className="font-display font-extrabold text-ink text-[17px] tabular-nums">{formatCents(q.epsCents, { alwaysDecimals: true })}</div>
            </div>
            <div className="g-inset p-2.5 text-center">
              <div className="g-label !text-[10px]">Dividendo / acción</div>
              <div className={`font-display font-extrabold text-[17px] tabular-nums ${q.dividendCents > 0 ? 'text-green-d' : 'text-ink-3'}`}>
                {q.dividendCents > 0 ? formatCents(q.dividendCents, { alwaysDecimals: true }) : '—'}
              </div>
            </div>
          </div>
          <p className="text-[12px] font-bold text-ink-3 mt-2 mb-0">
            {b.yieldBps > 0 ? `A este precio, el dividendo esperado es un ${formatPct(b.yieldBps)} al año. ` : 'Este negocio no reparte dividendo: reinvierte para crecer. '}
            {b.monthsToResults === 0 ? 'Hoy se han publicado las cuentas.' : `Próximas cuentas en ${b.monthsToResults} ${b.monthsToResults === 1 ? 'día' : 'días'}.`}
          </p>
        </>
      )}

      <SectionTitle>{gold ? 'Tus lingotes' : 'Tus acciones'}</SectionTitle>
      <div className="g-inset p-3.5 flex items-center justify-between gap-3">
        <div>
          <div className="font-display font-extrabold text-ink text-[16px]">
            {holding.shares} de {SHARES_PER_BUSINESS} {gold ? units : ''}· {holding.shares} % {holding.shares > 0 ? 'tuyo' : ''}
          </div>
          {holding.shares > 0 && (
            <div className="text-[12px] font-semibold text-ink-l">
              Precio medio {formatCents(holding.avgCostCents, { alwaysDecimals: true })} ·{' '}
              <span className={b.priceCents >= holding.avgCostCents ? 'text-green-d' : 'text-red-d'}>
                {b.priceCents >= holding.avgCostCents ? 'ganas' : 'pierdes'} {formatCents(Math.abs(b.priceCents - holding.avgCostCents) * holding.shares)}
              </span>
            </div>
          )}
        </div>
        <div className="g-bar g-bar--sm w-24">
          <i style={{ width: `${holding.shares}%` }} />
        </div>
      </div>

      <div className="mt-3">
        <Tabs
          value={mode}
          onChange={setMode}
          options={[
            ['comprar', 'Comprar'],
            ['vender', 'Vender'],
          ]}
        />
      </div>
      <div className="grid grid-cols-4 gap-2 mt-3">
        {SHARE_QUICK.map((n) => (
          <button key={n} type="button" disabled={n > limit} onClick={() => act(n)} className="g-btn g-btn--cream g-btn--sm !px-0 tabular-nums">
            {n}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 mt-2 items-center">
        <div className="min-w-0 flex items-center gap-2 h-12 px-3 g-inset">
          <input
            inputMode="numeric"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder={`Nº de ${units}`}
            className="min-w-0 flex-1 bg-transparent outline-none font-display font-extrabold text-ink placeholder:text-ink-3/70"
          />
        </div>
        <button type="button" disabled={!customOk} onClick={() => act(parsed)} className={`g-btn g-btn--sm ${mode === 'comprar' ? 'g-btn--purple' : 'g-btn--orange'}`}>
          {mode === 'comprar' ? 'Comprar' : 'Vender'}
        </button>
        <button type="button" disabled={limit <= 0} onClick={() => act(limit)} className="g-btn g-btn--cream g-btn--sm">
          {mode === 'comprar' ? 'Máx' : gold ? 'Todos' : 'Todas'}
        </button>
      </div>
      <p className="text-[12px] font-bold text-ink-3 mt-2 mb-0">
        {mode === 'comprar'
          ? `${limit > 0 ? `Puedes comprar hasta ${limit}.` : gold ? 'No te llega para ninguno.' : 'No te llega para ninguna.'} Cada operación cuesta ${formatCents(COMMISSION_CENTS, { alwaysDecimals: true })} de comisión.`
          : `Vendes al precio de hoy. Si ganas respecto a tu precio medio, Hacienda se lleva el 19 % de la ganancia; si pierdes, la pérdida resta de tus ganancias del año.`}
      </p>
      <div className="mt-3">
        <GButton onClick={() => setView('mercado')} tone="g-btn--cream">
          Ver todos los negocios
        </GButton>
      </div>
    </Sheet>
  )
}

/* ───────────────────────── Casa del Fondo Isla ───────────────────────── */

const FUND_QUICK = [10_00, 25_00, 50_00, 100_00]

function FondoPanel() {
  const game = useGame((s) => s.game)!
  const nowMs = useGame((s) => s.nowMs)
  const buyFund = useGame((s) => s.buyFund)
  const sellFund = useGame((s) => s.sellFund)
  const [mode, setMode] = useState<'meter' | 'sacar'>('meter')
  const [custom, setCustom] = useState('')
  const month = currentMonth(game, nowMs)
  const nav = fundNavSeries(marketCtx(game), month)
  const navNow = nav[month]
  const navBefore = nav[Math.max(0, month - 1)]
  const value = fundValue(game, month)
  const gain = value - game.fundCostCents
  const source = mode === 'meter' ? game.huchaCents : value
  const parsed = Math.round(parseFloat(custom.replace(',', '.')) * 100)
  const customOk = Number.isFinite(parsed) && parsed > 0 && parsed <= source
  const act = (cents: number) => {
    if (mode === 'meter') buyFund(cents)
    else sellFund(cents >= value ? 'all' : cents)
    setCustom('')
  }
  const inFund = marketAt(marketCtx(game), month, 4)
  return (
    <Sheet title="Fondo Isla" tone="purple">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="g-label">Cada participación vale</div>
          <div className="font-display font-extrabold text-ink text-3xl leading-none flex items-center gap-1.5 mt-1">
            <CoinIcon size={22} />
            {formatCents(Math.round(navNow), { alwaysDecimals: true })}
          </div>
          <div className="mt-1">
            <PctChange now={navNow} before={navBefore} /> <span className="text-[11px] font-bold text-ink-3">este mes</span>
          </div>
        </div>
        <Sparkline values={nav.slice(Math.max(0, month - 11), month + 1)} up={navNow >= navBefore} />
      </div>
      <div className="mt-3">
        <Tortuga>
          El fondo tiene un trocito igual de los {inFund.length} negocios de la isla. Es de <b>acumulación</b>: los dividendos que cobra no salen, se reinvierten y suben la
          participación. Cobra un {formatPct(FUND_FEE_BPS_YEAR)} al año por hacerlo. Si se rompe un huevo, quedan diez.
        </Tortuga>
      </div>

      <SectionTitle>Lo tuyo en el fondo</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Big label="Vale hoy" cents={value} />
        <div className="g-inset p-3.5">
          <div className="g-label">{value > 0 ? 'Sin vender' : 'Participaciones'}</div>
          {value > 0 ? (
            <div className={`font-display font-extrabold text-2xl mt-1 tabular-nums ${gain >= 0 ? 'text-green-d' : 'text-red-d'}`}>
              {gain >= 0 ? '+' : '−'}
              {formatCents(Math.abs(gain))}
            </div>
          ) : (
            <div className="font-display font-extrabold text-2xl mt-1 text-ink-3">0</div>
          )}
        </div>
      </div>
      {value > 0 && (
        <p className="text-[12px] font-bold text-ink-3 mt-1 mb-0">
          {game.fundUnits.toFixed(2)} participaciones · metiste {formatCents(game.fundCostCents)}
        </p>
      )}

      <div className="mt-4">
        <Tabs
          value={mode}
          onChange={setMode}
          options={[
            ['meter', 'Meter'],
            ['sacar', 'Sacar'],
          ]}
        />
      </div>
      <div className="grid grid-cols-4 gap-2 mt-3">
        {FUND_QUICK.map((q) => (
          <button key={q} type="button" disabled={q > source} onClick={() => act(q)} className="g-btn g-btn--cream g-btn--sm !px-0 tabular-nums">
            {formatCents(q)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 mt-2 items-center">
        <div className="min-w-0 flex items-center gap-2 h-12 px-3 g-inset">
          <CoinIcon size={16} />
          <input
            inputMode="decimal"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Otra cantidad"
            className="min-w-0 flex-1 bg-transparent outline-none font-display font-extrabold text-ink placeholder:text-ink-3/70"
          />
        </div>
        <button type="button" disabled={!customOk} onClick={() => act(parsed)} className={`g-btn g-btn--sm ${mode === 'meter' ? 'g-btn--purple' : 'g-btn--orange'}`}>
          {mode === 'meter' ? 'Meter' : 'Sacar'}
        </button>
        <button type="button" disabled={source <= 0} onClick={() => act(source)} className="g-btn g-btn--cream g-btn--sm">
          Todo
        </button>
      </div>
      <p className="text-[12px] font-bold text-ink-3 mt-2 mb-0">
        {mode === 'meter'
          ? 'Sin comisión de compra: la única comisión es la anual. Puedes meter cualquier cantidad, aunque sea 1.'
          : 'Sacas al valor de hoy. Si ganas respecto a lo que metiste, Hacienda se lleva el 19 % de la ganancia; si pierdes, resta de tus ganancias del año.'}
      </p>

      <SectionTitle>Qué hay dentro</SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {inFund.map((b) => (
          <span key={b.def.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-extrabold bg-white text-ink shadow-[0_2px_0_var(--color-cream-d)]">
            <span aria-hidden="true">{b.def.icon}</span> {b.def.name} <PctChange now={b.priceCents} before={b.previousPriceCents} />
          </span>
        ))}
      </div>
    </Sheet>
  )
}

/* ───────────────────────── La isla de la Liebre: la pizarra ───────────────────────── */

/** Dos líneas de patrimonio desde el primer mes: la tuya y la de la Liebre. */
function TwoLines({ mine, hers }: { mine: number[]; hers: number[] }) {
  const n = Math.max(mine.length, hers.length)
  if (n < 2) return <div className="g-inset p-3 text-[12px] font-bold text-ink-3 text-center">La gráfica empieza a dibujarse mañana.</div>
  const W = 300
  const H = 110
  const all = [...mine.filter((v) => v >= 0), ...hers]
  const max = Math.max(1, ...all)
  const pt = (i: number, v: number) => `${(i / (n - 1)) * (W - 8) + 4},${H - 6 - (Math.max(0, v) / max) * (H - 14)}`
  const mineKnown = mine.map((v, i) => (v >= 0 ? pt(i, v) : null)).filter(Boolean) as string[]
  const minePts = mineKnown.join(' ')
  const hersPts = hers.map((v, i) => pt(i, v)).join(' ')
  const single = mineKnown.length === 1 ? mineKnown[0].split(',').map(Number) : null
  return (
    <div className="g-inset p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label="Patrimonio tuyo y de la Liebre mes a mes">
        {[0.25, 0.5, 0.75].map((k) => (
          <line key={k} x1="4" x2={W - 4} y1={H - 6 - k * (H - 14)} y2={H - 6 - k * (H - 14)} stroke="rgba(60,50,40,0.12)" strokeWidth="1" />
        ))}
        <polyline points={hersPts} fill="none" stroke="#f2951c" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="7 5" />
        {mineKnown.length > 1 && <polyline points={minePts} fill="none" stroke="#5fa11e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
        {single && <circle cx={single[0]} cy={single[1]} r="5" fill="#5fa11e" stroke="#fff" strokeWidth="2" />}
      </svg>
      <div className="flex items-center justify-between text-[11px] font-extrabold mt-1">
        <span className="text-green-d">— Tú</span>
        <span className="text-ink-3">mes 1 → hoy</span>
        <span className="text-orange-d">- - La Liebre</span>
      </div>
    </div>
  )
}

function LiebrePanel() {
  const game = useGame((s) => s.game)!
  const nowMs = useGame((s) => s.nowMs)
  const returnHome = useGame((s) => s.returnHome)
  const lend = useGame((s) => s.lendToLiebre)
  const [tab, setTab] = useState<'pizarra' | 'liebre'>('pizarra')
  const month = Math.max(0, currentMonth(game, nowMs))
  const liebre = liebreAt(liebreCtx(game), month)
  const mine = netWorth(game, month)
  const monthsPaid = month + 1
  const canLend = liebreCanBorrow(game, month) && game.huchaCents >= LIEBRE_LOAN_CENTS
  const loan = game.liebreLoan
  const history = [...(game.netWorthHistory ?? [])]
  while (history.length <= month) history.push(-1)
  history[month] = mine
  const monthName = (m: number) => `${MONTH_NAMES[m % 12]} del año ${Math.floor(m / 12) + 1}`
  const items = liebre.items.map((i) => SHOP_ITEMS.find((d) => d.id === i.itemId)).filter(Boolean)
  return (
    <Sheet title="Tú y la Liebre" tone="orange">
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          ['pizarra', 'La pizarra'],
          ['liebre', 'Qué hace ella'],
        ]}
      />
      {tab === 'pizarra' ? (
        <>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="g-inset p-3.5 ring-2 ring-green/60">
              <div className="g-label">Tú</div>
              <Amount cents={mine} size="lg" className="text-ink mt-1" />
              <div className="text-[11px] font-bold text-ink-l mt-1">{game.purchases.filter((p) => !p.itemId.startsWith('cesta')).length} cosas compradas</div>
            </div>
            <div className="g-inset p-3.5">
              <div className="g-label">La Liebre</div>
              <Amount cents={liebre.netWorthCents} size="lg" className="text-ink mt-1" />
              <div className="text-[11px] font-bold text-ink-l mt-1">
                {liebre.items.length} cosas · {liebre.treats} caprichos
              </div>
            </div>
          </div>
          <p className="text-[12px] font-bold text-ink-3 mt-2 mb-2 text-center">
            Los dos habéis cobrado lo mismo: {formatCents(PAGA_CENTS * monthsPaid)} en {monthsPaid} {monthsPaid === 1 ? 'mes' : 'meses'}.
          </p>
          <TwoLines mine={history} hers={liebre.netWorthSeries} />
          <div className="mt-3">
            <Tortuga>{liebreLesson(game.world, mine, liebre.netWorthCents, liebre.items.length)}</Tortuga>
          </div>

          {/* El préstamo */}
          <SectionTitle>El préstamo</SectionTitle>
          {loan ? (
            <div className="g-inset p-3.5 text-[14px] font-semibold text-ink leading-snug">
              🐰 La Liebre te debe <b>{formatCents(loan.repayCents)}</b>. Prometió devolverlos en {monthName(loan.dueMonth)}
              {loan.late ? ' (ya se ha retrasado una vez).' : '.'}
            </div>
          ) : canLend ? (
            <div className="g-card g-card--orange">
              <div className="g-card__head">
                <span className="g-icon g-icon--orange" aria-hidden="true">
                  🐰
                </span>
                <div className="min-w-0">
                  <div className="font-display font-extrabold text-ink text-[15px] leading-tight">"¡No tengo para la cesta! ¿Me prestas {formatCents(LIEBRE_LOAN_CENTS)}?"</div>
                  <div className="text-[13px] font-semibold text-ink-l leading-snug mt-0.5">
                    Promete devolverte {formatCents(LIEBRE_LOAN_REPAY_CENTS)} el mes que viene: 1 eL de interés por prestar a alguien menos fiable que el Ayuntamiento. A veces se
                    retrasa.
                  </div>
                </div>
              </div>
              <div className="g-card__foot">
                <button type="button" onClick={lend} className="g-btn g-btn--orange g-btn--sm">
                  Prestar {formatCents(LIEBRE_LOAN_CENTS)}
                </button>
              </div>
            </div>
          ) : (
            <div className="g-inset p-3.5 text-[13px] font-semibold text-ink-l leading-snug">
              {liebre.hungryNow || liebre.foodMonths === 0
                ? `Hoy la Liebre tiene hambre, pero te faltan ${formatCents(LIEBRE_LOAN_CENTS - game.huchaCents)} en el cofre para prestarle.`
                : `Hoy la Liebre tiene comida. Los meses que pasa hambre te pide ${formatCents(LIEBRE_LOAN_CENTS)} y devuelve ${formatCents(LIEBRE_LOAN_REPAY_CENTS)}.`}
              {game.liebreLoansRepaid > 0 &&
                ` Te ha devuelto ${game.liebreLoansRepaid} ${game.liebreLoansRepaid === 1 ? 'préstamo' : 'préstamos'}${game.liebreLoansLate > 0 ? ` (${game.liebreLoansLate} con retraso)` : ''}.`}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mt-3">
            <Tortuga>
              {game.world <= 2
                ? 'Cada mes se gasta la paga en caprichos y en la cosa más cara que le llega. Solo compra comida cuando la despensa está vacía… y a veces se le olvida. No tiene cuenta en el banco ni bonos.'
                : game.world === 3
                  ? 'Ahora también va al Mercado: compra el negocio que más subió el mes pasado y vende cualquiera que baje más de un 10 %. Paga comisión cada vez y vende casi siempre perdiendo.'
                  : 'Cuando llegue La Tormenta venderá todo el primer día. Después, cuando los precios ya hayan vuelto, comprará otra vez.'}
            </Tortuga>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="g-inset p-2.5 text-center">
              <div className="g-label !text-[10px]">Despensa</div>
              <div className="font-display font-extrabold text-ink text-[17px]">
                {liebre.foodMonths} {liebre.foodMonths === 1 ? 'mes' : 'meses'}
              </div>
            </div>
            <div className="g-inset p-2.5 text-center">
              <div className="g-label !text-[10px]">Meses con hambre</div>
              <div className="font-display font-extrabold text-red-d text-[17px]">{liebre.hungryMonths}</div>
            </div>
            <div className="g-inset p-2.5 text-center">
              <div className="g-label !text-[10px]">En el cofre</div>
              <div className="font-display font-extrabold text-ink text-[17px] tabular-nums">{formatCents(liebre.huchaCents)}</div>
            </div>
          </div>
          <SectionTitle>Sus cosas · {formatCents(liebre.spentCents)} gastados</SectionTitle>
          {items.length === 0 ? (
            <div className="g-inset p-3 text-[13px] font-semibold text-ink-l">Todavía nada grande: todo se va en chuches, helados, cómics y cine.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {items.map((d) => (
                <span key={d!.id} className="g-pill !px-3 !py-1 text-[13px]">
                  <span aria-hidden="true">{d!.icon}</span> {d!.name}
                </span>
              ))}
            </div>
          )}
          {game.world >= 3 && (
            <>
              <SectionTitle>Sus operaciones en el Mercado</SectionTitle>
              {liebre.ops.length === 0 ? (
                <div className="g-inset p-3 text-[13px] font-semibold text-ink-l">Todavía no ha operado.</div>
              ) : (
                <ul className="grid gap-1.5">
                  {[...liebre.ops].reverse().map((o, i) => {
                    const b = BUSINESS_BY_ID[o.businessId]
                    return (
                      <li key={i} className="g-row">
                        <span className="g-icon g-icon--orange" aria-hidden="true">
                          {o.kind === 'compra' ? '📈' : o.kind === 'panico' ? '⛈️' : '📉'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-display font-extrabold text-ink text-[14px] leading-tight">
                            {o.kind === 'compra' ? 'Compró' : o.kind === 'panico' ? '¡Vendió asustada!' : 'Vendió'} {o.shares} de {b?.name ?? o.businessId}
                          </div>
                          <div className="text-[12px] font-semibold text-ink-l">
                            {MONTH_NAMES[o.month % 12]} · a {formatCents(o.priceCents, { alwaysDecimals: true })}
                            {o.gainCents !== undefined && (
                              <span className={o.gainCents >= 0 ? ' text-green-d' : ' text-red-d'}>
                                {' '}
                                · {o.gainCents >= 0 ? 'ganó' : 'perdió'} {formatCents(Math.abs(o.gainCents))}
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
              <p className="text-[12px] font-bold text-ink-3 mt-2 mb-0">
                Comisiones pagadas: {formatCents(liebre.commissionsCents)} · pérdidas al vender: {formatCents(liebre.realizedLossCents)}
                {liebre.soldInCrash && ' · vendió todo en La Tormenta.'}
              </p>
            </>
          )}
        </>
      )}
      <div className="mt-3">
        <GButton onClick={returnHome} tone="g-btn--cream">
          Volver a casa
        </GButton>
      </div>
    </Sheet>
  )
}

/* ───────────────────────── Ajustes ───────────────────────── */

/** Una fila de Ajustes: interruptor y, si está activo, deslizador de volumen. */
function SoundSetting({
  icon,
  title,
  onText,
  offText,
  on,
  volume,
  setOn,
  setVolume,
  label,
  onTest,
}: {
  icon: string
  title: string
  onText: string
  offText: string
  on: boolean
  volume: number
  setOn: (on: boolean) => void
  setVolume: (v: number) => void
  label: string
  onTest?: () => void
}) {
  const pct = Math.round(volume * 100)
  return (
    <div className="g-inset p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="g-icon g-icon--blue shrink-0" aria-hidden="true">
            {icon}
          </span>
          <div className="min-w-0">
            <div className="font-display font-extrabold text-ink text-[15px] leading-tight">{title}</div>
            <div className="text-[12px] font-semibold text-ink-l leading-snug">{on ? onText : offText}</div>
          </div>
        </div>
        <button type="button" role="switch" aria-checked={on} aria-label={title} className="g-switch" onClick={() => setOn(!on)} />
      </div>
      {on && (
        <div className="mt-3 pt-3 border-t-2 border-cream">
          <div className="flex items-center justify-between mb-2">
            <div className="font-display font-extrabold text-ink text-[14px] leading-tight">Volumen</div>
            <div className="flex items-center gap-2">
              {onTest && (
                <button type="button" onClick={onTest} className="g-btn g-btn--cream g-btn--sm !min-h-0 !h-8 !px-3 !text-[12px]">
                  Probar
                </button>
              )}
              <div className="font-display font-extrabold text-ink-l text-[14px] tabular-nums w-11 text-right">{pct} %</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="text-lg leading-none">
              🔈
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={pct}
              aria-label={label}
              className="g-slider flex-1"
              style={{ ['--pct' as string]: `${pct}%` }}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
            />
            <span aria-hidden="true" className="text-lg leading-none">
              🔊
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function CompartirSection() {
  const showToast = useGame((s) => s.showToast)
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL)
      setCopied(true)
      showToast('Dirección copiada. ¡Pásala a quien quieras!')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Sin permiso de portapapeles (o sin https): se muestra para copiarla a mano.
      window.prompt('Copia la dirección de Finfun:', SHARE_URL)
    }
  }
  const share = async () => {
    if (!navigator.share) return copy()
    try {
      await navigator.share({ title: 'Finfun', text: 'Educación financiera para niños: haz crecer tu isla y tu dinero.', url: SHARE_URL })
    } catch {
      /* cancelado */
    }
  }
  return (
    <>
      <SectionTitle>Compartir Finfun</SectionTitle>
      <div className="g-inset p-3.5 flex flex-col items-center gap-3">
        <ShareQr url={SHARE_URL} size={176} />
        <div className="w-full text-center font-display font-extrabold text-ink text-[14px] break-all select-all">{SHARE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '')}</div>
        <div className="grid grid-cols-2 gap-2 w-full">
          <button type="button" onClick={copy} className="g-btn g-btn--blue g-btn--sm">
            {copied ? '¡Copiada!' : 'Copiar'}
          </button>
          <button type="button" onClick={share} className="g-btn g-btn--orange g-btn--sm">
            Enviar
          </button>
        </div>
      </div>
      <p className="text-[12px] font-bold text-ink-3 mt-2 mb-0">Quien escanee el QR o abra la dirección llega a la pantalla de acceso de Finfun.</p>
    </>
  )
}

function AjustesPanel() {
  const account = useGame((s) => s.account)
  const signOut = useGame((s) => s.signOut)
  const setTutorialStep = useGame((s) => s.setTutorialStep)
  const setView = useGame((s) => s.setView)
  const musicOn = useGame((s) => s.musicOn)
  const musicVolume = useGame((s) => s.musicVolume)
  const setMusicOn = useGame((s) => s.setMusicOn)
  const setMusicVolume = useGame((s) => s.setMusicVolume)
  const sfxOn = useGame((s) => s.sfxOn)
  const sfxVolume = useGame((s) => s.sfxVolume)
  const setSfxOn = useGame((s) => s.setSfxOn)
  const setSfxVolume = useGame((s) => s.setSfxVolume)
  return (
    <Sheet title="Ajustes" tone="blue">
      <SectionTitle>Sonido</SectionTitle>
      <div className="grid gap-2">
        <SoundSetting
          icon="🎵"
          title="Música"
          onText="Sonando en la isla"
          offText="En silencio"
          on={musicOn}
          volume={musicVolume}
          setOn={setMusicOn}
          setVolume={setMusicVolume}
          label="Volumen de la música"
        />
        <SoundSetting
          icon="🔔"
          title="Efectos de sonido"
          onText="Suena un aviso con cada evento nuevo"
          offText="Sin avisos"
          on={sfxOn}
          volume={sfxVolume}
          setOn={setSfxOn}
          setVolume={setSfxVolume}
          label="Volumen de los efectos"
          onTest={() => playEventSfx(true)}
        />
      </div>
      <p className="text-[12px] font-bold text-ink-3 mt-3 mb-0">Los ajustes de sonido se guardan en este dispositivo.</p>
      <SectionTitle>Ayuda</SectionTitle>
      <div className="g-inset p-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="g-icon g-icon--green shrink-0" aria-hidden="true">
            🐢
          </span>
          <div className="min-w-0">
            <div className="font-display font-extrabold text-ink text-[15px] leading-tight">Recorrido con Doña Tortuga</div>
            <div className="text-[12px] font-semibold text-ink-l leading-snug">Los cinco pasos básicos, otra vez.</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setTutorialStep(0)
            setView('isla')
          }}
          className="g-btn g-btn--cream g-btn--sm shrink-0"
        >
          Repetir
        </button>
      </div>
      <CompartirSection />
      {account && (
        <>
          <SectionTitle>Cuenta</SectionTitle>
          <div className="g-inset p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="g-icon g-icon--green shrink-0" aria-hidden="true">
                👤
              </span>
              <div className="min-w-0">
                <div className="font-display font-extrabold text-ink text-[15px] leading-tight truncate">{account.username}</div>
                <div className="text-[12px] font-semibold text-ink-l leading-snug truncate">{account.email}</div>
              </div>
            </div>
            <button type="button" onClick={() => void signOut()} className="g-btn g-btn--cream g-btn--sm shrink-0">
              Cerrar sesión
            </button>
          </div>
          <p className="text-[12px] font-bold text-ink-3 mt-2 mb-0">La isla se guarda en tu cuenta: puedes seguir en otro dispositivo entrando con el mismo correo.</p>
        </>
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
    case 'huerto':
      return <HuertoPanel />
    case 'ayuntamiento':
      return <AyuntamientoPanel />
    case 'hacienda':
      return <HaciendaPanel />
    case 'escuela':
      return <EscuelaPanel />
    case 'edificio':
      return <EdificioPanel />
    case 'mercado':
      return <MercadoPanel />
    case 'negocio':
      return <NegocioPanel />
    case 'fondo':
      return <FondoPanel />
    case 'misiones':
      return <MisionesPanel />
    case 'eventos':
      return <EventosPanel />
    case 'patrimonio':
      return <PatrimonioPanel />
    case 'liebre':
      return <LiebrePanel />
    case 'ajustes':
      return <AjustesPanel />
    default:
      return null
  }
}
