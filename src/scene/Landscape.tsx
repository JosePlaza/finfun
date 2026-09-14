/**
 * TERRENO Y AGUA. La isla es una única malla continua (campo de alturas low-poly) coloreada por
 * altura y pendiente: arena junto al mar, hierba en las mesetas, roca en las laderas empinadas.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32 } from '../sim/rng'
import { C, type SeasonPalette } from './palette'
import { coastPoints, ISLAND_RX, ISLAND_RZ, scatter, slopeAt, type Terrain as TerrainField } from './terrain'
import { Rock } from './kit/Nature'

type V3 = [number, number, number]

const tmp = new THREE.Color()

function mix(a: string, b: string, t: number): THREE.Color {
  const ca = new THREE.Color(a)
  const cb = new THREE.Color(b)
  return ca.lerp(cb, Math.min(1, Math.max(0, t)))
}

/** La isla entera como una sola malla facetada. */
export function Ground({ terrain, palette }: { terrain: TerrainField; palette: SeasonPalette }) {
  const geometry = useMemo(() => {
    const W = ISLAND_RX * 2 * 1.35
    const D = ISLAND_RZ * 2 * 1.35
    const segX = 168
    const segZ = 140
    const geo = new THREE.PlaneGeometry(W, D, segX, segZ)
    geo.rotateX(-Math.PI / 2) // plano en XZ, +Y arriba
    const pos = geo.attributes.position as THREE.BufferAttribute
    const rng = mulberry32(terrain.seed + 101)
    const colors = new Float32Array(pos.count * 3)
    const jitter = (W / segX) * 0.28
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i)
      let z = pos.getZ(i)
      // Desordenamos un poco la rejilla para que las facetas no sean regulares.
      x += (rng() - 0.5) * jitter
      z += (rng() - 0.5) * jitter
      const h = terrain.height(x, z)
      pos.setXYZ(i, x, h, z)
      const slope = slopeAt(terrain, x, z)
      let c: THREE.Color
      if (h < 0.55) c = mix(C.sandWet, C.sand, (h - 0.1) / 0.45)
      else if (h < 0.9) c = mix(C.sand, palette.grass, (h - 0.55) / 0.35)
      else c = mix(palette.grass, palette.grassTop, (h - 3) / 4)
      // Laderas empinadas: roca.
      const rockT = (slope - 0.55) / 0.5
      if (rockT > 0 && h > 0.3) c = c.lerp(tmp.set(h > 4 ? C.rockLight : C.rock), Math.min(1, rockT))
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [terrain, palette])
  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial vertexColors flatShading roughness={0.95} />
    </mesh>
  )
}

/** Rocas redondeadas en la costa y en las laderas: el borde natural de la isla. */
export function CoastRocks({ terrain }: { terrain: TerrainField }) {
  const rocks = useMemo(() => {
    const rng = mulberry32(terrain.seed + 303)
    const coast = coastPoints(terrain, 84, 0.45)
      .filter(() => rng() > 0.3)
      .map(([x, z], i) => ({ x, z, y: terrain.height(x, z) - 0.25, s: 0.7 + rng() * 0.9, seed: i * 13 + 1, c: rng() > 0.5 ? C.rock : C.rockLight }))
    const slopes = scatter(terrain, terrain.seed + 404, 40, (_x, _z, h, slope) => h > 0.8 && slope > 0.75).map(([x, y, z], i) => ({
      x,
      z,
      y: y - 0.2,
      s: 0.5 + rng() * 0.6,
      seed: 500 + i * 7,
      c: rng() > 0.5 ? C.rock : C.rockDark,
    }))
    return [...coast, ...slopes]
  }, [terrain])
  return (
    <group>
      {rocks.map((r, i) => (
        <Rock key={i} position={[r.x, r.y, r.z]} size={r.s} seed={r.seed} color={r.c} />
      ))}
    </group>
  )
}

/** Camino de tierra que sigue el terreno: una cinta suave apoyada sobre la hierba. */
export function Path({ points, width = 0.8, terrain, color = C.path }: { points: [number, number][]; width?: number; terrain: TerrainField; color?: string }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)))
    const samples = curve.getPoints(Math.max(12, points.length * 10))
    const positions: number[] = []
    const indices: number[] = []
    for (let i = 0; i < samples.length; i++) {
      const p = samples[i]
      const next = samples[Math.min(i + 1, samples.length - 1)]
      const prev = samples[Math.max(i - 1, 0)]
      const dir = new THREE.Vector3().subVectors(next, prev).normalize()
      const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(width / 2)
      const ax = p.x + side.x
      const az = p.z + side.z
      const bx = p.x - side.x
      const bz = p.z - side.z
      positions.push(ax, terrain.height(ax, az) + 0.06, az, bx, terrain.height(bx, bz) + 0.06, bz)
      if (i < samples.length - 1) {
        const a = i * 2
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }, [points, width, terrain])
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color={color} roughness={1} side={THREE.DoubleSide} />
    </mesh>
  )
}

/**
 * Mar: fondo profundo lejos, bajío claro junto a la isla y una lámina translúcida con olas
 * low-poly recalculadas cada frame.
 */
export function Water({ palette }: { palette: SeasonPalette }) {
  const mesh = useRef<THREE.Mesh>(null)
  const geometry = useMemo(() => new THREE.PlaneGeometry(220, 220, 88, 88), [])
  const base = useMemo(() => geometry.attributes.position.array.slice() as Float32Array, [geometry])
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const pos = geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let i = 0; i < arr.length; i += 3) {
      const x = base[i]
      const y = base[i + 1]
      arr[i + 2] = Math.sin(x * 0.45 + t * 1.1) * 0.08 + Math.cos(y * 0.38 + t * 0.8 + x * 0.15) * 0.07
    }
    pos.needsUpdate = true
    geometry.computeVertexNormals()
  })
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
        <circleGeometry args={[130, 48]} />
        <meshStandardMaterial color={palette.waterDeep} roughness={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 1]} scale={[1, ISLAND_RZ / ISLAND_RX, 1]}>
        <circleGeometry args={[ISLAND_RX * 1.35, 56]} />
        <meshStandardMaterial color={palette.water} roughness={0.6} />
      </mesh>
      <mesh ref={mesh} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1]} receiveShadow>
        <meshStandardMaterial color={palette.water} roughness={0.22} metalness={0.08} flatShading transparent opacity={0.72} />
      </mesh>
      <Ripple position={[-7, 0.03, 16.5]} delay={0} />
      <Ripple position={[12, 0.03, 15]} delay={1.3} />
      <Ripple position={[-20, 0.03, 4]} delay={2.1} />
      <Ripple position={[20, 0.03, -6]} delay={0.7} />
    </group>
  )
}

/** Onda de espuma que crece y se desvanece junto a la orilla. */
function Ripple({ position, delay }: { position: V3; delay: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const k = ((clock.getElapsedTime() + delay) % 3.2) / 3.2
    ref.current.scale.setScalar(0.6 + k * 1.6)
    ;(ref.current.material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - k)
  })
  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.9, 1.15, 24]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
    </mesh>
  )
}
