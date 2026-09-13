import { useMemo } from 'react'
import * as THREE from 'three'
import { mulberry32 } from '../sim/rng'
import { PATH, ROCK, ROCK_DARK, WOOD, type SeasonPalette } from './palette'

/** Polígono irregular de pocos vértices: la silueta de una meseta. */
function blobShape(radius: number, verts: number, seed: number, squash = 1): THREE.Shape {
  const rng = mulberry32(seed)
  const shape = new THREE.Shape()
  for (let i = 0; i < verts; i++) {
    const a = (i / verts) * Math.PI * 2
    const r = radius * (0.82 + rng() * 0.36)
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r * squash
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  return shape
}

interface TerraceProps {
  radius: number
  height: number
  seed: number
  position: [number, number, number]
  squash?: number
  verts?: number
  topColor: string
  rockColor?: string
}

/** Una meseta: lados de roca facetada y tapa de hierba. */
export function Terrace({ radius, height, seed, position, squash = 1, verts = 10, topColor, rockColor = ROCK }: TerraceProps) {
  const geometry = useMemo(() => {
    const shape = blobShape(radius, verts, seed, squash)
    const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, steps: 1 })
    geo.rotateX(-Math.PI / 2)
    geo.computeVertexNormals()
    return geo
  }, [radius, verts, seed, squash, height])
  const materials = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ color: topColor, flatShading: true, roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ color: rockColor, flatShading: true, roughness: 0.9 }),
    ],
    [topColor, rockColor],
  )
  return <mesh geometry={geometry} material={materials} position={position} receiveShadow castShadow />
}

/** Camino de tierra clara: una cinta plana ligeramente por encima de la hierba. */
export function Path({ points, width = 0.45, y }: { points: [number, number][]; width?: number; y: number }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)))
    const samples = curve.getPoints(Math.max(8, points.length * 6))
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
    <mesh geometry={geometry} position={[0, y + 0.012, 0]} receiveShadow>
      <meshStandardMaterial color={PATH} roughness={1} />
    </mesh>
  )
}

/** Escalera tallada entre dos mesetas. */
export function Stairs({ position, rotation = 0, steps = 6, rise, run = 0.32, width = 0.9 }: {
  position: [number, number, number]
  rotation?: number
  steps?: number
  rise: number
  run?: number
  width?: number
}) {
  const stepH = rise / steps
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {Array.from({ length: steps }, (_, i) => (
        <mesh key={i} position={[0, stepH * (i + 0.5), -run * i]} castShadow receiveShadow>
          <boxGeometry args={[width, stepH, run * 1.05]} />
          <meshStandardMaterial color={i % 2 ? ROCK_DARK : ROCK} flatShading roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

export function Water({ palette }: { palette: SeasonPalette }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[40, 48]} />
        <meshStandardMaterial color={palette.water} roughness={0.35} metalness={0.05} />
      </mesh>
      {/* Orla de espuma pegada a la roca */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.3, 0.01, 0.2]}>
        <ringGeometry args={[6.6, 7.4, 40]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.28} roughness={1} />
      </mesh>
    </group>
  )
}

/** Embarcadero de madera con una barca amarrada. */
export function Pier({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.34, 0]} castShadow>
        <boxGeometry args={[0.9, 0.08, 2.8]} />
        <meshStandardMaterial color={WOOD} roughness={1} />
      </mesh>
      {[-1, 0, 1].map((z) =>
        [-0.38, 0.38].map((x) => (
          <mesh key={`${x}-${z}`} position={[x, 0.2, z]} castShadow>
            <boxGeometry args={[0.1, 0.5, 0.1]} />
            <meshStandardMaterial color="#7a5230" roughness={1} />
          </mesh>
        )),
      )}
      {/* barca */}
      <group position={[0.95, 0.12, 0.6]} rotation={[0, 0.3, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.22, 1.1]} />
          <meshStandardMaterial color="#c9553f" flatShading roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[0.36, 0.04, 0.95]} />
          <meshStandardMaterial color={WOOD} roughness={1} />
        </mesh>
      </group>
    </group>
  )
}
