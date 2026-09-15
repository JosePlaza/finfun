/**
 * VEGETACIÓN Y ROCAS del mundo. Estilizadas, baratas y reutilizables.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32 } from '../../sim/rng'
import { C, type SeasonPalette } from '../palette'
import { Mat } from './Parts'

type V3 = [number, number, number]

/** Palmera: tronco curvado por tramos y corona de hojas facetadas. */
export function Palm({ position, h = 3, lean = 0.25, rotation = 0, palette, scale = 1 }: { position: V3; h?: number; lean?: number; rotation?: number; palette: SeasonPalette; scale?: number }) {
  const segments = 5
  const leaves = 7
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      {Array.from({ length: segments }, (_, i) => {
        const t = i / segments
        const y = t * h
        const x = Math.sin(t * 1.2) * lean * h * 0.35
        return (
          <mesh key={i} position={[x, y + h / segments / 2, 0]} rotation={[0, 0, -lean * 0.5 * (1 - t)]} castShadow>
            <cylinderGeometry args={[0.1 - t * 0.03, 0.13 - t * 0.03, h / segments + 0.08, 6]} />
            <Mat color={i % 2 ? C.woodLight : C.wood} flat />
          </mesh>
        )
      })}
      <group position={[Math.sin(1.2) * lean * h * 0.35, h + 0.05, 0]}>
        {Array.from({ length: leaves }, (_, i) => {
          const a = (i / leaves) * Math.PI * 2
          return (
            <mesh key={i} rotation={[0, a, 0]} castShadow>
              <mesh position={[0.75, 0.05, 0]} rotation={[0, 0, -0.55]} scale={[1, 0.12, 0.42]}>
                <coneGeometry args={[0.5, 1.7, 4]} />
                <Mat color={palette.palm} flat />
              </mesh>
            </mesh>
          )
        })}
        {[0, 2.1, 4.2].map((a) => (
          <mesh key={a} position={[Math.cos(a) * 0.18, -0.12, Math.sin(a) * 0.18]}>
            <sphereGeometry args={[0.11, 6, 5]} />
            <Mat color={C.woodDark} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** Arbusto redondeado, con flores en primavera. */
export function Bush({ position, scale = 1, palette, color }: { position: V3; scale?: number; palette: SeasonPalette; color?: string }) {
  const c = color ?? palette.bush
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <dodecahedronGeometry args={[0.38, 0]} />
        <Mat color={c} flat />
      </mesh>
      <mesh position={[0.28, 0.22, 0.12]} castShadow>
        <dodecahedronGeometry args={[0.26, 0]} />
        <Mat color={c} flat />
      </mesh>
      <mesh position={[-0.22, 0.2, -0.16]} castShadow>
        <dodecahedronGeometry args={[0.22, 0]} />
        <Mat color={c} flat />
      </mesh>
      {palette.flowers &&
        [[-0.1, 0.62, 0.2, C.flowerPink], [0.3, 0.5, 0.3, C.flowerYellow]].map(([x, y, z, col], i) => (
          <mesh key={i} position={[x as number, y as number, z as number]}>
            <sphereGeometry args={[0.06, 5, 4]} />
            <Mat color={col as string} />
          </mesh>
        ))}
    </group>
  )
}

/** Macizo de flores: tallos con cabezas de colores. */
export function Flowers({ position, count = 5, seed = 1, scale = 1 }: { position: V3; count?: number; seed?: number; scale?: number }) {
  const items = useMemo(() => {
    const rng = mulberry32(seed)
    const colors = [C.flowerPink, C.flowerYellow, C.flowerRed, C.white]
    return Array.from({ length: count }, () => ({
      x: (rng() - 0.5) * 0.7,
      z: (rng() - 0.5) * 0.7,
      h: 0.18 + rng() * 0.18,
      c: colors[Math.floor(rng() * colors.length)],
    }))
  }, [count, seed])
  return (
    <group position={position} scale={scale}>
      {items.map((f, i) => (
        <group key={i} position={[f.x, 0, f.z]}>
          <mesh position={[0, f.h / 2, 0]}>
            <cylinderGeometry args={[0.015, 0.02, f.h, 4]} />
            <Mat color="#4f9f44" />
          </mesh>
          <mesh position={[0, f.h + 0.04, 0]}>
            <dodecahedronGeometry args={[0.055, 0]} />
            <Mat color={f.c} flat />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Matas de hierba alta: tres conos finos. */
export function GrassTuft({ position, palette, scale = 1 }: { position: V3; palette: SeasonPalette; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {[[-0.08, 0.28, 0.2], [0.06, 0.34, -0.15], [0.1, 0.26, 0.1]].map(([x, h, r], i) => (
        <mesh key={i} position={[x, h / 2, 0]} rotation={[0, 0, r]}>
          <coneGeometry args={[0.05, h, 4]} />
          <Mat color={palette.foliage} flat />
        </mesh>
      ))}
    </group>
  )
}

/** Roca redondeada de facetas visibles. */
export function Rock({ position, size = 0.6, color = C.rock, seed = 1, rotation }: { position: V3; size?: number; color?: string; seed?: number; rotation?: V3 }) {
  const rng = mulberry32(seed)
  const sx = 0.8 + rng() * 0.6
  const sy = 0.55 + rng() * 0.45
  const sz = 0.8 + rng() * 0.6
  const rot: V3 = rotation ?? [rng() * 0.6, rng() * Math.PI, rng() * 0.6]
  return (
    <mesh position={[position[0], position[1] + size * sy * 0.45, position[2]]} rotation={rot} scale={[sx, sy, sz]} castShadow receiveShadow>
      <dodecahedronGeometry args={[size, 0]} />
      <Mat color={color} flat />
    </mesh>
  )
}

/** Grupo de rocas: una grande y varias pequeñas alrededor. */
export function RockCluster({ position, size = 1, seed = 1, count = 4 }: { position: V3; size?: number; seed?: number; count?: number }) {
  const rocks = useMemo(() => {
    const rng = mulberry32(seed)
    return Array.from({ length: count }, (_, i) => {
      const a = rng() * Math.PI * 2
      const d = i === 0 ? 0 : size * (0.7 + rng() * 0.6)
      return { x: Math.cos(a) * d, z: Math.sin(a) * d, s: i === 0 ? size : size * (0.3 + rng() * 0.35), c: rng() > 0.5 ? C.rock : C.rockLight, seed: seed + i * 17 }
    })
  }, [size, seed, count])
  return (
    <group position={position}>
      {rocks.map((r, i) => (
        <Rock key={i} position={[r.x, 0, r.z]} size={r.s} color={r.c} seed={r.seed} />
      ))}
    </group>
  )
}

/** Bellota recogible: flota y gira despacio para llamar la atención. */
export function Acorn({ position, onPick }: { position: V3; onPick: () => void }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    // Flota claramente por encima de la hierba: la malla del terreno tiene facetas y nunca debe taparla.
    ref.current.position.y = position[1] + 0.35 + Math.sin(t * 2.4 + position[0]) * 0.06
    ref.current.rotation.y = t * 0.8
  })
  return (
    <group
      ref={ref}
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        onPick()
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      {/* zona de toque generosa (dedo en móvil); userData.acorn le da prioridad sobre los edificios */}
      <mesh visible={false} userData={{ acorn: true }}>
        <sphereGeometry args={[0.8, 6, 6]} />
        <meshBasicMaterial />
      </mesh>
      <mesh castShadow>
        <sphereGeometry args={[0.16, 8, 6]} />
        <Mat color="#8a5a2b" rough={0.6} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <sphereGeometry args={[0.14, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Mat color="#5c3d1e" />
      </mesh>
      <mesh position={[0, 0.26, 0]}>
        <cylinderGeometry args={[0.02, 0.03, 0.08, 5]} />
        <Mat color={C.wood} />
      </mesh>
      {/* brillo para que se distinga entre la hierba */}
      <mesh position={[0, -0.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.26, 0.36, 16]} />
        <meshBasicMaterial color={C.gold} transparent opacity={0.55} depthWrite={false} />
      </mesh>
    </group>
  )
}
