/**
 * INSIGNIAS. Cada insignia tiene hasta tres niveles (bronce, plata y oro) con un umbral cada uno, y se mide
 * sobre un número que sale de la partida (bellotas, días jugados, lecciones…). Las conseguidas se apuntan en
 * `state.badges` como "familia-nivel" (p. ej. `bellotas-2`), así se puede avisar de las nuevas y no se pierden
 * aunque el número baje después (el dinero del banco, por ejemplo).
 */
import { TASK_ACORNS, LESSONS } from './config'
import type { GameState } from './types'

export type BadgeTier = 1 | 2 | 3

export interface BadgeDef {
  id: string
  name: string
  /** Icono de la medalla. */
  icon: string
  /** Qué mide, en palabras del niño ("bellotas recogidas"). */
  what: string
  /** Umbrales de bronce, plata y oro (puede haber menos de tres). */
  tiers: number[]
  /** El número actual en la partida. */
  value: (g: GameState, month: number) => number
  /** Cómo se escribe el número (por defecto, tal cual). */
  format?: (n: number) => string
}

const eL = (cents: number) => `${Math.floor(cents / 100)} eL`

export const BADGES: BadgeDef[] = [
  { id: 'bellotas', name: 'Buscador de bellotas', icon: '🌰', what: 'bellotas recogidas', tiers: [100, 500, 1000], value: (g) => g.tasksCompleted * TASK_ACORNS },
  { id: 'constancia', name: 'Constante', icon: '📅', what: 'días jugados', tiers: [7, 30, 100], value: (g) => g.daysPlayed },
  { id: 'hormiguita', name: 'Hormiguita', icon: '🏦', what: 'en el banco', tiers: [100_00, 500_00, 2000_00], value: (g) => g.bankCents, format: eL },
  { id: 'sabio', name: 'Sabio de la escuela', icon: '🎓', what: 'lecciones aprendidas', tiers: [3, 8, LESSONS.length], value: (g) => g.lessonsRead.length },
  { id: 'prestamista', name: 'Prestamista', icon: '📜', what: 'bonos comprados', tiers: [1, 5, 15], value: (g) => g.bondsBought },
  { id: 'accionista', name: 'Accionista', icon: '📈', what: 'negocios distintos', tiers: [1, 4, 8], value: (g) => g.businessesBought.length },
  { id: 'paciente', name: 'Inversor paciente', icon: '🏠', what: 'puestos en el Fondo Isla', tiers: [100_00, 500_00, 1000_00], value: (g) => g.fundCostCents, format: eL },
  { id: 'patrimonio', name: 'Patrimonio', icon: '💎', what: 'de patrimonio', tiers: [300_00, 1000_00, 5000_00], value: (g, month) => netWorthOf(g, month), format: eL },
  { id: 'explorador', name: 'Explorador', icon: '🗺️', what: 'niveles abiertos', tiers: [2, 3, 4], value: (g) => g.world },
  {
    id: 'capitan',
    name: 'Capitán en la tormenta',
    icon: '⛈️',
    what: 'tormentas aguantadas sin vender',
    tiers: [1, 3, 5],
    value: (g) => g.stormsSurvived + (g.crashSurvived ? 1 : 0),
  },
  { id: 'liebre', name: 'Amigo de la Liebre', icon: '🐰', what: 'visitas a su isla', tiers: [1, 10, 30], value: (g) => g.liebreVisits },
  { id: 'vecino', name: 'Buen vecino', icon: '🤝', what: 'préstamos a la Liebre devueltos', tiers: [1, 5, 10], value: (g) => g.liebreLoansRepaid },
  { id: 'contribuyente', name: 'Contribuyente', icon: '🦉', what: 'declaraciones presentadas', tiers: [1, 3, 5], value: (g) => g.declarations.length },
  {
    id: 'huerto',
    name: 'Independiente',
    icon: '🥕',
    what: 'huerto: construido y ampliado',
    tiers: [1, 2],
    value: (g) => (g.huertoUpgradedMonth !== null ? 2 : g.huertoBuiltMonth !== null ? 1 : 0),
  },
]

export const BADGE_BY_ID: Record<string, BadgeDef> = Object.fromEntries(BADGES.map((b) => [b.id, b]))

/** Patrimonio sin importar el motor (evita el ciclo de imports): se inyecta desde engine.ts. */
let netWorthOf: (g: GameState, month: number) => number = () => 0
export function bindNetWorth(fn: (g: GameState, month: number) => number) {
  netWorthOf = fn
}

export const TIER_NAMES = ['', 'Bronce', 'Plata', 'Oro']

/** Nivel alcanzado (0 = ninguno) según el número actual. */
export function tierFor(def: BadgeDef, value: number): number {
  let t = 0
  for (let i = 0; i < def.tiers.length; i++) if (value >= def.tiers[i]) t = i + 1
  return t
}

export const badgeId = (family: string, tier: number) => `${family}-${tier}`

/** Apunta las insignias nuevas en la partida. Devuelve los ids recién conseguidos (para avisar). */
export function awardBadges(state: GameState, month: number): string[] {
  state.badges ??= []
  const fresh: string[] = []
  for (const def of BADGES) {
    const t = tierFor(def, def.value(state, month))
    for (let k = 1; k <= t; k++) {
      const id = badgeId(def.id, k)
      if (!state.badges.includes(id)) {
        state.badges.push(id)
        fresh.push(id)
      }
    }
  }
  return fresh
}

/** Estado de una insignia para la interfaz: nivel conseguido, número actual y siguiente umbral. */
export function badgeStatus(def: BadgeDef, state: GameState, month: number) {
  const value = def.value(state, month)
  // Lo conseguido: lo apuntado en la partida o, si aún no se ha apuntado (se apunta al actuar), lo que ya alcanza el número.
  const saved = def.tiers.reduce((acc, _t, i) => (state.badges?.includes(badgeId(def.id, i + 1)) ? i + 1 : acc), 0)
  const earned = Math.max(saved, tierFor(def, value))
  const next = earned < def.tiers.length ? def.tiers[earned] : null
  const fmt = def.format ?? ((n: number) => String(n))
  return { value, earned, next, valueText: fmt(value), nextText: next !== null ? fmt(next) : null, maxed: next === null }
}
