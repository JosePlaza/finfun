/**
 * SUPERPOSICIONES a pantalla completa: la celebración (bellotas, huerto, mundo nuevo),
 * la ruleta de la inflación al cerrar el año y la pantalla de fin de la aventura.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { diaryParagraphs, formatCents, formatPct, INFLATION_WHEEL_BPS, inflationForYear, stocksValue, fundValue, WORLD2_UNLOCK_ITEM } from '../sim'
import { useGame } from '../store/game'

const CONFETTI_COLORS = ['#f2951c', '#5fa11e', '#2fa6c9', '#7a5fe0', '#e04a46', '#ffc85a']

function Confetti({ count = 40 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: (i / count) * 100 + (Math.random() - 0.5) * 4,
        delay: Math.random() * 2.4,
        dur: 2.2 + Math.random() * 1.6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rot: Math.random() * 360,
      })),
    [count],
  )
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i key={i} style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, ['--dur' as string]: `${p.dur}s`, transform: `rotate(${p.rot}deg)` }} />
      ))}
    </div>
  )
}

/* ───────────────────────── Celebración ───────────────────────── */

export function CelebrationOverlay() {
  const c = useGame((s) => s.celebration)
  const dismiss = useGame((s) => s.dismissCelebration)
  if (!c) return null
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="celebration-title">
      <Confetti />
      <div className={`overlay__card g-panel g-panel--${c.tone} p-6 pt-9 text-center`}>
        <div className="g-ribbon">¡Bravo!</div>
        <div className="text-6xl leading-none mb-3" aria-hidden="true">
          {c.icon}
        </div>
        <h2 id="celebration-title" className="g-title text-2xl m-0">
          {c.title}
        </h2>
        <p className="text-ink-l font-semibold text-[15px] leading-relaxed mt-2 mb-0">{c.text}</p>
        <button type="button" onClick={dismiss} className={`g-btn g-btn--block g-btn--lg mt-5 g-btn--${c.tone}`} autoFocus>
          ¡Genial!
        </button>
      </div>
    </div>
  )
}

/* ───────────────────────── Ruleta de la inflación ───────────────────────── */

const SEG_COLORS = ['#5fa11e', '#2fa6c9', '#f2951c', '#7a5fe0', '#e04a46', '#3aa5d8']

/** Rueda de N casillas iguales; la casilla 0 empieza arriba y siguen en el sentido de las agujas del reloj. */
function Wheel({ rotation }: { rotation: number }) {
  const n = INFLATION_WHEEL_BPS.length
  const seg = 360 / n
  const stops = INFLATION_WHEEL_BPS.map((_, i) => `${SEG_COLORS[i % SEG_COLORS.length]} ${i * seg}deg ${(i + 1) * seg}deg`).join(', ')
  return (
    <div className="wheel-wrap">
      <div className="wheel__pin" />
      <div className="wheel" style={{ transform: `rotate(${rotation}deg)`, background: `conic-gradient(from ${-seg / 2}deg, ${stops})` }}>
        {INFLATION_WHEEL_BPS.map((bps, i) => (
          <span key={bps} className="wheel__label" style={{ transform: `rotate(${i * seg}deg) translate(-50%, -104px)` }}>
            {formatPct(bps)}
          </span>
        ))}
      </div>
      <div className="wheel__hub" aria-hidden="true">
        🐢
      </div>
    </div>
  )
}

export function InflationWheelOverlay() {
  const game = useGame((s) => s.game)
  const open = useGame((s) => s.wheelOpen)
  const openWheel = useGame((s) => s.openWheel)
  const spin = useGame((s) => s.spinInflation)
  const setView = useGame((s) => s.setView)
  const [phase, setPhase] = useState<'ready' | 'spinning' | 'done'>('ready')
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<number | null>(null)
  const [shownYear, setShownYear] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pending = game?.pendingYearEnds[0]
  // Tras girar, el año ya no está pendiente: seguimos mostrando el resultado del año que giramos.
  const year = phase === 'done' ? shownYear : (pending?.year ?? null)
  // La bici, para enseñar el "antes y después" (tras girar, el precio viejo queda en previousPriceCents).
  const bici = game?.shop.find((i) => i.id === WORLD2_UNLOCK_ITEM)
  const priceBefore = bici?.previousPriceCents ?? 0

  useEffect(() => {
    if (!open) {
      setPhase('ready')
      setResult(null)
      setRotation(0)
      setShownYear(null)
    }
  }, [open])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  if (!game || !open || year === null) return null

  const target = inflationForYear(game.seed, year - 1)
  const n = INFLATION_WHEEL_BPS.length
  const seg = 360 / n

  const start = () => {
    const idx = INFLATION_WHEEL_BPS.indexOf(target)
    // Varias vueltas y parada con la casilla elegida bajo la aguja (arriba).
    const turns = 5 + Math.floor(Math.random() * 2)
    const jitter = (Math.random() - 0.5) * seg * 0.5
    setRotation(turns * 360 - idx * seg + jitter)
    setShownYear(year)
    setPhase('spinning')
    timer.current = setTimeout(() => {
      const bps = spin()
      setResult(bps ?? target)
      setPhase('done')
    }, 4300)
  }

  const entry = game.diary[game.diary.length - 1]
  const close = () => openWheel(false)

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="wheel-title">
      {phase === 'done' && <Confetti count={24} />}
      <div className="overlay__card g-panel g-panel--purple p-5 pt-9 text-center">
        <div className="g-ribbon">Fin del año {year}</div>
        {phase !== 'done' ? (
          <>
            <h2 id="wheel-title" className="g-title text-xl m-0">
              La ruleta de la inflación
            </h2>
            <p className="text-ink-l font-semibold text-[14px] leading-snug mt-1 mb-3">
              Cada año los precios suben un poco. ¿Cuánto este año? Gira y lo sabrás.
            </p>
            <Wheel rotation={rotation} />
            <button type="button" onClick={start} disabled={phase === 'spinning'} className="g-btn g-btn--block g-btn--lg g-btn--orange mt-5">
              {phase === 'spinning' ? 'Girando…' : '¡Girar!'}
            </button>
            {phase === 'ready' && (
              <button type="button" onClick={close} className="mt-3 text-sm font-extrabold text-ink-3">
                Ahora no
              </button>
            )}
          </>
        ) : (
          <div className="wheel-result">
            <div className="g-label">Este año los precios suben</div>
            <div className="font-display font-extrabold text-purple-d text-6xl leading-none mt-1">{formatPct(result ?? target)}</div>
            <div className="g-inset p-3.5 mt-4 text-left">
              <div className="flex items-center justify-between">
                <span className="font-display font-extrabold text-ink">🚲 Bici</span>
                <span className="font-display font-extrabold text-ink tabular-nums">
                  <s className="text-ink-3 font-bold mr-2">{formatCents(priceBefore)}</s>
                  {formatCents(bici?.priceCents ?? priceBefore)}
                </span>
              </div>
              {entry && (
                <p className="m-0 mt-2 text-[14px] font-semibold leading-relaxed text-ink-l">
                  <b className="text-ink">Doña Tortuga:</b> {diaryParagraphs(entry)[entry.firstTime ? 1 : 0]}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button type="button" onClick={() => { close(); setView('faro') }} className="g-btn g-btn--cream">
                Diario
              </button>
              <button
                type="button"
                onClick={() => {
                  if (game.pendingYearEnds.length > 0) {
                    // Otro año esperando: la ruleta vuelve a empezar.
                    setPhase('ready')
                    setResult(null)
                    setRotation(0)
                    setShownYear(null)
                  } else close()
                }}
                className="g-btn g-btn--purple"
              >
                {game.pendingYearEnds.length > 0 ? 'Siguiente año' : 'Seguir'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ───────────────────────── El rescate de Doña Tortuga ───────────────────────── */

export function RescueOverlay() {
  const game = useGame((s) => s.game)
  const seen = useGame((s) => s.rescueSeen)
  const dismiss = useGame((s) => s.dismissRescue)
  const setView = useGame((s) => s.setView)
  if (!game || game.lastRescueMonth < 0 || seen >= game.lastRescueMonth) return null
  const ev = game.ledger.filter((e) => e.kind === 'rescate').slice(-1)[0]
  const lost = ev ? -ev.amountCents : 0
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="rescue-title">
      <div className="overlay__card g-panel g-panel--red p-6 pt-9 text-center">
        <div className="g-ribbon">Oh, no…</div>
        <div className="text-6xl leading-none mb-3" aria-hidden="true">
          🍲
        </div>
        <h2 id="rescue-title" className="g-title text-2xl m-0">
          Seis meses sin comer
        </h2>
        <p className="text-ink-l font-semibold text-[15px] leading-relaxed mt-2 mb-0">
          <b className="text-ink">Doña Tortuga:</b> Te encontré desmayado en la puerta de casa y te traje sopa. Los médicos y la comida se han llevado todo lo que había en el
          cofre{lost > 0 ? ` (${formatCents(lost)})` : ''}. Lo del banco, los bonos y las acciones sigue siendo tuyo. Antes de invertir, hay que comer: deja la cesta domiciliada
          y algo de dinero en el cofre, o ahorra para el huerto.
        </p>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <button type="button" onClick={() => { dismiss(); setView('tienda') }} className="g-btn g-btn--cream">
            Tienda
          </button>
          <button type="button" onClick={dismiss} className="g-btn g-btn--red">
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── La Tormenta ───────────────────────── */

export function StormOverlay() {
  const game = useGame((s) => s.game)
  const seen = useGame((s) => s.stormSeen)
  const dismiss = useGame((s) => s.dismissStorm)
  const setView = useGame((s) => s.setView)
  if (!game || seen || game.crashMonth === null || game.processedMonth < game.crashMonth) return null
  const invested = stocksValue(game, game.processedMonth) + fundValue(game, game.processedMonth)
  return (
    <div className="overlay overlay--storm" role="dialog" aria-modal="true" aria-labelledby="storm-title">
      <div className="overlay__card g-panel g-panel--red p-6 pt-9 text-center">
        <div className="g-ribbon">Noticia urgente</div>
        <div className="text-6xl leading-none mb-3" aria-hidden="true">
          ⛈️
        </div>
        <h2 id="storm-title" className="g-title text-2xl m-0">
          ¡La Tormenta!
        </h2>
        <p className="text-ink-l font-semibold text-[15px] leading-relaxed mt-2 mb-0">
          Todos los precios de la isla han caído de golpe. La gente vende asustada.{' '}
          {invested > 0 ? <>Tus acciones y tu fondo valen hoy <b className="text-ink">{formatCents(invested)}</b>.</> : 'Tú no tenías acciones: mira lo que pasa.'}
        </p>
        <div className="g-inset p-3.5 mt-3 text-left text-[14px] font-semibold leading-relaxed text-ink">
          <b>Doña Tortuga:</b> Respira. La Panadería sigue vendiendo pan y el Molino sigue dando luz: los negocios ganan lo mismo que ayer, solo ha cambiado el precio que
          la gente les pone hoy. Quien vende ahora pierde de verdad. Quien aguanta, cobra sus dividendos y ve volver los precios en unos meses. Espera y verás.
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <button type="button" onClick={() => { dismiss(); setView('mercado') }} className="g-btn g-btn--cream">
            Mercado
          </button>
          <button type="button" onClick={dismiss} className="g-btn g-btn--red">
            Aguantaré
          </button>
        </div>
      </div>
    </div>
  )
}
