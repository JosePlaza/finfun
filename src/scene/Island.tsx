import { Suspense, useMemo, useRef } from 'react'
import { Canvas, events as defaultEvents, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { BUSINESS_BY_ID, calendarOf, currentMonth, TUTORIAL_DONE } from '../sim'
import { mulberry32 } from '../sim/rng'
import { isDevMode, useGame } from '../store/game'
import { PALETTES, type SeasonPalette } from './palette'
import { BUILDINGS, BUILDING_BY_ID, buildingPositions, cameraPoseFor, fitDistance, ISLAND_VIEW, islandPose, PIER, SITES, type BuildingDef, type BuildingId } from './registry'
import { ISLAND_RX, ISLAND_RZ, makeTerrain, scatter, type Terrain } from './terrain'
import { acornSpotsFor, acornSpotsOn } from './acorns'
import { CoastRocks, Ground, Path, Water } from './Landscape'
import { Acorn, Beacon, Bush, Flowers, GrassTuft, Palm } from './kit/Nature'
import { Plinth } from './kit/Parts'
import { Ball, Bike, Canoe, Kite, Scooter, Swing, Telescope, Tent } from './kit/Objects'
import { House } from './buildings/House'
import { Bank } from './buildings/Bank'
import { Lighthouse } from './buildings/Lighthouse'
import { Cave } from './buildings/Cave'
import { Shop } from './buildings/Shop'
import { MerchantBoat, Pier, Rowboat } from './buildings/Pier'
import { GenericBuilding } from './buildings/Generic'
import { Ambient, type Action, type Prop, type Stop } from './Ambient'
import { avatarOr, LIEBRE_AVATAR, NEIGHBORS, type AvatarDef } from './avatars/catalog'
import { forwardOf } from './registry'
import { boatPose, LiebreBoat, LiebreIsland, liebreIslandPose } from './LiebreIsland'
import { COACH_STEPS } from '../ui/coachSteps'

type V3 = [number, number, number]

/**
 * Momento del día. Nunca oscurecemos la isla: por la tarde-noche el cielo se vuelve cálido,
 * se encienden ventanas y farolas y el faro gira, pero todo sigue viéndose con claridad.
 */
function isEveningNow(): boolean {
  const forced = new URLSearchParams(location.search).get('hour')
  const h = forced ? Number(forced) : new Date().getHours()
  return h < 8 || h >= 19
}

const CASA = BUILDING_BY_ID.casa

/** Qué hace un vecino al llegar a cada edificio. */
const STOP_ACTION: Partial<Record<BuildingId, Action>> = {
  casa: 'wave',
  tienda: 'carry',
  banco: 'look',
  cofre: 'look',
  faro: 'wave',
  huerto: 'work',
  ayuntamiento: 'wave',
  hacienda: 'look',
  escuela: 'wave',
  mercado: 'carry',
  panaderia: 'carry',
  heladeria: 'look',
  puerto: 'carry',
  astillero: 'work',
  molino: 'look',
  posada: 'wave',
  granja: 'work',
  cantera: 'work',
  taller: 'carry',
  observatorio: 'look',
  fondo: 'look',
}

/** Caminos: qué edificios están unidos. El trazado sigue el terreno y se curva un poco. */
const ROADS: [BuildingId, BuildingId][] = [
  ['casa', 'tienda'],
  ['tienda', 'banco'],
  ['banco', 'ayuntamiento'],
  ['ayuntamiento', 'faro'],
  ['ayuntamiento', 'escuela'],
  ['escuela', 'casa'],
  ['casa', 'mercado'],
  ['mercado', 'panaderia'],
  ['panaderia', 'astillero'],
  ['astillero', 'puerto'],
  ['puerto', 'cofre'],
  ['cofre', 'tienda'],
  ['tienda', 'heladeria'],
  ['banco', 'hacienda'],
  ['hacienda', 'molino'],
  ['hacienda', 'taller'],
  ['taller', 'fondo'],
  ['fondo', 'heladeria'],
  ['faro', 'posada'],
  ['ayuntamiento', 'observatorio'],
  ['observatorio', 'granja'],
  ['granja', 'mercado'],
  ['mercado', 'cantera'],
  ['casa', 'cofre'],
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
const OVERVIEW_VIEWS = new Set(['isla', 'misiones', 'eventos', 'patrimonio', 'liebre', 'ajustes', 'perfil'])

function CameraRig({ controls, positions, terrain }: { controls: React.RefObject<OrbitControlsImpl | null>; positions: Record<BuildingId, V3>; terrain: Terrain }) {
  /** Vista cercana de un punto del suelo (pista de bellota): mismo ángulo que la vista general, mucho más cerca. */
  const focusPose = (x: number, z: number, fov: number, aspect: number) => {
    const t: V3 = [x, terrain.height(x, z) + 0.5, z]
    const d = fitDistance(14, 12, fov, aspect)
    const dir = ISLAND_VIEW.dir
    return { target: t, position: [t[0] + dir[0] * d, t[1] + dir[1] * d, t[2] + dir[2] * d] as V3 }
  }
  const view = useGame((s) => s.view)
  const infoBuilding = useGame((s) => s.infoBuilding)
  const focusPoint = useGame((s) => s.focusPoint)
  const trip = useGame((s) => s.trip)
  const tripStartMs = useGame((s) => s.tripStartMs)
  const recenterSeq = useGame((s) => s.recenterSeq)
  const setCamOffCenter = useGame((s) => s.setCamOffCenter)
  const { camera, size } = useThree()
  const goalPos = useRef(new THREE.Vector3())
  const goalTarget = useRef(new THREE.Vector3())
  const lastKey = useRef<string>('')
  const flying = useRef(false)
  /** Cuándo empezó el vuelo actual: si el objetivo no es alcanzable (límites de los controles), se corta a los 2,5 s. */
  const flightStart = useRef(0)
  const boat = useMemo(() => ({ pos: new THREE.Vector3(), dir: new THREE.Vector3() }), [])

  useFrame((_, dt) => {
    const ctl = controls.current
    if (!ctl) return
    const aspect = size.width / size.height
    const portrait = aspect < 1
    const fov = (camera as THREE.PerspectiveCamera).fov
    // En barca: la cámara va detrás y algo por encima, mirando por delante de la proa.
    if (trip === 'going' || trip === 'returning') {
      boatPose(trip, (performance.now() - tripStartMs) / 1000, boat)
      goalTarget.current.set(boat.pos.x + boat.dir.x * 6, 1.0, boat.pos.z + boat.dir.z * 6)
      goalPos.current.set(boat.pos.x - boat.dir.x * 12 + boat.dir.z * 4, 7.5, boat.pos.z - boat.dir.z * 12 - boat.dir.x * 4)
      const a = 1 - Math.exp(-3.2 * dt)
      camera.position.lerp(goalPos.current, a)
      ctl.target.lerp(goalTarget.current, a)
      ctl.enabled = false
      lastKey.current = `trip:${trip}`
      flying.current = true
      ctl.update()
      return
    }
    // Qué edificio mira la cámara: el lugar de la vista, o el edificio de la ficha.
    const target: BuildingId | null = view === 'edificio' || view === 'negocio' ? infoBuilding : OVERVIEW_VIEWS.has(view) ? null : (view as BuildingId)
    const focus = view === 'isla' ? focusPoint : null
    const there = trip === 'there'
    const panelOpen = there && view !== 'isla'
    // Los paneles generales (misiones, eventos, patrimonio, ajustes) no mueven la cámara: se queda donde la dejó el jugador.
    const scene = there ? 'liebre' : OVERVIEW_VIEWS.has(view) ? 'isla' : view
    const key = `${scene}:${there ? (panelOpen ? 'panel' : '') : (target ?? '')}:${focus && !there ? focus.join(',') : ''}:${portrait ? 'p' : 'l'}:${recenterSeq}`
    if (key !== lastKey.current) {
      lastKey.current = key
      flying.current = true
      flightStart.current = performance.now()
      const pose = there
        ? liebreIslandPose(fov, aspect, portrait, panelOpen && portrait ? 0.5 : 0)
        : focus
          ? focusPose(focus[0], focus[1], fov, aspect)
          : target
            ? cameraPoseFor(BUILDING_BY_ID[target], positions[target], fov, aspect, portrait ? 0.5 : 0)
            : islandPose(fov, aspect, portrait)
      goalPos.current.set(...pose.position)
      goalTarget.current.set(...pose.target)
    }
    const free = OVERVIEW_VIEWS.has(view) || there
    if (flying.current || !free) {
      const a = 1 - Math.exp(-4 * dt)
      camera.position.lerp(goalPos.current, a)
      ctl.target.lerp(goalTarget.current, a)
      // El vuelo termina al llegar… o al cabo de 2,5 s si los límites de los controles no dejan llegar
      // (por ejemplo, la vista general en un móvil vertical queda más lejos que maxDistance). Si no,
      // los controles se quedarían bloqueados para siempre.
      if (camera.position.distanceTo(goalPos.current) < 0.05 || performance.now() - flightStart.current > 2500) flying.current = false
    }
    ctl.enabled = free && !flying.current
    ctl.update()
    // Desplazamiento libre (dos dedos / botón derecho): el punto que mira la cámara no puede salirse de la isla.
    if (ctl.enabled && !there) {
      const t = ctl.target
      const rx = ISLAND_RX * 1.15
      const rz = ISLAND_RZ * 1.15
      const r = Math.hypot(t.x / rx, t.z / rz)
      if (r > 1) {
        const nx = t.x / r
        const nz = t.z / r
        camera.position.x += nx - t.x
        camera.position.z += nz - t.z
        t.x = nx
        t.z = nz
      }
      setCamOffCenter(Math.hypot(t.x / ISLAND_RX, t.z / ISLAND_RZ) > 0.3)
    } else if (!there && flying.current) setCamOffCenter(false)
    if (isDevMode)
      (window as unknown as { finfunCam: unknown }).finfunCam = {
        flying: flying.current,
        enabled: ctl.enabled,
        dist: camera.position.distanceTo(goalPos.current),
        pos: camera.position.toArray(),
      }
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
  const avatarId = useGame((s) => s.avatar)
  const nowMs = useGame((s) => s.nowMs)
  const acornsFound = useGame((s) => s.acornsFound)
  const acornHint = useGame((s) => s.acornHint)
  const acornReveal = useGame((s) => s.acornReveal)
  const { collect, setView, pickAcorn, showBuilding, showBusiness } = useGame.getState()
  const controls = useRef<OrbitControlsImpl>(null)

  const month = currentMonth(game, nowMs)
  const cal = calendarOf(month)
  const palette = PALETTES[cal.season]
  const night = isEveningNow()
  const taskAvailable = game.taskDoneMonth < month
  const has = (id: string) => game.purchases.some((p) => p.itemId === id)

  const terrain = useMemo(() => makeTerrain(game.seed % 1000, SITES), [game.seed])
  const acornSpots = useMemo(() => acornSpotsOn(terrain), [terrain])
  const spots = useMemo(() => acornSpotsFor(game.seed, month, acornSpots.length), [game.seed, month, acornSpots.length])
  const positions = useMemo(() => buildingPositions(terrain), [terrain])
  const roads = useMemo(() => ROADS.map(([a, b]) => roadPoints(a, b, terrain.seed)), [terrain])
  const at = (x: number, z: number): V3 => [x, terrain.height(x, z), z]

  // Vecinos: cuantos más niveles abiertos, más gente paseando. Cada uno recorre una ruta propia por los
  // edificios abiertos y en cada parada hace algo relacionado con el sitio. La Liebre siempre está.
  const huertoBuilt = game.huertoBuiltMonth !== null
  const { routes, doers } = useMemo(() => {
    const open = BUILDINGS.filter((b) => b.world <= game.world && (b.id !== 'huerto' || huertoBuilt))
    const front = (b: BuildingDef, extra = 0.6): [number, number] => {
      const [fx, fz] = forwardOf(b.rotation)
      return [b.x + fx * (b.footprint + extra), b.z + fz * (b.footprint + extra)]
    }
    const stopFor = (b: BuildingDef): Stop => {
      const [x, z] = front(b, 0.9)
      const [fx, fz] = forwardOf(b.rotation)
      const action = STOP_ACTION[b.id] ?? 'look'
      return { x, z, action, dwell: action === 'work' ? 6 : action === 'carry' ? 2.5 : 4, face: [-fx, -fz] }
    }
    const rng = mulberry32(terrain.seed + 77)
    const shuffled = (arr: BuildingDef[]) => {
      const a = arr.slice()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    }
    const walkers = 2 * game.world
    // El primer paseante es el propio jugador, con su avatar; los demás son vecinos.
    const routes: { stops: Stop[]; look: AvatarDef; speed: number; offset: number }[] = []
    for (let i = 0; i < walkers; i++) {
      const picks = shuffled(open).slice(0, Math.min(open.length, 4 + (i % 3)))
      if (picks.length < 3) continue
      routes.push({ stops: picks.map(stopFor), look: i === 0 ? avatarOr(avatarId) : NEIGHBORS[i % NEIGHBORS.length], speed: 1.0 + (i % 3) * 0.15, offset: i * 7 })
    }
    // La Liebre: siempre con prisa, entre la tienda, la casa y el cofre.
    const liebreStops = ['tienda', 'casa', 'cofre', 'banco'].map((id) => stopFor(BUILDING_BY_ID[id as BuildingId]))
    liebreStops.forEach((st) => (st.dwell = 1.5))
    routes.push({ stops: liebreStops, look: LIEBRE_AVATAR, speed: 1.7, offset: 11 })

    // Gente quieta haciendo su trabajo.
    const doers: { position: V3; rotation: number; look: AvatarDef; action: Action; prop: Prop }[] = []
    doers.push({ position: [PIER.x + 0.4, 0.55, PIER.z + PIER.length + 0.4], rotation: Math.PI * 0.1, look: NEIGHBORS[5], action: 'sit', prop: 'rod' })
    const tienda = BUILDING_BY_ID.tienda
    const [tx, tz] = front(tienda, 1.6)
    doers.push({ position: [tx + 1.2, terrain.height(tx + 1.2, tz), tz], rotation: tienda.rotation + Math.PI + 0.6, look: NEIGHBORS[4], action: 'work', prop: 'broom' })
    if (huertoBuilt) {
      const h = BUILDING_BY_ID.huerto
      const [hx, hz] = front(h, 1.2)
      doers.push({ position: [hx - 1, terrain.height(hx - 1, hz), hz], rotation: h.rotation + Math.PI, look: NEIGHBORS[8], action: 'work', prop: 'hoe' })
    }
    if (game.bankUnlocked) {
      const b = BUILDING_BY_ID.banco
      const [bx, bz] = front(b, 1.4)
      doers.push({ position: [bx - 1.4, terrain.height(bx - 1.4, bz), bz], rotation: b.rotation + 0.4, look: NEIGHBORS[9], action: 'wave', prop: 'none' })
    }
    return { routes, doers }
  }, [terrain, game.world, huertoBuilt, game.bankUnlocked, avatarId])

  // Tocar un edificio abierto lleva a su panel; uno en obras (o sin panel todavía) muestra su ficha: qué se hará allí.
  const tapBuilding = (id: BuildingId) => {
    const def = BUILDING_BY_ID[id]
    if (def.view && game.world >= def.world) return setView(def.view)
    // Un negocio que ya cotiza abre su ficha de acciones.
    if (BUSINESS_BY_ID[id] && game.world >= def.world) return showBusiness(id)
    showBuilding(id)
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
            return (
              <House
                key={def.id}
                position={pos}
                rotation={def.rotation}
                palette={palette}
                night={night}
                mailboxCents={game.mailboxCents}
                onTap={() => setView('casa')}
                onMailbox={collect}
              />
            )
          case 'banco':
            return <Bank key={def.id} position={pos} rotation={def.rotation} palette={palette} night={night} unlocked cents={game.bankCents} onTap={() => setView('banco')} />
          case 'tienda':
            return <Shop key={def.id} position={pos} rotation={def.rotation} palette={palette} night={night} onTap={() => setView('tienda')} />
          case 'cofre':
            return <Cave key={def.id} position={pos} rotation={def.rotation} palette={palette} cents={game.huchaCents} onTap={() => setView('cofre')} />
          case 'faro':
            return <Lighthouse key={def.id} position={pos} rotation={def.rotation} palette={palette} night={night} onTap={() => setView('faro')} />
          default:
            return (
              <GenericBuilding
                key={def.id}
                def={def}
                position={pos}
                palette={palette}
                night={night}
                unlocked={unlocked}
                built={def.id === 'huerto' ? game.huertoBuiltMonth !== null : true}
                upgraded={def.id === 'huerto' && game.huertoUpgradedMonth !== null}
                ownedPct={game.holdings?.[def.id]?.shares}
                onTap={() => tapBuilding(def.id)}
              />
            )
        }
      })}

      {/* Muelle y barcas en la playa */}
      <Pier position={[PIER.x, 0, PIER.z]} rotation={PIER.rotation} length={PIER.length} />
      <MerchantBoat position={[PIER.x + 1.9, 0.04, PIER.z + 3.2]} rotation={PIER.rotation + 0.2} onTap={() => setView('tienda')} />
      <Rowboat position={[PIER.x - 1.2, 0.02, PIER.z + 2.6]} rotation={-0.35} />

      {/* ===== RECORRIDO INICIAL: haz sobre el edificio del paso ===== */}
      {game.tutorialStep < TUTORIAL_DONE && COACH_STEPS[game.tutorialStep]?.target && <Beacon position={positions[COACH_STEPS[game.tutorialStep].target as BuildingId]} />}

      {/* ===== LA ISLA DE LA LIEBRE (a lo lejos) Y SU BARCA ===== */}
      <LiebreIsland palette={palette} night={night} />
      <LiebreBoat />

      <Vegetation terrain={terrain} palette={palette} />
      <Ambient terrain={terrain} routes={routes} doers={doers} />

      {/* ===== OBJETOS COMPRADOS ===== */}
      {/* Alrededor de la casa, sobre su explanada; el telescopio en el acantilado del faro y la canoa en la playa. */}
      {has('cometa') && <Kite position={at(CASA.x - 2.6, CASA.z + 2.6)} />}
      {has('balon') && <Ball position={at(CASA.x - 1.2, CASA.z + 3.4)} />}
      {has('patinete') && <Scooter position={at(CASA.x + 3.2, CASA.z + 1.4)} rotation={1.2} />}
      {has('bici') && <Bike position={at(CASA.x + 3.4, CASA.z - 0.4)} rotation={0.9} />}
      {has('tienda-campana') && <Tent position={at(CASA.x - 3.6, CASA.z - 1.0)} rotation={0.6} />}
      {has('columpio') && <Swing position={at(CASA.x + 0.8, CASA.z - 3.6)} rotation={0.3} />}
      {has('telescopio') && <Telescope position={at(BUILDING_BY_ID.faro.x + 3.2, BUILDING_BY_ID.faro.z + 3.4)} />}
      {has('canoa') && <Canoe position={[PIER.x - 3.2, 0.05, PIER.z + 1.2]} rotation={0.5} />}

      {/* ===== BELLOTAS DEL DÍA ===== */}
      {(taskAvailable || acornReveal) &&
        spots.map((spotIndex, i) => {
          if (acornsFound.includes(i)) return null
          const [x, z] = acornSpots[spotIndex]
          const pos = at(x, z)
          const showBeacon = acornReveal || acornHint === i
          return (
            <group key={`${month}-${i}`}>
              <Acorn position={pos} onPick={() => taskAvailable && pickAcorn(i)} />
              {showBeacon && <Beacon position={pos} color={acornReveal ? '#ff8a7a' : undefined} />}
            </group>
          )
        })}

      <OrbitControls
        ref={controls}
        enablePan
        screenSpacePanning={false}
        panSpeed={0.9}
        enableDamping
        dampingFactor={0.12}
        minDistance={10}
        maxDistance={170}
        minPolarAngle={0.45}
        maxPolarAngle={1.25}
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      />
      <CameraRig controls={controls} positions={positions} terrain={terrain} />
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
      // Las bellotas siempre ganan el toque: si el dedo alcanza una, se ignora todo lo demás
      // (las zonas de toque de los edificios son grandes y, si no, se las llevarían por delante).
      events={(store) => ({
        ...defaultEvents(store),
        filter: (hits: THREE.Intersection[]) => (hits.some((h) => h.object.userData.acorn) ? hits.filter((h) => h.object.userData.acorn) : hits),
      })}
    >
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  )
}
