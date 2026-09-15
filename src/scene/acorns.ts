import { TASK_ACORNS } from '../sim/config'
import { rngFor } from '../sim/rng'
import { BUILDINGS, PIER, SITES } from './registry'
import { makeTerrain, scatter, type Terrain } from './terrain'

/**
 * Lugares donde pueden aparecer bellotas. Se calculan sobre el terreno de la isla con tres garantías:
 * tierra firme y llana (nunca bajo el agua ni en una ladera donde la malla las tape), fuera de la
 * explanada de cualquier edificio (para que no queden dentro de una pared ni detrás de una fachada)
 * y separadas entre sí. La prioridad de toque frente a los edificios la da el filtro del raycaster
 * (`Island.tsx`), no la distancia.
 */
export function acornSpotsOn(terrain: Terrain): [number, number][] {
  const clearOfBuildings = (x: number, z: number) =>
    BUILDINGS.every((b) => Math.hypot(x - b.x, z - b.z) > b.footprint * 1.3 + 1.2) && Math.hypot(x - PIER.x, z - PIER.z) > 5
  const raw = scatter(terrain, terrain.seed + 505, 60, (x, z, h, slope) => h > 0.75 && slope < 0.6 && clearOfBuildings(x, z))
  const out: [number, number][] = []
  for (const [x, , z] of raw) {
    if (out.every(([ox, oz]) => Math.hypot(x - ox, z - oz) > 4)) out.push([x, z])
    if (out.length >= 24) break
  }
  return out
}


/** Qué cinco lugares tocan hoy (índices sobre la lista de sitios; determinista por semilla y mes). */
export function acornSpotsFor(seed: number, month: number, count: number): number[] {
  const rng = rngFor(seed, month, 41)
  const idx = Array.from({ length: count }, (_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx.slice(0, TASK_ACORNS)
}

const spotsCache = new Map<number, [number, number][]>()

/** Coordenadas (x, z) de las bellotas de hoy, para quien no tiene el terreno a mano (el store, los paneles). */
export function dayAcornSpots(seed: number, month: number): [number, number][] {
  let all = spotsCache.get(seed)
  if (!all) {
    all = acornSpotsOn(makeTerrain(seed % 1000, SITES))
    spotsCache.set(seed, all)
  }
  const spots = all
  return acornSpotsFor(seed, month, spots.length).map((i) => spots[i])
}
