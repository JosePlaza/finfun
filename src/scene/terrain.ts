/**
 * TERRENO CONTINUO DE LA ISLA (funciones puras, sin Three.js).
 *
 * La isla es un campo de alturas h(x, z): una meseta central que baja suavemente hasta la costa,
 * con colinas y hondonadas que crean varios niveles, y una "explanada" aplanada bajo cada edificio
 * para que se asiente con naturalidad. No hay escalones: todas las transiciones son rampas suaves.
 */
import { mulberry32 } from '../sim/rng'

export interface Site {
  x: number
  z: number
  /** Radio de la explanada plana. */
  r: number
}

export interface Hill {
  x: number
  z: number
  /** Anchura (desviación) de la colina. Negativa `a` = hondonada. */
  s: number
  a: number
}

/** Semiejes de la isla: la costa se sitúa donde r ≈ 1. */
export const ISLAND_RX = 28
export const ISLAND_RZ = 23

/** Colinas y hondonadas que dan los niveles de la isla. */
export const HILLS: Hill[] = [
  { x: -14, z: -14.5, s: 6.8, a: 5.0 }, // pico del faro (noroeste)
  { x: 0, z: -11, s: 4.8, a: 1.4 }, // loma del observatorio (norte)
  { x: 12, z: -8, s: 6.0, a: 2.6 }, // cresta noreste (mercado / cantera)
  { x: -19, z: -8, s: 4.4, a: 1.2 }, // loma del molino (oeste)
  { x: 12, z: 2, s: 7.8, a: 0.6 }, // meseta este (casa)
  { x: 9, z: 15, s: 6.8, a: -1.5 }, // hondonada sur: la cueva y el puerto
  { x: -7, z: 16, s: 6.0, a: -2.3 }, // playa suroeste
  { x: 19, z: 8, s: 5.2, a: -1.0 }, // costa este baja: astillero
  { x: -16, z: 12, s: 5.0, a: -0.9 }, // costa oeste baja
]

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

/** Ruido suave y determinista (dos senos cruzados con la semilla). */
function wobble(x: number, z: number, seed: number): number {
  const a = (seed % 977) * 0.01
  return Math.sin(x * 0.31 + a) * Math.cos(z * 0.27 - a) * 0.5 + Math.sin(x * 0.13 - z * 0.17 + a * 2) * 0.5
}

/** Altura "geológica" antes de aplanar explanadas. */
export function rawHeight(x: number, z: number, seed: number): number {
  const r = Math.hypot(x / ISLAND_RX, z / ISLAND_RZ) + wobble(x, z, seed) * 0.07
  // 1 en el interior, 0 en la costa; por debajo sigue bajando bajo el agua.
  const inland = smoothstep(1.02, 0.7, r)
  let h = -1.6 + (1.6 + 0.6) * smoothstep(1.08, 0.94, r) + 3.2 * inland
  for (const b of HILLS) {
    const d2 = ((x - b.x) ** 2 + (z - b.z) ** 2) / (2 * b.s * b.s)
    h += b.a * Math.exp(-d2) * Math.min(1, inland + 0.35)
  }
  // Micro-relieve para que las facetas low-poly no sean perfectamente lisas.
  h += wobble(x * 2.3, z * 2.1, seed + 7) * 0.08
  return h
}

export interface Terrain {
  height: (x: number, z: number) => number
  raw: (x: number, z: number) => number
  /** Altura de la explanada de un sitio. */
  siteHeight: (site: Site) => number
  sites: Site[]
  seed: number
}

/** Construye el campo de alturas con las explanadas aplanadas bajo los sitios dados. */
export function makeTerrain(seed: number, sites: Site[]): Terrain {
  const raw = (x: number, z: number) => rawHeight(x, z, seed)
  const levels = sites.map((s) => {
    // La explanada toma la altura media del terreno bajo su huella y la redondea a medios metros:
    // así los edificios cercanos quedan a niveles reconocibles y las rampas entre ellos son claras.
    const samples = [raw(s.x, s.z), raw(s.x + s.r, s.z), raw(s.x - s.r, s.z), raw(s.x, s.z + s.r), raw(s.x, s.z - s.r)]
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length
    return Math.max(0.6, Math.round(mean * 2) / 2)
  })
  const height = (x: number, z: number) => {
    let h = raw(x, z)
    for (let i = 0; i < sites.length; i++) {
      const s = sites[i]
      const d = Math.hypot(x - s.x, z - s.z)
      if (d > s.r * 2.4) continue
      // Plana hasta 1,25 r (margen libre alrededor del edificio), transición suave hasta 2,4 r.
      const k = 1 - smoothstep(s.r * 1.25, s.r * 2.4, d)
      h = h + (levels[i] - h) * k
    }
    return h
  }
  return {
    height,
    raw,
    siteHeight: (site) => {
      const i = sites.indexOf(site)
      return i >= 0 ? levels[i] : height(site.x, site.z)
    },
    sites,
    seed,
  }
}

/** Pendiente aproximada (módulo del gradiente) en un punto. */
export function slopeAt(t: Terrain, x: number, z: number, eps = 0.35): number {
  const dx = (t.height(x + eps, z) - t.height(x - eps, z)) / (2 * eps)
  const dz = (t.height(x, z + eps) - t.height(x, z - eps)) / (2 * eps)
  return Math.hypot(dx, dz)
}

/** Puntos de la costa (donde la altura cruza el nivel del mar + margen), para rocas y espuma. */
export function coastPoints(t: Terrain, count: number, level = 0.25): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2
    // Busca desde fuera hacia dentro el primer punto por encima del nivel.
    for (let k = 1.25; k > 0.4; k -= 0.02) {
      const x = Math.cos(a) * ISLAND_RX * k
      const z = Math.sin(a) * ISLAND_RZ * k
      if (t.height(x, z) > level) {
        pts.push([x, z])
        break
      }
    }
  }
  return pts
}

/** Puntos aleatorios pero deterministas sobre la isla que cumplen un filtro (para vegetación y rocas). */
export function scatter(t: Terrain, seed: number, count: number, ok: (x: number, z: number, h: number, slope: number) => boolean): [number, number, number][] {
  const rng = mulberry32(seed)
  const out: [number, number, number][] = []
  let tries = 0
  while (out.length < count && tries < count * 40) {
    tries++
    const x = (rng() * 2 - 1) * ISLAND_RX
    const z = (rng() * 2 - 1) * ISLAND_RZ
    const h = t.height(x, z)
    if (h < 0.2) continue
    if (!ok(x, z, h, slopeAt(t, x, z))) continue
    out.push([x, h, z])
  }
  return out
}
