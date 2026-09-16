import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  advanceTo,
  buildHuerto as simBuildHuerto,
  upgradeHuerto as simUpgradeHuerto,
  buy as simBuy,
  buyBond as simBuyBond,
  buyShares as simBuyShares,
  sellShares as simSellShares,
  buyFund as simBuyFund,
  sellFund as simSellFund,
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
  visitLiebre as simVisitLiebre,
  lendToLiebre as simLendToLiebre,
  LIEBRE_VISIT_WORLD,
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
  | 'mercado'
  | 'negocio'
  | 'fondo'
  | 'edificio'
  | 'misiones'
  | 'eventos'
  | 'patrimonio'
  | 'liebre'
  | 'ajustes'

/** Dónde está el jugador: en su isla, cruzando el mar, en la isla de la Liebre o volviendo. */
export type Trip = 'home' | 'going' | 'there' | 'returning'

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
  /** ¿Se ha enseñado ya la pantalla de La Tormenta? (persistido) */
  stormSeen: boolean
  dismissStorm: () => void
  /** Ajustes (persistidos): música de fondo y efectos de sonido, con sus volúmenes (0..1). */
  musicOn: boolean
  musicVolume: number
  sfxOn: boolean
  sfxVolume: number
  setMusicOn: (on: boolean) => void
  setMusicVolume: (v: number) => void
  setSfxOn: (on: boolean) => void
  setSfxVolume: (v: number) => void
  /** El viaje a la isla de la Liebre (no se guarda). */
  trip: Trip
  /** Momento (ms de reloj de pantalla) en que empezó el viaje en curso. */
  tripStartMs: number
  travelToLiebre: () => void
  arriveAtLiebre: () => void
  returnHome: () => void
  arriveHome: () => void
  lendToLiebre: () => void

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
  upgradeHuerto: () => void
  buyBond: (offerId: string, cents: number) => void
  buyShares: (businessId: string, shares: number) => void
  sellShares: (businessId: string, shares: number) => void
  buyFund: (cents: number) => void
  sellFund: (cents: number | 'all') => void
  showBusiness: (id: BuildingId) => void
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
            text: r.state.world === 2 ? 'El Ayuntamiento, Hacienda y la escuela ya están abiertos, y el banco también. Desde ahora tus rendimientos pasan por Don Búho.' : 'Hay edificios nuevos en la isla. Tócalos para ver qué puedes hacer en ellos.',
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
        stormSeen: false,
        dismissStorm: () => set({ stormSeen: true }),
        musicOn: true,
        musicVolume: 0.6,
        sfxOn: true,
        sfxVolume: 0.8,
        setMusicOn: (on) => set({ musicOn: on }),
        setMusicVolume: (v) => set({ musicVolume: Math.min(1, Math.max(0, v)) }),
        setSfxOn: (on) => set({ sfxOn: on }),
        setSfxVolume: (v) => set({ sfxVolume: Math.min(1, Math.max(0, v)) }),
        trip: 'home',
        tripStartMs: 0,
        travelToLiebre: () => {
          const g = get().game
          if (!g) return
          if (g.world < LIEBRE_VISIT_WORLD) return get().showToast('La barca de la Liebre llega en el Nivel 2.')
          if (get().trip !== 'home') return
          set({ trip: 'going', tripStartMs: performance.now(), view: 'isla', focusPoint: null, infoBuilding: null })
        },
        arriveAtLiebre: () => {
          if (get().trip !== 'going') return
          const g = get().game
          set({ trip: 'there', view: 'liebre' })
          if (g) apply(simVisitLiebre(g, now()))
        },
        returnHome: () => {
          if (get().trip !== 'there') return
          set({ trip: 'returning', tripStartMs: performance.now(), view: 'isla' })
        },
        arriveHome: () => {
          if (get().trip !== 'returning') return
          set({ trip: 'home', view: 'isla' })
        },
        lendToLiebre: () => {
          const g = get().game
          if (!g) return
          apply(simLendToLiebre(g, now()), 'Prestado. La Liebre promete devolverte 6 el mes que viene.')
        },

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
        upgradeHuerto: () => {
          const g = get().game
          if (!g) return
          const r = simUpgradeHuerto(g, now())
          apply(r)
          if (r.ok)
            get().celebrate({
              icon: '🏝️',
              title: '¡Independencia financiera!',
              text: 'Tu huerto ampliado da tres meses de comida cada trimestre: la despensa se llena sola, para siempre. Tus inversiones ya pagan lo que necesitas para vivir. A partir de aquí, todo lo demás es libertad.',
              tone: 'green',
            })
        },
        buyBond: (offerId, cents) => {
          const g = get().game
          if (!g) return
          apply(simBuyBond(g, now(), offerId, cents), 'Prestado. El primer cupón llega en tres meses.')
        },
        buyShares: (businessId, shares) => {
          const g = get().game
          if (!g) return
          apply(simBuyShares(g, now(), businessId, shares))
        },
        sellShares: (businessId, shares) => {
          const g = get().game
          if (!g) return
          apply(simSellShares(g, now(), businessId, shares))
        },
        buyFund: (cents) => {
          const g = get().game
          if (!g) return
          apply(simBuyFund(g, now(), cents), 'Ya está repartido entre todos los negocios.')
        },
        sellFund: (cents) => {
          const g = get().game
          if (!g) return
          apply(simSellFund(g, now(), cents))
        },
        showBusiness: (id) => set({ infoBuilding: id, view: 'negocio' }),
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
          set({ game: null, view: 'isla', trip: 'home', acornsFound: [], acornsMonth: -1, celebration: null, wheelOpen: false, seenDiary: 0, seenBankOpen: false, seenWorld: 1, seenMissions: 0, stormSeen: false })
          get().createIsland(name)
        },
        showBuilding: (id) => set({ infoBuilding: id, view: 'edificio' }),
        celebrate: (c) => set({ celebration: { ...c, id: ++toastSeq } }),
        dismissCelebration: () => set({ celebration: null }),

        setView: (view) => {
          const g = get().game
          // "Ir" a la Liebre desde casa es coger la barca; desde su isla, abrir la pizarra.
          if (view === 'liebre' && get().trip === 'home') return get().travelToLiebre()
          if (view === 'liebre' && get().trip !== 'there') return
          const patch: Partial<Store> = { view }
          // Abrir el lugar correspondiente marca sus avisos como vistos.
          if (g && view === 'faro') patch.seenDiary = g.diary.length
          if (g && view === 'banco' && g.bankUnlocked) patch.seenBankOpen = true
          if (g && view === 'misiones') {
            patch.seenWorld = g.world
            patch.seenMissions = missionsFor(g).completed
          }
          if (view !== 'edificio' && view !== 'negocio') patch.infoBuilding = null
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
          set({ game: null, devOffsetMs: 0, view: 'isla', acornsFound: [], acornsMonth: -1, celebration: null, wheelOpen: false, wheelAutoShownFor: -1, stormSeen: false })
        },
      }
    },
    {
      name: 'finfun-save-v1',
      partialize: (s) => ({ game: s.game, devOffsetMs: s.devOffsetMs, seenDiary: s.seenDiary, seenBankOpen: s.seenBankOpen, seenWorld: s.seenWorld, seenMissions: s.seenMissions, stormSeen: s.stormSeen, musicOn: s.musicOn, musicVolume: s.musicVolume, sfxOn: s.sfxOn, sfxVolume: s.sfxVolume }),
    },
  ),
)

/** ¿Está activado el modo de pruebas? (`npm run dev` o `?dev` en la URL) */
export const isDevMode = import.meta.env.DEV || new URLSearchParams(location.search).has('dev')

// En modo de pruebas, el estado queda accesible desde la consola: `finfun.getState()`.
if (isDevMode) (window as unknown as { finfun: typeof useGame }).finfun = useGame
