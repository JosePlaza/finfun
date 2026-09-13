import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { C, type SeasonPalette } from '../palette'
import { Box, FloatingCoin, Label, Lantern, Mat, TapZone } from '../kit/Parts'
import { Bush, Flowers, GrassTuft, Rock } from '../kit/Nature'

type V3 = [number, number, number]

/** El cofre del tesoro: aquí vive el ahorro. La tapa se abre cuando hay algo dentro. */
export function Chest({ position = [0, 0, 0], rotation = 0, open, cents }: { position?: V3; rotation?: number; open: boolean; cents: number }) {
  const lid = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (!lid.current) return
    const target = open ? -1.15 : 0
    lid.current.rotation.x += (target - lid.current.rotation.x) * Math.min(1, dt * 4)
  })
  const W = 0.9
  const D = 0.6
  const H = 0.5
  const coins = Math.min(5, Math.ceil(cents / 50_00))
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box size={[W, H, D]} position={[0, H / 2, 0]} color={C.chestBrown} />
      {[-0.3, 0.3].map((x) => (
        <Box key={x} size={[0.08, H + 0.02, D + 0.04]} position={[x, H / 2, 0]} color={C.gold} />
      ))}
      <Box size={[0.16, 0.16, 0.05]} position={[0, H - 0.05, D / 2 + 0.02]} color={C.gold} />
      <group ref={lid} position={[0, H, -D / 2]}>
        <mesh position={[0, 0, D / 2]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[D / 2, D / 2, W, 10, 1, false, 0, Math.PI]} />
          <Mat color={C.chestBrown} />
        </mesh>
        {[-0.3, 0.3].map((x) => (
          <mesh key={x} position={[x, 0, D / 2]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[D / 2 + 0.02, D / 2 + 0.02, 0.08, 10, 1, false, 0, Math.PI]} />
            <Mat color={C.gold} />
          </mesh>
        ))}
      </group>
      {open && cents > 0 && (
        <>
          <mesh position={[0, H + 0.02, 0]} scale={[1.2, 0.35, 0.8]}>
            <dodecahedronGeometry args={[0.32, 0]} />
            <Mat color={C.gold} rough={0.35} flat />
          </mesh>
          {Array.from({ length: coins }, (_, i) => (
            <FloatingCoin key={i} index={i} base={H + 0.45} radius={0.15} />
          ))}
        </>
      )}
    </group>
  )
}

/**
 * LA CUEVA DEL TESORO · formación rocosa natural con una boca iluminada por farolillos
 * y un cofre dentro. Es la hucha del juego: aquí se guarda lo que no está colocado.
 * La boca mira hacia +Z.
 */
export function Cave({ position, rotation = 0, palette, cents, onTap }: { position: V3; rotation?: number; palette: SeasonPalette; cents: number; onTap: () => void }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <TapZone size={[5, 3.6, 4.4]} onTap={onTap}>
        {/* Interior oscuro y cálido */}
        <mesh position={[0, 0.95, -0.7]}>
          <boxGeometry args={[2.2, 1.9, 2.2]} />
          <Mat color={C.caveDark} />
        </mesh>
        <pointLight position={[0, 1.2, 0.2]} color={C.lantern} intensity={5} distance={5} decay={2} />

        {/* Boca: arco de roca */}
        <mesh position={[0, 0.6, 0.7]} rotation={[0, 0, 0]} castShadow>
          <torusGeometry args={[1.15, 0.38, 6, 12, Math.PI]} />
          <Mat color={C.rockDark} flat />
        </mesh>

        {/* Montículo de rocas que forma la cueva */}
        <Rock position={[-1.5, 0, -0.3]} size={1.0} seed={31} color={C.rock} />
        <Rock position={[1.6, 0, -0.4]} size={0.95} seed={32} color={C.rockLight} />
        <Rock position={[0, 1.4, -1.0]} size={1.15} seed={33} color={C.rock} />
        <Rock position={[-0.9, 1.2, -1.5]} size={0.8} seed={34} color={C.rockDark} />
        <Rock position={[1.0, 1.3, -1.5]} size={0.75} seed={35} color={C.rockLight} />
        <Rock position={[0.2, 0, -2.0]} size={1.1} seed={36} color={C.rock} />
        <Rock position={[-2.0, 0, 0.9]} size={0.45} seed={37} />
        <Rock position={[2.1, 0, 0.8]} size={0.4} seed={38} color={C.rockLight} />

        {/* Puntal de madera y farolillos */}
        <Box size={[0.14, 1.9, 0.14]} position={[-1.05, 0.95, 1.1]} color={C.woodDark} />
        <Box size={[0.14, 1.9, 0.14]} position={[1.05, 0.95, 1.1]} color={C.woodDark} />
        <Box size={[2.4, 0.16, 0.16]} position={[0, 1.95, 1.1]} color={C.woodDark} />
        <Lantern position={[-1.55, 0, 1.3]} lit h={1.4} />
        <Lantern position={[1.25, 0, 1.3]} lit h={1.4} />

        {/* El cofre */}
        <Chest position={[0, 0.02, -0.1]} open={cents > 0} cents={cents} />
      </TapZone>

      {/* Vegetación entre las rocas */}
      <Bush position={[-2.4, 0, 0.2]} palette={palette} scale={0.7} />
      <Bush position={[2.4, 0, -0.9]} palette={palette} scale={0.8} />
      <GrassTuft position={[-1.6, 0, 1.6]} palette={palette} />
      <GrassTuft position={[1.9, 0, 1.5]} palette={palette} scale={0.8} />
      <Flowers position={[-0.9, 0, 2.1]} seed={41} count={4} />
      <Flowers position={[1.4, 0, 2.2]} seed={43} count={3} />

      <Label text="Cofre" amount={(cents / 100).toLocaleString('es-ES', { maximumFractionDigits: 2 })} y={2.9} />
    </group>
  )
}
