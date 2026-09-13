import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { C, type SeasonPalette } from '../palette'
import { Barrel, Box, ConeRoof, Crate, Door, Fence, GableRoof, Gable, Label, Lantern, Mat, Snow, TapZone, Wall, Window } from '../kit/Parts'
import { Bush, Flowers, Palm, Rock } from '../kit/Nature'

type V3 = [number, number, number]

/**
 * EL FARO · vertical, reconocible y de cuento: base de piedra, torre a franjas rojas y blancas,
 * balcón con barandilla, linterna, tejado rojo y cabaña roja anexa. Mira hacia +Z.
 */
export function Lighthouse({ position, rotation = 0, palette, night, onTap }: { position: V3; rotation?: number; palette: SeasonPalette; night: boolean; onTap: () => void }) {
  const beam = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (beam.current) beam.current.rotation.y = clock.getElapsedTime() * 0.5
  })
  const TOWER_H = 5.2
  const bands = 6
  const bandH = TOWER_H / bands
  const rBottom = 0.95
  const rTop = 0.6
  const lanternY = 0.5 + TOWER_H
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <TapZone size={[4.5, TOWER_H + 2.5, 4]} onTap={onTap}>
        {/* Base de mampostería */}
        <mesh position={[0, 0.25, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[1.35, 1.55, 0.5, 9]} />
          <Mat color={C.stoneDark} flat />
        </mesh>
        {/* Torre a franjas */}
        {Array.from({ length: bands }, (_, i) => {
          const t0 = i / bands
          const t1 = (i + 1) / bands
          const r0 = rBottom + (rTop - rBottom) * t0
          const r1 = rBottom + (rTop - rBottom) * t1
          return (
            <mesh key={i} position={[0, 0.5 + bandH * (i + 0.5), 0]} castShadow>
              <cylinderGeometry args={[r1, r0, bandH + 0.01, 12]} />
              <Mat color={i % 2 ? C.red : C.white} />
            </mesh>
          )
        })}
        {/* Ventanitas */}
        <Window position={[0, 2.3, rBottom - 0.15]} w={0.32} h={0.45} shutters={false} night={night} />
        <Window position={[0, 3.9, rBottom - 0.34]} w={0.28} h={0.4} shutters={false} night={night} />
        <Door w={0.8} h={1.3} position={[0, 0.5, rBottom + 0.02]} />

        {/* Balcón y barandilla */}
        <mesh position={[0, lanternY - 0.02, 0]} castShadow>
          <cylinderGeometry args={[1.0, 0.85, 0.16, 12]} />
          <Mat color={C.metal} />
        </mesh>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 0.93, lanternY + 0.28, Math.sin(a) * 0.93]}>
              <cylinderGeometry args={[0.02, 0.02, 0.5, 4]} />
              <Mat color={C.metal} />
            </mesh>
          )
        })}
        <mesh position={[0, lanternY + 0.52, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.93, 0.025, 4, 18]} />
          <Mat color={C.metal} />
        </mesh>

        {/* Linterna */}
        <mesh position={[0, lanternY + 0.5, 0]}>
          <cylinderGeometry args={[0.55, 0.55, 0.9, 8]} />
          <Mat color="#fff4cc" rough={0.2} opacity={0.75} emissive={night ? C.lantern : undefined} emissiveIntensity={night ? 1.6 : 0} />
        </mesh>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2 + Math.PI / 8
          return <Box key={i} size={[0.05, 0.9, 0.05]} position={[Math.cos(a) * 0.55, lanternY + 0.5, Math.sin(a) * 0.55]} color={C.metal} />
        })}
        <mesh position={[0, lanternY + 0.98, 0]}>
          <cylinderGeometry args={[0.7, 0.62, 0.12, 8]} />
          <Mat color={C.metal} />
        </mesh>
        <ConeRoof r={0.72} h={0.75} position={[0, lanternY + 1.04, 0]} />
        {palette.snow && (
          <mesh position={[0, lanternY + 1.42, 0]}>
            <coneGeometry args={[0.3, 0.2, 8]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        )}

        {/* Haz de luz de noche: el vértice del cono está en la linterna y se abre hacia el mar */}
        {night && (
          <group ref={beam} position={[0, lanternY + 0.5, 0]}>
            <mesh position={[4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <coneGeometry args={[1.1, 8, 10, 1, true]} />
              <meshBasicMaterial color="#fff2b0" transparent opacity={0.14} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <pointLight color={C.lantern} intensity={6} distance={9} decay={2} />
          </group>
        )}

        {/* Cabaña roja anexa */}
        <group position={[1.9, 0, 0.4]}>
          <Wall w={1.9} d={1.7} h={1.5} color="#c9553f" base={0.35} corners={false} />
          {[-0.95, 0.95].map((x) =>
            [-0.85, 0.85].map((z) => <Box key={`${x}${z}`} size={[0.1, 1.5, 0.1]} position={[x, 0.75, z]} color={C.white} />),
          )}
          <GableRoof w={1.9} d={1.7} h={0.8} color={C.woodDark} dark={C.metal} position={[0, 1.5, 0]} overhang={0.25} rows={2} rotation={Math.PI / 2} />
          <Gable w={1.7} h={0.8} color="#c9553f" position={[0.95, 1.5, 0]} rotation={[0, Math.PI / 2, 0]} />
          <Gable w={1.7} h={0.8} color="#c9553f" position={[-0.95 - 0.12, 1.5, 0]} rotation={[0, Math.PI / 2, 0]} />
          <Door w={0.7} h={1.2} position={[-0.3, 0, 0.85 + 0.04]} color={C.white} arch={false} />
          <Window position={[0.45, 0.95, 0.85 + 0.04]} w={0.5} h={0.5} shutters={false} night={night} />
          {palette.snow && <Snow w={2.2} d={2.0} y={1.5 + 0.45} />}
          {/* salvavidas */}
          <mesh position={[0.95 + 0.06, 0.95, -0.3]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.16, 0.05, 6, 14]} />
            <Mat color={C.white} />
          </mesh>
          <mesh position={[0.95 + 0.07, 0.95, -0.3]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.16, 0.052, 6, 14, Math.PI / 2]} />
            <Mat color={C.red} />
          </mesh>
        </group>
      </TapZone>

      {/* Entorno del faro */}
      <Fence length={4.2} position={[0.4, 0, 2.6]} />
      <Fence length={2.6} position={[-1.8, 0, 1.3]} rotation={Math.PI / 2} />
      <Lantern position={[-1.2, 0, 2.2]} lit={night} h={1.5} />
      <Crate position={[3.3, 0, 1.1]} size={0.36} rotation={0.3} />
      <Barrel position={[3.35, 0, 0.5]} h={0.45} r={0.18} />
      <Palm position={[-2.4, 0, -0.4]} h={3.2} lean={0.3} rotation={2.4} palette={palette} />
      <Palm position={[3.6, 0, -1.4]} h={2.6} lean={0.2} rotation={0.8} palette={palette} scale={0.9} />
      <Bush position={[-1.6, 0, 1.6]} palette={palette} scale={0.8} />
      <Flowers position={[1.0, 0, 2.0]} seed={21} />
      <Rock position={[2.6, 0, -1.9]} size={0.5} seed={5} />

      <Label text="Faro" sub="Doña Tortuga" y={TOWER_H + 2.6} />
    </group>
  )
}
