/**
 * REGISTRO DEL MUNDO: todos los edificios del juego, en qué mundo se desbloquean, dónde están
 * y cómo los encuadra la cámara. Añadir un edificio = añadir una entrada aquí (+ su receta en buildings/).
 */
import type { Site, Terrain } from './terrain'

type V3 = [number, number, number]

export type PlaceId = 'casa' | 'cofre' | 'banco' | 'tienda' | 'faro'

export type BuildingId =
  | PlaceId
  | 'ayuntamiento'
  | 'hacienda'
  | 'escuela'
  | 'mercado'
  | 'panaderia'
  | 'heladeria'
  | 'puerto'
  | 'astillero'
  | 'molino'
  | 'posada'
  | 'granja'
  | 'cantera'
  | 'taller'
  | 'observatorio'
  | 'fondo'

export interface CameraFrame {
  frameW: number
  frameH: number
  elev: number
  side: number
  lookUp: number
}

export interface BuildingDef {
  id: BuildingId
  name: string
  /** Mundo en el que se desbloquea (1 = disponible desde el principio). */
  world: 1 | 2 | 3 | 4
  /** Qué enseña o para qué sirve, en una frase para el niño. */
  teaches: string
  x: number
  z: number
  /** Giro sobre Y. 0 mira a +Z; π/4 mira a la cámara por defecto (sureste). */
  rotation: number
  /** Radio de la explanada plana que necesita. */
  footprint: number
  /** Si tiene panel propio, es un "lugar" al que vuela la cámara. */
  view?: PlaceId
  camera?: Partial<CameraFrame>
  icon: string
}

const SE = Math.PI / 4

export const BUILDINGS: BuildingDef[] = [
  // ───────── MUNDO 1 · La Isla ─────────
  { id: 'casa', name: 'Casa', world: 1, teaches: 'Aquí llega tu paga cada mes.', x: 9.5, z: 2.5, rotation: SE, footprint: 3.4, view: 'casa', icon: '🏠', camera: { frameW: 9, frameH: 6.5, elev: 0.55, side: 0.25, lookUp: 1.6 } },
  { id: 'banco', name: 'Banco', world: 1, teaches: 'Guarda tu dinero y lo hace crecer un poquito cada mes.', x: -4.5, z: 3.5, rotation: SE + 0.3, footprint: 3.8, view: 'banco', icon: '🏦', camera: { frameW: 10, frameH: 7, elev: 0.5, side: -0.2, lookUp: 2.0 } },
  { id: 'tienda', name: 'Tienda', world: 1, teaches: 'Donde el dinero se convierte en cosas.', x: 3.0, z: 8.0, rotation: SE + 0.4, footprint: 3.2, view: 'tienda', icon: '🏪', camera: { frameW: 8.5, frameH: 6, elev: 0.55, side: 0.2, lookUp: 1.5 } },
  { id: 'cofre', name: 'Cueva del cofre', world: 1, teaches: 'Tu ahorro, a buen recaudo dentro de la roca.', x: 8.5, z: 11.5, rotation: SE, footprint: 3.2, view: 'cofre', icon: '🪙', camera: { frameW: 11, frameH: 7, elev: 0.32, side: 0.1, lookUp: 1.3 } },
  { id: 'faro', name: 'Faro', world: 1, teaches: 'La casa de Doña Tortuga: su diario y sus consejos.', x: -8.0, z: -8.0, rotation: SE, footprint: 3.6, view: 'faro', icon: '🐢', camera: { frameW: 10, frameH: 10, elev: 0.45, side: 0.35, lookUp: 3.6 } },
  // ───────── MUNDO 2 · El Ayuntamiento ─────────
  { id: 'ayuntamiento', name: 'Ayuntamiento', world: 2, teaches: 'Emite bonos: le prestas dinero y te paga un cupón fijo.', x: -1.0, z: -3.0, rotation: SE, footprint: 3.8, icon: '🏛️' },
  { id: 'hacienda', name: 'Hacienda', world: 2, teaches: 'Don Búho se lleva una parte de lo que ganas y hace la declaración.', x: -10.5, z: -1.0, rotation: Math.PI / 2, footprint: 3.0, icon: '🦉' },
  { id: 'escuela', name: 'Escuela', world: 2, teaches: 'Los carnés de inversor y las lecciones de Doña Tortuga.', x: 4.5, z: -2.0, rotation: SE, footprint: 3.2, icon: '🏫' },
  // ───────── MUNDO 3 · El Mercado ─────────
  { id: 'mercado', name: 'Mercado de acciones', world: 3, teaches: 'Compra trozos de los negocios de la isla.', x: 10.0, z: -6.0, rotation: SE, footprint: 3.8, icon: '📈' },
  { id: 'panaderia', name: 'Panadería', world: 3, teaches: 'Negocio estable que reparte dividendo cada trimestre.', x: 14.5, z: -1.0, rotation: SE + 0.6, footprint: 2.8, icon: '🥖' },
  { id: 'heladeria', name: 'Heladería', world: 3, teaches: 'Gana en verano y cierra en invierno: un negocio de temporada.', x: -3.0, z: 10.0, rotation: SE - 0.3, footprint: 2.6, icon: '🍦' },
  { id: 'puerto', name: 'Puerto pesquero', world: 3, teaches: 'Los barcos ganan mucho… si no hay tormenta.', x: 13.5, z: 9.5, rotation: SE, footprint: 2.8, icon: '🎣' },
  { id: 'astillero', name: 'Astillero', world: 3, teaches: 'No reparte dividendo: lo reinvierte todo para crecer.', x: 17.5, z: 4.5, rotation: SE - 0.6, footprint: 3.4, icon: '⚓' },
  // ───────── MUNDO 4 · La Tormenta ─────────
  { id: 'molino', name: 'Molino', world: 4, teaches: 'Energía regulada: poco crecimiento, dividendo seguro.', x: -14.5, z: -6.0, rotation: SE, footprint: 2.6, icon: '🌬️' },
  { id: 'posada', name: 'Posada del Puerto', world: 4, teaches: 'Vive del turismo de verano.', x: -6.0, z: -13.0, rotation: 0, footprint: 3.2, icon: '🛎️' },
  { id: 'granja', name: 'Granja', world: 4, teaches: 'La cosecha de otoño manda: plagas y sequías.', x: 3.5, z: -10.0, rotation: 0.2, footprint: 3.4, icon: '🌾' },
  { id: 'cantera', name: 'Cantera', world: 4, teaches: 'Gana cuando la isla construye: un negocio cíclico.', x: 16.5, z: -9.0, rotation: SE, footprint: 3.0, icon: '⛏️' },
  { id: 'taller', name: 'Taller de juguetes', world: 4, teaches: 'Modas: un año arrasa y otro no.', x: -15.5, z: 3.5, rotation: Math.PI / 2, footprint: 3.0, icon: '🧸' },
  { id: 'observatorio', name: 'Observatorio', world: 4, teaches: 'Ciencia: crece muchísimo o nada. Alto riesgo.', x: -2.0, z: -8.5, rotation: SE, footprint: 2.6, icon: '🔭' },
  { id: 'fondo', name: 'Casa del Fondo Isla', world: 4, teaches: 'Un trocito de todos los negocios a la vez.', x: -11.5, z: 9.0, rotation: SE + 0.7, footprint: 3.2, icon: '🧺' },
]

export const WORLD_NAMES: Record<number, string> = { 1: 'La Isla', 2: 'El Ayuntamiento', 3: 'El Mercado', 4: 'La Tormenta' }

export const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map((b) => [b.id, b])) as Record<BuildingId, BuildingDef>

/** Explanadas planas que el terreno debe reservar. */
export const SITES: Site[] = BUILDINGS.map((b) => ({ x: b.x, z: b.z, r: b.footprint }))

/** El muelle y las barcas, en la playa suroeste. */
export const PIER = { x: -6.0, z: 13.0, rotation: 0.15, length: 4.6 }

export const DEFAULT_CAMERA: CameraFrame = { frameW: 9, frameH: 7, elev: 0.5, side: 0.2, lookUp: 1.6 }

/** Posición 3D de cada edificio sobre el terreno ya aplanado. */
export function buildingPositions(terrain: Terrain): Record<BuildingId, V3> {
  const out = {} as Record<BuildingId, V3>
  BUILDINGS.forEach((b, i) => {
    out[b.id] = [b.x, terrain.siteHeight(SITES[i]), b.z]
  })
  return out
}

/** Dirección "hacia delante" de un lugar (hacia donde mira su fachada). */
export function forwardOf(rotation: number): [number, number] {
  return [Math.sin(rotation), Math.cos(rotation)]
}

/** Distancia a la que hay que ponerse para que un rectángulo (ancho × alto) quepa en pantalla. */
export function fitDistance(frameW: number, frameH: number, fovDeg: number, aspect: number): number {
  const vfov = (fovDeg * Math.PI) / 180
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect)
  return Math.max(frameH / 2 / Math.tan(vfov / 2), frameW / 2 / Math.tan(hfov / 2))
}

function unit(x: number, y: number, z: number): V3 {
  const l = Math.hypot(x, y, z) || 1
  return [x / l, y / l, z / l]
}

/**
 * Pose de cámara para mirar un edificio de frente y algo elevada.
 * `panelRatio` es la parte inferior de la pantalla tapada por el panel (0 en escritorio).
 */
export function cameraPoseFor(def: BuildingDef, position: V3, fovDeg: number, aspect: number, panelRatio = 0): { position: V3; target: V3 } {
  const cam = { ...DEFAULT_CAMERA, ...def.camera }
  const [fx, fz] = forwardOf(def.rotation)
  const rx = fz
  const rz = -fx
  const visible = 1 - panelRatio
  const d = fitDistance(cam.frameW * 1.15, (cam.frameH * 1.15) / visible, fovDeg, aspect)
  const dir = unit(fx + rx * cam.side, cam.elev, fz + rz * cam.side)
  const target: V3 = [position[0], position[1] + cam.lookUp - (cam.frameH * panelRatio) / visible / 2, position[2]]
  return { position: [target[0] + dir[0] * d, target[1] + dir[1] * d, target[2] + dir[2] * d], target }
}

/** Vista general de la isla: encuadra la isla entera desde el sureste, elevada. */
export const ISLAND_VIEW = {
  target: [0.5, 3.6, 1.5] as V3,
  dir: unit(0.62, 0.66, 0.7),
  frameW: 44,
  frameH: 41,
}

export function islandPose(fovDeg: number, aspect: number, portrait = false): { position: V3; target: V3 } {
  // En vertical dejamos que los bordes se recorten: importa ver el centro con detalle.
  const d = fitDistance(portrait ? 30 : ISLAND_VIEW.frameW, portrait ? 38 : ISLAND_VIEW.frameH, fovDeg, aspect)
  // En vertical el HUD ocupa la parte alta, así que centramos la isla algo más abajo.
  const t: V3 = portrait ? [ISLAND_VIEW.target[0], 1.6, ISLAND_VIEW.target[2]] : ISLAND_VIEW.target
  const dir = ISLAND_VIEW.dir
  return { target: t, position: [t[0] + dir[0] * d, t[1] + dir[1] * d, t[2] + dir[2] * d] }
}
