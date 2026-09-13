import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ACORN, ACORN_CAP, WOOD, type SeasonPalette } from './palette'

const trunkMat = <meshStandardMaterial color="#7a5230" roughness={1} />

/** Ciprés: tres conos apilados, el árbol vertical de la referencia. */
export function Cypress({ position, scale = 1, palette }: { position: [number, number, number]; scale?: number; palette: SeasonPalette }) {
  const c = palette.cypress
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 0.3, 5]} />
        {trunkMat}
      </mesh>
      <mesh position={[0, 0.75, 0]} castShadow>
        <coneGeometry args={[0.34, 1.0, 6]} />
        <meshStandardMaterial color={c} flatShading roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.35, 0]} castShadow>
        <coneGeometry args={[0.26, 0.9, 6]} />
        <meshStandardMaterial color={c} flatShading roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.9, 0]} castShadow>
        <coneGeometry args={[0.16, 0.7, 6]} />
        <meshStandardMaterial color={c} flatShading roughness={0.9} />
      </mesh>
      {palette.snow && (
        <mesh position={[0, 2.22, 0]}>
          <coneGeometry args={[0.1, 0.18, 6]} />
          <meshStandardMaterial color="#ffffff" roughness={1} />
        </mesh>
      )}
    </group>
  )
}

/** Árbol redondo de copa facetada. */
export function RoundTree({ position, scale = 1, palette, color }: { position: [number, number, number]; scale?: number; palette: SeasonPalette; color?: string }) {
  const c = color ?? palette.foliage
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 0.6, 5]} />
        {trunkMat}
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <dodecahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color={c} flatShading roughness={0.9} />
      </mesh>
      <mesh position={[0.25, 1.05, 0.1]} castShadow>
        <dodecahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color={c} flatShading roughness={0.9} />
      </mesh>
      {palette.snow && (
        <mesh position={[0, 1.22, 0]} scale={[1, 0.35, 1]}>
          <dodecahedronGeometry args={[0.42, 0]} />
          <meshStandardMaterial color="#ffffff" roughness={1} />
        </mesh>
      )}
      {palette.flowers && (
        <>
          <mesh position={[-0.28, 0.95, 0.3]}>
            <sphereGeometry args={[0.06, 5, 4]} />
            <meshStandardMaterial color="#f5a3b5" />
          </mesh>
          <mesh position={[0.32, 0.7, -0.25]}>
            <sphereGeometry args={[0.06, 5, 4]} />
            <meshStandardMaterial color="#f5a3b5" />
          </mesh>
        </>
      )}
    </group>
  )
}

/** El roble de la isla: el que cambia de color y suelta hojas en otoño. */
export function Oak({ position, palette }: { position: [number, number, number]; palette: SeasonPalette }) {
  const bare = palette.snow
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.24, 1.1, 6]} />
        <meshStandardMaterial color="#6b4a2c" roughness={1} />
      </mesh>
      <mesh position={[0.35, 1.1, 0.1]} rotation={[0, 0, -0.6]} castShadow>
        <cylinderGeometry args={[0.06, 0.1, 0.7, 5]} />
        <meshStandardMaterial color="#6b4a2c" roughness={1} />
      </mesh>
      <mesh position={[-0.3, 1.15, -0.1]} rotation={[0.2, 0, 0.6]} castShadow>
        <cylinderGeometry args={[0.06, 0.1, 0.7, 5]} />
        <meshStandardMaterial color="#6b4a2c" roughness={1} />
      </mesh>
      {!bare && (
        <>
          <mesh position={[0, 1.7, 0]} castShadow>
            <dodecahedronGeometry args={[0.85, 0]} />
            <meshStandardMaterial color={palette.oak} flatShading roughness={0.9} />
          </mesh>
          <mesh position={[0.55, 1.45, 0.25]} castShadow>
            <dodecahedronGeometry args={[0.5, 0]} />
            <meshStandardMaterial color={palette.oak} flatShading roughness={0.9} />
          </mesh>
          <mesh position={[-0.5, 1.5, -0.2]} castShadow>
            <dodecahedronGeometry args={[0.45, 0]} />
            <meshStandardMaterial color={palette.oak} flatShading roughness={0.9} />
          </mesh>
        </>
      )}
      {bare && (
        <mesh position={[0, 1.55, 0]}>
          <dodecahedronGeometry args={[0.35, 0]} />
          <meshStandardMaterial color="#ffffff" roughness={1} />
        </mesh>
      )}
      {palette.fallenLeaves &&
        [
          [0.9, 0.4], [-0.8, 0.6], [0.3, -0.9], [-0.4, -0.7], [1.1, -0.3], [0.1, 1.1],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, i]}>
            <circleGeometry args={[0.09, 5]} />
            <meshStandardMaterial color={i % 2 ? '#e08a4a' : '#c96a3a'} roughness={1} />
          </mesh>
        ))}
    </group>
  )
}

/** Bellota recogible: flota y gira despacio para llamar la atención. */
export function Acorn({ position, onPick }: { position: [number, number, number]; onPick: () => void }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.position.y = position[1] + 0.12 + Math.sin(t * 2.4 + position[0]) * 0.05
    ref.current.rotation.y = t * 0.8
  })
  return (
    <group
      ref={ref}
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        onPick()
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      {/* área de toque generosa e invisible para el móvil */}
      <mesh visible={false}>
        <sphereGeometry args={[0.45, 6, 6]} />
        <meshBasicMaterial />
      </mesh>
      <mesh castShadow>
        <sphereGeometry args={[0.15, 8, 6]} />
        <meshStandardMaterial color={ACORN} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.11, 0]}>
        <sphereGeometry args={[0.13, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={ACORN_CAP} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.02, 0.03, 0.08, 5]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
    </group>
  )
}
