/**
 * EDIFICIOS DEL MUNDO montados con el kit, uno por receta. Comparten escala, materiales y detalle;
 * cada uno tiene una silueta propia ligada a su función (torre del reloj, aspas, cúpula, grúa…).
 * Mientras un edificio no se ha desbloqueado se muestra su solar EN OBRAS con el mundo en que abre.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { C, type SeasonPalette } from '../palette'
import { Barrel, Box, Chimney, CoinEmblem, Column, ConeRoof, Crate, Door, Fence, FlagPole, Gable, GableRoof, HipRoof, Label, Lantern, Mat, Sack, Sign, Steps, TapZone, Wall, Window } from '../kit/Parts'
import { Bush, Flowers, GrassTuft, Rock } from '../kit/Nature'
import { Rowboat } from './Pier'
import type { BuildingDef } from '../registry'

type V3 = [number, number, number]

interface Props {
  def: BuildingDef
  position: V3
  palette: SeasonPalette
  night: boolean
  unlocked: boolean
  /** Para construcciones que paga el jugador (huerto): ¿ya está construida? */
  built?: boolean
  /** Acciones del jugador en este negocio (de 100): se muestra "Tuyo: N %" en el cartel. */
  ownedPct?: number
  /** Huerto ampliado: invernadero, colmenas y otra vaca. */
  upgraded?: boolean
  onTap: () => void
}

/* ───────────────────────── Solar en obras ───────────────────────── */

export function ConstructionSite({ def, position, onTap }: { def: BuildingDef; position: V3; onTap: () => void }) {
  const w = def.footprint * 1.1
  const d = def.footprint * 0.9
  return (
    <group position={position} rotation={[0, def.rotation, 0]}>
      <TapZone size={[w + 1, 2.6, d + 1]} onTap={onTap}>
        {/* cimientos */}
        <Box size={[w, 0.25, d]} position={[0, 0.12, 0]} color={C.stone} flat />
        <Box size={[w * 0.8, 0.2, d * 0.8]} position={[0, 0.3, 0]} color={C.stoneDark} flat />
        {/* andamio: cuatro postes con tablones */}
        {[[-w / 2 + 0.2, -d / 2 + 0.2], [w / 2 - 0.2, -d / 2 + 0.2], [-w / 2 + 0.2, d / 2 - 0.2], [w / 2 - 0.2, d / 2 - 0.2]].map(([x, z], i) => (
          <Box key={i} size={[0.1, 2.2, 0.1]} position={[x, 1.3, z]} color={C.woodLight} />
        ))}
        <Box size={[w - 0.3, 0.06, 0.1]} position={[0, 1.4, d / 2 - 0.2]} color={C.woodLight} />
        <Box size={[w - 0.3, 0.06, 0.1]} position={[0, 2.2, d / 2 - 0.2]} color={C.woodLight} />
        <Box size={[0.1, 0.06, d - 0.3]} position={[-w / 2 + 0.2, 1.8, 0]} color={C.woodLight} />
        <Box size={[w * 0.5, 0.05, 0.5]} position={[0.2, 1.42, d / 2 - 0.55]} color={C.wood} />
        {/* materiales */}
        <Crate position={[-w / 2 + 0.6, 0.4, 0.2]} size={0.4} rotation={0.3} />
        <Crate position={[-w / 2 + 1.0, 0.4, -0.3]} size={0.32} rotation={-0.4} />
        <Barrel position={[w / 2 - 0.6, 0.4, -0.2]} h={0.5} />
        <Sack position={[w / 2 - 0.9, 0.4, 0.4]} />
        {/* montón de arena */}
        <mesh position={[0, 0.4, -d / 2 + 0.4]} scale={[1.2, 0.5, 0.8]}>
          <dodecahedronGeometry args={[0.45, 0]} />
          <Mat color={C.sand} flat />
        </mesh>
        {/* cartel del nivel en que abre */}
        <group position={[0, 0, d / 2 + 0.8]}>
          <Box size={[0.08, 1.4, 0.08]} position={[-0.6, 0.7, 0]} color={C.woodDark} />
          <Box size={[0.08, 1.4, 0.08]} position={[0.6, 0.7, 0]} color={C.woodDark} />
          <Box size={[1.6, 0.7, 0.08]} position={[0, 1.35, 0]} color={C.plasterWarm} />
          <Html position={[0, 1.35, 0.06]} center transform distanceFactor={4} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
            <div className="site-sign">
              <span className="site-sign__world">Nivel {def.world}</span>
              <span className="site-sign__name">{def.name}</span>
            </div>
          </Html>
        </group>
      </TapZone>
    </group>
  )
}

/* ───────────────────────── Solar en venta (construcción que paga el jugador) ───────────────────────── */

export function ForSaleLot({ def, position, palette, onTap }: { def: BuildingDef; position: V3; palette: SeasonPalette; onTap: () => void }) {
  const w = def.footprint * 1.3
  const price = def.costCents ? (def.costCents / 100).toLocaleString('es-ES') : ''
  return (
    <group position={position} rotation={[0, def.rotation, 0]}>
      <TapZone size={[w + 1, 2.4, w + 1]} onTap={onTap}>
        {/* valla baja alrededor del solar, hierba alta y un cartel de venta */}
        <Fence length={w} position={[0, 0, -w / 2]} h={0.5} />
        <Fence length={w} position={[0, 0, w / 2]} h={0.5} />
        <Fence length={w} position={[-w / 2, 0, 0]} rotation={Math.PI / 2} h={0.5} />
        <Fence length={w} position={[w / 2, 0, 0]} rotation={Math.PI / 2} h={0.5} />
        {[[-1.2, -0.8], [0.6, -1.3], [1.3, 0.9], [-0.9, 1.1], [0.1, 0.2], [-1.6, 0.3]].map(([x, z], i) => (
          <GrassTuft key={i} position={[x, 0, z]} palette={palette} scale={1.3} />
        ))}
        <Rock position={[1.5, 0, -0.9]} size={0.35} seed={3} />
        <group position={[0, 0, w / 2 + 0.7]}>
          <Box size={[0.1, 1.5, 0.1]} position={[0, 0.75, 0]} color={C.woodDark} />
          <Box size={[1.9, 0.8, 0.08]} position={[0, 1.45, 0]} color={C.plasterWarm} />
          <Html position={[0, 1.45, 0.06]} center transform distanceFactor={4} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
            <div className="site-sign site-sign--sale">
              <span className="site-sign__world">Se construye</span>
              <span className="site-sign__name">{def.name} · {price}</span>
            </div>
          </Html>
        </group>
      </TapZone>
    </group>
  )
}

/* ───────────────────────── Animales del huerto ───────────────────────── */

function Cow({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  const head = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (head.current) head.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.9 + position[0]) * 0.18 + 0.25
  })
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box size={[0.9, 0.5, 0.5]} position={[0, 0.62, 0]} color={C.white} />
      <Box size={[0.32, 0.3, 0.2]} position={[0.15, 0.7, 0.16]} color="#3f3a36" />
      <Box size={[0.24, 0.22, 0.2]} position={[-0.25, 0.55, -0.16]} color="#3f3a36" />
      {[[-0.32, 0.18], [0.32, 0.18], [-0.32, -0.18], [0.32, -0.18]].map(([x, z], i) => (
        <Box key={i} size={[0.12, 0.38, 0.12]} position={[x, 0.19, z]} color={C.white} />
      ))}
      <group ref={head} position={[0.5, 0.75, 0]}>
        <Box size={[0.34, 0.3, 0.3]} position={[0.1, -0.1, 0]} color={C.white} />
        <Box size={[0.14, 0.14, 0.32]} position={[0.22, -0.18, 0]} color="#f0b9b0" />
        <Box size={[0.05, 0.12, 0.05]} position={[0.02, 0.1, 0.14]} color={C.stoneDark} />
        <Box size={[0.05, 0.12, 0.05]} position={[0.02, 0.1, -0.14]} color={C.stoneDark} />
      </group>
    </group>
  )
}

function Hen({ position, rotation = 0, color = C.white }: { position: V3; rotation?: number; color?: string }) {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (g.current) g.current.position.y = position[1] + Math.abs(Math.sin(clock.getElapsedTime() * 3 + position[2] * 5)) * 0.03
  })
  return (
    <group ref={g} position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.16, 0]} castShadow>
        <sphereGeometry args={[0.15, 8, 6]} />
        <Mat color={color} flat />
      </mesh>
      <mesh position={[0.12, 0.3, 0]}>
        <sphereGeometry args={[0.08, 7, 5]} />
        <Mat color={color} flat />
      </mesh>
      <Box size={[0.03, 0.06, 0.05]} position={[0.12, 0.38, 0]} color={C.roofRed} />
      <Box size={[0.08, 0.03, 0.03]} position={[0.22, 0.29, 0]} color={C.flowerYellow} />
    </group>
  )
}

function Pig({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.34, 0]} scale={[1.3, 1, 1]} castShadow>
        <sphereGeometry args={[0.26, 8, 6]} />
        <Mat color="#f3b0b8" flat />
      </mesh>
      <mesh position={[0.34, 0.36, 0]}>
        <sphereGeometry args={[0.16, 7, 5]} />
        <Mat color="#f3b0b8" flat />
      </mesh>
      <Box size={[0.08, 0.1, 0.12]} position={[0.5, 0.33, 0]} color="#e08a97" />
      {[[-0.15, 0.12], [0.15, 0.12], [-0.15, -0.12], [0.15, -0.12]].map(([x, z], i) => (
        <Box key={i} size={[0.09, 0.2, 0.09]} position={[x, 0.1, z]} color="#f3b0b8" />
      ))}
    </group>
  )
}

/* ───────────────────────── Piezas compuestas reutilizables ───────────────────────── */

function Body({ w, d, h, color, roof, roofColor, roofDark, gableColor, night, windows = 2, door = true, position = [0, 0, 0] }: {
  w: number
  d: number
  h: number
  color: string
  roof: 'gable' | 'hip'
  roofColor: string
  roofDark?: string
  gableColor?: string
  night: boolean
  windows?: number
  door?: boolean
  position?: V3
}) {
  const rh = roof === 'gable' ? h * 0.5 : h * 0.55
  return (
    <group position={position}>
      <Wall w={w} d={d} h={h} color={color} />
      {roof === 'gable' ? (
        <>
          <GableRoof w={w} d={d} h={rh} color={roofColor} dark={roofDark ?? C.roofRedDark} position={[0, h, 0]} />
          <Gable w={w} h={rh} color={gableColor ?? C.wood} position={[0, h, d / 2 - 0.12]} />
          <Gable w={w} h={rh} color={gableColor ?? C.wood} position={[0, h, -d / 2]} />
        </>
      ) : (
        <HipRoof w={w} d={d} h={rh} color={roofColor} dark={roofDark ?? C.roofBlueDark} position={[0, h, 0]} />
      )}
      {door && <Door position={[-w * 0.2, 0, d / 2 + 0.04]} />}
      {Array.from({ length: windows }, (_, i) => (
        <Window key={i} position={[w * 0.25 + (i - (windows - 1) / 2) * 0.9 * (i ? 1 : 1), h * 0.58, d / 2 + 0.04]} night={night} />
      ))}
      <Window position={[-w / 2 - 0.04, h * 0.58, 0]} rotation={-Math.PI / 2} night={night} />
      <Window position={[w / 2 + 0.04, h * 0.58, 0]} rotation={Math.PI / 2} night={night} />
    </group>
  )
}

/** Torre con reloj para el Ayuntamiento. */
function ClockTower({ position, h = 3.6, night }: { position: V3; h?: number; night: boolean }) {
  return (
    <group position={position}>
      <Box size={[1.2, h, 1.2]} position={[0, h / 2, 0]} color={C.plaster} />
      {[-0.6, 0.6].map((x) => (
        <Box key={x} size={[0.14, h, 0.14]} position={[x, h / 2, 0.6]} color={C.woodDark} />
      ))}
      <mesh position={[0, h - 0.5, 0.62]}>
        <circleGeometry args={[0.36, 16]} />
        <Mat color={C.white} />
      </mesh>
      <mesh position={[0, h - 0.5, 0.63]}>
        <ringGeometry args={[0.33, 0.38, 16]} />
        <Mat color={C.gold} rough={0.4} />
      </mesh>
      <Box size={[0.04, 0.26, 0.02]} position={[0, h - 0.38, 0.64]} color="#1e3436" />
      <Box size={[0.2, 0.04, 0.02]} position={[0.09, h - 0.5, 0.64]} color="#1e3436" />
      <Window position={[0, h * 0.45, 0.62]} w={0.36} h={0.5} shutters={false} night={night} />
      <Box size={[1.4, 0.16, 1.4]} position={[0, h, 0]} color={C.stone} />
      <ConeRoof r={0.95} h={1.1} color={C.roofBlueDark} position={[0, h + 0.1, 0]} segments={4} />
    </group>
  )
}

/** Aspas de molino girando. */
function Blades({ position, r = 2.2 }: { position: V3; r?: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z -= dt * 0.7
  })
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.5, 8]} />
        <Mat color={C.woodDark} />
      </mesh>
      <group ref={ref} position={[0, 0, 0.3]}>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
            <Box size={[0.08, r, 0.06]} position={[0, r / 2, 0]} color={C.woodDark} />
            <Box size={[0.55, r * 0.75, 0.03]} position={[0.32, r * 0.55, 0]} color={C.white} />
            {[0.3, 0.55, 0.8].map((k) => (
              <Box key={k} size={[0.6, 0.03, 0.04]} position={[0.32, r * k, 0]} color={C.woodLight} />
            ))}
          </group>
        ))}
      </group>
    </group>
  )
}

/** Cúpula de observatorio con ranura. */
function Dome({ position, r = 1.1 }: { position: V3; r?: number }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <sphereGeometry args={[r, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Mat color={C.white} flat />
      </mesh>
      <Box size={[0.3, r * 1.02, 0.5]} position={[0, r * 0.5, r * 0.55]} rotation={[0.6, 0, 0]} color={C.navy} />
      <mesh position={[0, r * 0.75, r * 0.7]} rotation={[0.9, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.13, 1.0, 8]} />
        <Mat color={C.metal} />
      </mesh>
    </group>
  )
}

/** Grúa de madera con cuerda y gancho. */
function Crane({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box size={[0.18, 3.4, 0.18]} position={[0, 1.7, 0]} color={C.woodDark} />
      <Box size={[2.6, 0.16, 0.16]} position={[1.1, 3.3, 0]} color={C.woodDark} />
      <Box size={[0.12, 1.2, 0.12]} position={[1.0, 2.75, 0]} rotation={[0, 0, 0.7]} color={C.wood} />
      <mesh position={[2.2, 2.5, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.5, 4]} />
        <Mat color={C.plasterWarm} />
      </mesh>
      <mesh position={[2.2, 1.7, 0]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.12, 0.03, 6, 10, Math.PI]} />
        <Mat color={C.metal} />
      </mesh>
      <Crate position={[2.2, 1.0, 0]} size={0.4} />
    </group>
  )
}

/** Casco de barco a medio construir sobre soportes. */
function Hull({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-0.8, 0.8].map((z) => (
        <Box key={z} size={[1.4, 0.5, 0.15]} position={[0, 0.25, z]} color={C.woodDark} />
      ))}
      <mesh position={[0, 0.75, 0]} scale={[1, 0.6, 2.2]} castShadow>
        <cylinderGeometry args={[0.7, 0.45, 0.7, 8, 1, true]} />
        <meshStandardMaterial color={C.woodLight} roughness={0.9} side={THREE.DoubleSide} flatShading />
      </mesh>
      {[0.3, 0.6].map((k) => (
        <mesh key={k} position={[0, 0.5 + k * 0.5, 0]} scale={[1, 1, 2.2]}>
          <torusGeometry args={[0.5 + k * 0.25, 0.03, 4, 12]} />
          <Mat color={C.wood} />
        </mesh>
      ))}
    </group>
  )
}

/** Silo con cúpula. */
function Silo({ position, h = 2.8 }: { position: V3; h?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.65, h, 10]} />
        <Mat color={C.plaster} />
      </mesh>
      <mesh position={[0, h, 0]}>
        <sphereGeometry args={[0.62, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Mat color={C.roofRed} flat />
      </mesh>
      {[0.4, 1.4, 2.3].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.66, 0.66, 0.05, 10]} />
          <Mat color={C.metal} />
        </mesh>
      ))}
    </group>
  )
}

/* ───────────────────────── Recetas ───────────────────────── */

export function GenericBuilding(props: Props) {
  const { def, position, palette, night, unlocked, built = true, ownedPct, upgraded = false, onTap } = props
  if (!unlocked) return <ConstructionSite def={def} position={position} onTap={onTap} />
  if (def.costCents && !built) return <ForSaleLot def={def} position={position} palette={palette} onTap={onTap} />
  const r = def.rotation
  const label = <Label text={def.name} sub={ownedPct ? `Tuyo: ${ownedPct} %` : undefined} tone={ownedPct ? 'coin' : 'default'} y={4.2} />
  const wrap = (children: React.ReactNode, size: V3 = [6, 4.5, 6]) => (
    <group position={position} rotation={[0, r, 0]}>
      <TapZone size={size} onTap={onTap}>{children}</TapZone>
      {label}
    </group>
  )

  switch (def.id) {
    case 'huerto':
      return wrap(
        <>
          {/* caseta de aperos */}
          <group position={[-1.6, 0, -1.4]} rotation={[0, 0.3, 0]}>
            <Wall w={1.5} d={1.3} h={1.4} color={C.wood} base={0.2} corners={false} />
            <GableRoof w={1.5} d={1.3} h={0.7} color={C.roofRed} position={[0, 1.4, 0]} />
            <Door w={0.6} h={1.0} arch={false} color={C.woodDark} position={[0, 0, 0.68]} />
          </group>
          {/* bancales con cultivos en hileras */}
          {[-0.6, 0.3, 1.2].map((z, row) => (
            <group key={row} position={[0.9, 0, z]}>
              <Box size={[2.6, 0.18, 0.55]} position={[0, 0.09, 0]} color="#7a5537" flat />
              {[-1.0, -0.5, 0, 0.5, 1.0].map((x) => (
                <group key={x} position={[x, 0.18, 0]}>
                  <mesh position={[0, 0.16, 0]} castShadow>
                    <dodecahedronGeometry args={[row === 1 ? 0.13 : 0.16, 0]} />
                    <Mat color={row === 0 ? '#5fa845' : row === 1 ? C.roofOrange : '#3e8f3a'} flat />
                  </mesh>
                </group>
              ))}
            </group>
          ))}
          {/* corral con animales */}
          <Fence length={3.2} position={[-1.0, 0, 1.9]} h={0.55} />
          <Fence length={2.4} position={[-2.6, 0, 0.7]} rotation={Math.PI / 2} h={0.55} />
          <Cow position={[-1.4, 0, 0.9]} rotation={-0.5} />
          <Pig position={[-2.0, 0, -0.2]} rotation={2.2} />
          <Hen position={[-0.4, 0, 1.3]} rotation={1.0} />
          <Hen position={[-0.8, 0, 0.2]} rotation={-2.0} color={C.roofOrange} />
          {/* abrevadero y saco de grano */}
          <Box size={[0.7, 0.28, 0.3]} position={[-2.2, 0.14, 1.4]} color={C.woodDark} />
          <Box size={[0.6, 0.06, 0.22]} position={[-2.2, 0.28, 1.4]} color="#7fc8ea" />
          <Sack position={[-0.6, 0, -1.6]} />
          <Flowers position={[2.4, 0, -1.4]} seed={31} />
          {upgraded && (
            <>
              {/* invernadero de cristal */}
              <group position={[2.6, 0, -1.6]}>
                <Box size={[1.8, 0.9, 1.2]} position={[0, 0.45, 0]} color={C.white} />
                <mesh position={[0, 0.5, 0]}>
                  <boxGeometry args={[1.7, 0.85, 1.1]} />
                  <meshStandardMaterial color="#bfe9f5" transparent opacity={0.55} />
                </mesh>
                <GableRoof w={1.8} d={1.2} h={0.5} color="#bfe9f5" dark="#9fd3e6" position={[0, 0.9, 0]} />
                {[-0.5, 0, 0.5].map((x) => (
                  <mesh key={x} position={[x, 0.25, 0]}>
                    <dodecahedronGeometry args={[0.13, 0]} />
                    <Mat color={C.roofRed} flat />
                  </mesh>
                ))}
              </group>
              {/* colmenas */}
              {[-2.9, -2.5].map((x, i) => (
                <group key={i} position={[x, 0, -1.7 + i * 0.5]}>
                  <Box size={[0.32, 0.4, 0.32]} position={[0, 0.2, 0]} color={C.flowerYellow} />
                  <Box size={[0.38, 0.06, 0.38]} position={[0, 0.43, 0]} color={C.woodDark} />
                </group>
              ))}
              {/* segunda vaca */}
              <Cow position={[-0.9, 0, -0.9]} rotation={1.9} />
            </>
          )}
        </>,
        [7.5, 4, 6.5],
      )
    case 'ayuntamiento':
      return wrap(
        <>
          <Box size={[5.2, 0.3, 4.2]} position={[0, 0.15, 0.3]} color={C.stone} flat />
          <Steps count={2} width={2.2} rise={0.15} position={[0, 0, 2.4]} />
          <group position={[0, 0.3, 0]}>
            <Body w={4.2} d={3} h={2.6} color={C.plaster} roof="hip" roofColor={C.roofBlueDark} night={night} windows={2} door={false} />
            <Door w={1.2} h={1.7} arch color={C.woodDark} position={[0, 0, 1.54]} />
            {[-1.3, 1.3].map((x) => <Column key={x} h={2.4} position={[x, 0, 1.9]} />)}
            <Box size={[4.6, 0.16, 1.0]} position={[0, 2.5, 1.7]} color={C.stone} />
            <ClockTower position={[0, 2.6, -0.4]} night={night} />
            <FlagPole position={[2.6, 0, -1.0]} h={3.4} />
            <Sign text="AYUNTAMIENTO" tone="navy" position={[0, 2.15, 1.6]} w={2.2} />
          </group>
          <Lantern position={[-2.2, 0.3, 2.3]} lit={night} />
          <Lantern position={[2.2, 0.3, 2.3]} lit={night} />
          <Flowers position={[-2.4, 0.3, 1.2]} seed={81} />
          <Flowers position={[2.4, 0.3, 1.2]} seed={82} />
        </>,
        [7, 7.5, 6],
      )
    case 'hacienda':
      return wrap(
        <>
          <Body w={3.2} d={2.6} h={2.4} color={C.stone} roof="gable" roofColor="#6b6f8a" roofDark="#4f5370" gableColor={C.stoneDark} night={night} windows={1} />
          <Sign text="HACIENDA" tone="navy" position={[0, 2.1, 1.4]} w={1.7} />
          <Lantern position={[1.9, 0, 1.6]} lit={night} />
          {/* búho de piedra en el tejado */}
          <group position={[0, 3.65, 0]}>
            <mesh castShadow>
              <dodecahedronGeometry args={[0.22, 0]} />
              <Mat color={C.stoneDark} flat />
            </mesh>
            <mesh position={[0, 0.28, 0]}>
              <dodecahedronGeometry args={[0.16, 0]} />
              <Mat color={C.stoneDark} flat />
            </mesh>
          </group>
          <Fence length={3} position={[0, 0, 2.4]} />
          <Bush position={[-2.1, 0, 1.4]} palette={palette} scale={0.7} />
        </>,
      )
    case 'escuela':
      return wrap(
        <>
          <Body w={3.6} d={2.6} h={2.3} color={C.plasterWarm} roof="gable" roofColor={C.roofOrange} roofDark="#b85f2c" night={night} windows={2} />
          {/* campanario */}
          <group position={[-1.2, 3.4, 0]}>
            <Box size={[0.7, 0.9, 0.7]} position={[0, 0.45, 0]} color={C.white} />
            <mesh position={[0, 0.5, 0]}>
              <sphereGeometry args={[0.16, 8, 6]} />
              <Mat color={C.gold} rough={0.4} />
            </mesh>
            <ConeRoof r={0.5} h={0.5} color={C.roofOrange} position={[0, 0.9, 0]} segments={4} />
          </group>
          <Sign text="ESCUELA" position={[0.4, 2.0, 1.4]} w={1.5} />
          <FlagPole position={[2.4, 0, 0.8]} h={3} color={C.roofOrange} emblem={false} />
          <Fence length={3.6} position={[0, 0, 2.6]} />
          <Flowers position={[-2.2, 0, 1.8]} seed={83} />
        </>,
      )
    case 'mercado':
      return wrap(
        <>
          <Box size={[5.4, 0.3, 4.4]} position={[0, 0.15, 0]} color={C.stone} flat />
          <group position={[0, 0.3, 0]}>
            <Body w={4.2} d={3.2} h={2.6} color={C.plaster} roof="hip" roofColor="#3f9a8a" roofDark="#2f7568" night={night} windows={0} door={false} />
            <Door w={1.6} h={1.9} arch color={C.woodDark} position={[0, 0, 1.64]} />
            {[-1.5, 1.5].map((x) => (
              <Window key={x} position={[x, 1.5, 1.64]} night={night} shutterColor="#3f9a8a" />
            ))}
            <CoinEmblem position={[0, 2.35, 1.7]} r={0.28} />
            <Sign text="MERCADO" tone="navy" position={[0, 2.95, 1.66]} w={1.9} />
            {/* toldos laterales de puestos */}
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 2.4, 0, 0.4]}>
                <Box size={[0.9, 0.05, 1.6]} position={[0, 1.5, 0]} rotation={[0, 0, s * 0.25]} color={s > 0 ? C.roofRed : C.roofBlue} />
                <Box size={[0.06, 1.5, 0.06]} position={[s * 0.4, 0.75, 0.7]} color={C.woodLight} />
                <Box size={[0.06, 1.5, 0.06]} position={[s * 0.4, 0.75, -0.7]} color={C.woodLight} />
                <Crate position={[0, 0, 0.2]} size={0.4} />
                <Sack position={[0, 0, -0.4]} />
              </group>
            ))}
            <FlagPole position={[-2.0, 0, -1.6]} h={3.4} color="#3f9a8a" />
            <FlagPole position={[2.0, 0, -1.6]} h={3.4} color={C.roofRed} emblem={false} />
          </group>
        </>,
        [7.5, 6, 6.5],
      )
    case 'panaderia':
      return wrap(
        <>
          <Body w={2.8} d={2.3} h={2.1} color={C.plasterWarm} roof="gable" roofColor={C.roofRed} night={night} windows={1} />
          <Chimney position={[-0.8, 2.55, -0.4]} h={1.1} smoke />
          {/* toldo */}
          {Array.from({ length: 6 }, (_, i) => (
            <Box key={i} size={[0.5, 0.05, 0.8]} position={[-1.25 + i * 0.5, 1.8, 1.55]} rotation={[0.45, 0, 0]} color={i % 2 ? C.roofOrange : C.white} />
          ))}
          <Sign text="PAN" position={[0, 2.35, 1.3]} w={1.0} />
          {/* pan en un cesto */}
          <group position={[1.1, 0, 1.6]}>
            <Barrel position={[0, 0, 0]} h={0.35} r={0.22} />
            {[0, 0.8, 1.6].map((a) => (
              <mesh key={a} position={[Math.cos(a) * 0.08, 0.42, Math.sin(a) * 0.08]} rotation={[0, a, 0.3]}>
                <capsuleGeometry args={[0.06, 0.3, 3, 6]} />
                <Mat color={C.woodLight} />
              </mesh>
            ))}
          </group>
        </>,
      )
    case 'heladeria':
      return wrap(
        <>
          <Body w={2.6} d={2.1} h={2.0} color="#fbe7ee" roof="gable" roofColor="#f27ba0" roofDark="#d9628a" gableColor="#f7c7d3" night={night} windows={1} />
          {Array.from({ length: 6 }, (_, i) => (
            <Box key={i} size={[0.48, 0.05, 0.8]} position={[-1.2 + i * 0.48, 1.7, 1.45]} rotation={[0.45, 0, 0]} color={i % 2 ? '#f27ba0' : C.white} />
          ))}
          {/* helado gigante en el tejado */}
          <group position={[0.7, 3.0, 0]}>
            <mesh rotation={[Math.PI, 0, 0]} castShadow>
              <coneGeometry args={[0.32, 0.9, 8]} />
              <Mat color={C.woodLight} flat />
            </mesh>
            <mesh position={[0, 0.55, 0]}>
              <sphereGeometry args={[0.34, 10, 8]} />
              <Mat color="#f7c7d3" />
            </mesh>
            <mesh position={[0, 1.0, 0]}>
              <sphereGeometry args={[0.28, 10, 8]} />
              <Mat color={C.white} />
            </mesh>
            <mesh position={[0, 1.3, 0]}>
              <sphereGeometry args={[0.08, 6, 6]} />
              <Mat color={C.red} />
            </mesh>
          </group>
          <Sign text="HELADOS" position={[-0.4, 2.2, 1.2]} w={1.4} />
          <Flowers position={[-1.8, 0, 1.4]} seed={84} />
        </>,
      )
    case 'puerto':
      return wrap(
        <>
          <Body w={2.6} d={2.0} h={1.9} color={C.woodLight} roof="gable" roofColor={C.roofBlue} roofDark={C.roofBlueDark} gableColor={C.wood} night={night} windows={1} />
          <Sign text="PESCA" position={[0, 2.0, 1.1]} w={1.2} />
          {/* pequeño embarcadero y barca */}
          <Box size={[1.2, 0.1, 3.2]} position={[2.2, 0.3, 1.2]} color={C.woodLight} />
          {[0.2, 1.4, 2.6].map((z) => (
            <mesh key={z} position={[2.7, 0.05, z]}>
              <cylinderGeometry args={[0.07, 0.08, 0.6, 6]} />
              <Mat color={C.woodDark} />
            </mesh>
          ))}
          <Rowboat position={[3.6, 0.0, 1.6]} rotation={0.2} />
          <Barrel position={[-1.7, 0, 1.2]} h={0.45} />
          <Crate position={[-1.7, 0, 0.5]} size={0.36} />
          {/* red tendida */}
          <Box size={[1.6, 0.03, 0.03]} position={[0.2, 1.2, 1.7]} color={C.woodDark} />
          <mesh position={[0.2, 0.75, 1.7]}>
            <planeGeometry args={[1.5, 0.8]} />
            <meshStandardMaterial color={C.plasterWarm} transparent opacity={0.6} side={THREE.DoubleSide} wireframe />
          </mesh>
          <Lantern position={[1.4, 0, 2.3]} lit={night} h={1.4} />
        </>,
        [8, 4.5, 6],
      )
    case 'astillero':
      return wrap(
        <>
          <Wall w={3.8} d={3.0} h={2.4} color={C.woodDark} base={0.6} />
          <GableRoof w={3.8} d={3.0} h={1.2} color={C.metal} dark="#3a3633" position={[0, 2.4, 0]} overhang={0.35} />
          <Gable w={3.8} h={1.2} color={C.wood} position={[0, 2.4, 1.38]} />
          <Gable w={3.8} h={1.2} color={C.wood} position={[0, 2.4, -1.5]} />
          <Door w={1.8} h={2.0} arch={false} color={C.wood} position={[0, 0, 1.54]} />
          <Window position={[-1.9, 1.5, 0.4]} rotation={-Math.PI / 2} shutters={false} night={night} />
          <Sign text="ASTILLERO" position={[0, 2.25, 1.6]} w={1.8} />
          <Crane position={[2.6, 0, 1.6]} rotation={-0.6} />
          <Hull position={[-2.8, 0, 1.6]} rotation={0.5} />
          <Barrel position={[2.4, 0, -1.0]} h={0.5} />
          <Crate position={[2.9, 0, -0.4]} size={0.42} rotation={0.4} />
        </>,
        [9, 5, 7],
      )
    case 'molino':
      return wrap(
        <>
          <mesh position={[0, 1.6, 0]} castShadow>
            <cylinderGeometry args={[0.95, 1.25, 3.2, 10]} />
            <Mat color={C.stone} flat />
          </mesh>
          <Box size={[2.7, 0.2, 2.7]} position={[0, 0.1, 0]} color={C.stoneDark} flat />
          <Door position={[0, 0, 1.12]} w={0.8} h={1.3} />
          <Window position={[0, 2.3, 0.98]} w={0.36} h={0.45} shutters={false} night={night} />
          <mesh position={[0, 3.3, 0]}>
            <cylinderGeometry args={[1.05, 1.0, 0.2, 10]} />
            <Mat color={C.woodDark} />
          </mesh>
          <ConeRoof r={1.1} h={1.2} color={C.roofRed} position={[0, 3.4, 0]} />
          <Blades position={[0, 3.6, 1.1]} />
          <Sack position={[1.4, 0, 0.8]} />
          <Sack position={[1.1, 0, 1.3]} />
          <Fence length={2.6} position={[-1.6, 0, 1.2]} rotation={0.3} />
        </>,
        [6, 6.5, 6],
      )
    case 'posada':
      return wrap(
        <>
          <Wall w={3.6} d={3.0} h={3.4} color={C.plasterWarm} base={0.7} />
          {/* vigas de madera del piso alto */}
          <Box size={[3.7, 0.12, 3.1]} position={[0, 1.8, 0]} color={C.woodDark} />
          {[-1.2, 0, 1.2].map((x) => <Box key={x} size={[0.12, 1.6, 0.06]} position={[x, 2.6, 1.53]} color={C.woodDark} />)}
          <GableRoof w={3.6} d={3.0} h={1.5} color={C.roofRed} position={[0, 3.4, 0]} overhang={0.4} rows={4} />
          <Gable w={3.6} h={1.5} color={C.wood} position={[0, 3.4, 1.38]} />
          <Gable w={3.6} h={1.5} color={C.wood} position={[0, 3.4, -1.5]} />
          <Door position={[-0.6, 0, 1.54]} />
          <Window position={[0.9, 1.15, 1.54]} night={night} flowers />
          {[-0.9, 0.6].map((x) => <Window key={x} position={[x, 2.7, 1.54]} night={night} flowers />)}
          <Window position={[-1.84, 2.7, 0]} rotation={-Math.PI / 2} night={night} />
          <Window position={[1.84, 2.7, 0]} rotation={Math.PI / 2} night={night} />
          {/* balcón */}
          <Box size={[1.6, 0.1, 0.5]} position={[0.7, 2.2, 1.8]} color={C.woodLight} />
          <Fence length={1.6} position={[0.7, 2.25, 2.02]} h={0.5} />
          <Chimney position={[1.0, 4.0, -0.5]} h={0.9} smoke />
          <Sign text="POSADA" position={[-0.6, 1.75, 1.6]} w={1.3} />
          <Lantern position={[1.9, 0, 1.9]} lit={night} />
          <Barrel position={[-2.1, 0, 1.0]} h={0.5} />
        </>,
        [6, 6.5, 6],
      )
    case 'granja':
      return wrap(
        <>
          <Wall w={3.2} d={2.6} h={2.3} color="#c9553f" base={0.5} corners={false} />
          {[-1.6, 1.6].map((x) => [-1.3, 1.3].map((z) => <Box key={`${x}${z}`} size={[0.12, 2.3, 0.12]} position={[x, 1.15, z]} color={C.white} />))}
          <GableRoof w={3.2} d={2.6} h={1.3} color={C.woodDark} dark="#3a3633" position={[0, 2.3, 0]} />
          <Gable w={3.2} h={1.3} color="#c9553f" position={[0, 2.3, 1.18]} />
          <Gable w={3.2} h={1.3} color="#c9553f" position={[0, 2.3, -1.3]} />
          <Door w={1.4} h={1.8} arch={false} color={C.white} position={[0, 0, 1.34]} />
          <Box size={[0.04, 1.8, 0.02]} position={[0, 0.9, 1.42]} color="#c9553f" />
          <Silo position={[2.6, 0, -0.6]} />
          <Fence length={4} position={[-0.5, 0, 3.2]} />
          <Fence length={2.4} position={[-2.5, 0, 2.0]} rotation={Math.PI / 2} />
          {[[-1.6, 2.3], [-0.6, 2.3], [0.4, 2.3]].map(([x, z], i) => (
            <group key={i} position={[x, 0, z]}>
              <Box size={[0.8, 0.16, 0.5]} position={[0, 0.08, 0]} color={C.woodDark} />
              {[-0.25, 0, 0.25].map((gx) => <GrassTuft key={gx} position={[gx, 0.16, 0]} palette={palette} scale={0.8} />)}
            </group>
          ))}
          {/* fardos de paja */}
          <mesh position={[1.8, 0.3, 2.2]} rotation={[0, 0.4, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.32, 0.32, 0.6, 10]} />
            <Mat color="#e2c26a" flat />
          </mesh>
        </>,
        [8, 5, 7],
      )
    case 'cantera':
      return wrap(
        <>
          <Wall w={2.2} d={1.9} h={1.8} color={C.woodLight} base={0.3} corners={false} position={[-1.6, 0, 0.6]} />
          <GableRoof w={2.2} d={1.9} h={0.8} color={C.metal} dark="#3a3633" position={[-1.6, 1.8, 0.6]} />
          <Gable w={2.2} h={0.8} color={C.woodLight} position={[-1.6, 1.8, 1.43]} />
          <Door position={[-1.6, 0, 1.6]} w={0.8} h={1.3} arch={false} />
          <Sign text="CANTERA" position={[-1.6, 1.75, 1.62]} w={1.4} />
          {/* pila de bloques de piedra y rocas */}
          {[[1.0, 0, 0.8, 0.5], [1.7, 0, 0.3, 0.55], [1.3, 0.5, 0.55, 0.45], [2.2, 0, 1.2, 0.4]].map(([x, y, z, s], i) => (
            <Box key={i} size={[s, s * 0.7, s]} position={[x, y + (s * 0.7) / 2, z]} rotation={[0, i * 0.4, 0]} color={C.rockLight} flat />
          ))}
          <Rock position={[1.4, 0, -1.4]} size={1.3} seed={91} color={C.rock} />
          <Rock position={[2.6, 0, -0.6]} size={0.9} seed={92} color={C.rockDark} />
          <Rock position={[0.2, 0, -1.8]} size={0.8} seed={93} color={C.rockLight} />
          {/* carretilla */}
          <group position={[-0.2, 0, 1.9]} rotation={[0, 0.5, 0]}>
            <Box size={[0.6, 0.3, 0.9]} position={[0, 0.45, 0]} color={C.woodLight} />
            <mesh position={[0, 0.25, 0.3]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.2, 0.2, 0.08, 10]} />
              <Mat color={C.metal} />
            </mesh>
            <Box size={[0.06, 0.06, 0.8]} position={[-0.25, 0.4, -0.7]} color={C.wood} />
            <Box size={[0.06, 0.06, 0.8]} position={[0.25, 0.4, -0.7]} color={C.wood} />
          </group>
          <Crane position={[3.0, 0, 0.6]} rotation={2.4} />
        </>,
        [8, 4.5, 6],
      )
    case 'taller':
      return wrap(
        <>
          <Body w={3.0} d={2.4} h={2.2} color="#dbe9f2" roof="gable" roofColor={C.roofOrange} roofDark="#b85f2c" gableColor={C.woodLight} night={night} windows={1} />
          {/* tubo de chimenea metálico */}
          <mesh position={[1.0, 3.1, -0.5]}>
            <cylinderGeometry args={[0.12, 0.12, 1.2, 8]} />
            <Mat color={C.metal} />
          </mesh>
          {/* engranaje-cartel */}
          <mesh position={[1.1, 2.1, 1.3]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.32, 0.32, 0.08, 8]} />
            <Mat color={C.gold} rough={0.4} />
          </mesh>
          <Sign text="TALLER" position={[-0.5, 2.0, 1.3]} w={1.2} />
          {/* juguetes: bloques de colores y una peonza */}
          {[[-1.9, 0, 1.0, C.roofRed], [-1.9, 0.3, 1.0, C.roofBlue], [-1.55, 0, 1.3, C.flowerYellow]].map(([x, y, z, c], i) => (
            <Box key={i} size={[0.3, 0.3, 0.3]} position={[x as number, (y as number) + 0.15, z as number]} color={c as string} />
          ))}
          <Crate position={[1.9, 0, 1.1]} size={0.38} />
        </>,
      )
    case 'observatorio':
      return wrap(
        <>
          <Box size={[3.0, 0.3, 3.0]} position={[0, 0.15, 0]} color={C.stone} flat />
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[1.15, 1.3, 2.4, 12]} />
            <Mat color={C.plaster} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <Box key={i} size={[0.14, 2.4, 0.14]} position={[Math.cos((i * Math.PI) / 2 + 0.4) * 1.2, 1.5, Math.sin((i * Math.PI) / 2 + 0.4) * 1.2]} color={C.woodDark} />
          ))}
          <mesh position={[0, 2.75, 0]}>
            <cylinderGeometry args={[1.3, 1.2, 0.2, 12]} />
            <Mat color={C.navy} />
          </mesh>
          <Dome position={[0, 2.85, 0]} r={1.15} />
          <Door position={[0, 0.3, 1.2]} w={0.8} h={1.3} />
          <Window position={[0.85, 1.6, 0.9]} rotation={0.75} w={0.32} h={0.45} shutters={false} night={night} />
          <Steps count={2} width={1.2} rise={0.15} position={[0, 0, 1.6]} />
          <Lantern position={[1.6, 0.3, 1.4]} lit={night} h={1.4} />
        </>,
        [6, 6, 6],
      )
    case 'fondo':
      return wrap(
        <>
          <Box size={[4.6, 0.3, 3.8]} position={[0, 0.15, 0.2]} color={C.stone} flat />
          <group position={[0, 0.3, 0]}>
            <Body w={3.4} d={2.8} h={2.5} color={C.plaster} roof="hip" roofColor="#c9a35b" roofDark="#a8823f" night={night} windows={0} door={false} />
            <Door w={1.1} h={1.7} arch color={C.woodDark} position={[0, 0, 1.44]} />
            {[-1.1, 1.1].map((x) => <Column key={x} h={2.3} position={[x, 0, 1.75]} />)}
            <Box size={[3.6, 0.14, 0.9]} position={[0, 2.4, 1.5]} color={C.stone} />
            <CoinEmblem position={[0, 2.95, 0.6]} r={0.4} />
            {/* cesta: muchos negocios en uno */}
            <group position={[2.3, 0, 1.2]}>
              <Barrel position={[0, 0, 0]} h={0.4} r={0.3} />
              {[C.roofRed, C.roofBlue, C.flowerYellow, '#3f9a8a'].map((c, i) => (
                <mesh key={i} position={[Math.cos(i * 1.6) * 0.14, 0.5, Math.sin(i * 1.6) * 0.14]}>
                  <sphereGeometry args={[0.1, 6, 5]} />
                  <Mat color={c} />
                </mesh>
              ))}
            </group>
            <Sign text="FONDO ISLA" tone="navy" position={[0, 2.05, 1.5]} w={1.9} />
            <FlagPole position={[-2.2, 0, -1.2]} h={3.2} color="#c9a35b" />
          </group>
          <Flowers position={[-2.4, 0.3, 1.6]} seed={85} />
          <Bush position={[2.6, 0.3, -1.2]} palette={palette} scale={0.7} />
        </>,
        [7, 6, 6],
      )
    default:
      return wrap(<Body w={3} d={2.4} h={2.2} color={C.plaster} roof="gable" roofColor={C.roofRed} night={night} />)
  }
}
