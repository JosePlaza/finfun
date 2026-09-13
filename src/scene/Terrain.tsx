/**
 * TERRENO. La isla se compone de mesetas naturales (Terrace) apiladas en tres niveles,
 * con roca redondeada en los bordes, playas de arena, caminos y escaleras talladas.
 */
import { useMemo } from 'react'
import * as THREE from 'three'
import { mulberry32 } from '../sim/rng'
import { C, type SeasonPalette } from './palette'
import { Mat } from './kit/Parts'
import { Rock } from './kit/Nature'

type V3 = [number, number, number]

/** Puntos de una silueta irregular y redondeada (una meseta vista desde arriba). */
export function blobPoints(radius: number, verts: number, seed: number, squash = 1): [number, number][] {
  const rng = mulberry32(seed)
  const pts: [number, number][] = []
  for (let i = 0; i < verts; i++) {
    const a = (i / verts) * Math.PI * 2
    const r = radius * (0.84 + rng() * 0.32)
    pts.push([Math.cos(a) * r, Math.sin(a) * r * squash])
  }
  return pts
}

function shapeFrom(points: [number, number][]): THREE.Shape {
  // Curva suave que pasa por los puntos: bordes redondeados, no poligonales.
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, 'centripetal')
  const smooth = curve.getPoints(points.length * 4)
  const shape = new THREE.Shape()
  smooth.forEach((p, i) => (i === 0 ? shape.moveTo(p.x, p.y) : shape.lineTo(p.x, p.y)))
  shape.closePath()
  return shape
}

interface TerraceProps {
  radius: number
  height: number
  seed: number
  position: V3
  squash?: number
  verts?: number
  topColor: string
  sideColor?: string
  /** Rocas redondeadas alrededor del borde, para que el acantilado parezca natural. */
  boulders?: boolean
  boulderSize?: number
}

export function Terrace({ radius, height, seed, position, squash = 1, verts = 12, topColor, sideColor = C.rock, boulders = true, boulderSize = 0.7 }: TerraceProps) {
  const points = useMemo(() => blobPoints(radius, verts, seed, squash), [radius, verts, seed, squash])
  const geometry = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(shapeFrom(points), { depth: height, bevelEnabled: false, steps: 1 })
    geo.rotateX(-Math.PI / 2)
    geo.computeVertexNormals()
    return geo
  }, [points, height])
  const materials = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ color: sideColor, flatShading: true, roughness: 0.9 }),
    ],
    [topColor, sideColor],
  )
  const ring = useMemo(() => {
    if (!boulders) return []
    const rng = mulberry32(seed + 99)
    return points
      .filter(() => rng() > 0.35)
      .map(([x, z], i) => ({ x: x * 0.97, z: -z * 0.97, s: boulderSize * (0.6 + rng() * 0.7), seed: seed + i * 7, c: rng() > 0.5 ? C.rock : C.rockLight }))
  }, [points, boulders, boulderSize, seed])
  return (
    <group position={position}>
      <mesh geometry={geometry} material={materials} receiveShadow castShadow />
      {ring.map((b, i) => (
        <Rock key={i} position={[b.x, height * 0.55 - b.s * 0.5, b.z]} size={b.s} color={b.c} seed={b.seed} />
      ))}
    </group>
  )
}

/** Playa de arena: una meseta bajita de arena con el borde mojado. */
export function Beach({ radius, seed, position, squash = 1 }: { radius: number; seed: number; position: V3; squash?: number }) {
  return (
    <group>
      <Terrace radius={radius * 1.15} height={0.18} seed={seed} position={position} squash={squash} topColor={C.sandWet} sideColor={C.sandWet} boulders={false} />
      <Terrace radius={radius} height={0.32} seed={seed} position={position} squash={squash} topColor={C.sand} sideColor={C.sand} boulders={false} />
    </group>
  )
}

/** Camino de tierra: una cinta suave que sigue puntos de control. */
export function Path({ points, width = 0.7, y, color = C.path }: { points: [number, number][]; width?: number; y: number; color?: string }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)))
    const samples = curve.getPoints(Math.max(10, points.length * 8))
    const positions: number[] = []
    const indices: number[] = []
    for (let i = 0; i < samples.length; i++) {
      const p = samples[i]
      const next = samples[Math.min(i + 1, samples.length - 1)]
      const prev = samples[Math.max(i - 1, 0)]
      const dir = new THREE.Vector3().subVectors(next, prev).normalize()
      const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(width / 2)
      positions.push(p.x + side.x, 0, p.z + side.z, p.x - side.x, 0, p.z - side.z)
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
  }, [points, width])
  return (
    <mesh geometry={geometry} position={[0, y + 0.015, 0]} receiveShadow>
      <meshStandardMaterial color={color} roughness={1} side={THREE.DoubleSide} />
    </mesh>
  )
}

/** Escalera tallada en la roca entre dos niveles. Sube hacia -Z local. */
export function Stairs({ position, rotation = 0, rise, run = 0.34, width = 1.3, steps }: { position: V3; rotation?: number; rise: number; run?: number; width?: number; steps?: number }) {
  const n = steps ?? Math.max(3, Math.round(rise / 0.22))
  const stepH = rise / n
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[0, stepH * (i + 0.5), -run * i]} castShadow receiveShadow>
          <boxGeometry args={[width, stepH, run * 1.08]} />
          <Mat color={i % 2 ? C.rockLight : C.stone} flat />
        </mesh>
      ))}
    </group>
  )
}

/** Mar en dos tonos: profundo lejos, claro y luminoso junto a la isla. */
export function Water({ palette }: { palette: SeasonPalette }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[60, 48]} />
        <meshStandardMaterial color={palette.waterDeep} roughness={0.3} metalness={0.05} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.5, 0, 3.5]} receiveShadow>
        <circleGeometry args={[21, 48]} />
        <meshStandardMaterial color={palette.water} roughness={0.25} metalness={0.05} transparent opacity={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.5, 0.01, 3.5]}>
        <ringGeometry args={[20.2, 21.4, 56]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.22} roughness={1} />
      </mesh>
    </group>
  )
}
