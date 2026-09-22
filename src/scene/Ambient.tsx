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

export interface Look {
  kind: 'humano' | 'liebre'
  skin: string
  shirt: string
  pants: string
  hair: string
  hairStyle: 'corto' | 'coleta' | 'melena' | 'calvo'
  hat: 'none' | 'gorra' | 'sombrero' | 'panuelo'
  /** Altura relativa (los niños son más bajos). */
  scale: number
}

/** Vecinos de la isla. Colores de la paleta, tonos de piel variados, siluetas distintas a primera vista. */
export const LOOKS: Look[] = [
  { kind: 'humano', skin: '#f2c9a6', shirt: C.roofBlue, pants: '#4a5a8a', hair: '#5a3a1e', hairStyle: 'corto', hat: 'gorra', scale: 0.82 }, // niño de la gorra
  { kind: 'humano', skin: '#e0a984', shirt: '#e8a4c4', pants: '#4a5a8a', hair: '#2b1b12', hairStyle: 'coleta', hat: 'none', scale: 0.8 }, // niña de la coleta
  { kind: 'humano', skin: '#8d5a3b', shirt: C.roofOrange, pants: C.woodDark, hair: '#1f1512', hairStyle: 'corto', hat: 'none', scale: 1.0 }, // vecino
  { kind: 'humano', skin: '#f6d6bd', shirt: '#7fb069', pants: '#6b4b2f', hair: '#c9c2b5', hairStyle: 'calvo', hat: 'sombrero', scale: 0.98 }, // abuelo del sombrero
  { kind: 'humano', skin: '#c68b5c', shirt: C.roofRed, pants: '#3f3f3f', hair: '#3a2416', hairStyle: 'melena', hat: 'none', scale: 0.96 }, // vecina
  { kind: 'humano', skin: '#f2c9a6', shirt: '#f5c542', pants: '#4a5a8a', hair: '#b5652b', hairStyle: 'corto', hat: 'panuelo', scale: 0.94 }, // panadera del pañuelo
  { kind: 'humano', skin: '#a56c47', shirt: '#3aa5d8', pants: '#e9e2d0', hair: '#111', hairStyle: 'melena', hat: 'none', scale: 1.0 }, // marinero
  { kind: 'humano', skin: '#f0bfa0', shirt: '#7a5fe0', pants: '#4a5a8a', hair: '#e2b04a', hairStyle: 'coleta', hat: 'none', scale: 0.9 }, // chica del morado
  { kind: 'humano', skin: '#d9a77c', shirt: C.white, pants: '#2f4858', hair: '#4b2e1e', hairStyle: 'corto', hat: 'gorra', scale: 1.0 }, // repartidor
  { kind: 'humano', skin: '#f2c9a6', shirt: '#3e8f3a', pants: '#6b4b2f', hair: '#5a3a1e', hairStyle: 'corto', hat: 'sombrero', scale: 0.98 }, // hortelano
]
export const LIEBRE: Look = { kind: 'liebre', skin: '#d9c3a5', shirt: C.roofRed, pants: C.woodDark, hair: '#d9c3a5', hairStyle: 'corto', hat: 'none', scale: 0.9 }

/**
 * Personaje low-poly con proporciones humanas (cabeza redonda, cuello, torso, brazos y piernas articulados)
 * y un repertorio de acciones: andar, mirar alrededor, saludar, trabajar (agacharse y golpear),
 * llevar una caja o sentarse. `walking` y `action` son refs para animar sin re-renderizar.
 */
export function Character({ look, walking, action, prop = 'none' }: { look: Look; walking: React.RefObject<number>; action: React.RefObject<Action>; prop?: Prop }) {
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const torso = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const root = useRef<THREE.Group>(null)
  const crate = useRef<THREE.Mesh>(null)
  const ease = (o: THREE.Object3D, k: 'x' | 'y' | 'z', target: number, a: number) => {
    o.rotation[k] += (target - o.rotation[k]) * a
  }
  useFrame(({ clock }, dt) => {
    const t = clock.getElapsedTime()
    const k = walking.current ?? 0
    const act = action.current ?? 'walk'
    const a = Math.min(1, dt * 8)
    const swing = Math.sin(t * 8) * 0.6 * k
    if (!legL.current || !legR.current || !armL.current || !armR.current || !torso.current || !head.current || !root.current) return
    // Piernas: paso al andar; sentado, estiradas hacia delante.
    ease(legL.current, 'x', act === 'sit' ? -1.45 : swing, a)
    ease(legR.current, 'x', act === 'sit' ? -1.45 : -swing, a)
    root.current.position.y = act === 'sit' ? -0.42 : Math.abs(Math.sin(t * 8)) * 0.05 * k
    // Torso y cabeza según la acción.
    let torsoX = 0
    let headY = 0
    let aLx = -swing * 0.8
    let aRx = swing * 0.8
    let aLz = 0.08
    let aRz = -0.08
    switch (act) {
      case 'look':
        headY = Math.sin(t * 1.3) * 0.7
        aLx = 0
        aRx = 0
        break
      case 'wave':
        aRz = -2.6 + Math.sin(t * 7) * 0.35
        aRx = 0
        aLx = 0
        headY = 0.2
        break
      case 'work':
        torsoX = 0.35 + Math.max(0, Math.sin(t * 4.5)) * 0.3
        aLx = -1.3 + Math.sin(t * 4.5) * 0.6
        aRx = -1.3 + Math.sin(t * 4.5) * 0.6
        break
      case 'carry':
        aLx = -1.35
        aRx = -1.35
        aLz = 0.3
        aRz = -0.3
        break
      case 'sit':
        aLx = -0.6
        aRx = -0.6
        headY = Math.sin(t * 0.7) * 0.25
        break
    }
    ease(torso.current, 'x', torsoX, a)
    ease(head.current, 'y', headY, a)
    ease(armL.current, 'x', aLx, a)
    ease(armR.current, 'x', aRx, a)
    ease(armL.current, 'z', aLz, a)
    ease(armR.current, 'z', aRz, a)
    if (crate.current) crate.current.visible = act === 'carry'
  })
  const { skin, shirt, pants, hair } = look
  const liebre = look.kind === 'liebre'
  return (
    <group ref={root} scale={look.scale}>
      {/* piernas (pivote en la cadera) */}
      {[-0.1, 0.1].map((x, i) => (
        <group key={x} ref={i === 0 ? legL : legR} position={[x, 0.5, 0]}>
          <mesh position={[0, -0.25, 0]} castShadow>
            <boxGeometry args={[0.15, 0.5, 0.17]} />
            <Mat color={pants} />
          </mesh>
          <mesh position={[0, -0.5, 0.04]}>
            <boxGeometry args={[0.16, 0.08, 0.26]} />
            <Mat color={liebre ? skin : '#3a2f28'} />
          </mesh>
        </group>
      ))}
      <group ref={torso} position={[0, 0.5, 0]}>
        {/* torso con cuello */}
        <mesh position={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[0.4, 0.56, 0.26]} />
          <Mat color={shirt} />
        </mesh>
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.07, 0.08, 0.1, 8]} />
          <Mat color={skin} />
        </mesh>
        {/* brazos (pivote en el hombro) */}
        {[-0.26, 0.26].map((x, i) => (
          <group key={x} ref={i === 0 ? armL : armR} position={[x, 0.54, 0]}>
            <mesh position={[0, -0.2, 0]} castShadow>
              <boxGeometry args={[0.12, 0.4, 0.13]} />
              <Mat color={shirt} />
            </mesh>
            <mesh position={[0, -0.46, 0]}>
              <sphereGeometry args={[0.07, 6, 5]} />
              <Mat color={skin} />
            </mesh>
            {/* herramienta en la mano derecha */}
            {i === 1 && prop === 'rod' && (
              <mesh position={[0, -0.46, 0.7]} rotation={[Math.PI / 2 - 0.5, 0, 0]}>
                <cylinderGeometry args={[0.012, 0.02, 1.8, 5]} />
                <Mat color={C.woodDark} />
              </mesh>
            )}
            {i === 1 && prop === 'broom' && (
              <group position={[0, -0.46, 0.15]} rotation={[0.5, 0, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.02, 0.02, 1.3, 5]} />
                  <Mat color={C.wood} />
                </mesh>
                <mesh position={[0, -0.7, 0]}>
                  <boxGeometry args={[0.28, 0.22, 0.08]} />
                  <Mat color="#e2c26a" flat />
                </mesh>
              </group>
            )}
            {i === 1 && prop === 'hoe' && (
              <group position={[0, -0.46, 0.15]} rotation={[0.5, 0, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.02, 0.02, 1.3, 5]} />
                  <Mat color={C.wood} />
                </mesh>
                <mesh position={[0, -0.68, 0.06]} rotation={[0.6, 0, 0]}>
                  <boxGeometry args={[0.22, 0.12, 0.03]} />
                  <Mat color={C.stoneDark} />
                </mesh>
              </group>
            )}
          </group>
        ))}
        {/* caja que lleva en brazos */}
        <mesh ref={crate} position={[0, 0.28, 0.34]} visible={false} castShadow>
          <boxGeometry args={[0.42, 0.3, 0.3]} />
          <Mat color={C.wood} flat />
        </mesh>
        {/* cabeza redonda */}
        <group ref={head} position={[0, 0.9, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.23, 12, 10]} />
            <Mat color={skin} />
          </mesh>
          {/* ojos */}
          {[-0.08, 0.08].map((x) => (
            <mesh key={x} position={[x, 0.03, 0.2]}>
              <sphereGeometry args={[0.03, 6, 5]} />
              <Mat color="#2b2b2b" />
            </mesh>
          ))}
          {/* sonrisa */}
          <mesh position={[0, -0.07, 0.21]}>
            <boxGeometry args={[0.1, 0.02, 0.02]} />
            <Mat color="#8a4a3a" />
          </mesh>
          {liebre ? (
            <>
              {[-0.1, 0.1].map((x) => (
                <mesh key={x} position={[x, 0.42, -0.02]} rotation={[0, 0, x > 0 ? -0.15 : 0.15]}>
                  <boxGeometry args={[0.1, 0.55, 0.07]} />
                  <Mat color={skin} />
                </mesh>
              ))}
              <mesh position={[0, -0.02, 0.23]}>
                <sphereGeometry args={[0.04, 6, 5]} />
                <Mat color="#e28a9d" />
              </mesh>
            </>
          ) : (
            <>
              {/* pelo */}
              {look.hairStyle !== 'calvo' && (
                <mesh position={[0, 0.06, -0.02]} rotation={[-0.25, 0, 0]}>
                  <sphereGeometry args={[0.245, 12, 8, 0, Math.PI * 2, 0, look.hairStyle === 'melena' ? Math.PI * 0.7 : Math.PI * 0.5]} />
                  <Mat color={hair} />
                </mesh>
              )}
              {look.hairStyle === 'coleta' && (
                <mesh position={[0, 0.05, -0.27]}>
                  <sphereGeometry args={[0.09, 8, 6]} />
                  <Mat color={hair} />
                </mesh>
              )}
              {/* sombreros */}
              {look.hat === 'gorra' && (
                <group position={[0, 0.17, 0]}>
                  <mesh>
                    <sphereGeometry args={[0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
                    <Mat color={C.red} />
                  </mesh>
                  <mesh position={[0, 0.02, 0.24]}>
                    <boxGeometry args={[0.3, 0.03, 0.22]} />
                    <Mat color={C.red} />
                  </mesh>
                </group>
              )}
              {look.hat === 'sombrero' && (
                <group position={[0, 0.19, 0]}>
                  <mesh>
                    <cylinderGeometry args={[0.38, 0.38, 0.03, 12]} />
                    <Mat color="#e2c26a" flat />
                  </mesh>
                  <mesh position={[0, 0.09, 0]}>
                    <cylinderGeometry args={[0.18, 0.2, 0.18, 10]} />
                    <Mat color="#e2c26a" flat />
                  </mesh>
                </group>
              )}
              {look.hat === 'panuelo' && (
                <mesh position={[0, 0.1, -0.01]} rotation={[-0.2, 0, 0]}>
                  <sphereGeometry args={[0.25, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
                  <Mat color={C.roofRed} />
                </mesh>
              )}
            </>
          )}
        </group>
      </group>
    </group>
  )
}

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
/** Un vecino (Look) o el avatar del jugador (AvatarDef): se distinguen porque el avatar tiene `id`. */
export type Anyone = Look | AvatarDef
const isAvatar = (l: Anyone): l is AvatarDef => 'id' in l

/** Dibuja a quien sea con la animación que toque. */
function Someone({ look, walking, action, prop }: { look: Anyone; walking: React.RefObject<number>; action: React.RefObject<Action>; prop?: Prop }) {
  return isAvatar(look) ? <Avatar def={look} walking={walking} action={action} /> : <Character look={look} walking={walking} action={action} prop={prop} />
}

export function Walker({ stops, terrain, look, speed = 1.1, offset = 0 }: { stops: Stop[]; terrain: Terrain; look: Anyone; speed?: number; offset?: number }) {
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
      <Someone look={look} walking={walking} action={action} />
    </group>
  )
}

/** Un personaje quieto que hace siempre lo mismo (pescar, barrer, cavar…). */
export function Doer({ position, rotation = 0, look, action, prop = 'none' }: { position: [number, number, number]; rotation?: number; look: Look; action: Action; prop?: Prop }) {
  const walking = useRef(0)
  const act = useRef<Action>(action)
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Character look={look} walking={walking} action={act} prop={prop} />
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
  routes: { stops: Stop[]; look: Anyone; speed: number; offset: number }[]
  doers: { position: [number, number, number]; rotation: number; look: Look; action: Action; prop: Prop }[]
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
