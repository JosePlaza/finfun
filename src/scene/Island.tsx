import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { calendarOf, currentMonth, TASK_ACORNS } from '../sim'
import { mulberry32, rngFor } from '../sim/rng'
import { useGame } from '../store/game'
import { PALETTES, type SeasonPalette } from './palette'
import { BUILDINGS, BUILDING_BY_ID, buildingPositions, cameraPoseFor, islandPose, PIER, SITES, type BuildingId } from './registry'
import { makeTerrain, scatter, type Terrain } from './terrain'
import { CoastRocks, Ground, Path, Water } from './Landscape'
import { Acorn, Bush, Flowers, GrassTuft, Palm } from './kit/Nature'
import { Plinth } from './kit/Parts'
import { Ball, Bike, Kite, Telescope } from './kit/Objects'
import { House } from './buildings/House'
import { Bank } from './buildings/Bank'
import { Lighthouse } from './buildings/Lighthouse'
import { Cave } from './buildings/Cave'
import { Shop } from './buildings/Shop'
import { MerchantBoat, Pier, Rowboat } from './buildings/Pier'
import { GenericBuilding } from './buildings/Generic'
import { Ambient } from './Ambient'
import { forwardOf } from './registry'

type V3 = [number, number, number]

/** Lugares (x, z) donde pueden aparecer bellotas; la altura se toma del terreno. */
const ACORN_XZ: [number, number][] = [
  [-2, 6], [6, -1], [-12, 3], [-2, -8], [-9, -8], [-17, -14], [5, 19], [13, 19], [-2, 19], [-12, 18], [20, -17], [-3, 12],
  [21, 1], [-23, 0], [11, -14], [-16, 7], [14, 9], [-6, 10], [-10, -18], [1, -20], [7, 8], [-13, -4],
]

function acornSpotsFor(seed: number, month: number): number[] {
  const rng = rngFor(seed, month, 41)
  const idx = ACORN_XZ.map((_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx.slice(0, TASK_ACORNS)
}

/**
 * Momento del día. Nunca oscurecemos la isla: por la tarde-noche el cielo se vuelve cálido,
 * se encienden ventanas y farolas y el faro gira, pero todo sigue viéndose con claridad.
 */
function isEveningNow(): boolean {
  const forced = new URLSearchParams(location.search).get('hour')
  const h = forced ? Number(forced) : new Date().getHours()
  return h < 8 || h >= 19
}

/** Caminos: qué edificios están unidos. El trazado sigue el terreno y se curva un poco. */
const ROADS: [BuildingId, BuildingId][] = [
  ['casa', 'tienda'], ['tienda', 'banco'], ['banco', 'ayuntamiento'], ['ayuntamiento', 'faro'], ['ayuntamiento', 'escuela'],
  ['escuela', 'casa'], ['casa', 'mercado'], ['mercado', 'panaderia'], ['panaderia', 'astillero'], ['astillero', 'puerto'],
  ['puerto', 'cofre'], ['cofre', 'tienda'], ['tienda', 'heladeria'], ['banco', 'hacienda'], ['hacienda', 'molino'],
  ['hacienda', 'taller'], ['taller', 'fondo'], ['fondo', 'heladeria'], ['faro', 'posada'], ['ayuntamiento', 'observatorio'],
  ['observatorio', 'granja'], ['granja', 'mercado'], ['mercado', 'cantera'], ['casa', 'cofre'],
]

function roadPoints(a: BuildingId, b: BuildingId, seed: number): [number, number][] {
  const A = BUILDING_BY_ID[a]
  const B = BUILDING_BY_ID[b]
  const dx = B.x - A.x
  const dz = B.z - A.z
  const len = Math.hypot(dx, dz) || 1
  const ux = dx / len
  const uz = dz / len
  const start: [number, number] = [A.x + ux * A.footprint * 0.7, A.z + uz * A.footprint * 0.7]
  const end: [number, number] = [B.x - ux * B.footprint * 0.7, B.z - uz * B.footprint * 0.7]
  const rng = mulberry32(seed + a.length * 31 + b.length * 17)
  const bend = (rng() - 0.5) * Math.min(3, len * 0.25)
  const mid: [number, number] = [(start[0] + end[0]) / 2 - uz * bend, (start[1] + end[1]) / 2 + ux * bend]
  return [start, mid, end]
}

/**
 * La cámara vuela suavemente hacia el lugar activo. En la vista de isla el jugador puede girar
 * y acercarse; al entrar en un lugar la cámara se coloca de frente y los controles se apagan.
 */
function CameraRig({ controls, positions }: { controls: React.RefObject<OrbitControlsImpl | null>; positions: Record<BuildingId, V3> }) {
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
    const key = `${view}:${portrait ? 'p' : 'l'}`
    if (key !== lastKey.current) {
      lastKey.current = key
      flying.current = true
      const overview = view === 'isla' || view === 'misiones' || view === 'eventos' || view === 'patrimonio'
      const pose = overview ? islandPose(fov, aspect, portrait) : cameraPoseFor(BUILDING_BY_ID[view], positions[view], fov, aspect, portrait ? 0.5 : 0)
      goalPos.current.set(...pose.position)
      goalTarget.current.set(...pose.target)
    }
    const free = view === 'isla' || view === 'misiones' || view === 'eventos' || view === 'patrimonio'
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

/** Vegetación repartida por la isla evitando las explanadas de los edificios y los caminos. */
function Vegetation({ terrain, palette }: { terrain: Terrain; palette: SeasonPalette }) {
  const items = useMemo(() => {
    const farFromSites = (x: number, z: number, margin: number) => SITES.every((s) => Math.hypot(x - s.x, z - s.z) > s.r * 1.25 + margin)
    const palms = scatter(terrain, terrain.seed + 11, 52, (x, z, h, slope) => h > 0.5 && h < 3.2 && slope < 0.7 && farFromSites(x, z, 1.4))
    const bushes = scatter(terrain, terrain.seed + 22, 64, (x, z, h, slope) => h > 0.8 && slope < 0.8 && farFromSites(x, z, 0.8))
    const flowers = scatter(terrain, terrain.seed + 33, 48, (x, z, h, slope) => h > 0.9 && slope < 0.5 && farFromSites(x, z, 0.6))
    const tufts = scatter(terrain, terrain.seed + 44, 64, (x, z, h, slope) => h > 0.7 && slope < 0.9 && farFromSites(x, z, 0.5))
    const rng = mulberry32(terrain.seed + 55)
    return {
      palms: palms.map((p) => ({ p, h: 2.4 + rng() * 1.2, lean: 0.15 + rng() * 0.3, rot: rng() * Math.PI * 2, s: 0.8 + rng() * 0.35 })),
      bushes: bushes.map((p) => ({ p, s: 0.6 + rng() * 0.6 })),
      flowers: flowers.map((p, i) => ({ p, seed: i * 3 + 1 })),
      tufts: tufts.map((p) => ({ p, s: 0.8 + rng() * 0.6 })),
    }
  }, [terrain])
  return (
    <group>
      {items.palms.map((it, i) => (
        <Palm key={`p${i}`} position={it.p} h={it.h} lean={it.lean} rotation={it.rot} scale={it.s} palette={palette} />
      ))}
      {items.bushes.map((it, i) => (
        <Bush key={`b${i}`} position={it.p} scale={it.s} palette={palette} />
      ))}
      {items.flowers.map((it, i) => (
        <Flowers key={`f${i}`} position={it.p} seed={it.seed} />
      ))}
      {items.tufts.map((it, i) => (
        <GrassTuft key={`g${i}`} position={it.p} scale={it.s} palette={palette} />
      ))}
    </group>
  )
}

function Scene() {
  const game = useGame((s) => s.game)!
  const nowMs = useGame((s) => s.nowMs)
  const acornsFound = useGame((s) => s.acornsFound)
  const { collect, setView, pickAcorn, showToast } = useGame.getState()
  const controls = useRef<OrbitControlsImpl>(null)

  const month = currentMonth(game, nowMs)
  const cal = calendarOf(month)
  const palette = PALETTES[cal.season]
  const night = isEveningNow()
  const taskAvailable = game.taskDoneMonth < month
  const spots = useMemo(() => acornSpotsFor(game.seed, month), [game.seed, month])
  const has = (id: string) => game.purchases.some((p) => p.itemId === id)

  const terrain = useMemo(() => makeTerrain(game.seed % 1000, SITES), [game.seed])
  const positions = useMemo(() => buildingPositions(terrain), [terrain])
  const roads = useMemo(() => ROADS.map(([a, b]) => roadPoints(a, b, terrain.seed)), [terrain])
  const at = (x: number, z: number): V3 => [x, terrain.height(x, z), z]

  // Rutas de paseo: pasan por delante de la puerta de cada edificio del bucle.
  const walkerRoutes = useMemo(() => {
    const front = (id: BuildingId): [number, number] => {
      const b = BUILDING_BY_ID[id]
      const [fx, fz] = forwardOf(b.rotation)
      return [b.x + fx * (b.footprint + 0.6), b.z + fz * (b.footprint + 0.6)]
    }
    const loop = (ids: BuildingId[]) => ids.map(front)
    return [loop(['casa', 'tienda', 'banco', 'ayuntamiento', 'escuela']), loop(['cofre', 'puerto', 'astillero', 'panaderia', 'mercado', 'casa'])]
  }, [])

  const tapBuilding = (id: BuildingId) => {
    const def = BUILDING_BY_ID[id]
    if (def.view) return setView(def.view)
    if (game.world < def.world) showToast(`${def.name} · se abre en el Mundo ${def.world}. ${def.teaches}`)
    else showToast(`${def.name} · ${def.teaches} (próximamente)`)
  }

  return (
    <>
      <color attach="background" args={[night ? '#f0b98f' : palette.sky]} />
      <fog attach="fog" args={[night ? '#ffd9bd' : palette.skyBottom, 90, 260]} />
      <ambientLight intensity={night ? palette.ambient * 0.9 : palette.ambient} color={night ? '#ffe2c8' : '#ffffff'} />
      <hemisphereLight intensity={0.55} color={night ? '#f5c9a3' : palette.sky} groundColor={palette.water} />
      <directionalLight
        position={night ? [30, 16, 22] : [22, 34, 18]}
        intensity={night ? palette.sunIntensity * 0.85 : palette.sunIntensity}
        color={night ? '#ffb97a' : palette.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-far={110}
      />

      <Water palette={palette} />
      <Ground terrain={terrain} palette={palette} />
      <CoastRocks terrain={terrain} />
      {roads.map((pts, i) => (
        <Path key={i} points={pts} terrain={terrain} width={0.8} />
      ))}

      {/* ===== EDIFICIOS ===== */}
      {/* Zócalos: base sólida bajo cada edificio (la cueva es roca por sí misma) */}
      {BUILDINGS.filter((def) => def.id !== 'cofre').map((def) => (
        <Plinth key={`plinth-${def.id}`} radius={def.footprint * 1.05} position={positions[def.id]} />
      ))}
      {BUILDINGS.map((def) => {
        const pos = positions[def.id]
        const unlocked = game.world >= def.world
        switch (def.id) {
          case 'casa':
            return <House key={def.id} position={pos} rotation={def.rotation} palette={palette} night={night} mailboxCents={game.mailboxCents} onTap={() => setView('casa')} onMailbox={collect} />
          case 'banco':
            return <Bank key={def.id} position={pos} rotation={def.rotation} palette={palette} night={night} unlocked={game.bankUnlocked} cents={game.bankCents} onTap={() => setView('banco')} />
          case 'tienda':
            return <Shop key={def.id} position={pos} rotation={def.rotation} palette={palette} night={night} onTap={() => setView('tienda')} />
          case 'cofre':
            return <Cave key={def.id} position={pos} rotation={def.rotation} palette={palette} cents={game.huchaCents} onTap={() => setView('cofre')} />
          case 'faro':
            return <Lighthouse key={def.id} position={pos} rotation={def.rotation} palette={palette} night={night} onTap={() => setView('faro')} />
          default:
            return <GenericBuilding key={def.id} def={def} position={pos} palette={palette} night={night} unlocked={unlocked} onTap={() => tapBuilding(def.id)} />
        }
      })}

      {/* Muelle y barcas en la playa */}
      <Pier position={[PIER.x, 0, PIER.z]} rotation={PIER.rotation} length={PIER.length} />
      <MerchantBoat position={[PIER.x + 1.9, 0.04, PIER.z + 3.2]} rotation={PIER.rotation + 0.2} onTap={() => setView('tienda')} />
      <Rowboat position={[PIER.x - 1.2, 0.02, PIER.z + 2.6]} rotation={-0.35} />

      <Vegetation terrain={terrain} palette={palette} />
      <Ambient terrain={terrain} walkerRoutes={walkerRoutes} />

      {/* ===== OBJETOS COMPRADOS ===== */}
      {has('cometa') && <Kite position={at(6.5, 6.5)} />}
      {has('balon') && <Ball position={at(7.5, 5.5)} />}
      {has('bici') && <Bike position={at(6.8, 4.2)} rotation={0.9} />}
      {has('telescopio') && <Telescope position={at(-10.5, -10.5)} />}

      {/* ===== BELLOTAS DEL DÍA ===== */}
      {taskAvailable &&
        spots.map((spotIndex, i) => {
          if (acornsFound.includes(i)) return null
          const [x, z] = ACORN_XZ[spotIndex]
          return <Acorn key={`${month}-${i}`} position={at(x, z)} onPick={() => pickAcorn(i)} />
        })}

      <OrbitControls
        ref={controls}
        enablePan={false}
        enableDamping
        dampingFactor={0.12}
        minDistance={10}
        maxDistance={110}
        minPolarAngle={0.45}
        maxPolarAngle={1.25}
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      />
      <CameraRig controls={controls} positions={positions} />
    </>
  )
}

export function Island() {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.75]}
      camera={{ position: [40, 40, 45], fov: 40, near: 0.5, far: 300 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'none' }}
    >
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  )
}
