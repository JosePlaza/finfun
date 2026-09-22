/**
 * VIDA EN EL MAPA: nubes a la deriva, pájaros que sobrevuelan la isla, bancos de peces bajo el agua
 * y personajes que pasean por los caminos. Todo barato, todo determinista, todo del mismo mundo.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32 } from '../sim/rng'
import { Mat } from './kit/Parts'
import { ISLAND_RX, ISLAND_RZ, type Terrain } from './terrain'
import { Avatar } from './avatars/Avatar'
import type { AvatarDef } from './avatars/catalog'

/* ───────────────────────── Nubes ───────────────────────── */

function Cloud({ seed, scale = 1 }: { seed: number; scale?: number }) {
  const puffs = useMemo(() => {
    const rng = mulberry32(seed)
    return Array.from({ length: 5 }, (_, i) => ({
      x: (i - 2) * 1.1 + (rng() - 0.5) * 0.5,
      y: (rng() - 0.5) * 0.4 + (i === 2 ? 0.5 : 0),
      z: (rng() - 0.5) * 0.9,
      r: 0.9 + rng() * 0.7 + (i === 2 ? 0.4 : 0),
    }))
  }, [seed])
  return (
    <group scale={scale}>
      {puffs.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]} castShadow>
          <dodecahedronGeometry args={[p.r, 1]} />
          <meshStandardMaterial color="#ffffff" flatShading roughness={1} transparent opacity={0.82} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

export function Clouds({ seed }: { seed: number }) {
  const group = useRef<THREE.Group>(null)
  const clouds = useMemo(() => {
    const rng = mulberry32(seed + 900)
    return Array.from({ length: 7 }, (_, i) => ({
      // Banda al norte de la isla (lejos de la cámara, que mira desde el sureste):
      // se ven pasar por detrás del faro sin taparnos nunca la vista.
      x: (rng() * 2 - 1) * 60,
      y: 14 + rng() * 5,
      z: -18 - rng() * 30,
      speed: 0.5 + rng() * 0.6,
      scale: 0.8 + rng() * 1.0,
      seed: seed + i * 31,
    }))
  }, [seed])
  useFrame((_, dt) => {
    if (!group.current) return
    group.current.children.forEach((c, i) => {
      c.position.x += clouds[i].speed * dt
      if (c.position.x > 65) c.position.x = -65
    })
  })
  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]}>
          <Cloud seed={c.seed} scale={c.scale} />
        </group>
      ))}
    </group>
  )
}

/* ───────────────────────── Pájaros ───────────────────────── */

function Bird({ phase }: { phase: number }) {
  const l = useRef<THREE.Mesh>(null)
  const r = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const f = Math.sin(clock.getElapsedTime() * 9 + phase) * 0.6
    if (l.current) l.current.rotation.z = f
    if (r.current) r.current.rotation.z = -f
  })
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.12, 0.1, 0.36]} />
        <Mat color="#ffffff" />
      </mesh>
      <mesh ref={l} position={[-0.05, 0, 0]}>
        <mesh position={[-0.28, 0, 0]}>
          <boxGeometry args={[0.55, 0.03, 0.18]} />
          <Mat color="#f4f4f4" />
        </mesh>
      </mesh>
      <mesh ref={r} position={[0.05, 0, 0]}>
        <mesh position={[0.28, 0, 0]}>
          <boxGeometry args={[0.55, 0.03, 0.18]} />
          <Mat color="#f4f4f4" />
        </mesh>
      </mesh>
    </group>
  )
}

/** Bandada en V que da vueltas amplias sobre la isla. */
export function Flock({ seed }: { seed: number }) {
  const group = useRef<THREE.Group>(null)
  const offsets = useMemo(
    () => [
      [0, 0],
      [-0.9, -0.8],
      [0.9, -0.8],
      [-1.8, -1.6],
      [1.8, -1.6],
    ],
    [],
  )
  const r0 = 18 + (seed % 5)
  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.getElapsedTime() * 0.1 + seed
    const x = Math.cos(t) * r0 * 1.3
    const z = Math.sin(t) * r0 * 0.9
    const y = 13.5 + Math.sin(t * 2.3) * 1.2
    group.current.position.set(x, y, z)
    // Mira hacia donde va
    group.current.rotation.y = -t + Math.PI / 2
  })
  return (
    <group ref={group} scale={0.55}>
      {offsets.map(([ox, oz], i) => (
        <group key={i} position={[ox, i * 0.1, oz]}>
          <Bird phase={i * 1.3} />
        </group>
      ))}
    </group>
  )
}

/* ───────────────────────── Bancos de peces ───────────────────────── */

/** Sombras oscuras y alargadas justo bajo la superficie que serpentean alrededor de la isla. */
export function FishShoal({ seed, radius, speed = 0.08 }: { seed: number; radius: [number, number]; speed?: number }) {
  const group = useRef<THREE.Group>(null)
  const fish = useMemo(() => {
    const rng = mulberry32(seed)
    return Array.from({ length: 9 }, () => ({ x: (rng() - 0.5) * 2.4, z: (rng() - 0.5) * 3.2, s: 0.5 + rng() * 0.5, ph: rng() * 6 }))
  }, [seed])
  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.getElapsedTime() * speed + seed
    const x = Math.cos(t) * radius[0]
    const z = Math.sin(t * 1.3) * radius[1]
    group.current.position.set(x, -0.12, z)
    group.current.rotation.y = -Math.atan2(Math.cos(t * 1.3) * radius[1] * 1.3, -Math.sin(t) * radius[0])
    group.current.children.forEach((f, i) => {
      f.position.x = fish[i].x + Math.sin(clock.getElapsedTime() * 2 + fish[i].ph) * 0.15
    })
  })
  return (
    <group ref={group}>
      {fish.map((f, i) => (
        <mesh key={i} position={[f.x, 0, f.z]} rotation={[-Math.PI / 2, 0, 0]} scale={[f.s, f.s * 2.2, 1]}>
          <circleGeometry args={[0.28, 6]} />
          <meshBasicMaterial color="#123a4a" transparent opacity={0.45} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/* ───────────────────────── Personajes ───────────────────────── */

export type Action = 'walk' | 'look' | 'wave' | 'work' | 'carry' | 'sit'
export type Prop = 'none' | 'rod' | 'broom' | 'hoe'

/**
 * Todos los habitantes (vecinos, la Liebre y el avatar del jugador) comparten la misma morfología: el
 * personaje de `avatars/Avatar.tsx`, montado a partir de una receta del catálogo. Así la isla es un solo mundo.
 */

/** Una parada de la ruta: dónde, qué hace al llegar, cuánto se queda y hacia dónde mira. */
export interface Stop {
  x: number
  z: number
  action: Action
  dwell: number
  /** Dirección hacia la que mira mientras está parado (normalmente hacia el edificio). */
  face: [number, number]
}

/**
 * Un personaje que recorre en bucle una ruta de paradas: camina de una a otra pegado al terreno,
 * y en cada parada se detiene unos segundos haciendo algo (mirar, saludar, trabajar, cargar).
 */
export function Walker({ stops, terrain, look, speed = 1.1, offset = 0 }: { stops: Stop[]; terrain: Terrain; look: AvatarDef; speed?: number; offset?: number }) {
  const group = useRef<THREE.Group>(null)
  const walking = useRef(1)
  const action = useRef<Action>('walk')
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        stops.map((s) => new THREE.Vector3(s.x, 0, s.z)),
        true,
        'centripetal',
        0.6,
      ),
    [stops],
  )
  const length = useMemo(() => curve.getLength(), [curve])
  const dist = useRef(offset)
  const lastStop = useRef(-1)
  const pauseLeft = useRef(0)
  const faceY = useRef(0)
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const tmp2 = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    if (!group.current) return
    if (pauseLeft.current > 0) {
      pauseLeft.current -= dt
      walking.current += (0 - walking.current) * Math.min(1, dt * 6)
      // Gira despacio hacia el edificio.
      const d = faceY.current - group.current.rotation.y
      group.current.rotation.y += Math.atan2(Math.sin(d), Math.cos(d)) * Math.min(1, dt * 4)
      if (pauseLeft.current <= 0) action.current = 'walk'
      return
    }
    walking.current += (1 - walking.current) * Math.min(1, dt * 4)
    dist.current = (dist.current + speed * dt * walking.current) % length
    const u = dist.current / length
    curve.getPointAt(u, tmp)
    curve.getPointAt((u + 0.004) % 1, tmp2)
    group.current.position.set(tmp.x, terrain.height(tmp.x, tmp.z), tmp.z)
    group.current.rotation.y = Math.atan2(tmp2.x - tmp.x, tmp2.z - tmp.z)
    // ¿Hemos llegado a una parada nueva?
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i]
      if (i !== lastStop.current && Math.hypot(tmp.x - s.x, tmp.z - s.z) < 0.5) {
        lastStop.current = i
        pauseLeft.current = s.dwell
        action.current = s.action
        faceY.current = Math.atan2(s.face[0], s.face[1])
        break
      }
    }
  })
  return (
    <group ref={group}>
      <Avatar def={look} walking={walking} action={action} />
    </group>
  )
}

/** Un personaje quieto que hace siempre lo mismo (pescar, barrer, cavar…). */
export function Doer({
  position,
  rotation = 0,
  look,
  action,
  prop = 'none',
}: {
  position: [number, number, number]
  rotation?: number
  look: AvatarDef
  action: Action
  prop?: Prop
}) {
  const walking = useRef(0)
  const act = useRef<Action>(action)
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Avatar def={look} walking={walking} action={act} prop={prop} />
    </group>
  )
}

/** Todo lo ambiental junto: cielo, mar y vecinos. */
export function Ambient({
  terrain,
  routes,
  doers,
}: {
  terrain: Terrain
  routes: { stops: Stop[]; look: AvatarDef; speed: number; offset: number }[]
  doers: { position: [number, number, number]; rotation: number; look: AvatarDef; action: Action; prop: Prop }[]
}) {
  return (
    <group>
      <Clouds seed={terrain.seed} />
      <Flock seed={terrain.seed % 7} />
      <Flock seed={(terrain.seed % 7) + 3} />
      <FishShoal seed={terrain.seed + 1} radius={[ISLAND_RX * 1.18, ISLAND_RZ * 1.25]} speed={0.07} />
      <FishShoal seed={terrain.seed + 2} radius={[ISLAND_RX * 1.32, ISLAND_RZ * 1.12]} speed={0.055} />
      <FishShoal seed={terrain.seed + 3} radius={[ISLAND_RX * 1.1, ISLAND_RZ * 1.4]} speed={0.09} />
      {routes.map((r, i) => (
        <Walker key={i} stops={r.stops} terrain={terrain} look={r.look} speed={r.speed} offset={r.offset} />
      ))}
      {doers.map((d, i) => (
        <Doer key={i} position={d.position} rotation={d.rotation} look={d.look} action={d.action} prop={d.prop} />
      ))}
    </group>
  )
}
