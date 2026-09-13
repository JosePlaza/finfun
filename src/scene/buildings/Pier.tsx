import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { C } from '../palette'
import { Barrel, Box, Crate, Label, Mat, Sack, TapZone } from '../kit/Parts'

type V3 = [number, number, number]

/** Embarcadero de madera sobre pilotes. Se extiende hacia +Z local. */
export function Pier({ position, rotation = 0, length = 4 }: { position: V3; rotation?: number; length?: number }) {
  const piles = Math.round(length / 1.1) + 1
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box size={[1.3, 0.1, length]} position={[0, 0.42, length / 2]} color={C.woodLight} />
      {Array.from({ length: Math.round(length / 0.32) }, (_, i) => (
        <Box key={i} size={[1.32, 0.02, 0.06]} position={[0, 0.48, i * 0.32 + 0.16]} color={C.wood} />
      ))}
      {Array.from({ length: piles }, (_, i) =>
        [-0.55, 0.55].map((x) => (
          <mesh key={`${i}-${x}`} position={[x, 0.15, (length / (piles - 1)) * i]} castShadow>
            <cylinderGeometry args={[0.07, 0.08, 0.75, 6]} />
            <Mat color={C.woodDark} />
          </mesh>
        )),
      )}
      {/* farol al final */}
      <Box size={[0.08, 1.1, 0.08]} position={[0.55, 1.0, length - 0.2]} color={C.woodDark} />
      <mesh position={[0.55, 1.6, length - 0.2]}>
        <boxGeometry args={[0.18, 0.24, 0.18]} />
        <Mat color="#ffd27a" emissive={C.lantern} emissiveIntensity={0.8} rough={0.3} />
      </mesh>
      {/* bolardo con cuerda */}
      <mesh position={[-0.5, 0.65, length - 0.4]}>
        <cylinderGeometry args={[0.08, 0.1, 0.4, 6]} />
        <Mat color={C.woodDark} />
      </mesh>
    </group>
  )
}

/** Bote de remos amarrado al muelle: se balancea con el agua. Pura vida para la escena. */
export function Rowboat({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.rotation.z = Math.sin(t * 1.3) * 0.05
    ref.current.rotation.x = Math.sin(t * 0.9 + 0.5) * 0.03
    ref.current.position.y = position[1] + Math.sin(t * 1.5) * 0.035
  })
  return (
    <group ref={ref} position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.18, 0]} scale={[1, 0.5, 1.9]} castShadow>
        <cylinderGeometry args={[0.5, 0.3, 0.5, 7]} />
        <Mat color={C.roofRed} flat />
      </mesh>
      <Box size={[0.8, 0.05, 1.7]} position={[0, 0.36, 0]} color={C.woodLight} />
      <Box size={[0.7, 0.06, 0.16]} position={[0, 0.44, 0.3]} color={C.wood} />
      <Box size={[0.7, 0.06, 0.16]} position={[0, 0.44, -0.4]} color={C.wood} />
      {/* remos */}
      <mesh position={[0.55, 0.42, 0.1]} rotation={[0, 0.3, 0.5]}>
        <cylinderGeometry args={[0.025, 0.03, 1.4, 5]} />
        <Mat color={C.woodLight} />
      </mesh>
      <mesh position={[-0.5, 0.42, -0.1]} rotation={[0, -0.3, -0.5]}>
        <cylinderGeometry args={[0.025, 0.03, 1.4, 5]} />
        <Mat color={C.woodLight} />
      </mesh>
      {/* cuerda hacia el muelle */}
      <mesh position={[-0.55, 0.5, 0.6]} rotation={[0, 0, 1.2]}>
        <cylinderGeometry args={[0.012, 0.012, 1.0, 4]} />
        <Mat color={C.plasterWarm} />
      </mesh>
    </group>
  )
}

/**
 * LA BARCA MERCANTE · amarrada al muelle, carga cajas, barriles y sacos: es la TIENDA del juego.
 * Se balancea suavemente con el agua.
 */
export function MerchantBoat({ position, rotation = 0, onTap }: { position: V3; rotation?: number; onTap: () => void }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.rotation.z = Math.sin(t * 0.9) * 0.03
    ref.current.rotation.x = Math.sin(t * 0.7 + 1) * 0.02
    ref.current.position.y = position[1] + Math.sin(t * 1.1) * 0.03
  })
  const sail = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (sail.current) sail.current.rotation.y = Math.sin(clock.getElapsedTime() * 1.6) * 0.12
  })
  return (
    <group ref={ref} position={position} rotation={[0, rotation, 0]}>
      <TapZone size={[2.4, 3.4, 4]} onTap={onTap}>
        {/* casco */}
        <mesh position={[0, 0.25, 0]} scale={[1, 0.55, 1.7]} castShadow>
          <cylinderGeometry args={[0.85, 0.55, 0.6, 8]} />
          <Mat color={C.roofRed} flat />
        </mesh>
        <Box size={[1.5, 0.08, 2.6]} position={[0, 0.5, 0]} color={C.woodLight} />
        <Box size={[1.7, 0.1, 0.12]} position={[0, 0.58, 1.3]} color={C.woodDark} />
        <Box size={[1.7, 0.1, 0.12]} position={[0, 0.58, -1.3]} color={C.woodDark} />
        {/* mástil y vela */}
        <mesh position={[0, 1.8, -0.4]} castShadow>
          <cylinderGeometry args={[0.05, 0.07, 2.6, 6]} />
          <Mat color={C.woodDark} />
        </mesh>
        <mesh ref={sail} position={[0, 2.0, -0.4]}>
          <mesh position={[0.5, 0, 0]}>
            <planeGeometry args={[1.0, 1.4]} />
            <meshStandardMaterial color={C.white} side={THREE.DoubleSide} roughness={0.9} />
          </mesh>
          <mesh position={[0.5, 0, 0.01]}>
            <planeGeometry args={[1.0, 0.3]} />
            <meshStandardMaterial color={C.roofOrange} side={THREE.DoubleSide} roughness={0.9} />
          </mesh>
        </mesh>
        {/* mercancía */}
        <Crate position={[-0.35, 0.54, 0.5]} size={0.42} rotation={0.2} />
        <Crate position={[0.1, 0.54, 0.75]} size={0.34} rotation={-0.3} />
        <Crate position={[-0.35, 0.96, 0.5]} size={0.3} rotation={0.5} />
        <Barrel position={[0.4, 0.54, 0.1]} h={0.5} r={0.2} />
        <Sack position={[-0.3, 0.54, -0.1]} />
        <Sack position={[0.35, 0.54, -0.6]} />
        <Box size={[0.9, 0.08, 0.5]} position={[0, 0.58, -0.9]} color={C.wood} />
      </TapZone>
      <Label text="Barca mercante" sub="trae la mercancía de la tienda" y={3.2} />
    </group>
  )
}
