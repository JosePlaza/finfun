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

export function Scooter({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.06, 10]} />
          <Mat color="#2b2b2b" />
        </mesh>
      ))}
      <Box size={[0.55, 0.04, 0.14]} position={[0, 0.16, 0]} color={C.roofRed} />
      <Box size={[0.04, 0.8, 0.04]} position={[0.3, 0.55, 0]} rotation={[0, 0, -0.15]} color={C.metal} />
      <Box size={[0.05, 0.05, 0.36]} position={[0.36, 0.94, 0]} color="#2b2b2b" />
    </group>
  )
}

export function Tent({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.55, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[0.8, 0.8, 1.4]} />
        <Mat color={C.roofOrange} flat />
      </mesh>
      {/* suelo y puerta */}
      <Box size={[1.2, 0.04, 1.5]} position={[0, 0.02, 0]} color="#b85a2a" />
      <mesh position={[0, 0.3, 0.71]}>
        <coneGeometry args={[0.26, 0.55, 3]} />
        <Mat color="#3a3633" />
      </mesh>
    </group>
  )
}

export function Swing({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  const seat = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (seat.current) seat.current.rotation.x = Math.sin(clock.getElapsedTime() * 1.6) * 0.45
  })
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-0.7, 0.7].map((x) => (
        <group key={x}>
          <Box size={[0.08, 2.0, 0.08]} position={[x, 1.0, 0.35]} rotation={[-0.34, 0, 0]} color={C.wood} />
          <Box size={[0.08, 2.0, 0.08]} position={[x, 1.0, -0.35]} rotation={[0.34, 0, 0]} color={C.wood} />
        </group>
      ))}
      <Box size={[1.6, 0.08, 0.08]} position={[0, 1.95, 0]} color={C.woodDark} />
      <group ref={seat} position={[0, 1.95, 0]}>
        {[-0.22, 0.22].map((x) => (
          <Box key={x} size={[0.02, 1.3, 0.02]} position={[x, -0.65, 0]} color={C.metal} />
        ))}
        <Box size={[0.6, 0.05, 0.22]} position={[0, -1.3, 0]} color={C.roofRed} />
      </group>
    </group>
  )
}

export function Canoe({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.position.y = position[1] + Math.sin(t * 1.4) * 0.04
    ref.current.rotation.z = Math.sin(t * 1.1) * 0.05
  })
  return (
    <group ref={ref} position={position} rotation={[0, rotation, 0]}>
      <mesh scale={[1, 0.45, 0.32]} castShadow>
        <sphereGeometry args={[1.1, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <Mat color={C.roofRed} flat />
      </mesh>
      <Box size={[1.6, 0.04, 0.5]} position={[0, 0.02, 0]} color={C.woodLight} />
      <Box size={[0.04, 0.04, 1.3]} position={[0.3, 0.12, 0]} rotation={[0, 0, 0.5]} color={C.wood} />
    </group>
  )
}
