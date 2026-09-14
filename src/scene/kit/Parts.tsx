/**
 * KIT DE PIEZAS. Todos los edificios del mundo se montan con estas piezas.
 * Regla: una pieza nueva se añade aquí y se reutiliza; nunca se modela "a mano" dentro de un edificio.
 */
import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { C, SCALE } from '../palette'

type V3 = [number, number, number]

/** Material estándar del mundo: mate, con facetas visibles si se pide. */
export function Mat({ color, flat = false, rough = 0.9, emissive, emissiveIntensity = 0, opacity }: {
  color: string
  flat?: boolean
  rough?: number
  emissive?: string
  emissiveIntensity?: number
  opacity?: number
}) {
  return (
    <meshStandardMaterial
      color={color}
      flatShading={flat}
      roughness={rough}
      emissive={emissive ?? '#000000'}
      emissiveIntensity={emissiveIntensity}
      transparent={opacity !== undefined}
      opacity={opacity ?? 1}
    />
  )
}

/** Caja con sombra: el ladrillo básico. */
export function Box({ size, position, rotation, color, flat, children }: { size: V3; position?: V3; rotation?: V3; color: string; flat?: boolean; children?: ReactNode }) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      {children ?? <Mat color={color} flat={flat} />}
    </mesh>
  )
}

/* ---------------- Muros ---------------- */

/** Muro con zócalo de piedra y esquinas de madera opcionales. */
export function Wall({ w, h = SCALE.wallHeight, d, color = C.plaster, base = 0.5, corners = true, position = [0, 0, 0] }: {
  w: number
  h?: number
  d: number
  color?: string
  base?: number
  corners?: boolean
  position?: V3
}) {
  return (
    <group position={position}>
      <Box size={[w, h, d]} position={[0, h / 2, 0]} color={color} />
      {base > 0 && <Box size={[w + 0.06, base, d + 0.06]} position={[0, base / 2, 0]} color={C.stone} flat />}
      {corners &&
        [
          [-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2],
        ].map(([x, z], i) => <Box key={i} size={[0.14, h, 0.14]} position={[x, h / 2, z]} color={C.woodDark} />)}
    </group>
  )
}

/** Frontón triangular para cerrar el hastial bajo un tejado a dos aguas. */
export function Gable({ w, h, color, position = [0, 0, 0], rotation = [0, 0, 0] }: { w: number; h: number; color: string; position?: V3; rotation?: V3 }) {
  const shape = new THREE.Shape()
  shape.moveTo(-w / 2, 0)
  shape.lineTo(w / 2, 0)
  shape.lineTo(0, h)
  shape.closePath()
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <extrudeGeometry args={[shape, { depth: 0.12, bevelEnabled: false }]} />
      <Mat color={color} />
    </mesh>
  )
}

/* ---------------- Tejados ---------------- */

/** Tejado a dos aguas con grosor, alero y filas de teja sugeridas. */
export function GableRoof({ w, d, h, color = C.roofRed, dark = C.roofRedDark, overhang = 0.3, position = [0, 0, 0], rotation = 0, rows = 3 }: {
  w: number
  d: number
  h: number
  color?: string
  dark?: string
  overhang?: number
  position?: V3
  rotation?: number
  rows?: number
}) {
  const halfW = w / 2 + overhang
  const slope = Math.hypot(halfW, h)
  const angle = Math.atan2(h, halfW)
  const depth = d + overhang * 2
  const side = (dir: 1 | -1) => (
    <group position={[(dir * halfW) / 2, h / 2, 0]} rotation={[0, 0, dir * -angle]}>
      <Box size={[slope, 0.14, depth]} color={color} />
      {Array.from({ length: rows }, (_, i) => (
        <Box key={i} size={[0.06, 0.05, depth + 0.02]} position={[-slope / 2 + (slope / (rows + 1)) * (i + 1), 0.09, 0]} color={dark} />
      ))}
    </group>
  )
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {side(1)}
      {side(-1)}
      <Box size={[0.18, 0.18, depth + 0.04]} position={[0, h + 0.02, 0]} color={dark} />
    </group>
  )
}

/** Tejado a cuatro aguas (pirámide truncada) para edificios "importantes". */
export function HipRoof({ w, d, h, color = C.roofBlue, dark = C.roofBlueDark, position = [0, 0, 0] }: { w: number; d: number; h: number; color?: string; dark?: string; position?: V3 }) {
  const r = Math.hypot(w, d) / 2 + 0.25
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]} rotation={[0, Math.PI / 4, 0]} scale={[w / Math.hypot(w, d), 1, d / Math.hypot(w, d)]} castShadow>
        <cylinderGeometry args={[0.18, r, h, 4, 1]} />
        <Mat color={color} flat />
      </mesh>
      <Box size={[0.4, 0.16, 0.4]} position={[0, h + 0.06, 0]} color={dark} />
    </group>
  )
}

/** Tejado cónico (faro, torres). */
export function ConeRoof({ r, h, color = C.roofRed, position = [0, 0, 0], segments = 10 }: { r: number; h: number; color?: string; position?: V3; segments?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <coneGeometry args={[r, h, segments]} />
        <Mat color={color} flat />
      </mesh>
      <mesh position={[0, h + 0.08, 0]}>
        <sphereGeometry args={[0.1, 8, 6]} />
        <Mat color={C.gold} rough={0.4} />
      </mesh>
    </group>
  )
}

/* ---------------- Aberturas ---------------- */

export function Door({ w = SCALE.door.w, h = SCALE.door.h, color = C.wood, arch = true, position = [0, 0, 0], rotation = 0 }: { w?: number; h?: number; color?: string; arch?: boolean; position?: V3; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box size={[w + 0.16, h + 0.1, 0.1]} position={[0, (h + 0.1) / 2, -0.02]} color={C.stoneDark} />
      <Box size={[w, h, 0.08]} position={[0, h / 2, 0.02]} color={color} />
      {arch && (
        <mesh position={[0, h, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[w / 2, w / 2, 0.08, 10, 1, false, 0, Math.PI]} />
          <Mat color={color} />
        </mesh>
      )}
      <Box size={[0.03, h - 0.2, 0.02]} position={[0, h / 2, 0.07]} color={C.woodDark} />
      <mesh position={[w * 0.3, h * 0.45, 0.08]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <Mat color={C.gold} rough={0.4} />
      </mesh>
    </group>
  )
}

export function Window({ w = SCALE.window.w, h = SCALE.window.h, shutters = true, shutterColor = C.roofBlue, night = false, flowers = false, position = [0, 0, 0], rotation = 0 }: {
  w?: number
  h?: number
  shutters?: boolean
  shutterColor?: string
  night?: boolean
  flowers?: boolean
  position?: V3
  rotation?: number
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box size={[w + 0.14, h + 0.14, 0.08]} position={[0, 0, -0.01]} color={C.woodLight} />
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[w, h, 0.03]} />
        <Mat color={night ? C.glassNight : C.glass} rough={0.2} emissive={night ? C.lantern : undefined} emissiveIntensity={night ? 0.9 : 0} />
      </mesh>
      <Box size={[0.04, h, 0.02]} position={[0, 0, 0.05]} color={C.woodLight} />
      <Box size={[w, 0.04, 0.02]} position={[0, 0, 0.05]} color={C.woodLight} />
      {shutters && (
        <>
          <Box size={[w * 0.45, h + 0.1, 0.05]} position={[-(w / 2 + w * 0.3), 0, 0.02]} color={shutterColor} />
          <Box size={[w * 0.45, h + 0.1, 0.05]} position={[w / 2 + w * 0.3, 0, 0.02]} color={shutterColor} />
        </>
      )}
      <Box size={[w + 0.3, 0.06, 0.16]} position={[0, -h / 2 - 0.05, 0.06]} color={C.stone} />
      {flowers && (
        <group position={[0, -h / 2 + 0.02, 0.12]}>
          <Box size={[w, 0.14, 0.14]} color={C.wood} />
          {[-0.2, 0, 0.2].map((x, i) => (
            <mesh key={i} position={[x * (w / 0.7), 0.14, 0]}>
              <dodecahedronGeometry args={[0.06, 0]} />
              <Mat color={[C.flowerPink, C.flowerRed, C.flowerYellow][i]} flat />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}

/* ---------------- Detalles ---------------- */

export function Chimney({ position = [0, 0, 0], h = 0.7, smoke = true }: { position?: V3; h?: number; smoke?: boolean }) {
  const puffs = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!puffs.current) return
    const t = clock.getElapsedTime()
    puffs.current.children.forEach((p, i) => {
      const phase = (t * 0.35 + i / 3) % 1
      p.position.y = h + phase * 1.1
      p.position.x = Math.sin(t + i) * 0.08 * phase
      const s = 0.08 + phase * 0.16
      p.scale.setScalar(s)
      const m = (p as THREE.Mesh).material as THREE.MeshStandardMaterial
      m.opacity = 0.7 * (1 - phase)
    })
  })
  return (
    <group position={position}>
      <Box size={[0.36, h, 0.36]} position={[0, h / 2, 0]} color={C.stoneDark} flat />
      <Box size={[0.46, 0.1, 0.46]} position={[0, h, 0]} color={C.stone} flat />
      {smoke && (
        <group ref={puffs}>
          {[0, 1, 2].map((i) => (
            <mesh key={i}>
              <dodecahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.6} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}

/** Valla de madera: postes y dos travesaños. `length` en unidades, a lo largo de X local. */
export function Fence({ length, position = [0, 0, 0], rotation = 0, h = SCALE.fence }: { length: number; position?: V3; rotation?: number; h?: number }) {
  const posts = Math.max(2, Math.round(length / 0.8) + 1)
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {Array.from({ length: posts }, (_, i) => (
        <Box key={i} size={[0.1, h, 0.1]} position={[-length / 2 + (length / (posts - 1)) * i, h / 2, 0]} color={C.woodLight} />
      ))}
      <Box size={[length, 0.06, 0.05]} position={[0, h * 0.75, 0]} color={C.woodLight} />
      <Box size={[length, 0.06, 0.05]} position={[0, h * 0.4, 0]} color={C.woodLight} />
    </group>
  )
}

export function Column({ h = 1.8, r = 0.11, position = [0, 0, 0], color = C.plaster }: { h?: number; r?: number; position?: V3; color?: string }) {
  return (
    <group position={position}>
      <Box size={[r * 3, 0.1, r * 3]} position={[0, 0.05, 0]} color={C.stone} />
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r * 1.1, h, 10]} />
        <Mat color={color} />
      </mesh>
      <Box size={[r * 3, 0.1, r * 3]} position={[0, h - 0.05, 0]} color={C.stone} />
    </group>
  )
}

export function Steps({ count = 3, width = 1.4, rise = SCALE.step, run = 0.32, position = [0, 0, 0], rotation = 0, color = C.stone }: { count?: number; width?: number; rise?: number; run?: number; position?: V3; rotation?: number; color?: string }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {Array.from({ length: count }, (_, i) => (
        <Box key={i} size={[width, rise * (count - i), run]} position={[0, (rise * (count - i)) / 2, run * i]} color={i % 2 ? C.stoneDark : color} flat />
      ))}
    </group>
  )
}

export function Lantern({ position = [0, 0, 0], lit = true, h = 1.6 }: { position?: V3; lit?: boolean; h?: number }) {
  return (
    <group position={position}>
      <Box size={[0.08, h, 0.08]} position={[0, h / 2, 0]} color={C.metal} />
      <Box size={[0.32, 0.05, 0.08]} position={[0.12, h, 0]} color={C.metal} />
      <group position={[0.24, h - 0.22, 0]}>
        <Box size={[0.2, 0.28, 0.2]} color={lit ? C.lantern : C.glass}>
          <Mat color={lit ? '#ffd27a' : C.glass} emissive={lit ? C.lantern : undefined} emissiveIntensity={lit ? 1.4 : 0} rough={0.3} />
        </Box>
        <Box size={[0.24, 0.05, 0.24]} position={[0, 0.16, 0]} color={C.metal} />
      </group>
    </group>
  )
}

export function Crate({ position = [0, 0, 0], size = 0.42, rotation = 0 }: { position?: V3; size?: number; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box size={[size, size, size]} position={[0, size / 2, 0]} color={C.woodLight} />
      <Box size={[size + 0.02, 0.05, 0.05]} position={[0, size * 0.5, size / 2]} color={C.wood} />
      <Box size={[0.05, size + 0.02, 0.05]} position={[0, size / 2, size / 2]} color={C.wood} />
    </group>
  )
}

export function Barrel({ position = [0, 0, 0], h = 0.5, r = 0.2 }: { position?: V3; h?: number; r?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[r * 0.9, r * 0.9, h, 10]} />
        <Mat color={C.wood} />
      </mesh>
      {[0.2, 0.8].map((k) => (
        <mesh key={k} position={[0, h * k, 0]}>
          <cylinderGeometry args={[r, r, 0.05, 10]} />
          <Mat color={C.metal} />
        </mesh>
      ))}
    </group>
  )
}

export function Sack({ position = [0, 0, 0] }: { position?: V3 }) {
  return (
    <mesh position={[position[0], position[1] + 0.2, position[2]]} scale={[1, 1.1, 0.9]} castShadow>
      <dodecahedronGeometry args={[0.22, 0]} />
      <Mat color={C.plasterWarm} flat />
    </mesh>
  )
}

/**
 * Zócalo: la base sólida sobre la que se asienta cada edificio. Un disco de piedra a ras de la
 * explanada y un faldón de roca que se hunde en el terreno, de modo que aunque la ladera caiga
 * junto al edificio nunca quede nada "en el aire". Mismo material que las rocas de la isla.
 */
export function Plinth({ radius, position = [0, 0, 0] }: { radius: number; position?: V3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[radius, radius + 0.25, 0.24, 14]} />
        <Mat color={C.sand} flat />
      </mesh>
      <mesh position={[0, -1.7, 0]}>
        <cylinderGeometry args={[radius + 0.25, radius + 1.9, 3.4, 14]} />
        <Mat color={C.rock} flat />
      </mesh>
    </group>
  )
}

/** Cartel de madera con texto legible (HTML sobre la escena). */
export function Sign({ text, position = [0, 0, 0], w = 1.5, tone = 'wood' }: { text: string; position?: V3; w?: number; tone?: 'wood' | 'navy' }) {
  return (
    <group position={position}>
      <Box size={[w, 0.42, 0.08]} color={tone === 'navy' ? C.navy : C.wood} />
      <Box size={[w + 0.08, 0.06, 0.1]} position={[0, 0.22, 0]} color={C.woodDark} />
      <Box size={[w + 0.08, 0.06, 0.1]} position={[0, -0.22, 0]} color={C.woodDark} />
      <Html position={[0, 0, 0.06]} center transform distanceFactor={4} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`sign-text ${tone === 'navy' ? 'sign-text--light' : ''}`}>{text}</div>
      </Html>
    </group>
  )
}

/** Mástil con bandera que ondea. */
export function FlagPole({ position = [0, 0, 0], h = 3.2, color = C.navy, emblem = true }: { position?: V3; h?: number; color?: string; emblem?: boolean }) {
  const flag = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (flag.current) flag.current.rotation.y = Math.sin(clock.getElapsedTime() * 2.2) * 0.25
  })
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.05, h, 6]} />
        <Mat color={C.woodLight} />
      </mesh>
      <mesh position={[0, h + 0.05, 0]}>
        <sphereGeometry args={[0.07, 6, 6]} />
        <Mat color={C.gold} rough={0.4} />
      </mesh>
      <group ref={flag} position={[0, h - 0.4, 0]}>
        <mesh position={[0.45, 0, 0]} castShadow>
          <planeGeometry args={[0.9, 0.6]} />
          <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.9} />
        </mesh>
        {emblem && (
          <mesh position={[0.45, 0, 0.01]}>
            <circleGeometry args={[0.16, 12]} />
            <meshStandardMaterial color={C.gold} side={THREE.DoubleSide} roughness={0.4} />
          </mesh>
        )}
      </group>
    </group>
  )
}

/** Emblema de moneda para fachadas. */
export function CoinEmblem({ position = [0, 0, 0], r = 0.3 }: { position?: V3; r?: number }) {
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r, r, 0.06, 16]} />
        <Mat color={C.gold} rough={0.35} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.035]}>
        <torusGeometry args={[r * 0.62, 0.025, 6, 16]} />
        <Mat color={C.goldDark} rough={0.4} />
      </mesh>
    </group>
  )
}

/** Etiqueta flotante de lugar: nombre y, opcionalmente, una cantidad con la moneda. */
export function Label({ text, sub, amount, tone = 'default', y = 1.6 }: { text: string; sub?: string; amount?: string; tone?: 'default' | 'coin' | 'locked'; y?: number }) {
  return (
    <Html position={[0, y, 0]} center distanceFactor={12} zIndexRange={[6, 0]} style={{ pointerEvents: 'none' }}>
      <div className={`scene-label scene-label--${tone}`}>
        <span>{text}</span>
        {sub && <small>{sub}</small>}
        {amount !== undefined && (
          <small className="scene-label__amount">
            <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="11" fill="#e2b04a" stroke="#b8862b" strokeWidth="2" />
              <circle cx="12" cy="12" r="6.5" fill="none" stroke="#b8862b" strokeWidth="2" />
            </svg>
            {amount}
          </small>
        )}
      </div>
    </Html>
  )
}

/** Zona de toque invisible y generosa: en el móvil todo se debe poder pulsar bien. */
export function TapZone({ size, onTap, children, position = [0, 0, 0] }: { size: V3; onTap?: () => void; children: ReactNode; position?: V3 }) {
  return (
    <group
      position={position}
      onClick={(e) => {
        if (!onTap) return
        e.stopPropagation()
        onTap()
      }}
      onPointerOver={() => onTap && (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <mesh position={[0, size[1] / 2, 0]} visible={false}>
        <boxGeometry args={size} />
        <meshBasicMaterial />
      </mesh>
      {children}
    </group>
  )
}

/** Moneda que flota y gira: señal universal de "hay algo que recoger". */
export function FloatingCoin({ index = 0, base = 1, radius = 0.2 }: { index?: number; base?: number; radius?: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime() + index * 0.7
    ref.current.position.y = base + index * 0.12 + Math.sin(t * 2) * 0.05
    ref.current.rotation.y = t * 1.5
  })
  return (
    <mesh ref={ref} position={[Math.sin(index * 2) * radius, base, Math.cos(index * 2) * radius]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.14, 0.14, 0.04, 14]} />
      <Mat color={C.gold} rough={0.3} emissive={C.goldDark} emissiveIntensity={0.2} />
    </mesh>
  )
}

/** Nieve sobre un tejado o superficie plana. */
export function Snow({ w, d, y, x = 0, z = 0 }: { w: number; d: number; y: number; x?: number; z?: number }) {
  return (
    <mesh position={[x, y, z]}>
      <boxGeometry args={[w, 0.07, d]} />
      <meshStandardMaterial color="#ffffff" roughness={1} />
    </mesh>
  )
}
