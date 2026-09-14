/**
 * VIDA EN EL MAPA: nubes a la deriva, pájaros que sobrevuelan la isla, bancos de peces bajo el agua
 * y personajes que pasean por los caminos. Todo barato, todo determinista, todo del mismo mundo.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32 } from '../sim/rng'
import { C } from './palette'
import { Mat } from './kit/Parts'
import { ISLAND_RX, ISLAND_RZ, type Terrain } from './terrain'

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
  const offsets = useMemo(() => [[0, 0], [-0.9, -0.8], [0.9, -0.8], [-1.8, -1.6], [1.8, -1.6]], [])
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

type Look = 'nino' | 'liebre'

/** Personaje low-poly: cuerpo, cabeza grande, brazos y piernas que oscilan al andar. */
function Character({ look, walking }: { look: Look; walking: React.RefObject<number> }) {
  const legL = useRef<THREE.Mesh>(null)
  const legR = useRef<THREE.Mesh>(null)
  const armL = useRef<THREE.Mesh>(null)
  const armR = useRef<THREE.Mesh>(null)
  const body = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 8
    const k = walking.current ?? 1
    const s = Math.sin(t) * 0.55 * k
    if (legL.current) legL.current.rotation.x = s
    if (legR.current) legR.current.rotation.x = -s
    if (armL.current) armL.current.rotation.x = -s * 0.8
    if (armR.current) armR.current.rotation.x = s * 0.8
    if (body.current) body.current.position.y = Math.abs(Math.sin(t)) * 0.04 * k
  })
  const skin = look === 'nino' ? '#f2c9a6' : '#d9c3a5'
  const shirt = look === 'nino' ? C.roofBlue : C.roofRed
  const pants = look === 'nino' ? '#4a5a8a' : C.woodDark
  return (
    <group ref={body}>
      {/* piernas */}
      <mesh ref={legL} position={[-0.11, 0.42, 0]}>
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.16, 0.4, 0.18]} />
          <Mat color={pants} />
        </mesh>
      </mesh>
      <mesh ref={legR} position={[0.11, 0.42, 0]}>
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.16, 0.4, 0.18]} />
          <Mat color={pants} />
        </mesh>
      </mesh>
      {/* cuerpo */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.42, 0.55, 0.3]} />
        <Mat color={shirt} />
      </mesh>
      {/* brazos */}
      <mesh ref={armL} position={[-0.29, 0.92, 0]}>
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[0.12, 0.44, 0.14]} />
          <Mat color={shirt} />
        </mesh>
      </mesh>
      <mesh ref={armR} position={[0.29, 0.92, 0]}>
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[0.12, 0.44, 0.14]} />
          <Mat color={shirt} />
        </mesh>
      </mesh>
      {/* cabeza grande */}
      <mesh position={[0, 1.28, 0]} castShadow>
        <boxGeometry args={[0.5, 0.48, 0.46]} />
        <Mat color={skin} />
      </mesh>
      {[-0.11, 0.11].map((x) => (
        <mesh key={x} position={[x, 1.3, 0.24]}>
          <boxGeometry args={[0.07, 0.09, 0.02]} />
          <Mat color="#2b2b2b" />
        </mesh>
      ))}
      {look === 'nino' ? (
        <>
          {/* gorra roja */}
          <mesh position={[0, 1.54, 0]}>
            <boxGeometry args={[0.54, 0.14, 0.5]} />
            <Mat color={C.red} />
          </mesh>
          <mesh position={[0, 1.5, 0.36]}>
            <boxGeometry args={[0.5, 0.05, 0.28]} />
            <Mat color={C.red} />
          </mesh>
        </>
      ) : (
        <>
          {/* orejas de liebre */}
          {[-0.14, 0.14].map((x) => (
            <mesh key={x} position={[x, 1.85, -0.05]} rotation={[0, 0, x > 0 ? -0.15 : 0.15]}>
              <boxGeometry args={[0.12, 0.65, 0.08]} />
              <Mat color="#d9c3a5" />
            </mesh>
          ))}
          <mesh position={[0, 1.15, 0.24]}>
            <boxGeometry args={[0.1, 0.07, 0.02]} />
            <Mat color="#e28a9d" />
          </mesh>
        </>
      )}
    </group>
  )
}

/** Un personaje que recorre en bucle una ruta de puntos (x, z), pegado al terreno y mirando hacia delante. */
export function Walker({ route, terrain, look, speed = 1.1, offset = 0 }: { route: [number, number][]; terrain: Terrain; look: Look; speed?: number; offset?: number }) {
  const group = useRef<THREE.Group>(null)
  const walking = useRef(1)
  const curve = useMemo(() => new THREE.CatmullRomCurve3(route.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal'), [route])
  const length = useMemo(() => curve.getLength(), [curve])
  const dist = useRef(offset)
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const tmp2 = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    if (!group.current) return
    // Se detiene un momento en algunos puntos, como si mirara.
    const pauseT = (dist.current / length) * 12
    const pausing = Math.sin(pauseT) > 0.985
    walking.current += ((pausing ? 0 : 1) - walking.current) * Math.min(1, dt * 6)
    dist.current = (dist.current + speed * dt * walking.current) % length
    const u = dist.current / length
    curve.getPointAt(u, tmp)
    curve.getPointAt((u + 0.004) % 1, tmp2)
    const y = terrain.height(tmp.x, tmp.z)
    group.current.position.set(tmp.x, y, tmp.z)
    group.current.rotation.y = Math.atan2(tmp2.x - tmp.x, tmp2.z - tmp.z)
  })
  return (
    <group ref={group}>
      <Character look={look} walking={walking} />
    </group>
  )
}

/** Todo lo ambiental junto, con rutas derivadas de la isla. */
export function Ambient({ terrain, walkerRoutes }: { terrain: Terrain; walkerRoutes: [number, number][][] }) {
  return (
    <group>
      <Clouds seed={terrain.seed} />
      <Flock seed={terrain.seed % 7} />
      <Flock seed={(terrain.seed % 7) + 3} />
      <FishShoal seed={terrain.seed + 1} radius={[ISLAND_RX * 1.18, ISLAND_RZ * 1.25]} speed={0.07} />
      <FishShoal seed={terrain.seed + 2} radius={[ISLAND_RX * 1.32, ISLAND_RZ * 1.12]} speed={0.055} />
      <FishShoal seed={terrain.seed + 3} radius={[ISLAND_RX * 1.1, ISLAND_RZ * 1.4]} speed={0.09} />
      {walkerRoutes[0] && <Walker route={walkerRoutes[0]} terrain={terrain} look="nino" speed={1.2} />}
      {walkerRoutes[1] && <Walker route={walkerRoutes[1]} terrain={terrain} look="liebre" speed={1.5} offset={9} />}
    </group>
  )
}
