import type { Season } from '../sim'

export interface SeasonPalette {
  sky: string
  water: string
  grass: string
  grassTop: string
  foliage: string
  cypress: string
  oak: string
  sun: string
  sunIntensity: number
  ambient: number
  snow: boolean
  flowers: boolean
  fallenLeaves: boolean
}

export const PALETTES: Record<Season, SeasonPalette> = {
  primavera: {
    sky: '#cfe8ee', water: '#8ec9d8', grass: '#9fd3a6', grassTop: '#a8d9ae', foliage: '#5fa97c', cypress: '#4e9268',
    oak: '#6fb886', sun: '#fff7e6', sunIntensity: 2.2, ambient: 0.9, snow: false, flowers: true, fallenLeaves: false,
  },
  verano: {
    sky: '#bfe4f2', water: '#74c3d8', grass: '#8fcf88', grassTop: '#98d590', foliage: '#4f9f6b', cypress: '#3f8a5c',
    oak: '#5aa66d', sun: '#fff1cc', sunIntensity: 2.6, ambient: 1.0, snow: false, flowers: false, fallenLeaves: false,
  },
  otoño: {
    sky: '#e7d9d6', water: '#7fb3c0', grass: '#bccf8f', grassTop: '#c5d494', foliage: '#c9a35b', cypress: '#5f8f5a',
    oak: '#e08a4a', sun: '#ffe2c2', sunIntensity: 1.9, ambient: 0.85, snow: false, flowers: false, fallenLeaves: true,
  },
  invierno: {
    sky: '#dfe8ef', water: '#9cc0d1', grass: '#e6eeea', grassTop: '#f2f6f4', foliage: '#6f9a86', cypress: '#4a7a63',
    oak: '#8a6a4a', sun: '#eaf1ff', sunIntensity: 1.6, ambient: 0.8, snow: true, flowers: false, fallenLeaves: false,
  },
}

export const ROCK = '#e8c9c0'
export const ROCK_DARK = '#d9b3aa'
export const PATH = '#f3e4c4'
export const WOOD = '#9b6a3c'
export const WOOD_LIGHT = '#c48f5a'
export const CORAL = '#e5735b'
export const WHITE = '#f7f3ec'
export const COIN = '#e2b04a'
export const COIN_DARK = '#b8862b'
export const ACORN = '#8a5a2b'
export const ACORN_CAP = '#5c3d1e'
export const LEAF_DARK = '#3f7a4c'
export const BANK_GREEN = '#5fa97c'
export const SHOP_AWNING = '#e5735b'
export const SLATE = '#5a5652'
