/**
 * LA ISLA DE LA LIEBRE · el "¿y si…?" hecho lugar.
 *
 * Un islote más pequeño a lo lejos (mismo mar, misma luz) con la casa de la Liebre desbordada de cosas,
 * su cueva con el cofre vacío, el solar del huerto que nunca construye, su muelle y la pizarra "Tú y la
 * Liebre". Se llega en su barca, que cruza el mar desde el muelle del jugador (la cámara la sigue).
 * El terreno reutiliza el generador de la isla grande, encogido.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { currentMonth, liebreAt, liebreCtx, LIEBRE_VISIT_WORLD } from '../sim'
import { useGame, type Trip } from '../store/game'
import { C, type SeasonPalette } from './palette'
import { BUILDING_BY_ID, fitDistance, ISLAND_VIEW } from './registry'
import { makeTerrain, type Site, type Terrain } from './terrain'
import { Ground } from './Landscape'
import { Bush, Flowers, GrassTuft, Palm, Rock } from './kit/Nature'
import { Box, Label, Mat, Plinth, TapZone } from './kit/Parts'
import { Ball, Bike, Canoe, Kite, Scooter, Swing, Telescope, Tent } from './kit/Objects'
import { House } from './buildings/House'
import { Cave } from './buildings/Cave'
import { Pier } from './buildings/Pier'
import { ForSaleLot } from './buildings/Generic'
import { Doer, LIEBRE, LOOKS } from './Ambient'

type V3 = [number, number, number]

/** Dónde está el islote respecto a la isla grande, y cuánto se encoge el terreno. */
export const LIEBRE_OFFSET: V3 = [82, 0, -36]
const SXZ = 0.42
const SY = 0.7
export const TRIP_SECONDS = 3.6

/** Sitios (en coordenadas del generador, antes de encoger) con su explanada. */
const L_SITES: Record<'casa' | 'cofre' | 'huerto' | 'pizarra', Site> = {
  casa: { x: 9, z: 3, r: 7 },
  cofre: { x: -9, z: 9, r: 7 },
  huerto: { x: 16, z: -8, r: 6 },
  pizarra: { x: -5, z: -6, r: 5 },
}
const L_PIER = { x: 1.5, z: 9.4, rotation: 0.05, length: 3.6 }

function liebreTerrain(seed: number): Terrain {
  return makeTerrain((seed % 1000) + 77, Object.values(L_SITES))
}

/** Altura del islote en coordenadas locales ya encogidas (relativas al OFFSET). */
function localHeight(t: Terrain, x: number, z: number): number {
  return SY * t.height(x / SXZ, z / SXZ)
}

function local(site: Site): [number, number] {
  return [site.x * SXZ, site.z * SXZ]
}

/** Dónde espera la barca de la Liebre en la isla del jugador. */
export const HOME_MOORING = { x: 14.5, z: 22.0 }

/** Recorrido de la barca: del muelle del jugador al muelle de la Liebre, rodeando la isla por el sureste. */
export const TRIP_CURVE = new THREE.CatmullRomCurve3(
  [
    // Amarrada en la playa del sur, a la vista desde la vista general (el muelle queda cortado en vertical).
    new THREE.Vector3(HOME_MOORING.x, 0, HOME_MOORING.z),
    new THREE.Vector3(26, 0, 32),
    new THREE.Vector3(44, 0, 28),
    new THREE.Vector3(66, 0, 4),
    new THREE.Vector3(LIEBRE_OFFSET[0] + L_PIER.x, 0, LIEBRE_OFFSET[2] + L_PIER.z + L_PIER.length + 1.6),
  ],
  false,
  'catmullrom',
  0.2,
)

const SAIL = (() => {
  const sh = new THREE.Shape()
  sh.moveTo(0, -0.7)
  sh.lineTo(0, 0.85)
  sh.lineTo(1.1, -0.7)
  sh.closePath()
  return sh
})()

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

/** Posición y dirección de la barca en el viaje: `u` 0..1 (ida) — la vuelta recorre la curva al revés. */
export function boatPose(trip: Trip, elapsedS: number, out: { pos: THREE.Vector3; dir: THREE.Vector3 }): number {
  const raw = Math.min(1, elapsedS / TRIP_SECONDS)
  const k = easeInOut(raw)
  const u = trip === 'returning' ? 1 - k : k
  TRIP_CURVE.getPointAt(u, out.pos)
  TRIP_CURVE.getTangentAt(u, out.dir)
  if (trip === 'returning') out.dir.negate()
  return raw
}

/** Encuadre del islote entero, mismo ángulo que la vista general de la isla grande. */
export function liebreIslandPose(fovDeg: number, aspect: number, portrait: boolean, panelRatio = 0): { position: V3; target: V3 } {
  const visible = 1 - panelRatio
  const frameH = portrait ? 26 : 24
  const d = fitDistance(portrait ? 20 : 28, frameH / visible, fovDeg, aspect)
  // Con el panel abierto, el punto que mira la cámara baja para que el islote quede en la parte visible.
  const t: V3 = [LIEBRE_OFFSET[0] + 0.5, (portrait ? 2.2 : 1.6) - (frameH * panelRatio) / visible / 2, LIEBRE_OFFSET[2] + 1.0]
  const dir = ISLAND_VIEW.dir
  return { target: t, position: [t[0] + dir[0] * d, t[1] + dir[1] * d, t[2] + dir[2] * d] }
}

function vivid(hex: string): string {
  const c = new THREE.Color(hex)
  c.offsetHSL(0.01, 0.14, 0.03)
  return `#${c.getHexString()}`
}

/* ───────────────────────── La pizarra ───────────────────────── */

function Blackboard({ position, rotation, onTap }: { position: V3; rotation: number; onTap: () => void }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <TapZone size={[3.4, 2.6, 1.2]} onTap={onTap}>
        <Box size={[0.12, 2.0, 0.12]} position={[-1.3, 1.0, 0]} color={C.woodDark} />
        <Box size={[0.12, 2.0, 0.12]} position={[1.3, 1.0, 0]} color={C.woodDark} />
        <Box size={[2.9, 1.5, 0.12]} position={[0, 1.55, 0]} color={C.wood} />
        <Box size={[2.6, 1.25, 0.06]} position={[0, 1.55, 0.06]} color="#2f4b3a" flat />
        {/* tiza: dos líneas, una sube y otra no */}
        <Html position={[0, 1.55, 0.1]} center transform distanceFactor={4} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <div className="chalk">
            <span className="chalk__title">Tú y la Liebre</span>
            <svg width="120" height="44" viewBox="0 0 120 44" aria-hidden="true">
              <polyline points="4,40 30,34 60,26 90,14 116,4" fill="none" stroke="#9fe0b0" strokeWidth="3" strokeLinecap="round" />
              <polyline points="4,40 30,36 60,38 90,34 116,37" fill="none" stroke="#ffd27a" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 4" />
            </svg>
          </div>
        </Html>
        <Label text="Pizarra" sub="Tú y la Liebre" y={2.7} />
      </TapZone>
    </group>
  )
}

/* ───────────────────────── El islote ───────────────────────── */

export function LiebreIsland({ palette, night }: { palette: SeasonPalette; night: boolean }) {
  const game = useGame((s) => s.game)!
  const nowMs = useGame((s) => s.nowMs)
  const trip = useGame((s) => s.trip)
  const setView = useGame((s) => s.setView)
  const month = currentMonth(game, nowMs)
  const terrain = useMemo(() => liebreTerrain(game.seed), [game.seed])
  const vividPalette = useMemo<SeasonPalette>(() => ({ ...palette, grass: vivid(palette.grass), grassTop: vivid(palette.grassTop) }), [palette])
  const liebre = useMemo(() => liebreAt(liebreCtx(game), Math.max(0, month)), [game, month])
  const at = (x: number, z: number): V3 => [x, localHeight(terrain, x, z), z]
  const open = () => trip === 'there' && setView('liebre')
  const has = (id: string) => liebre.items.some((i) => i.itemId === id)

  const [cx, cz] = local(L_SITES.casa)
  const [kx, kz] = local(L_SITES.cofre)
  const [hx, hz] = local(L_SITES.huerto)
  const [px, pz] = local(L_SITES.pizarra)
  const huertoDef = { ...BUILDING_BY_ID.huerto, name: 'Huerto de la Liebre', rotation: 0.3 }

  // Vegetación fija (pocas piezas: el islote se ve de lejos casi siempre).
  const plants = useMemo(() => {
    const pts: { x: number; z: number; kind: 'palm' | 'bush' | 'grass' | 'flowers'; s: number }[] = []
    const spots: [number, number, 'palm' | 'bush' | 'grass' | 'flowers', number][] = [
      [-8.5, -1.5, 'palm', 1.0], [8.8, -3.4, 'palm', 0.9], [-3.5, 7.8, 'palm', 0.85], [6.5, 7.2, 'bush', 1.0], [-6.8, 4.2, 'bush', 0.9],
      [1.2, -7.4, 'bush', 1.1], [4.0, 5.9, 'flowers', 1], [-1.0, 1.4, 'flowers', 1], [-4.2, -2.4, 'grass', 1.2], [7.6, 1.6, 'grass', 1.1], [2.6, -3.6, 'grass', 1.0],
    ]
    for (const [x, z, kind, s] of spots) {
      const h = localHeight(terrain, x, z)
      if (h > 0.5) pts.push({ x, z, kind, s })
    }
    return pts
  }, [terrain])

  return (
    <group position={LIEBRE_OFFSET}>
      {/* Terreno encogido: mismo generador que la isla grande */}
      <group scale={[SXZ, SY, SXZ]}>
        <Ground terrain={terrain} palette={vividPalette} />
      </group>
      {/* Zócalos */}
      <Plinth radius={2.2} position={at(cx, cz)} />
      <Plinth radius={2.0} position={at(hx, hz)} />

      {/* Toda la isla abre la pizarra cuando estás allí */}
      <TapZone size={[26, 6, 22]} onTap={open}>
        <group />
      </TapZone>

      {/* La casa, desbordada de cosas */}
      <House position={at(cx, cz)} rotation={0.35} palette={palette} night={night} mailboxCents={0} onTap={open} onMailbox={open} />
      {has('cometa') && <Kite position={at(cx - 2.6, cz + 2.4)} />}
      {has('balon') && <Ball position={at(cx - 1.0, cz + 3.0)} />}
      {has('patinete') && <Scooter position={at(cx + 2.9, cz + 1.6)} rotation={1.4} />}
      {has('bici') && <Bike position={at(cx + 3.1, cz - 0.6)} rotation={0.8} />}
      {has('tienda-campana') && <Tent position={at(cx - 3.4, cz - 1.2)} rotation={0.7} />}
      {has('columpio') && <Swing position={at(cx + 0.6, cz - 3.4)} rotation={0.3} />}
      {has('guitarra') && <Box size={[0.3, 0.9, 0.12]} position={[cx + 1.9, localHeight(terrain, cx + 1.9, cz + 2.4) + 0.45, cz + 2.4]} rotation={[0.2, 0.4, 0.5]} color={C.wood} />}
      {has('camara') && <Box size={[0.3, 0.2, 0.2]} position={[cx - 2.0, localHeight(terrain, cx - 2.0, cz + 1.0) + 0.1, cz + 1.0]} color={C.stoneDark} />}
      {has('telescopio') && <Telescope position={at(cx + 2.4, cz + 3.2)} />}
      {has('consola') && <Box size={[0.5, 0.14, 0.34]} position={[cx - 0.4, localHeight(terrain, cx - 0.4, cz + 2.2) + 0.07, cz + 2.2]} color={C.navy} />}
      {has('canoa') && <Canoe position={[L_PIER.x - 2.6, 0.05, L_PIER.z + 1.2]} rotation={0.4} />}
      {/* Envoltorios de caprichos por el suelo: cuanto más ha gastado, más papeles */}
      {Array.from({ length: Math.min(8, Math.floor(liebre.treats / 24)) }, (_, i) => {
        const a = i * 1.9
        const x = cx + Math.cos(a) * (2.2 + (i % 3) * 0.5)
        const z = cz + Math.sin(a) * (2.4 + (i % 2) * 0.6)
        return <Box key={i} size={[0.16, 0.05, 0.12]} position={[x, localHeight(terrain, x, z) + 0.03, z]} rotation={[0, a, 0]} color={i % 2 ? C.red : '#f2951c'} flat />
      })}

      {/* Cueva con el cofre (casi) vacío */}
      <Cave position={at(kx, kz)} rotation={0.5} palette={palette} cents={liebre.huchaCents} onTap={open} />

      {/* El huerto que nunca construye */}
      <ForSaleLot def={huertoDef} position={at(hx, hz)} palette={palette} onTap={open} />

      {/* La pizarra */}
      <Blackboard position={at(px, pz)} rotation={0.6} onTap={open} />

      {/* Muelle */}
      <Pier position={[L_PIER.x, 0, L_PIER.z]} rotation={L_PIER.rotation} length={L_PIER.length} />

      {/* La Liebre en casa (cuando no va en la barca) */}
      {trip === 'there' || trip === 'home' ? (
        <Doer position={at(cx - 1.6, cz + 1.8)} rotation={2.6} look={LIEBRE} action={liebre.hungryNow ? 'sit' : 'look'} />
      ) : null}
      {/* Un vecino mirando la pizarra */}
      <Doer position={at(px + 1.4, pz + 1.3)} rotation={-2.3} look={LOOKS[3 % LOOKS.length]} action="look" />

      {/* Vegetación y rocas */}
      {plants.map((p, i) =>
        p.kind === 'palm' ? (
          <Palm key={i} position={at(p.x, p.z)} palette={palette} scale={p.s} rotation={i} />
        ) : p.kind === 'bush' ? (
          <Bush key={i} position={at(p.x, p.z)} palette={palette} scale={p.s} />
        ) : p.kind === 'flowers' ? (
          <Flowers key={i} position={at(p.x, p.z)} seed={i + 3} />
        ) : (
          <GrassTuft key={i} position={at(p.x, p.z)} palette={palette} scale={p.s} />
        ),
      )}
      <Rock position={[-10.6, -0.2, 3.6]} size={1.4} seed={71} color={C.rock} />
      <Rock position={[10.8, -0.1, 4.8]} size={1.1} seed={72} color={C.rockDark} />
      <Rock position={[-6.2, -0.3, -9.0]} size={1.6} seed={73} color={C.rockLight} />
      <Rock position={[8.0, -0.2, -9.6]} size={1.0} seed={74} color={C.rock} />

      <Label text="Isla de la Liebre" sub={trip === 'there' ? 'Toca la pizarra' : ''} y={7.5} />
    </group>
  )
}

/* ───────────────────────── La barca de la Liebre ───────────────────────── */

/**
 * La barca vive en el muelle del jugador (desde el Nivel 2), cruza el mar cuando empieza el viaje y
 * espera en el muelle de la Liebre mientras estás allí. Avisa al store al llegar.
 */
export function LiebreBoat() {
  const game = useGame((s) => s.game)!
  const trip = useGame((s) => s.trip)
  const tripStartMs = useGame((s) => s.tripStartMs)
  const { travelToLiebre, returnHome, arriveAtLiebre, arriveHome } = useGame.getState()
  const group = useRef<THREE.Group>(null)
  const tmp = useMemo(() => ({ pos: new THREE.Vector3(), dir: new THREE.Vector3() }), [])
  const arrived = useRef(false)
  const unlocked = game.world >= LIEBRE_VISIT_WORLD

  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    const t = clock.getElapsedTime()
    if (trip === 'going' || trip === 'returning') {
      const raw = boatPose(trip, (performance.now() - tripStartMs) / 1000, tmp)
      g.position.set(tmp.pos.x, 0.02 + Math.sin(t * 2.2) * 0.04, tmp.pos.z)
      g.rotation.set(Math.sin(t * 1.4) * 0.03, Math.atan2(tmp.dir.x, tmp.dir.z), Math.sin(t * 1.9) * 0.05)
      if (raw >= 1 && !arrived.current) {
        arrived.current = true
        if (trip === 'going') arriveAtLiebre()
        else arriveHome()
      }
    } else {
      arrived.current = false
      const end = trip === 'there' ? TRIP_CURVE.getPoint(1) : TRIP_CURVE.getPoint(0)
      if (trip === 'there') g.position.set(end.x - 1.6, 0.02 + Math.sin(t * 1.5) * 0.035, end.z - 0.8)
      else g.position.set(end.x, 0.02 + Math.sin(t * 1.5) * 0.035, end.z)
      g.rotation.set(Math.sin(t * 0.9) * 0.03, trip === 'there' ? 2.9 : 0.6, Math.sin(t * 1.3) * 0.05)
    }
  })

  if (!unlocked) return null
  const onTap = trip === 'home' ? travelToLiebre : trip === 'there' ? returnHome : undefined
  const sailing = trip === 'going' || trip === 'returning'
  return (
    <group ref={group} scale={1.25}>
      <TapZone size={[2.6, 2.2, 3.4]} onTap={onTap}>
        {/* casco */}
        <mesh position={[0, 0.2, 0]} scale={[1, 0.55, 2.2]} castShadow>
          <cylinderGeometry args={[0.62, 0.36, 0.55, 8]} />
          <Mat color="#f2951c" flat />
        </mesh>
        <Box size={[1.0, 0.05, 2.3]} position={[0, 0.42, 0]} color={C.woodLight} />
        <Box size={[0.9, 0.06, 0.18]} position={[0, 0.5, 0.45]} color={C.wood} />
        <Box size={[0.9, 0.06, 0.18]} position={[0, 0.5, -0.5]} color={C.wood} />
        {/* mástil y vela */}
        <mesh position={[0, 1.4, -0.1]} castShadow>
          <cylinderGeometry args={[0.04, 0.05, 2.0, 6]} />
          <Mat color={C.woodDark} />
        </mesh>
        <mesh position={[0.35, 1.45, -0.1]} rotation={[0, -Math.PI / 2, 0]} castShadow>
          <shapeGeometry args={[SAIL]} />
          <meshStandardMaterial color={C.white} side={THREE.DoubleSide} roughness={0.9} />
        </mesh>
        {/* pasajeros: la Liebre siempre; el niño cuando navega o está allí */}
        <group position={[0, 0.2, 0.55]} rotation={[0, Math.PI, 0]} scale={0.85}>
          <Doer position={[0, 0, 0]} look={LIEBRE} action="sit" />
        </group>
        {(sailing || trip === 'there') && (
          <group position={[0, 0.2, -0.55]} scale={0.85}>
            <Doer position={[0, 0, 0]} look={LOOKS[0]} action="sit" />
          </group>
        )}
        {trip === 'home' && <Label text="Barca de la Liebre" sub="Visitar su isla" tone="coin" y={2.6} />}
        {trip === 'there' && <Label text="Barca" sub="Volver a casa" tone="coin" y={2.6} />}
      </TapZone>
    </group>
  )
}
