import type { Season } from '../sim'

/**
 * PALETA ÚNICA DEL MUNDO.
 * Todo lo que se construya en la isla (hoy o dentro de un año) toma sus colores de aquí.
 * Cambiar un valor aquí cambia el mundo entero de forma coherente.
 */
export const C = {
  // Terreno
  rock: '#b9ae9e',
  rockDark: '#9d9283',
  rockLight: '#d3c9b9',
  sand: '#f1dfb8',
  sandWet: '#dcc9a1',
  path: '#d9b88a',
  pathEdge: '#c9a674',
  // Materiales de construcción
  stone: '#d8ccb4',
  stoneDark: '#b9ab90',
  plaster: '#f6ecd6',
  plasterWarm: '#f3dfa9',
  wood: '#8e5a2c',
  woodLight: '#c78b4e',
  woodDark: '#5e3a1b',
  metal: '#4f4a45',
  glass: '#a9dff2',
  glassNight: '#ffd98a',
  // Tejados
  roofRed: '#d9573f',
  roofRedDark: '#b8432f',
  roofBlue: '#3b7fc4',
  roofBlueDark: '#2c62a0',
  roofOrange: '#e07a3f',
  // Acentos
  white: '#f8f5ee',
  red: '#d6453a',
  navy: '#274a7a',
  gold: '#e7b54a',
  goldDark: '#b8862b',
  flowerPink: '#f27ba0',
  flowerYellow: '#f5c542',
  flowerRed: '#e2503f',
  chestBrown: '#8a4b1e',
  caveDark: '#3d2f26',
  lantern: '#ffb347',
} as const

export interface SeasonPalette {
  sky: string
  skyBottom: string
  water: string
  waterDeep: string
  grass: string
  grassTop: string
  foliage: string
  palm: string
  bush: string
  sun: string
  sunIntensity: number
  ambient: number
  snow: boolean
  flowers: boolean
  fallenLeaves: boolean
}

export const PALETTES: Record<Season, SeasonPalette> = {
  primavera: {
    sky: '#8fd0f0', skyBottom: '#cfeaf6', water: '#3fb8d9', waterDeep: '#2a93b8', grass: '#7cc75a', grassTop: '#8fd36a',
    foliage: '#4fae4a', palm: '#4fb04c', bush: '#5cb85c', sun: '#fff5df', sunIntensity: 2.4, ambient: 0.85, snow: false, flowers: true, fallenLeaves: false,
  },
  verano: {
    sky: '#79c8f2', skyBottom: '#c9e9f8', water: '#2fb3dc', waterDeep: '#1f8fbd', grass: '#79c452', grassTop: '#8ccf62',
    foliage: '#3f9f44', palm: '#3fa245', bush: '#4fae55', sun: '#fff0c8', sunIntensity: 2.8, ambient: 0.95, snow: false, flowers: false, fallenLeaves: false,
  },
  otoño: {
    sky: '#b7cde0', skyBottom: '#eadfd6', water: '#4aa5c3', waterDeep: '#33809f', grass: '#a8bd5e', grassTop: '#b7c86a',
    foliage: '#c98f3f', palm: '#6a9e48', bush: '#b3a24a', sun: '#ffe0bd', sunIntensity: 2.0, ambient: 0.8, snow: false, flowers: false, fallenLeaves: true,
  },
  invierno: {
    sky: '#b9d3e6', skyBottom: '#e6eef3', water: '#5aa6c4', waterDeep: '#3e86a4', grass: '#a9c99b', grassTop: '#c4d9b8',
    foliage: '#5f9a6a', palm: '#4e8d55', bush: '#6a9b72', sun: '#eef3ff', sunIntensity: 1.7, ambient: 0.75, snow: true, flowers: false, fallenLeaves: false,
  },
}

/**
 * ESCALA DEL MUNDO. 1 unidad ≈ 1 metro. Un personaje mediría ~1,5.
 * Todas las piezas del kit respetan estas medidas.
 */
export const SCALE = {
  door: { w: 0.9, h: 1.4 },
  window: { w: 0.7, h: 0.7 },
  wallHeight: 2.2,
  step: 0.22,
  fence: 0.7,
} as const
