import { Suspense, useEffect, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'
import { OrbitControls } from '@react-three/drei'
import { calendarOf, currentMonth, TASK_ACORNS } from '../sim'
import { useGame } from '../store/game'
import { PALETTES } from './palette'
import { Path, Pier, Stairs, Terrace, Water } from './Terrain'
import { Acorn, Cypress, Oak, RoundTree } from './Nature'
import { Ball, Bank, Bike, House, Kite, Lighthouse, Mailbox, Piggy, Shop, Telescope } from './Buildings'
import { rngFor } from '../sim/rng'

const BASE_Y = 1.2 // altura de la meseta principal
const TOP_Y = 2.35 // altura de la meseta alta

/** Puntos donde pueden aparecer bellotas, sobre las mesetas. */
const ACORN_SPOTS: [number, number, number][] = [
  [-1.2, BASE_Y, 3.4], [3.6, BASE_Y, -3.2], [-4.2, BASE_Y, -0.6], [1.6, BASE_Y, 3.9], [-3.0, TOP_Y, -3.2],
  [4.6, BASE_Y, 1.0], [-0.4, TOP_Y, -1.2], [2.0, BASE_Y, -4.2], [-4.8, BASE_Y, 1.8], [0.4, BASE_Y, -0.2],
]

function acornSpotsFor(seed: number, month: number): number[] {
  const rng = rngFor(seed, month, 41)
  const idx = ACORN_SPOTS.map((_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx.slice(0, TASK_ACORNS)
}

/** Aleja y abre la cámara en pantallas verticales para que la isla quepa. */
function CameraRig() {
  const { camera, size } = useThree()
  useEffect(() => {
    const aspect = size.width / size.height
    const k = aspect < 1 ? 1 + (1 / aspect - 1) * 0.55 : 1
    const cam = camera as PerspectiveCamera
    cam.fov = aspect < 1 ? 48 : 38
    cam.position.set(9 * k, 8.5 * k, 11 * k)
    cam.updateProjectionMatrix()
  }, [camera, size.width, size.height])
  return null
}

function isNightNow(): boolean {
  const h = new Date().getHours()
  return h < 7 || h >= 20
}

function Scene() {
  const game = useGame((s) => s.game)!
  const nowMs = useGame((s) => s.nowMs)
  const acornsFound = useGame((s) => s.acornsFound)
  const { collect, setPanel, pickAcorn } = useGame.getState()

  const month = currentMonth(game, nowMs)
  const cal = calendarOf(month)
  const palette = PALETTES[cal.season]
  const night = isNightNow()
  const taskAvailable = game.taskDoneMonth < month
  const spots = useMemo(() => acornSpotsFor(game.seed, month), [game.seed, month])
  const has = (id: string) => game.purchases.some((p) => p.itemId === id)

  return (
    <>
      <color attach="background" args={[night ? '#2a3a4d' : palette.sky]} />
      <fog attach="fog" args={[night ? '#2a3a4d' : palette.sky, 22, 46]} />
      <ambientLight intensity={night ? 0.35 : palette.ambient} color={night ? '#9db4d6' : '#ffffff'} />
      <hemisphereLight intensity={0.5} color={palette.sky} groundColor={palette.water} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={night ? 0.5 : palette.sunIntensity}
        color={night ? '#b9c8e6' : palette.sun}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      <Water palette={palette} />
      {/* Meseta principal y meseta alta */}
      <Terrace radius={6.6} height={BASE_Y} seed={game.seed % 1000} position={[0.3, 0, 0.2]} squash={0.86} verts={11} topColor={palette.grass} />
      <Terrace radius={3.3} height={TOP_Y - BASE_Y} seed={(game.seed % 1000) + 7} position={[-1.6, BASE_Y, -1.6]} squash={0.8} verts={9} topColor={palette.grassTop} />
      <Stairs position={[0.9, BASE_Y, -0.2]} rotation={Math.PI * 0.9} steps={6} rise={TOP_Y - BASE_Y} />
      {/* Roquedo bajo junto al embarcadero */}
      <Terrace radius={1.4} height={0.5} seed={(game.seed % 1000) + 3} position={[1.2, 0, 5.4]} topColor={palette.grass} />
      <Pier position={[1.4, 0, 7.2]} rotation={0.15} />

      <Path y={BASE_Y} points={[[2.6, 3.2], [1.4, 2.4], [0.2, 2.2], [-1.6, 2.6], [-2.6, 1.9]]} />
      <Path y={BASE_Y} points={[[1.4, 2.4], [2.2, 0.4], [3.0, -0.6]]} width={0.4} />
      <Path y={BASE_Y} points={[[1.6, 3.6], [1.3, 4.6]]} width={0.4} />

      {/* Edificios */}
      <House position={[3.0, BASE_Y, 2.4]} palette={palette} night={night} />
      <Mailbox position={[4.5, BASE_Y, 3.7]} cents={game.mailboxCents} onTap={collect} />
      <Piggy position={[0.1, BASE_Y, 3.1]} cents={game.huchaCents} onTap={() => setPanel('hucha')} palette={palette} />
      <Shop position={[-3.2, BASE_Y, 1.6]} palette={palette} onTap={() => setPanel('tienda')} />
      <Bank position={[3.4, BASE_Y, -1.9]} unlocked={game.bankUnlocked} cents={game.bankCents} palette={palette} onTap={() => setPanel('banco')} />
      <Lighthouse position={[-2.4, TOP_Y, -2.2]} palette={palette} night={night} />

      {/* Vegetación */}
      <Oak position={[-0.6, TOP_Y, 0.2]} palette={palette} />
      <Cypress position={[-4.6, BASE_Y, -1.2]} palette={palette} scale={1.1} />
      <Cypress position={[-5.1, BASE_Y, 0.2]} palette={palette} scale={0.9} />
      <Cypress position={[5.2, BASE_Y, 0.4]} palette={palette} />
      <Cypress position={[4.6, BASE_Y, -3.6]} palette={palette} scale={0.85} />
      <Cypress position={[-3.6, TOP_Y, -0.2]} palette={palette} scale={0.8} />
      <Cypress position={[-0.2, TOP_Y, -3.6]} palette={palette} scale={0.75} />
      <RoundTree position={[-1.8, BASE_Y, 4.2]} palette={palette} />
      <RoundTree position={[1.6, BASE_Y, -3.8]} palette={palette} scale={0.9} />
      <RoundTree position={[-4.0, BASE_Y, 3.2]} palette={palette} scale={0.8} />
      <RoundTree position={[5.4, BASE_Y, 2.6]} palette={palette} scale={0.7} />

      {/* Objetos comprados */}
      {has('cometa') && <Kite position={[1.6, BASE_Y, 4.6]} />}
      {has('balon') && <Ball position={[2.2, BASE_Y, 3.6]} />}
      {has('bici') && <Bike position={[2.1, BASE_Y, 1.4]} rotation={0.6} />}
      {has('telescopio') && <Telescope position={[-3.4, TOP_Y, -3.6]} />}

      {/* Bellotas de la tarea diaria */}
      {taskAvailable &&
        spots.map((spotIndex, i) =>
          acornsFound.includes(i) ? null : <Acorn key={`${month}-${i}`} position={ACORN_SPOTS[spotIndex]} onPick={() => pickAcorn(i)} />,
        )}

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.12}
        minDistance={9}
        maxDistance={34}
        minPolarAngle={0.55}
        maxPolarAngle={1.25}
        target={[0.3, 0.1, 0.6]}
        touches={{ ONE: 0, TWO: 2 }}
      />
    </>
  )
}

export function Island() {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.75]}
      camera={{ position: [9, 8.5, 11], fov: 38 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'none' }}
    >
      <CameraRig />
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  )
}
