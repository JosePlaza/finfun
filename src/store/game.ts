import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  advanceTo,
  buildHuerto as simBuildHuerto,
  buy as simBuy,
  buyBond as simBuyBond,
  canDoTask,
  chooseTaxMode as simChooseTaxMode,
  collectMailbox,
  completeTask,
  createGame,
  currentMonth,
  deposit as simDeposit,
  forfeitTask,
  formatCents,
  migrate,
  readLesson as simReadLesson,
  spinInflation as simSpinInflation,
  TASK_ACORNS,
  missionsFor,
  withdraw as simWithdraw,
  type ActionResult,
  type GameState,
  type TaxMode,
} from '../sim'
import type { BuildingId } from '../scene/registry'
import { dayAcornSpots } from '../scene/acorns'
import { hasSupabase, loadRemote, saveRemote, serverNow, syncClock } from '../lib/supabase'

/** Lugar activo: la isla completa o uno de sus edificios (la cámara vuela hasta él). */
export type View =
  | 'isla'
  | 'casa'
  | 'cofre'
  | 'banco'
  | 'tienda'
  | 'faro'
  | 'huerto'
  | 'ayuntamiento'
  | 'hacienda'
  | 'escuela'
  | 'edificio'
  | 'misiones'
  | 'eventos'
  | 'patrimonio'

/** Una celebración a pantalla completa (bellotas, nivel nuevo…). */
export interface Celebration {
  id: number
  icon: string
  title: string
  text: string
  tone: 'green' | 'purple' | 'orange'
}

interface Store {
  game: GameState | null
  /** Hora de juego (servidor si hay Supabase) más el desplazamiento de desarrollo. */
  nowMs: number
  /** Solo para probar: adelanta el reloj del juego. Se guarda para poder seguir probando tras recargar. */
  devOffsetMs: number
  view: View
  toast: { text: string; id: number } | null
  /** Bellotas ya recogidas hoy (índices 0..4). Se reinicia cada mes de isla. */
  acornsFound: number[]
  acornsMonth: number
  ready: boolean
  /** Marcas de "ya visto" para los avisos de eventos. */
  seenDiary: number
  seenBankOpen: boolean
  seenWorld: number
  seenMissions: number
  /** Edificio cuya ficha se muestra en la vista 'edificio'. */
  infoBuilding: BuildingId | null
  celebration: Celebration | null
  /** La ruleta de fin de año: abierta en pantalla o aparcada hasta que el jugador la abra desde Eventos. */
  wheelOpen: boolean
  /** Meses de isla en los que ya hemos abierto la ruleta automáticamente (para no insistir). */
  wheelAutoShownFor: number
  /** Pista: índice de la bellota señalada ahora mismo (o null). */
  acornHint: number | null
  /** Resolver: se enseñan todas las bellotas que faltaban (sin premio) hasta que cambie el mes. */
  acornReveal: boolean
  /** Punto de la isla al que vuela la cámara (pista de bellota); null = vista general. */
  focusPoint: [number, number] | null

  boot: () => Promise<void>
  tick: () => void
  createIsland: (name: string) => void
  collect: () => void
  deposit: (cents: number) => void
  withdraw: (cents: number) => void
  buy: (itemId: string) => void
  pickAcorn: (index: number) => void
  hintAcorn: () => void
  revealAcorns: () => void
  buildHuerto: () => void
  buyBond: (offerId: string, cents: number) => void
  chooseTaxMode: (mode: TaxMode) => void
  readLesson: (id: string) => void
  spinInflation: () => number | null
  openWheel: (open: boolean) => void
  restart: () => void
  setView: (v: View) => void
  showBuilding: (id: BuildingId) => void
  celebrate: (c: Omit<Celebration, 'id'>) => void
  dismissCelebration: () => void
  showToast: (text: string) => void
  devAdvanceDays: (days: number) => void
  devReset: () => void
}

let toastSeq = 0
let saveTimer: ReturnType<typeof setTimeout> | null = null

function scheduleRemoteSave(game: GameState) {
  if (!hasSupabase) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void saveRemote(game), 1500)
}

export const useGame = create<Store>()(
  persist(
    (set, get) => {
      const now = () => serverNow() + get().devOffsetMs

      const apply = (r: ActionResult, okText?: string) => {
        if (!r.ok) {
          get().showToast(r.reason)
          return
        }
        const before = get().game
        set({ game: r.state })
        scheduleRemoteSave(r.state)
        if (okText) get().showToast(okText)
        if (before && r.state.world > before.world) {
          get().celebrate({
            icon: '🎉',
            title: `¡Se abre el Nivel ${r.state.world}!`,
            text: r.state.world === 2 ? 'El Ayuntamiento, Hacienda y la escuela ya están abiertos. Desde ahora tus rendimientos pasan por Don Búho.' : 'Hay edificios nuevos en la isla. Tócalos para ver qué puedes hacer en ellos.',
            tone: 'purple',
          })
        }
      }

      return {
        game: null,
        nowMs: Date.now(),
        devOffsetMs: 0,
        view: 'isla',
        toast: null,
        acornsFound: [],
        acornsMonth: -1,
        ready: false,
        seenDiary: 0,
        seenBankOpen: false,
        seenWorld: 1,
        seenMissions: 0,
        infoBuilding: null,
        celebration: null,
        wheelOpen: false,
        wheelAutoShownFor: -1,
        acornHint: null,
        acornReveal: false,
        focusPoint: null,

        boot: async () => {
          try {
            await syncClock()
            const remote = await loadRemote()
            const local = get().game
            // La partida más avanzada gana; normalmente son la misma.
            if (remote && (!local || remote.processedMonth >= local.processedMonth)) set({ game: remote })
            // Partidas guardadas con versiones anteriores: se completan los campos nuevos.
            const g = get().game
            if (g) set({ game: migrate(g) })
            get().tick()
          } catch (err) {
            console.error('Finfun: error al arrancar', err)
          } finally {
            set({ ready: true })
          }
        },

        tick: () => {
          const t = now()
          const g0 = get().game
          if (!g0) {
            set({ nowMs: t })
            return
          }
          const g = migrate(g0)
          const advanced = advanceTo(g, t)
          const month = currentMonth(advanced, t)
          const patch: Partial<Store> = { nowMs: t }
          if (advanced !== g) {
            patch.game = advanced
            scheduleRemoteSave(advanced)
          }
          if (month !== get().acornsMonth) {
            patch.acornsFound = []
            patch.acornsMonth = month
            patch.acornHint = null
            patch.acornReveal = false
            patch.focusPoint = null
          }
          // Si hay un año por cerrar, la ruleta aparece sola una vez por mes de isla.
          if (advanced.pendingYearEnds.length > 0 && !advanced.dead && get().wheelAutoShownFor !== month && !get().wheelOpen) {
            patch.wheelOpen = true
            patch.wheelAutoShownFor = month
            patch.view = 'isla'
          }
          set(patch)
        },

        createIsland: (name) => {
          const t = now()
          const seed = (Math.floor(Math.random() * 0xffffffff) ^ t) >>> 0
          const game = advanceTo(createGame({ islandName: name, seed, epochMs: t }), t)
          set({ game, view: 'isla', acornsFound: [], acornsMonth: 0 })
          scheduleRemoteSave(game)
        },

        collect: () => {
          const g = get().game
          if (!g) return
          apply(collectMailbox(g, now()))
        },
        deposit: (cents) => {
          const g = get().game
          if (!g) return
          apply(simDeposit(g, now(), cents), 'Tu dinero ya está en el banco.')
        },
        withdraw: (cents) => {
          const g = get().game
          if (!g) return
          apply(simWithdraw(g, now(), cents), 'De vuelta al cofre.')
        },
        buy: (itemId) => {
          const g = get().game
          if (!g) return
          apply(simBuy(g, now(), itemId))
        },
        pickAcorn: (index) => {
          const g = get().game
          if (!g) return
          const t = now()
          if (!canDoTask(g, t)) return
          const found = get().acornsFound
          if (found.includes(index)) return
          const next = [...found, index]
          set({ acornsFound: next })
          if (next.length >= TASK_ACORNS) {
            const r = completeTask(g, t)
            if (r.ok) {
              const reward = r.state.huchaCents - g.huchaCents
              apply(r)
              get().celebrate({
                icon: '🌰',
                title: '¡Las cinco bellotas!',
                text: `Has encontrado todas las bellotas de hoy. Ganas ${formatCents(reward)} ${reward === 100 ? 'euroLuky, que ya está' : 'euroLukys, que ya están'} en tu cofre. Mañana habrá cinco más.`,
                tone: 'green',
              })
            }
          } else {
            get().showToast(`Bellota ${next.length} de ${TASK_ACORNS}`)
          }
          if (get().acornHint === index) set({ acornHint: null, focusPoint: null })
        },
        hintAcorn: () => {
          const g = get().game
          const t = now()
          if (!g || !canDoTask(g, t)) return
          const found = get().acornsFound
          const daySpots = dayAcornSpots(g.seed, currentMonth(g, t))
          const missing = daySpots.map((_, i) => i).filter((i) => !found.includes(i))
          if (missing.length === 0) return
          // Siempre la misma mientras no la recojas: así la pista no cambia si la pides dos veces.
          const current = get().acornHint
          const index = current !== null && missing.includes(current) ? current : missing[Math.floor(Math.random() * missing.length)]
          const [x, z] = daySpots[index]
          set({ acornHint: index, focusPoint: [x, z], view: 'isla' })
          get().showToast('Mira el haz de luz: ahí hay una bellota.')
        },
        revealAcorns: () => {
          const g = get().game
          if (!g) return
          const r = forfeitTask(g, now())
          if (!r.ok) return get().showToast(r.reason)
          set({ game: r.state, acornReveal: true, acornHint: null, focusPoint: null, view: 'isla' })
          scheduleRemoteSave(r.state)
          get().showToast('Ahí estaban. Hoy no hay premio; mañana, cinco nuevas.')
        },
        buildHuerto: () => {
          const g = get().game
          if (!g) return
          const r = simBuildHuerto(g, now())
          apply(r)
          if (r.ok) get().celebrate({ icon: '🌾', title: '¡Huerto construido!', text: 'Cada tres meses dará una cesta grande de comida, para siempre. Tu primera inversión que se come.', tone: 'green' })
        },
        buyBond: (offerId, cents) => {
          const g = get().game
          if (!g) return
          apply(simBuyBond(g, now(), offerId, cents), 'Prestado. El primer cupón llega en tres meses.')
        },
        chooseTaxMode: (mode) => {
          const g = get().game
          if (!g) return
          apply(simChooseTaxMode(g, now(), mode), mode === 'anual' ? 'Pagarás una vez al año.' : 'Pagarás en cada cobro.')
        },
        readLesson: (id) => {
          const g = get().game
          if (!g) return
          apply(simReadLesson(g, now(), id))
        },
        spinInflation: () => {
          const g = get().game
          if (!g) return null
          const r = simSpinInflation(g)
          if (!r.ok) return null
          set({ game: r.state })
          scheduleRemoteSave(r.state)
          return r.inflationBps ?? null
        },
        openWheel: (open) => set({ wheelOpen: open }),
        restart: () => {
          const name = get().game?.islandName ?? 'Mi isla'
          set({ game: null, view: 'isla', acornsFound: [], acornsMonth: -1, celebration: null, wheelOpen: false, seenDiary: 0, seenBankOpen: false, seenWorld: 1, seenMissions: 0 })
          get().createIsland(name)
        },
        showBuilding: (id) => set({ infoBuilding: id, view: 'edificio' }),
        celebrate: (c) => set({ celebration: { ...c, id: ++toastSeq } }),
        dismissCelebration: () => set({ celebration: null }),

        setView: (view) => {
          const g = get().game
          const patch: Partial<Store> = { view }
          // Abrir el lugar correspondiente marca sus avisos como vistos.
          if (g && view === 'faro') patch.seenDiary = g.diary.length
          if (g && view === 'banco' && g.bankUnlocked) patch.seenBankOpen = true
          if (g && view === 'misiones') {
            patch.seenWorld = g.world
            patch.seenMissions = missionsFor(g).completed
          }
          if (view !== 'edificio') patch.infoBuilding = null
          // Salir de la isla (o volver a ella desde un panel) deja la cámara libre otra vez.
          if (view !== 'isla') patch.focusPoint = null
          set(patch)
        },
        showToast: (text) => {
          const id = ++toastSeq
          set({ toast: { text, id } })
          setTimeout(() => {
            if (get().toast?.id === id) set({ toast: null })
          }, 2600)
        },

        devAdvanceDays: (days) => {
          set({ devOffsetMs: get().devOffsetMs + days * 24 * 60 * 60 * 1000 })
          get().tick()
        },
        devReset: () => {
          set({ game: null, devOffsetMs: 0, view: 'isla', acornsFound: [], acornsMonth: -1, celebration: null, wheelOpen: false, wheelAutoShownFor: -1 })
        },
      }
    },
    {
      name: 'finfun-save-v1',
      partialize: (s) => ({ game: s.game, devOffsetMs: s.devOffsetMs, seenDiary: s.seenDiary, seenBankOpen: s.seenBankOpen, seenWorld: s.seenWorld, seenMissions: s.seenMissions }),
    },
  ),
)

/** ¿Está activado el modo de pruebas? (`npm run dev` o `?dev` en la URL) */
export const isDevMode = import.meta.env.DEV || new URLSearchParams(location.search).has('dev')

// En modo de pruebas, el estado queda accesible desde la consola: `finfun.getState()`.
if (isDevMode) (window as unknown as { finfun: typeof useGame }).finfun = useGame
