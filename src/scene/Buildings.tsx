import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { BANK_GREEN, COIN, COIN_DARK, CORAL, ROCK, ROCK_DARK, SHOP_AWNING, SLATE, WHITE, WOOD, WOOD_LIGHT, type SeasonPalette } from './palette'

const roughMat = (color: string, flat = true) => <meshStandardMaterial color={color} flatShading={flat} roughness={0.9} />

/** Etiqueta flotante, siempre legible, con el estilo de la interfaz. */
export function Label({ text, sub, amount, tone = 'default', y = 1.6 }: { text: string; sub?: string; amount?: string; tone?: 'default' | 'coin' | 'locked'; y?: number }) {
  return (
    <Html position={[0, y, 0]} center distanceFactor={11} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
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

/** Zona de toque invisible y generosa, para que en el móvil todo se pueda pulsar bien. */
function TapZone({ size, onTap, children }: { size: [number, number, number]; onTap?: () => void; children: ReactNode }) {
  return (
    <group
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

function Snow({ w, d, y, x = 0, z = 0 }: { w: number; d: number; y: number; x?: number; z?: number }) {
  return (
    <mesh position={[x, y, z]}>
      <boxGeometry args={[w, 0.06, d]} />
      <meshStandardMaterial color="#ffffff" roughness={1} />
    </mesh>
  )
}

/** Tejado a dos aguas: prisma triangular. */
function GableRoof({ w, d, h, color, y }: { w: number; d: number; h: number; color: string; y: number }) {
  // Prisma triangular: un cilindro de 3 lados tumbado. El radio fija la altura del tejado.
  return (
    <mesh position={[0, y + h * 0.36, 0]} rotation={[Math.PI / 2, Math.PI / 6, 0]} castShadow>
      <cylinderGeometry args={[w * 0.72, w * 0.72, d, 3, 1]} />
      {roughMat(color)}
    </mesh>
  )
}

export function House({ position, palette, night }: { position: [number, number, number]; palette: SeasonPalette; night: boolean }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 1.0, 1.3]} />
        {roughMat(WHITE, false)}
      </mesh>
      <GableRoof w={1.15} d={1.5} h={0.9} color={CORAL} y={1.0} />
      {palette.snow && <Snow w={1.2} d={1.6} y={1.62} />}
      <mesh position={[0.45, 1.55, -0.3]} castShadow>
        <boxGeometry args={[0.2, 0.5, 0.2]} />
        {roughMat(ROCK_DARK)}
      </mesh>
      <mesh position={[0, 0.35, 0.66]}>
        <boxGeometry args={[0.36, 0.7, 0.04]} />
        {roughMat(WOOD, false)}
      </mesh>
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} position={[x, 0.6, 0.66]}>
          <boxGeometry args={[0.3, 0.3, 0.04]} />
          <meshStandardMaterial color={night ? '#ffd98a' : '#a9d8ea'} emissive={night ? '#ffb347' : '#000000'} emissiveIntensity={night ? 0.9 : 0} />
        </mesh>
      ))}
    </group>
  )
}

/** Buzón: la paga llega aquí. Con dinero dentro, la banderita sube y flotan monedas. */
export function Mailbox({ position, cents, onTap }: { position: [number, number, number]; cents: number; onTap: () => void }) {
  const coins = Math.min(6, Math.ceil(cents / 30_00))
  return (
    <group position={position}>
      <TapZone size={[1.2, 1.6, 1.2]} onTap={onTap}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[0.08, 0.7, 0.08]} />
          {roughMat(WOOD, false)}
        </mesh>
        <mesh position={[0, 0.8, 0]} castShadow>
          <boxGeometry args={[0.32, 0.26, 0.5]} />
          {roughMat(cents > 0 ? BANK_GREEN : SLATE, false)}
        </mesh>
        <mesh position={[0.2, cents > 0 ? 1.05 : 0.85, -0.1]} rotation={[0, 0, cents > 0 ? 0 : Math.PI / 2]}>
          <boxGeometry args={[0.04, 0.24, 0.12]} />
          {roughMat(CORAL, false)}
        </mesh>
        {Array.from({ length: coins }, (_, i) => (
          <FloatingCoin key={i} index={i} base={1.1} />
        ))}
        <Label text={cents > 0 ? 'Paga' : 'Buzón'} sub={cents > 0 ? '¡Toca para recoger!' : 'vacío'} tone={cents > 0 ? 'coin' : 'default'} y={1.55} />
      </TapZone>
    </group>
  )
}

export function FloatingCoin({ index, base }: { index: number; base: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime() + index * 0.7
    ref.current.position.y = base + index * 0.12 + Math.sin(t * 2) * 0.05
    ref.current.rotation.y = t * 1.5
  })
  return (
    <mesh ref={ref} position={[Math.sin(index) * 0.2, base, Math.cos(index) * 0.2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.13, 0.13, 0.04, 12]} />
      <meshStandardMaterial color={COIN} metalness={0.4} roughness={0.35} emissive={COIN_DARK} emissiveIntensity={0.15} />
    </mesh>
  )
}

/** La hucha de la plaza: un cerdito grande. */
export function Piggy({ position, cents, onTap, palette }: { position: [number, number, number]; cents: number; onTap: () => void; palette: SeasonPalette }) {
  const pink = '#f2a7b6'
  const legs: [number, number][] = [[-0.32, -0.22], [0.32, -0.22], [-0.32, 0.22], [0.32, 0.22]]
  return (
    <group position={position}>
      <TapZone size={[1.6, 1.4, 1.4]} onTap={onTap}>
        {legs.map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, 0.16, z]} castShadow>
            <cylinderGeometry args={[0.1, 0.11, 0.32, 6]} />
            {roughMat('#e28a9d')}
          </mesh>
        ))}
        <mesh position={[0, 0.62, 0]} scale={[1.15, 0.9, 0.95]} castShadow>
          <dodecahedronGeometry args={[0.55, 1]} />
          {roughMat(pink)}
        </mesh>
        <mesh position={[0.6, 0.6, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.17, 0.19, 0.24, 8]} />
          {roughMat('#e28a9d')}
        </mesh>
        {[-0.22, 0.22].map((z) => (
          <mesh key={z} position={[0.25, 1.02, z]} rotation={[0, 0, 0.3]} castShadow>
            <coneGeometry args={[0.13, 0.26, 4]} />
            {roughMat('#e28a9d')}
          </mesh>
        ))}
        {[-0.18, 0.18].map((z) => (
          <mesh key={z} position={[0.5, 0.82, z]}>
            <sphereGeometry args={[0.05, 6, 6]} />
            <meshStandardMaterial color="#2b2b2b" />
          </mesh>
        ))}
        <mesh position={[0, 1.07, 0]}>
          <boxGeometry args={[0.3, 0.05, 0.08]} />
          <meshStandardMaterial color="#8a4a5a" />
        </mesh>
        {palette.snow && <Snow w={0.5} d={0.5} y={1.12} x={-0.15} />}
        <Label text="Hucha" amount={(cents / 100).toLocaleString('es-ES', { maximumFractionDigits: 2 })} y={1.75} />
      </TapZone>
    </group>
  )
}

/** La tienda: toldo a rayas, escaparate y cartel. */
export function Shop({ position, palette, onTap }: { position: [number, number, number]; palette: SeasonPalette; onTap: () => void }) {
  return (
    <group position={position}>
      <TapZone size={[2.2, 2.2, 2]} onTap={onTap}>
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.9, 1.1, 1.4]} />
          {roughMat('#fbead2', false)}
        </mesh>
        <mesh position={[0, 1.18, 0]} castShadow>
          <boxGeometry args={[2.05, 0.16, 1.55]} />
          {roughMat(WOOD)}
        </mesh>
        {palette.snow && <Snow w={2.0} d={1.5} y={1.29} />}
        {/* toldo a rayas */}
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i} position={[-0.75 + i * 0.3, 0.98, 0.95]} rotation={[0.5, 0, 0]} castShadow>
            <boxGeometry args={[0.3, 0.04, 0.6]} />
            {roughMat(i % 2 ? SHOP_AWNING : WHITE, false)}
          </mesh>
        ))}
        <mesh position={[0, 0.5, 0.71]}>
          <boxGeometry args={[1.3, 0.6, 0.04]} />
          <meshStandardMaterial color="#a9d8ea" roughness={0.2} />
        </mesh>
        <mesh position={[0.72, 0.35, 0.71]}>
          <boxGeometry args={[0.3, 0.7, 0.04]} />
          {roughMat(WOOD, false)}
        </mesh>
        {/* cajas de fruta */}
        <mesh position={[-0.7, 0.18, 1.05]} castShadow>
          <boxGeometry args={[0.4, 0.3, 0.3]} />
          {roughMat(WOOD_LIGHT, false)}
        </mesh>
        <mesh position={[-0.7, 0.36, 1.05]}>
          <sphereGeometry args={[0.1, 6, 5]} />
          <meshStandardMaterial color="#f2a541" />
        </mesh>
        <mesh position={[-0.58, 0.38, 1.0]}>
          <sphereGeometry args={[0.09, 6, 5]} />
          <meshStandardMaterial color="#e5735b" />
        </mesh>
        <Label text="Tienda" y={1.75} />
      </TapZone>
    </group>
  )
}

/** El Banco de la Isla: fachada de columnas. Cerrado hasta el final del primer año. */
export function Bank({ position, unlocked, palette, onTap, cents }: { position: [number, number, number]; unlocked: boolean; palette: SeasonPalette; onTap: () => void; cents: number }) {
  const bodyColor = unlocked ? '#f3eee4' : '#d9d3c8'
  return (
    <group position={position}>
      <TapZone size={[2.4, 2.4, 2.2]} onTap={onTap}>
        <mesh position={[0, 0.1, 0]} receiveShadow>
          <boxGeometry args={[2.3, 0.2, 1.9]} />
          {roughMat(ROCK)}
        </mesh>
        <mesh position={[0, 0.8, -0.2]} castShadow receiveShadow>
          <boxGeometry args={[1.9, 1.2, 1.3]} />
          {roughMat(bodyColor, false)}
        </mesh>
        {[-0.7, -0.23, 0.23, 0.7].map((x) => (
          <mesh key={x} position={[x, 0.8, 0.62]} castShadow>
            <cylinderGeometry args={[0.09, 0.1, 1.2, 8]} />
            {roughMat(WHITE, false)}
          </mesh>
        ))}
        <mesh position={[0, 1.5, 0]} castShadow>
          <boxGeometry args={[2.1, 0.2, 1.7]} />
          {roughMat(unlocked ? BANK_GREEN : SLATE)}
        </mesh>
        <mesh position={[0, 1.75, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[1.1, 1.1, 1.7, 3, 1]} />
          {roughMat(unlocked ? BANK_GREEN : SLATE)}
        </mesh>
        {palette.snow && <Snow w={1.9} d={1.6} y={2.3} />}
        {unlocked ? (
          <>
            <mesh position={[0, 0.45, 0.46]}>
              <boxGeometry args={[0.5, 0.9, 0.04]} />
              {roughMat(WOOD, false)}
            </mesh>
            {/* chimenea del interés */}
            <mesh position={[0.7, 2.05, -0.4]} castShadow>
              <boxGeometry args={[0.2, 0.5, 0.2]} />
              {roughMat(ROCK_DARK)}
            </mesh>
            {cents > 0 && <FloatingCoin index={0} base={2.4} />}
          </>
        ) : (
          <>
            {/* tablones y andamio: en construcción */}
            {[0.2, 0.6, 1.0].map((y) => (
              <mesh key={y} position={[0, y, 0.7]} rotation={[0, 0, y === 0.6 ? 0.15 : -0.1]}>
                <boxGeometry args={[1.7, 0.1, 0.06]} />
                {roughMat(WOOD_LIGHT, false)}
              </mesh>
            ))}
          </>
        )}
        <Label
          text="Banco"
          sub={unlocked ? undefined : 'abre al terminar el año 1'}
          amount={unlocked ? (cents / 100).toLocaleString('es-ES', { maximumFractionDigits: 2 }) : undefined}
          tone={unlocked ? 'default' : 'locked'}
          y={2.7}
        />
      </TapZone>
    </group>
  )
}

/** El faro, con su cabaña roja: el edificio de referencia de la isla. */
export function Lighthouse({ position, palette, night }: { position: [number, number, number]; palette: SeasonPalette; night: boolean }) {
  const beam = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (beam.current) beam.current.rotation.y = clock.getElapsedTime() * 0.6
  })
  return (
    <group position={position}>
      {/* base de roca */}
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[0.95, 1.1, 0.3, 7]} />
        {roughMat(ROCK_DARK)}
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.36, 0.48, 2.6, 10]} />
        {roughMat(WHITE, false)}
      </mesh>
      {[0.9, 1.9].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.47 - y * 0.04, 0.48 - y * 0.04, 0.22, 10]} />
          {roughMat('#8e8a85', false)}
        </mesh>
      ))}
      {/* balcón y barandilla */}
      <mesh position={[0, 2.95, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.55, 0.12, 10]} />
        {roughMat(SLATE, false)}
      </mesh>
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.55, 3.15, Math.sin(a) * 0.55]}>
            <cylinderGeometry args={[0.015, 0.015, 0.3, 4]} />
            <meshStandardMaterial color={SLATE} />
          </mesh>
        )
      })}
      <mesh position={[0, 3.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.02, 4, 12]} />
        <meshStandardMaterial color={SLATE} />
      </mesh>
      {/* linterna */}
      <mesh position={[0, 3.35, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.55, 8]} />
        <meshStandardMaterial color="#fff3c4" transparent opacity={0.8} emissive={night ? '#ffd27a' : '#000'} emissiveIntensity={night ? 1.2 : 0} />
      </mesh>
      {night && (
        <group ref={beam} position={[0, 3.35, 0]}>
          <mesh position={[3, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.9, 6, 8, 1, true]} />
            <meshBasicMaterial color="#fff2b0" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>
      )}
      <mesh position={[0, 3.75, 0]} castShadow>
        <coneGeometry args={[0.42, 0.45, 8]} />
        {roughMat(CORAL)}
      </mesh>
      <mesh position={[0, 4.02, 0]}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshStandardMaterial color={SLATE} />
      </mesh>
      {/* cabaña roja adosada */}
      <group position={[1.1, 0.3, 0.3]}>
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.8, 1.0]} />
          {roughMat('#c9553f', false)}
        </mesh>
        <mesh position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.85, 0.85, 1.15, 3, 1]} />
          {roughMat('#5c4a40')}
        </mesh>
        {palette.snow && <Snow w={1.1} d={1.1} y={1.28} />}
        <mesh position={[0, 0.35, 0.51]}>
          <boxGeometry args={[0.26, 0.5, 0.03]} />
          {roughMat(WHITE, false)}
        </mesh>
        <mesh position={[0.4, 0.5, 0.51]}>
          <boxGeometry args={[0.24, 0.24, 0.03]} />
          <meshStandardMaterial color={night ? '#ffd98a' : '#a9d8ea'} emissive={night ? '#ffb347' : '#000'} emissiveIntensity={night ? 0.8 : 0} />
        </mesh>
        {/* salvavidas */}
        <mesh position={[-0.42, 0.5, 0.52]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.12, 0.04, 6, 12]} />
          <meshStandardMaterial color={WHITE} />
        </mesh>
        <mesh position={[-0.42, 0.5, 0.53]}>
          <torusGeometry args={[0.12, 0.041, 6, 12, Math.PI / 2]} />
          <meshStandardMaterial color={CORAL} />
        </mesh>
        {/* barriles */}
        {[[-0.85, 0.2], [-0.85, 0.55]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.18, z]} castShadow>
            <cylinderGeometry args={[0.13, 0.13, 0.36, 8]} />
            {roughMat(WOOD, false)}
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** Objetos comprados, colocados en la isla. */
export function Kite({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.position.x = position[0] + Math.sin(t * 0.7) * 0.4
    ref.current.position.y = position[1] + 2.4 + Math.sin(t * 1.1) * 0.25
    ref.current.rotation.z = Math.sin(t * 0.9) * 0.3
  })
  return (
    <group>
      <group ref={ref} position={[position[0], position[1] + 2.4, position[2]]}>
        <mesh rotation={[0, 0, Math.PI / 4]} castShadow>
          <planeGeometry args={[0.6, 0.6]} />
          <meshStandardMaterial color="#e5735b" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.6, 0]}>
          <boxGeometry args={[0.03, 0.8, 0.03]} />
          <meshStandardMaterial color="#f5c542" />
        </mesh>
      </group>
      <mesh position={[position[0], position[1] + 0.05, position[2]]}>
        <cylinderGeometry args={[0.06, 0.08, 0.1, 6]} />
        {roughMat(WOOD, false)}
      </mesh>
    </group>
  )
}

export function Ball({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={[position[0], position[1] + 0.18, position[2]]} castShadow>
      <dodecahedronGeometry args={[0.18, 0]} />
      <meshStandardMaterial color="#ffffff" flatShading />
    </mesh>
  )
}

export function Bike({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-0.32, 0.32].map((x) => (
        <mesh key={x} position={[x, 0.22, 0]} rotation={[0, 0, 0]} castShadow>
          <torusGeometry args={[0.2, 0.03, 6, 14]} />
          <meshStandardMaterial color="#2b2b2b" />
        </mesh>
      ))}
      <mesh position={[0, 0.4, 0]} rotation={[0, 0, 0.35]}>
        <boxGeometry args={[0.55, 0.05, 0.05]} />
        <meshStandardMaterial color="#5fa8d3" />
      </mesh>
      <mesh position={[-0.05, 0.55, 0]}>
        <boxGeometry args={[0.2, 0.05, 0.14]} />
        <meshStandardMaterial color="#2b2b2b" />
      </mesh>
      <mesh position={[0.32, 0.55, 0]}>
        <boxGeometry args={[0.05, 0.05, 0.3]} />
        <meshStandardMaterial color="#5fa8d3" />
      </mesh>
    </group>
  )
}

export function Telescope({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[0, 2.1, 4.2].map((a) => (
        <mesh key={a} position={[Math.cos(a) * 0.18, 0.35, Math.sin(a) * 0.18]} rotation={[Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35]}>
          <cylinderGeometry args={[0.02, 0.02, 0.7, 5]} />
          <meshStandardMaterial color="#2b2b2b" />
        </mesh>
      ))}
      <mesh position={[0, 0.8, 0]} rotation={[0.9, 0, 0.4]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.7, 8]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>
    </group>
  )
}
