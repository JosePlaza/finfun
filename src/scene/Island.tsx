import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { calendarOf, currentMonth, TASK_ACORNS } from '../sim'
import { rngFor } from '../sim/rng'
import { useGame } from '../store/game'
import { C, PALETTES } from './palette'
import { cameraPoseFor, islandPose, LEVELS, PLACES } from './registry'
import { Beach, Path, Stairs, Terrace, Water } from './Terrain'
import { Acorn, Bush, Flowers, GrassTuft, Palm, Rock, RockCluster } from './kit/Nature'
import { Ball, Bike, Kite, Telescope } from './kit/Objects'
import { House } from './buildings/House'
import { Bank } from './buildings/Bank'
import { Lighthouse } from './buildings/Lighthouse'
import { Cave } from './buildings/Cave'
import { MerchantBoat, Pier } from './buildings/Pier'

type V3 = [number, number, number]
const { playa: PLAYA, inferior: L1, central: L2, superior: L3 } = LEVELS

/** Puntos donde pueden aparecer bellotas, repartidos por los tres niveles. */
const ACORN_SPOTS: V3[] = [
  [0.6, L2, 4.6], [6.6, L2, -3.2], [-7.2, L2, -2.4], [1.6, L2, -4.6], [-0.8, L3, -2.2], [-5.8, L3, -5.6],
  [2.0, L1, 8.2], [6.8, L1, 8.4], [-2.0, PLAYA, 8.6], [-5.8, PLAYA, 9.4], [3.6, L2, -5.8], [-1.6, L2, 6.0],
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

function isNightNow(): boolean {
  const forced = new URLSearchParams(location.search).get('hour')
  const h = forced ? Number(forced) : new Date().getHours()
  return h < 7 || h >= 20
}

/**
 * La cámara vuela suavemente hacia el lugar activo. En la vista de isla el jugador puede girar
 * y acercarse; al entrar en un lugar la cámara se coloca de frente y los controles se apagan.
 */
function CameraRig({ controls }: { controls: React.RefObject<OrbitControlsImpl | null> }) {
  const view = useGame((s) => s.view)
  const { camera, size } = useThree()
  const goalPos = useRef(new THREE.Vector3())
  const goalTarget = useRef(new THREE.Vector3())
  const lastKey = useRef<string>('')
  const flying = useRef(false)

  useFrame((_, dt) => {
    const ctl = controls.current
    if (!ctl) return
    const aspect = size.width / size.height
    const portrait = aspect < 1
    const fov = (camera as THREE.PerspectiveCamera).fov
    // Recalculamos el destino si cambia la vista o la orientación de la pantalla.
    const key = `${view}:${portrait ? 'p' : 'l'}`
    if (key !== lastKey.current) {
      lastKey.current = key
      flying.current = true
      const pose = view === 'isla' ? islandPose(fov, aspect, portrait) : cameraPoseFor(PLACES[view], fov, aspect, portrait ? 0.5 : 0.2)
      goalPos.current.set(...pose.position)
      goalTarget.current.set(...pose.target)
    }

    const free = view === 'isla'
    ctl.enabled = free && !flying.current
    if (flying.current || !free) {
      const a = 1 - Math.exp(-4 * dt)
      camera.position.lerp(goalPos.current, a)
      ctl.target.lerp(goalTarget.current, a)
      if (camera.position.distanceTo(goalPos.current) < 0.03) flying.current = false
    }
    ctl.update()
  })

  return null
}

function Scene() {
  const game = useGame((s) => s.game)!
  const nowMs = useGame((s) => s.nowMs)
  const acornsFound = useGame((s) => s.acornsFound)
  const { collect, setView, pickAcorn } = useGame.getState()
  const controls = useRef<OrbitControlsImpl>(null)

  const month = currentMonth(game, nowMs)
  const cal = calendarOf(month)
  const palette = PALETTES[cal.season]
  const night = isNightNow()
  const taskAvailable = game.taskDoneMonth < month
  const spots = useMemo(() => acornSpotsFor(game.seed, month), [game.seed, month])
  const has = (id: string) => game.purchases.some((p) => p.itemId === id)
  const seed = game.seed % 1000
  const { casa, banco, faro, cofre, tienda } = PLACES

  return (
    <>
      <color attach="background" args={[night ? '#22344a' : palette.sky]} />
      <fog attach="fog" args={[night ? '#22344a' : palette.skyBottom, 70, 190]} />
      <ambientLight intensity={night ? 0.3 : palette.ambient} color={night ? '#9db4d6' : '#ffffff'} />
      <hemisphereLight intensity={0.55} color={palette.sky} groundColor={palette.water} />
      <directionalLight
        position={[10, 14, 8]}
        intensity={night ? 0.45 : palette.sunIntensity}
        color={night ? '#b9c8e6' : palette.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-far={50}
      />

      <Water palette={palette} />

      {/* ===== TERRENO: tres niveles naturales ===== */}
      {/* Nivel inferior: plataforma de la cueva (sureste) */}
      <Terrace radius={5.0} height={L1} seed={seed + 3} position={[4.8, 0, 7.6]} squash={0.9} verts={12} topColor={palette.grass} boulderSize={0.8} />
      {/* Playa (suroeste) */}
      <Beach radius={4.0} seed={seed + 5} position={[-3.6, 0, 8.6]} squash={0.85} />
      {/* Nivel central: la gran meseta */}
      <Terrace radius={9.6} height={L2} seed={seed} position={[0, 0, 0]} squash={0.8} verts={16} topColor={palette.grass} boulderSize={1.0} />
      {/* Nivel superior: el promontorio del faro */}
      <Terrace radius={4.4} height={L3 - L2} seed={seed + 7} position={[-3.4, L2, -4.4]} squash={0.85} verts={11} topColor={palette.grassTop} boulderSize={0.6} />

      {/* Escaleras entre niveles */}
      <Stairs position={[0.2, L2, -1.2]} rotation={Math.PI / 4} rise={L3 - L2} />
      <Stairs position={[2.2, L1, 6.3]} rotation={0.42} rise={L2 - L1} />
      <Stairs position={[-4.0, PLAYA, 6.6]} rotation={-0.15} rise={L2 - PLAYA} width={1.5} />

      {/* Caminos */}
      <Path y={L2} points={[[6.2, 3.4], [4.2, 3.6], [2.4, 3.0], [0.4, 2.8], [-1.8, 3.4], [-3.4, 4.0]]} />
      <Path y={L2} points={[[0.4, 2.8], [0.3, 1.0], [0.2, -1.1]]} width={0.6} />
      <Path y={L2} points={[[2.4, 3.0], [2.3, 4.4], [2.3, 5.8]]} width={0.6} />
      <Path y={L2} points={[[-1.8, 3.4], [-3.2, 5.0], [-4.0, 6.2]]} width={0.6} />
      <Path y={L1} points={[[2.4, 6.8], [3.4, 7.0], [4.6, 7.3], [5.4, 7.6]]} width={0.6} />
      <Path y={PLAYA} points={[[-4.0, 7.0], [-3.9, 8.8], [-3.8, 10.4]]} width={0.7} color={C.sandWet} />

      {/* ===== LUGARES ===== */}
      <House position={casa.position} rotation={casa.rotation} palette={palette} night={night} mailboxCents={game.mailboxCents} onTap={() => setView('casa')} onMailbox={collect} />
      <Bank position={banco.position} rotation={banco.rotation} palette={palette} night={night} unlocked={game.bankUnlocked} cents={game.bankCents} onTap={() => setView('banco')} />
      <Lighthouse position={faro.position} rotation={faro.rotation} palette={palette} night={night} onTap={() => setView('faro')} />
      <Cave position={cofre.position} rotation={cofre.rotation} palette={palette} cents={game.huchaCents} onTap={() => setView('cofre')} />
      <Pier position={[-3.8, 0, 10.6]} rotation={0.05} length={4.4} />
      <MerchantBoat position={tienda.position} rotation={tienda.rotation} onTap={() => setView('tienda')} />

      {/* ===== VEGETACIÓN Y ROCAS ===== */}
      <Palm position={[7.6, L2, -2.0]} h={3.4} lean={0.3} rotation={1.1} palette={palette} />
      <Palm position={[8.4, L2, 0.8]} h={2.8} lean={0.25} rotation={2.2} palette={palette} scale={0.9} />
      <Palm position={[-8.2, L2, 3.4]} h={3.2} lean={0.35} rotation={-0.6} palette={palette} />
      <Palm position={[-8.6, L2, -1.4]} h={2.6} lean={0.2} rotation={3.0} palette={palette} scale={0.85} />
      <Palm position={[1.6, L2, -6.4]} h={3.0} lean={0.3} rotation={0.4} palette={palette} />
      <Palm position={[8.0, L1, 6.4]} h={3.0} lean={0.3} rotation={1.8} palette={palette} />
      <Palm position={[-6.2, PLAYA, 10.4]} h={2.8} lean={0.4} rotation={-1.2} palette={palette} scale={0.9} />
      <Palm position={[-0.4, PLAYA, 10.0]} h={2.4} lean={0.35} rotation={0.9} palette={palette} scale={0.8} />
      <Palm position={[6.6, L2, 4.6]} h={2.6} lean={0.3} rotation={2.6} palette={palette} scale={0.85} />
      <Bush position={[2.8, L2, -4.6]} palette={palette} />
      <Bush position={[-1.0, L2, 5.4]} palette={palette} scale={0.8} />
      <Bush position={[7.4, L2, 2.8]} palette={palette} scale={0.7} />
      <Bush position={[-7.0, L2, 5.2]} palette={palette} scale={0.9} />
      <Bush position={[0.4, L3, -6.2]} palette={palette} scale={0.8} />
      <Bush position={[-6.2, L3, -3.6]} palette={palette} scale={0.7} />
      <Flowers position={[1.2, L2, 1.8]} seed={51} />
      <Flowers position={[-0.8, L2, 1.6]} seed={52} count={4} />
      <Flowers position={[3.4, L1, 8.6]} seed={53} count={4} />
      <Flowers position={[-1.4, L2, -3.2]} seed={54} count={4} />
      <GrassTuft position={[4.6, L2, -3.6]} palette={palette} />
      <GrassTuft position={[-5.4, L2, -4.8]} palette={palette} scale={1.2} />
      <GrassTuft position={[1.0, L1, 8.4]} palette={palette} />
      <GrassTuft position={[6.4, L2, -5.2]} palette={palette} />
      <RockCluster position={[7.2, L2, -4.6]} size={0.9} seed={61} />
      <RockCluster position={[-8.4, L2, 1.0]} size={0.7} seed={62} count={3} />
      <RockCluster position={[8.4, L1, 4.4]} size={0.8} seed={63} count={3} />
      <RockCluster position={[3.6, L2, -6.6]} size={0.8} seed={66} count={3} />
      <Rock position={[-1.6, PLAYA, 11.4]} size={0.5} seed={64} color={C.rockLight} />
      <Rock position={[1.4, 0, 11.8]} size={0.7} seed={65} />
      {/* Zona libre al este (x 4..8, z -6..-1) y al norte (x -1..3, z -8..-5): reservada para futuros edificios */}

      {/* ===== OBJETOS COMPRADOS ===== */}
      {has('cometa') && <Kite position={[1.0, L2, 5.0]} />}
      {has('balon') && <Ball position={[3.4, L2, 4.6]} />}
      {has('bici') && <Bike position={[2.4, L2, 1.6]} rotation={0.9} />}
      {has('telescopio') && <Telescope position={[-6.4, L3, -5.6]} />}

      {/* ===== BELLOTAS DEL DÍA ===== */}
      {taskAvailable &&
        spots.map((spotIndex, i) =>
          acornsFound.includes(i) ? null : <Acorn key={`${month}-${i}`} position={ACORN_SPOTS[spotIndex]} onPick={() => pickAcorn(i)} />,
        )}

      <OrbitControls
        ref={controls}
        enablePan={false}
        enableDamping
        dampingFactor={0.12}
        minDistance={8}
        maxDistance={60}
        minPolarAngle={0.5}
        maxPolarAngle={1.25}
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      />
      <CameraRig controls={controls} />
    </>
  )
}

export function Island() {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.75]}
      camera={{ position: [18, 18, 20], fov: 40, near: 0.5, far: 140 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'none' }}
    >
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  )
}
