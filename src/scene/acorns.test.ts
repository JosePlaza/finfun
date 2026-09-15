import { describe, expect, it } from 'vitest'
import { acornSpotsOn } from './acorns'
import { BUILDINGS, SITES } from './registry'
import { makeTerrain, slopeAt } from './terrain'

describe('bellotas', () => {
  it('siempre hay sitios de sobra, en tierra firme y lejos de los edificios', () => {
    for (const seed of [1, 77, 345, 512, 999]) {
      const terrain = makeTerrain(seed, SITES)
      const spots = acornSpotsOn(terrain)
      expect(spots.length).toBeGreaterThanOrEqual(10)
      for (const [x, z] of spots) {
        expect(terrain.height(x, z)).toBeGreaterThan(0.75)
        expect(slopeAt(terrain, x, z)).toBeLessThan(0.6)
        for (const b of BUILDINGS) expect(Math.hypot(x - b.x, z - b.z)).toBeGreaterThan(b.footprint * 1.3 + 1.2)
      }
    }
  })
})
