import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  advanceTo,
  buy as simBuy,
  canDoTask,
  collectMailbox,
  completeTask,
  createGame,
  currentMonth,
  deposit as simDeposit,
  TASK_ACORNS,
  missionsFor,
  withdraw as simWithdraw,
  type ActionResult,
  type GameState,
} from '../sim'
import { hasSupabase, loadRemote, saveRemote, serverNow, syncClock } from '../lib/supabase'

/** Lugar activo: la isla completa o uno de sus edificios (la cámara vuela hasta él). */
export type View = 'isla' | 'casa' | 'cofre' | 'banco' | 'tienda' | 'faro' | 'misiones' | 'eventos' | 'patrimonio'

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

  boot: () => Promise<void>
  tick: () => void
  createIsland: (name: string) => void
  collect: () => void
  deposit: (cents: number) => void
  withdraw: (cents: number) => void
  buy: (itemId: string) => void
  pickAcorn: (index: number) => void
  setView: (v: View) => void
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
        set({ game: r.state })
        scheduleRemoteSave(r.state)
        if (okText) get().showToast(okText)
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

        boot: async () => {
          await syncClock()
          const remote = await loadRemote()
          const local = get().game
          // La partida más avanzada gana; normalmente son la misma.
          if (remote && (!local || remote.processedMonth >= local.processedMonth)) set({ game: remote })
          get().tick()
          set({ ready: true })
        },

        tick: () => {
          const t = now()
          const g = get().game
          if (!g) {
            set({ nowMs: t })
            return
          }
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
              apply(r, `¡Bellotas recogidas! Ganas ${reward / 100} euroLukys.`)
            }
          }
        },

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
          set({ game: null, devOffsetMs: 0, view: 'isla', acornsFound: [], acornsMonth: -1 })
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
