import { BUILDINGS, PIER } from './registry'
import { scatter, type Terrain } from './terrain'

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

