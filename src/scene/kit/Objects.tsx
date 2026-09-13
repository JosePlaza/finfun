/** OBJETOS COMPRADOS en la tienda: aparecen en la isla al comprarlos. */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { C } from '../palette'
import { Box, Mat } from './Parts'

type V3 = [number, number, number]

export function Kite({ position }: { position: V3 }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.position.x = position[0] + Math.sin(t * 0.7) * 0.5
    ref.current.position.y = position[1] + 2.8 + Math.sin(t * 1.1) * 0.3
    ref.current.rotation.z = Math.sin(t * 0.9) * 0.3
  })
  return (
    <group>
      <group ref={ref} position={[position[0], position[1] + 2.8, position[2]]}>
        <mesh rotation={[0, 0, Math.PI / 4]} castShadow>
          <planeGeometry args={[0.7, 0.7]} />
          <meshStandardMaterial color={C.roofOrange} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.7, 0]}>
          <boxGeometry args={[0.03, 0.9, 0.03]} />
          <meshStandardMaterial color={C.flowerYellow} />
        </mesh>
      </group>
      <mesh position={[position[0], position[1] + 0.06, position[2]]}>
        <cylinderGeometry args={[0.07, 0.09, 0.12, 6]} />
        <Mat color={C.wood} />
      </mesh>
    </group>
  )
}

export function Ball({ position }: { position: V3 }) {
  return (
    <mesh position={[position[0], position[1] + 0.2, position[2]]} castShadow>
      <dodecahedronGeometry args={[0.2, 0]} />
      <Mat color={C.white} flat />
    </mesh>
  )
}

export function Bike({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-0.36, 0.36].map((x) => (
        <mesh key={x} position={[x, 0.24, 0]} castShadow>
          <torusGeometry args={[0.22, 0.035, 6, 14]} />
          <Mat color={C.metal} />
        </mesh>
      ))}
      <Box size={[0.6, 0.05, 0.05]} position={[0, 0.44, 0]} rotation={[0, 0, 0.35]} color={C.roofBlue} />
      <Box size={[0.22, 0.05, 0.14]} position={[-0.06, 0.6, 0]} color={C.metal} />
      <Box size={[0.05, 0.05, 0.34]} position={[0.36, 0.6, 0]} color={C.roofBlue} />
    </group>
  )
}

export function Telescope({ position }: { position: V3 }) {
  return (
    <group position={position}>
      {[0, 2.1, 4.2].map((a) => (
        <mesh key={a} position={[Math.cos(a) * 0.2, 0.38, Math.sin(a) * 0.2]} rotation={[Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35]}>
          <cylinderGeometry args={[0.02, 0.02, 0.76, 5]} />
          <Mat color={C.metal} />
        </mesh>
      ))}
      <mesh position={[0, 0.85, 0]} rotation={[0.9, 0, 0.4]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 0.75, 8]} />
        <Mat color={C.white} />
      </mesh>
    </group>
  )
}
