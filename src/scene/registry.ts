/**
 * REGISTRO DEL MUNDO. Niveles de terreno, lugares y su cámara.
 * Añadir un lugar nuevo = añadir una entrada aquí (y su componente en buildings/).
 */
type V3 = [number, number, number]

/** Los tres niveles naturales de la isla (altura de la hierba). */
export const LEVELS = {
  playa: 0.32,
  inferior: 1.0,
  central: 2.3,
  superior: 3.7,
} as const

export type PlaceId = 'casa' | 'cofre' | 'banco' | 'tienda' | 'faro'

export interface Place {
  id: PlaceId
  label: string
  /** Posición del edificio en el mundo (base). */
  position: V3
  /** Giro sobre Y. Con 0 la fachada mira a +Z; con π/4 mira a la cámara por defecto. */
  rotation: number
  /** Encuadre al entrar: tamaño del lugar a encajar (ancho × alto), elevación y desviación lateral de la cámara. */
  camera: { frameW: number; frameH: number; elev: number; side: number; lookUp: number }
}

const FACE_CAMERA = Math.PI / 4

export const PLACES: Record<PlaceId, Place> = {
  casa: {
    id: 'casa',
    label: 'Casa',
    position: [4.6, LEVELS.central, 1.2],
    rotation: FACE_CAMERA,
    camera: { frameW: 9, frameH: 6.5, elev: 0.55, side: 0.25, lookUp: 1.6 },
  },
  banco: {
    id: 'banco',
    label: 'Banco',
    position: [-4.6, LEVELS.central, 1.6],
    rotation: FACE_CAMERA + 0.35,
    camera: { frameW: 10, frameH: 7, elev: 0.5, side: -0.2, lookUp: 2.0 },
  },
  faro: {
    id: 'faro',
    label: 'Faro',
    position: [-3.2, LEVELS.superior, -4.6],
    rotation: FACE_CAMERA,
    camera: { frameW: 10, frameH: 10, elev: 0.45, side: 0.35, lookUp: 3.6 },
  },
  cofre: {
    id: 'cofre',
    label: 'Cofre',
    position: [4.4, LEVELS.inferior, 6.0],
    rotation: FACE_CAMERA,
    camera: { frameW: 7.5, frameH: 5, elev: 0.5, side: 0.1, lookUp: 1.1 },
  },
  tienda: {
    id: 'tienda',
    label: 'Tienda',
    position: [-2.2, 0.04, 12.8],
    rotation: 0.25,
    camera: { frameW: 7, frameH: 5.5, elev: 0.55, side: 0.4, lookUp: 1.4 },
  },
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

/**
 * Pose de cámara para mirar un lugar de frente y algo elevada.
 * `panelRatio` es la parte inferior de la pantalla tapada por el panel (0 en escritorio).
 */
export function cameraPoseFor(place: Place, fovDeg: number, aspect: number, panelRatio = 0): { position: V3; target: V3 } {
  const [fx, fz] = forwardOf(place.rotation)
  const rx = fz
  const rz = -fx
  const { frameW, frameH, elev, side, lookUp } = place.camera
  const visible = 1 - panelRatio
  const d = fitDistance(frameW * 1.15, (frameH * 1.15) / visible, fovDeg, aspect)
  const dir = new_vec(fx + rx * side, elev, fz + rz * side)
  const target: V3 = [place.position[0], place.position[1] + lookUp - (frameH * panelRatio) / visible / 2, place.position[2]]
  const position: V3 = [target[0] + dir[0] * d, target[1] + dir[1] * d, target[2] + dir[2] * d]
  return { position, target }
}

function new_vec(x: number, y: number, z: number): V3 {
  const l = Math.hypot(x, y, z) || 1
  return [x / l, y / l, z / l]
}

/** Vista general de la isla: encuadra la isla entera desde el sureste, elevada. */
export const ISLAND_VIEW = {
  target: [0.4, 1.6, 2.0] as V3,
  dir: new_vec(0.62, 0.62, 0.7),
  frameW: 26,
  frameH: 24,
}

export function islandPose(fovDeg: number, aspect: number, portrait = false): { position: V3; target: V3 } {
  // En vertical dejamos que los bordes de la isla se recorten: importa ver el centro con detalle.
  const d = fitDistance(portrait ? 16 : ISLAND_VIEW.frameW, ISLAND_VIEW.frameH, fovDeg, aspect)
  const t = ISLAND_VIEW.target
  const dir = ISLAND_VIEW.dir
  return { target: t, position: [t[0] + dir[0] * d, t[1] + dir[1] * d, t[2] + dir[2] * d] }
}
