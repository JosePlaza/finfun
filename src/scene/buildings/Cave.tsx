import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { C, type SeasonPalette } from '../palette'
import { Box, FloatingCoin, Label, Lantern, Mat, TapZone } from '../kit/Parts'
import { Bush, Flowers, GrassTuft, Palm, Rock } from '../kit/Nature'

type V3 = [number, number, number]

/** El cofre del tesoro: aquí vive el ahorro. La tapa se abre cuando hay algo dentro. */
export function Chest({ position = [0, 0, 0], rotation = 0, open, cents }: { position?: V3; rotation?: number; open: boolean; cents: number }) {
  const lid = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (!lid.current) return
    const target = open ? -1.15 : 0
    lid.current.rotation.x += (target - lid.current.rotation.x) * Math.min(1, dt * 4)
  })
  const W = 1.0
  const D = 0.66
  const H = 0.55
  const coins = Math.min(5, Math.ceil(cents / 50_00))
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box size={[W, H, D]} position={[0, H / 2, 0]} color={C.chestBrown} />
      {[-0.34, 0.34].map((x) => (
        <Box key={x} size={[0.08, H + 0.02, D + 0.04]} position={[x, H / 2, 0]} color={C.gold} />
      ))}
      <Box size={[0.18, 0.18, 0.05]} position={[0, H - 0.06, D / 2 + 0.02]} color={C.gold} />
      <group ref={lid} position={[0, H, -D / 2]}>
        <mesh position={[0, 0, D / 2]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[D / 2, D / 2, W, 10, 1, false, 0, Math.PI]} />
          <Mat color={C.chestBrown} />
        </mesh>
        {[-0.34, 0.34].map((x) => (
          <mesh key={x} position={[x, 0, D / 2]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[D / 2 + 0.02, D / 2 + 0.02, 0.08, 10, 1, false, 0, Math.PI]} />
            <Mat color={C.gold} />
          </mesh>
        ))}
      </group>
      {open && cents > 0 && (
        <>
          <mesh position={[0, H + 0.02, 0]} scale={[1.2, 0.35, 0.8]}>
            <dodecahedronGeometry args={[0.36, 0]} />
            <Mat color={C.gold} rough={0.35} flat emissive={C.goldDark} emissiveIntensity={0.25} />
          </mesh>
          {Array.from({ length: coins }, (_, i) => (
            <FloatingCoin key={i} index={i} base={H + 0.5} radius={0.16} />
          ))}
        </>
      )}
    </group>
  )
}

/**
 * LA CUEVA DEL TESORO · un montículo de roca natural con una boca oscura y cálida, puntal de
 * madera, farolillos y el cofre visible al fondo. Es la hucha del juego. La boca mira hacia +Z.
 */
export function Cave({ position, rotation = 0, palette, cents, onTap }: { position: V3; rotation?: number; palette: SeasonPalette; cents: number; onTap: () => void }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <TapZone size={[7, 4.6, 6.5]} onTap={onTap}>
        {/* Túnel: un cilindro abierto, oscuro por dentro, que se mete en el montículo */}
        <mesh position={[0, 1.1, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.25, 1.25, 3.2, 12, 1, true]} />
          <meshStandardMaterial color={C.caveDark} side={THREE.BackSide} roughness={1} />
        </mesh>
        {/* fondo del túnel */}
        <mesh position={[0, 1.1, -2.2]}>
          <circleGeometry args={[1.26, 12]} />
          <meshStandardMaterial color="#2a1f19" roughness={1} />
        </mesh>
        {/* suelo interior */}
        <Box size={[2.3, 0.1, 3.2]} position={[0, 0.02, -0.6]} color="#4a3a2e" flat />
        <pointLight position={[0, 1.4, 0.4]} color={C.lantern} intensity={7} distance={6} decay={2} />
        <pointLight position={[0, 0.9, -1.4]} color={C.lantern} intensity={3} distance={4} decay={2} />

        {/* El montículo: rocas grandes que envuelven el túnel (dejan libre la boca en +Z) */}
        <Rock position={[-1.9, 0, -0.4]} size={1.7} seed={31} color={C.rock} rotation={[0.1, 0.4, 0.15]} />
        <Rock position={[1.9, 0, -0.5]} size={1.6} seed={32} color={C.rockLight} rotation={[0.2, -0.3, -0.1]} />
        <Rock position={[0, 1.9, -1.0]} size={2.1} seed={33} color={C.rock} rotation={[0.3, 0.2, 0.1]} />
        <Rock position={[-1.3, 1.5, -2.0]} size={1.5} seed={34} color={C.rockDark} rotation={[0, 0.8, 0.2]} />
        <Rock position={[1.4, 1.6, -2.1]} size={1.4} seed={35} color={C.rockLight} rotation={[0.2, 1.1, 0]} />
        <Rock position={[0.2, 0.2, -3.0]} size={1.9} seed={36} color={C.rock} rotation={[0.1, 0.5, 0.1]} />
        <Rock position={[-2.6, 0, -2.2]} size={1.2} seed={37} color={C.rockLight} />
        <Rock position={[2.7, 0, -2.0]} size={1.1} seed={38} color={C.rock} />
        {/* dintel de roca sobre la boca */}
        <Rock position={[0, 2.75, -0.3]} size={1.25} seed={39} color={C.rockLight} rotation={[0.9, 0.3, 0.2]} />
        <Rock position={[-1.8, 1.4, 0.2]} size={0.85} seed={40} color={C.rock} />
        <Rock position={[1.9, 1.3, 0.2]} size={0.8} seed={41} color={C.rockDark} />
        {/* piedrecitas en la entrada */}
        <Rock position={[-1.9, 0, 1.9]} size={0.4} seed={42} color={C.rockLight} />
        <Rock position={[2.1, 0, 1.7]} size={0.35} seed={43} color={C.rock} />

        {/* Puntal de madera y farolillos que marcan la entrada */}
        <Box size={[0.16, 2.2, 0.16]} position={[-1.15, 1.1, 1.05]} color={C.woodDark} />
        <Box size={[0.16, 2.2, 0.16]} position={[1.15, 1.1, 1.05]} color={C.woodDark} />
        <Box size={[2.6, 0.18, 0.18]} position={[0, 2.25, 1.05]} color={C.woodDark} />
        <Lantern position={[-1.7, 0, 1.4]} lit h={1.5} />
        <Lantern position={[1.35, 0, 1.4]} lit h={1.5} />

        {/* Camino de piedras hasta la boca */}
        {[[0.2, 1.6], [-0.3, 2.3], [0.25, 3.0]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.03, z]} rotation={[-Math.PI / 2, 0, i]}>
            <circleGeometry args={[0.32, 6]} />
            <Mat color={C.stone} />
          </mesh>
        ))}

        {/* El cofre, dentro, visible desde fuera */}
        <Chest position={[0, 0.07, -0.9]} open={cents > 0} cents={cents} />
      </TapZone>

      {/* Vegetación sobre y alrededor de la roca */}
      <Bush position={[-1.2, 2.9, -1.0]} palette={palette} scale={0.8} />
      <Bush position={[1.6, 2.7, -1.6]} palette={palette} scale={0.7} />
      <GrassTuft position={[0.6, 3.6, -1.2]} palette={palette} />
      <GrassTuft position={[-2.6, 1.4, -0.6]} palette={palette} scale={0.9} />
      <Palm position={[3.2, 0, -0.2]} h={2.6} lean={0.35} rotation={1.2} palette={palette} scale={0.85} />
      <Bush position={[-3.0, 0, 0.9]} palette={palette} scale={0.8} />
      <Flowers position={[-1.6, 0, 2.4]} seed={44} count={4} />
      <Flowers position={[1.9, 0, 2.6]} seed={45} count={3} />

      <Label text="Cofre" amount={(cents / 100).toLocaleString('es-ES', { maximumFractionDigits: 2 })} y={4.3} />
    </group>
  )
}
