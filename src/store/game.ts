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
  answerQuiz as simAnswerQuiz,
  LESSONS,
  BADGE_BY_ID,
  TIER_NAMES,
  spinInflation as simSpinInflation,
  setTutorialStep as simSetTutorialStep,
  setAutoFood as simSetAutoFood,
  TUTORIAL_DONE,
  visitLiebre as simVisitLiebre,
  lendToLiebre as simLendToLiebre,
  LIEBRE_VISIT_WORLD,
  TASK_ACORNS,
  SHOP_ITEMS,
  missionsFor,
  withdraw as simWithdraw,
  type ActionResult,
  type GameState,
  type TaxMode,
} from '../sim'
import type { BuildingId } from '../scene/registry'
import { dayAcornSpots } from '../scene/acorns'
import { playAcornSfx, playCoinSfx } from '../ui/Music'
import {
  currentAccount,
  deleteRemote,
  hasSupabase,
  loadRemote,
  onAuthChange,
  saveRemote,
  serverNow,
  signIn as sbSignIn,
  signOut as sbSignOut,
  signUp as sbSignUp,
  saveAvatar as sbSaveAvatar,
  syncClock,
  type Account,
} from '../lib/supabase'
import { netWorth } from '../sim'

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
  | 'perfil'

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
  /** Cuenta con sesión abierta (null en modo local o sin entrar). */
  account: Account | null
  /** A qué cuenta pertenece la partida guardada en este navegador (null = partida local de antes de las cuentas). */
  saveOwner: string | null
  signUp: (p: { email: string; password: string; username: string }) => Promise<string | null>
  signIn: (p: { email: string; password: string }) => Promise<string | null>
  signOut: () => Promise<void>
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
  /** Recorrido inicial: vistas abiertas desde que empezó (para saber si ya ha mirado el cofre o las misiones). */
  coachVisited: View[]
  setTutorialStep: (step: number) => void
  skipTutorial: () => void
  setAutoFood: (on: boolean) => void
  /** Mes del último rescate que ya se ha enseñado (persistido). */
  rescueSeen: number
  dismissRescue: () => void
  setFocusPoint: (p: [number, number] | null) => void
  /** Ajustes (persistidos): música de fondo y efectos de sonido, con sus volúmenes (0..1). */
  /** Avatar elegido (id del catálogo). Se guarda en la cuenta si hay Supabase; si no, en este navegador. */
  avatar: string
  setAvatar: (id: string) => void
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
  /** Responde al cuestionario de una lección. Devuelve si ha acertado (null si no se pudo responder). */
  answerQuiz: (id: string, optionIndex: number) => boolean | null
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
  saveTimer = setTimeout(() => void saveRemote(game, netWorth(game)), 1500)
}

/** Guarda ya, sin esperar (al salir de la página o al cerrar sesión). */
function flushRemoteSave(game: GameState | null) {
  if (!hasSupabase || !game) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = null
  void saveRemote(game, netWorth(game))
}

export const useGame = create<Store>()(
  persist(
    (set, get) => {
      const now = () => serverNow() + get().devOffsetMs

      /** Avisa de las insignias nuevas (comparando la lista de antes y la de después). */
      const announceBadges = (before: GameState | null, after: GameState) => {
        const old = new Set(before?.badges ?? [])
        const fresh = (after.badges ?? []).filter((id) => !old.has(id))
        if (fresh.length === 0 || !before) return
        const last = fresh[fresh.length - 1]
        const [family, tier] = last.split('-')
        const def = BADGE_BY_ID[family]
        if (def) {
          playAcornSfx()
          get().showToast(`🏅 Insignia de ${TIER_NAMES[Number(tier)].toLowerCase()}: ${def.name}${fresh.length > 1 ? ` (+${fresh.length - 1})` : ''}`)
        }
      }

      const apply = (r: ActionResult, okText?: string) => {
        if (!r.ok) {
          get().showToast(r.reason)
          return
        }
        const before = get().game
        set({ game: r.state })
        scheduleRemoteSave(r.state)
        if (okText) get().showToast(okText)
        else announceBadges(before, r.state)
        if (before && r.state.world > before.world) {
          get().celebrate({
            icon: '🎉',
            title: `¡Se abre el Nivel ${r.state.world}!`,
            text:
              r.state.world === 2
                ? 'El Ayuntamiento, Hacienda y la escuela ya están abiertos, y el banco también. Desde ahora tus rendimientos pasan por Don Búho.'
                : 'Hay edificios nuevos en la isla. Tócalos para ver qué puedes hacer en ellos.',
            tone: 'purple',
          })
        }
      }

      /**
       * Con una cuenta ya identificada: decide qué partida se juega. Gana la más avanzada entre la de la
       * cuenta (servidor) y la de este navegador, siempre que la local sea de esta cuenta o de antes de que
       * hubiera cuentas (esa se sube a la cuenta la primera vez).
       */
      const adoptGameFor = async (account: Account) => {
        const remote = await loadRemote()
        const local = get().game
        const owner = get().saveOwner
        const localUsable = local && (owner === null || owner === account.id)
        let game: GameState | null = null
        if (remote && localUsable && local) game = local.processedMonth > remote.processedMonth ? local : remote
        else if (remote) game = remote
        else if (localUsable && local) game = local
        if (game) game = migrate(game)
        set({ game, account, saveOwner: account.id, view: 'isla', trip: 'home', avatar: account.avatar || get().avatar })
        // La partida local de antes de las cuentas (o más avanzada) pasa a la cuenta.
        if (game && (!remote || game !== remote)) flushRemoteSave(game)
        get().tick()
      }

      return {
        game: null,
        account: null,
        saveOwner: null,
        signUp: async (p) => {
          const r = await sbSignUp(p)
          if (!r.ok) return r.error
          await adoptGameFor(r.account)
          return null
        },
        signIn: async (p) => {
          const r = await sbSignIn(p)
          if (!r.ok) return r.error
          await adoptGameFor(r.account)
          return null
        },
        signOut: async () => {
          flushRemoteSave(get().game)
          await sbSignOut()
          set({
            account: null,
            game: null,
            saveOwner: null,
            view: 'isla',
            trip: 'home',
            acornsFound: [],
            acornsMonth: -1,
            celebration: null,
            wheelOpen: false,
            wheelAutoShownFor: -1,
            seenDiary: 0,
            seenBankOpen: false,
            seenWorld: 1,
            seenMissions: 0,
            stormSeen: false,
          })
        },
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
        coachVisited: [],
        setTutorialStep: (step) => {
          const g = get().game
          if (!g) return
          const r = simSetTutorialStep(g, step)
          if (!r.ok) return
          set({ game: r.state, focusPoint: null, acornHint: null })
          scheduleRemoteSave(r.state)
          if (step >= TUTORIAL_DONE && g.tutorialStep < TUTORIAL_DONE) {
            get().celebrate({
              icon: '🐢',
              title: '¡Ya sabes jugar!',
              text: 'Tienes tu primer carné de la escuela: "Espera y verás". Ahora, cada día diez minutos: recoge, decide, vuelve mañana.',
              tone: 'green',
            })
          }
        },
        skipTutorial: () => {
          const g = get().game
          if (!g) return
          const r = simSetTutorialStep(g, TUTORIAL_DONE)
          if (r.ok) {
            set({ game: r.state, focusPoint: null, acornHint: null })
            scheduleRemoteSave(r.state)
          }
        },
        setFocusPoint: (p) => set({ focusPoint: p }),
        setAutoFood: (on) => {
          const g = get().game
          if (!g) return
          apply(simSetAutoFood(g, now(), on), on ? 'Cesta domiciliada: la despensa se rellena sola.' : 'Ahora compras tú la comida cada mes.')
        },
        rescueSeen: -1,
        dismissRescue: () => set({ rescueSeen: get().game?.lastRescueMonth ?? -1 }),
        avatar: 'gorra',
        setAvatar: (id) => {
          set({ avatar: id })
          if (get().account) void sbSaveAvatar(id)
        },
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
            if (hasSupabase) {
              // Cuenta obligatoria: si hay sesión abierta, se carga su partida; si no, la pantalla de acceso espera.
              const account = await currentAccount()
              if (account) await adoptGameFor(account)
              else set({ account: null })
              onAuthChange((acc) => {
                if (!acc) set({ account: null, game: null, saveOwner: null, view: 'isla', trip: 'home' })
              })
            } else {
              // Modo local: partidas guardadas con versiones anteriores se completan con los campos nuevos.
              const g = get().game
              if (g) set({ game: migrate(g) })
              get().tick()
            }
          } catch (err) {
            console.error('Finfun: error al arrancar', err)
          } finally {
            set({ ready: true })
          }
        },

        tick: () => {
          const t = now()
          const g0 = get().game
          // Con cuentas, la partida solo avanza (y se guarda) cuando hay sesión.
          if (!g0 || (hasSupabase && !get().account)) {
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
            announceBadges(g0, advanced)
          }
          if (month !== get().acornsMonth) {
            patch.acornsFound = []
            patch.acornsMonth = month
            patch.acornHint = null
            patch.acornReveal = false
            patch.focusPoint = null
          }
          // Si hay un año por cerrar, la ruleta aparece sola una vez por mes de isla.
          if (advanced.pendingYearEnds.length > 0 && get().wheelAutoShownFor !== month && !get().wheelOpen) {
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
          const r = collectMailbox(g, now())
          if (r.ok) playCoinSfx('moneda')
          apply(r)
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
          const def = SHOP_ITEMS.find((i) => i.id === itemId)
          const price = g.shop.find((i) => i.id === itemId)?.priceCents ?? def?.basePriceCents ?? 0
          const r = simBuy(g, now(), itemId)
          if (r.ok) {
            playCoinSfx('compra')
            const extra = def?.kind === 'comida' ? ` · +${def.foodMonths ?? 1} ${def.foodMonths === 1 ? 'mes' : 'meses'} de comida` : ''
            apply(r, `${def?.icon ?? '🛍️'} ${def?.name ?? 'Compra'} · −${formatCents(price, { alwaysDecimals: true })}${extra}`)
          } else apply(r)
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
          playAcornSfx()
          if (next.length >= TASK_ACORNS) {
            const r = completeTask(g, t)
            if (r.ok) {
              const reward = r.state.huchaCents - g.huchaCents
              apply(r, `🌰 ¡Encontraste una bellota! · ${TASK_ACORNS} de ${TASK_ACORNS} · +${formatCents(reward)} eL`)
              get().celebrate({
                icon: '🌰',
                title: '¡Las cinco bellotas!',
                text: `Has encontrado todas las bellotas de hoy. Ganas ${formatCents(reward)} ${reward === 100 ? 'euroLuky, que ya está' : 'euroLukys, que ya están'} en tu cofre. Mañana habrá cinco más.`,
                tone: 'green',
              })
            }
          } else {
            get().showToast(`🌰 ¡Encontraste una bellota! · ${next.length} de ${TASK_ACORNS}`)
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
          if (r.ok)
            get().celebrate({
              icon: '🌾',
              title: '¡Huerto construido!',
              text: 'Cada tres meses dará una cesta grande de comida, para siempre. Tu primera inversión que se come.',
              tone: 'green',
            })
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
        answerQuiz: (id, optionIndex) => {
          const g = get().game
          if (!g) return null
          const r = simAnswerQuiz(g, now(), id, optionIndex)
          if (!r.ok) {
            apply(r)
            return null
          }
          apply(r)
          if (r.correct) {
            playAcornSfx()
            get().showToast(`🎓 ¡Lección aprendida! · ${r.state.lessonsRead.length} de ${LESSONS.length}`)
          }
          return r.correct ?? null
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
          if (hasSupabase) void deleteRemote()
          set({
            game: null,
            view: 'isla',
            trip: 'home',
            acornsFound: [],
            acornsMonth: -1,
            celebration: null,
            wheelOpen: false,
            seenDiary: 0,
            seenBankOpen: false,
            seenWorld: 1,
            seenMissions: 0,
            stormSeen: false,
          })
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
          // El recorrido inicial mira qué lugares se han abierto ya.
          if (g && g.tutorialStep < TUTORIAL_DONE && !get().coachVisited.includes(view)) patch.coachVisited = [...get().coachVisited, view]
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
      partialize: (s) => ({
        game: s.game,
        saveOwner: s.saveOwner,
        devOffsetMs: s.devOffsetMs,
        seenDiary: s.seenDiary,
        seenBankOpen: s.seenBankOpen,
        seenWorld: s.seenWorld,
        seenMissions: s.seenMissions,
        stormSeen: s.stormSeen,
        rescueSeen: s.rescueSeen,
        avatar: s.avatar,
        musicOn: s.musicOn,
        musicVolume: s.musicVolume,
        sfxOn: s.sfxOn,
        sfxVolume: s.sfxVolume,
      }),
    },
  ),
)

/** ¿Está activado el modo de pruebas? (`npm run dev`, o `?dev` en la URL si VITE_ALLOW_DEV=true) */
export const isDevMode = import.meta.env.DEV || (new URLSearchParams(location.search).has('dev') && import.meta.env.VITE_ALLOW_DEV === 'true')

// Al salir de la página o dejarla en segundo plano, la partida se guarda en el servidor sin esperar.
if (typeof window !== 'undefined') {
  const flush = () => flushRemoteSave(useGame.getState().game)
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', () => document.hidden && flush())
}

// En modo de pruebas, el estado queda accesible desde la consola: `finfun.getState()`.
if (isDevMode) (window as unknown as { finfun: typeof useGame }).finfun = useGame
