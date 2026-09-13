/** mulberry32: generador determinista pequeño y suficiente para el juego. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Mezcla la semilla de la partida con un "canal" (año, mes…) para obtener un sub-generador estable. */
export function rngFor(seed: number, channel: number, salt = 0): () => number {
  const mixed = (seed ^ Math.imul(channel + 1, 0x9e3779b9) ^ Math.imul(salt + 7, 0x85ebca6b)) >>> 0
  return mulberry32(mixed)
}

/** Entero uniforme en [min, max]. */
export function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}
