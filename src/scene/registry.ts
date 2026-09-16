/**
 * REGISTRO DEL MUNDO: todos los edificios del juego, en qué mundo se desbloquean, dónde están
 * y cómo los encuadra la cámara. Añadir un edificio = añadir una entrada aquí (+ su receta en buildings/).
 */
import type { Site, Terrain } from './terrain'

type V3 = [number, number, number]

export type PlaceId = 'casa' | 'cofre' | 'banco' | 'tienda' | 'faro' | 'huerto' | 'ayuntamiento' | 'hacienda' | 'escuela' | 'mercado' | 'fondo'

export type BuildingId =
  | PlaceId
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
  /** Nivel en el que se desbloquea (1 = disponible desde el principio). */
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
  /** Qué se hace ahí, con un poco más de detalle (para la ficha del edificio). */
  about: string
  /** Construcción que paga el jugador (en euroLukys) en vez de abrirse por nivel. */
  costCents?: number
}

const SE = Math.PI / 4

export const BUILDINGS: BuildingDef[] = [
  // ───────── MUNDO 1 · La Isla ─────────
  { id: 'casa', name: 'Casa', world: 1, teaches: 'Aquí llega tu paga cada mes.', x: 10.5, z: 5.0, rotation: SE, footprint: 3.4, view: 'casa', icon: '🏠', about: 'Cada mes llega la paga al buzón. Dentro está la despensa: cada mes se come una ración, y si se vacía empieza a contar el hambre.', camera: { frameW: 9, frameH: 6.5, elev: 0.55, side: 0.25, lookUp: 1.6 } },
  { id: 'banco', name: 'Banco', world: 1, teaches: 'Guarda tu dinero y lo hace crecer un poquito cada mes.', x: -8.0, z: 6.0, rotation: SE + 0.3, footprint: 3.8, view: 'banco', icon: '🏦', about: 'Cuenta remunerada: deja el dinero y cada mes crece un 2,5 % anual repartido por meses. Se puede sacar cuando quieras.', camera: { frameW: 10, frameH: 7, elev: 0.5, side: -0.2, lookUp: 2.0 } },
  { id: 'tienda', name: 'Tienda', world: 1, teaches: 'Donde el dinero se convierte en cosas.', x: 1.5, z: 9.0, rotation: SE + 0.4, footprint: 3.2, view: 'tienda', icon: '🏪', about: 'Cestas de comida (pequeña para un mes, grande para dos y más barata por mes) y cosas que apetecen. Los precios suben cada año con la inflación.', camera: { frameW: 8.5, frameH: 6, elev: 0.55, side: 0.2, lookUp: 1.5 } },
  { id: 'cofre', name: 'Cueva del cofre', world: 1, teaches: 'Tu ahorro, a buen recaudo dentro de la roca.', x: 3.0, z: 18.0, rotation: SE, footprint: 3.2, view: 'cofre', icon: '🪙', about: 'Tu ahorro seguro. No crece, pero está a mano. Desde aquí lo llevas al banco, al Ayuntamiento o a la tienda.', camera: { frameW: 11, frameH: 7, elev: 0.32, side: 0.1, lookUp: 1.3 } },
  { id: 'faro', name: 'Faro', world: 1, teaches: 'La casa de Doña Tortuga: su diario y sus consejos.', x: -14.0, z: -14.5, rotation: SE, footprint: 3.6, view: 'faro', icon: '🐢', about: 'El diario de Doña Tortuga: cada cierre de año cuenta qué pasó con tu dinero y qué habría pasado en otro sitio. Aquí gira la ruleta de la inflación.', camera: { frameW: 10, frameH: 10, elev: 0.45, side: 0.35, lookUp: 3.6 } },
  { id: 'huerto', name: 'Huerto', world: 1, teaches: 'Da comida cada tres meses. Una inversión que se come.', x: 19.0, z: 10.0, rotation: SE - 0.5, footprint: 3.2, view: 'huerto', icon: '🌾', about: 'Cuesta 1000 euroLukys y da una cesta grande cada tres meses, para siempre. Una inversión que se come: cuanto más suban los precios, más vale.', costCents: 1000_00, camera: { frameW: 10, frameH: 7, elev: 0.55, side: 0.2, lookUp: 1.2 } },
  // ───────── MUNDO 2 · El Ayuntamiento ─────────
  { id: 'ayuntamiento', name: 'Ayuntamiento', world: 2, teaches: 'Emite bonos: le prestas dinero y te paga un cupón fijo.', x: -7.5, z: -6.0, rotation: SE, footprint: 3.8, view: 'ayuntamiento', icon: '🏛️', camera: { frameW: 11, frameH: 8, elev: 0.5, side: 0.2, lookUp: 2.2 }, about: 'Emite bonos: le prestas dinero para obras concretas (farolas, un puente, la biblioteca) y te paga un cupón fijo cada trimestre. A más plazo, más cupón. Al vencer te devuelve lo prestado.' },
  { id: 'hacienda', name: 'Hacienda', world: 2, teaches: 'Don Búho se lleva una parte de lo que ganas y hace la declaración.', x: -15.5, z: -0.5, rotation: Math.PI / 2, footprint: 3.0, view: 'hacienda', icon: '🦉', about: 'Don Búho cobra el 19 % de lo que ganas con tu dinero (intereses y cupones). Tú eliges: retención en cada cobro, o una declaración al cerrar el año, que deja el dinero trabajando más tiempo.' },
  { id: 'escuela', name: 'Escuela', world: 2, teaches: 'Los carnés de inversor y las lecciones de Doña Tortuga.', x: 1.0, z: -0.5, rotation: SE, footprint: 3.2, view: 'escuela', icon: '🏫', about: 'Lecciones cortas de Doña Tortuga sobre cada idea del juego. Leerlas da carnés de inversor y forma parte de las misiones.' },
  // ───────── MUNDO 3 · El Mercado ─────────
  { id: 'mercado', name: 'Mercado de acciones', world: 3, teaches: 'Compra trozos de los negocios de la isla.', x: 10.0, z: -5.5, rotation: SE, footprint: 3.8, view: 'mercado', icon: '📈', camera: { frameW: 11, frameH: 8, elev: 0.5, side: 0.2, lookUp: 2.2 }, about: 'Compra y vende acciones de los negocios de la isla. El precio cambia cada mes según cómo les va; algunos reparten dividendo cada trimestre y otros no. Comisión pequeña por operación.' },
  { id: 'panaderia', name: 'Panadería', world: 3, teaches: 'Negocio estable que reparte dividendo cada trimestre.', x: 20.0, z: -8.0, rotation: SE + 0.6, footprint: 2.8, icon: '🥖', about: 'Negocio estable: vende pan todos los meses, gana parecido en todas las estaciones y reparte dividendo trimestral. Aquí ves sus cuentas y compras sus acciones.' },
  { id: 'heladeria', name: 'Heladería', world: 3, teaches: 'Gana en verano y cierra en invierno: un negocio de temporada.', x: -5.5, z: 16.5, rotation: SE - 0.3, footprint: 2.6, icon: '🍦', about: 'Negocio de temporada: arrasa en verano, cierra en invierno. El dividendo llega solo tras el verano. Enseña que los beneficios no son iguales todo el año.' },
  { id: 'puerto', name: 'Puerto pesquero', world: 3, teaches: 'Los barcos ganan mucho… si no hay tormenta.', x: 12.0, z: 15.5, rotation: SE, footprint: 2.8, icon: '🎣', about: 'Negocio de mucho dividendo… cuando no hay tormenta. Un trimestre malo puede dejarlo a cero. Riesgo y recompensa a la vista.' },
  { id: 'astillero', name: 'Astillero', world: 3, teaches: 'No reparte dividendo: lo reinvierte todo para crecer.', x: 22.5, z: 1.0, rotation: SE - 0.6, footprint: 3.4, icon: '⚓', about: 'No reparte dividendo: reinvierte todo para crecer. Su acción sube más que las demás a largo plazo, pero no da nada por el camino.' },
  // ───────── MUNDO 4 · La Tormenta ─────────
  { id: 'molino', name: 'Molino', world: 4, teaches: 'Energía regulada: poco crecimiento, dividendo seguro.', x: -20.5, z: -7.5, rotation: SE, footprint: 2.6, icon: '🌬️', about: 'Energía regulada: poco crecimiento, dividendo pequeño y muy seguro. El refugio tranquilo de la cartera.' },
  { id: 'posada', name: 'Posada del Puerto', world: 4, teaches: 'Vive del turismo de verano.', x: -4.5, z: -18.0, rotation: 0, footprint: 3.2, icon: '🛎️', about: 'Vive del turismo de verano: llena en verano, medio vacía el resto. Cíclico y estacional a la vez.' },
  { id: 'granja', name: 'Granja', world: 4, teaches: 'La cosecha de otoño manda: plagas y sequías.', x: 5.0, z: -18.0, rotation: 0.2, footprint: 3.4, icon: '🌾', about: 'La cosecha de otoño decide el año: plagas y sequías la pueden estropear. Beneficios muy variables.' },
  { id: 'cantera', name: 'Cantera de Oro', world: 4, teaches: 'El activo refugio: no gana nada, pero sube cuando hay miedo.', x: 14.0, z: -14.5, rotation: SE, footprint: 3.0, icon: '🪙', about: 'De aquí salen los lingotes de oro de la isla. El oro no gana ni reparte nada, pero cuando todo cae la gente lo busca y sube: un refugio para las tormentas.' },
  { id: 'taller', name: 'Taller de juguetes', world: 4, teaches: 'Modas: un año arrasa y otro no.', x: -20.5, z: 7.0, rotation: Math.PI / 2, footprint: 3.0, icon: '🧸', about: 'Modas: un año todos quieren sus juguetes y al siguiente nadie. La acción más nerviosa de la isla.' },
  { id: 'observatorio', name: 'Observatorio', world: 4, teaches: 'Ciencia: crece muchísimo o nada. Alto riesgo.', x: 1.5, z: -9.5, rotation: SE, footprint: 2.6, icon: '🔭', about: 'Ciencia: unos años no descubre nada y otro año descubre un cometa y su acción se multiplica. Alto riesgo, alta recompensa… o nada.' },
  { id: 'fondo', name: 'Casa del Fondo Isla', world: 4, teaches: 'Un trocito de todos los negocios a la vez.', x: -14.5, z: 14.0, rotation: SE + 0.7, footprint: 3.2, view: 'fondo', icon: '🧺', about: 'Un trocito de todos los negocios a la vez, con una comisión anual pequeña. Diversificar: no poner todos los huevos en la misma cesta. Se puede traspasar sin pasar por Hacienda.' },
]

export const WORLD_NAMES: Record<number, string> = { 1: 'La Isla', 2: 'El Ayuntamiento', 3: 'El Mercado', 4: 'La Tormenta' }

export const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map((b) => [b.id, b])) as Record<BuildingId, BuildingDef>

/** Explanadas planas que el terreno debe reservar. */
export const SITES: Site[] = BUILDINGS.map((b) => ({ x: b.x, z: b.z, r: b.footprint }))

/** El muelle y las barcas, en la playa suroeste. */
export const PIER = { x: -8.0, z: 17.5, rotation: 0.15, length: 4.6 }

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
  target: [0.5, 4.0, 2.0] as V3,
  dir: unit(0.62, 0.66, 0.7),
  frameW: 58,
  frameH: 54,
}

export function islandPose(fovDeg: number, aspect: number, portrait = false): { position: V3; target: V3 } {
  // En vertical dejamos que los bordes se recorten: importa ver el centro con detalle.
  const d = fitDistance(portrait ? 40 : ISLAND_VIEW.frameW, portrait ? 50 : ISLAND_VIEW.frameH, fovDeg, aspect)
  // En vertical el HUD ocupa la parte alta, así que centramos la isla algo más abajo.
  const t: V3 = portrait ? [ISLAND_VIEW.target[0], 4.6, ISLAND_VIEW.target[2]] : ISLAND_VIEW.target
  const dir = ISLAND_VIEW.dir
  return { target: t, position: [t[0] + dir[0] * d, t[1] + dir[1] * d, t[2] + dir[2] * d] }
}
