/**
 * AVATAR DEL JUGADOR: personaje low-poly de cabeza cúbica grande, cuerpo corto y brazos y piernas
 * articulados, montado a partir de una receta del catálogo (`catalog.ts`). Anda, mira, saluda, trabaja…
 * con el mismo repertorio de acciones que los vecinos de la isla, así que puede pasear por ella.
 *
 * Coordenadas: el origen está entre los pies, mira hacia +z. Altura ≈ 1,3 unidades (× `scale`).
 */
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Mat } from '../kit/Parts'
import type { Action, Prop } from '../Ambient'
import { C } from '../palette'
import type { AvatarDef } from './catalog'

type V3 = [number, number, number]

/** Caja con esquinas suavizadas (o afiladas si `sharp`). */
function Bx({
  s,
  p,
  c,
  r,
  sharp = false,
  radius = 0.03,
  flat = false,
  opacity,
}: {
  s: V3
  p: V3
  c: string
  r?: V3
  sharp?: boolean
  radius?: number
  flat?: boolean
  opacity?: number
}) {
  if (sharp) {
    return (
      <mesh position={p} rotation={r} castShadow>
        <boxGeometry args={s} />
        <Mat color={c} flat={flat} opacity={opacity} />
      </mesh>
    )
  }
  return (
    <RoundedBox args={s} radius={Math.min(radius, Math.min(...s) / 2 - 0.001)} smoothness={2} position={p} rotation={r} castShadow>
      <Mat color={c} flat={flat} opacity={opacity} />
    </RoundedBox>
  )
}

function Sph({ r, p, c, sc, flat = false }: { r: number; p: V3; c: string; sc?: V3; flat?: boolean }) {
  return (
    <mesh position={p} scale={sc} castShadow>
      <sphereGeometry args={[r, 10, 8]} />
      <Mat color={c} flat={flat} />
    </mesh>
  )
}

function Cyl({ rt, rb, h, p, c, r, seg = 12, flat = false }: { rt: number; rb: number; h: number; p: V3; c: string; r?: V3; seg?: number; flat?: boolean }) {
  return (
    <mesh position={p} rotation={r} castShadow>
      <cylinderGeometry args={[rt, rb, h, seg]} />
      <Mat color={c} flat={flat} />
    </mesh>
  )
}

function Cone({ rad, h, p, c, r, seg = 10, flat = true }: { rad: number; h: number; p: V3; c: string; r?: V3; seg?: number; flat?: boolean }) {
  return (
    <mesh position={p} rotation={r} castShadow>
      <coneGeometry args={[rad, h, seg]} />
      <Mat color={c} flat={flat} />
    </mesh>
  )
}

function Ring({ rad, tube, p, c, r }: { rad: number; tube: number; p: V3; c: string; r?: V3 }) {
  return (
    <mesh position={p} rotation={r}>
      <torusGeometry args={[rad, tube, 6, 16]} />
      <Mat color={c} />
    </mesh>
  )
}

/** Oscurece un color hexadecimal (para nariz, sombras de la ropa…). */
function shade(hex: string, k: number): string {
  const c = new THREE.Color(hex)
  c.multiplyScalar(k)
  return `#${c.getHexString()}`
}

/** Dorsal con número: textura de canvas, sin fuentes externas. */
function NumberPlate({ text, color, bg }: { text: string; color: string; bg: string }) {
  const tex = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const g = canvas.getContext('2d')
    if (g) {
      g.fillStyle = bg
      g.fillRect(0, 0, 128, 128)
      g.fillStyle = color
      g.font = "800 92px 'Baloo 2', 'Arial Black', Arial, sans-serif"
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(text, 64, 70)
    }
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [text, color, bg])
  return (
    <mesh position={[0, 0.2, 0.162]}>
      <planeGeometry args={[0.28, 0.28]} />
      <meshStandardMaterial map={tex} roughness={0.9} />
    </mesh>
  )
}

const DARK = '#2b2b2b'
const WHITE = '#f8f4ea'
const GOLD = '#f2c044'

/* ───────────────────────── Medidas ───────────────────────── */
const HEAD: V3 = [0.58, 0.52, 0.5]
const HEAD_Y = 0.7 // respecto al grupo del torso
const FACE_Z = HEAD[2] / 2
const TOP_Y = HEAD[1] / 2 // coronilla (respecto al centro de la cabeza)

/* ───────────────────────── Pelo ───────────────────────── */
function Hair({ def }: { def: AvatarDef }) {
  const h = def.hair
  if (!h || h.style === 'calvo') return null
  const c = h.color
  const cap = <Bx s={[0.6, 0.14, 0.52]} p={[0, 0.21, -0.01]} c={c} radius={0.05} />
  const back = (len: number) => <Bx s={[0.6, len, 0.08]} p={[0, 0.25 - len / 2, -0.23]} c={c} radius={0.03} />
  const sides = (len: number) => [-0.285, 0.285].map((x) => <Bx key={x} s={[0.07, len, 0.46]} p={[x, 0.25 - len / 2, -0.03]} c={c} radius={0.03} />)
  switch (h.style) {
    case 'corto':
      return (
        <>
          {cap}
          {back(0.3)}
        </>
      )
    case 'flequillo':
      return (
        <>
          {cap}
          {back(0.3)}
          <Bx s={[0.6, 0.1, 0.07]} p={[0, 0.17, 0.23]} c={c} radius={0.03} />
        </>
      )
    case 'melena':
      return (
        <>
          {cap}
          {back(0.55)}
          {sides(0.5)}
        </>
      )
    case 'largo':
      return (
        <>
          {cap}
          {back(0.8)}
          {sides(0.62)}
        </>
      )
    case 'coletas':
      return (
        <>
          {cap}
          {back(0.3)}
          {[-0.34, 0.34].map((x) => (
            <Sph key={x} r={0.11} p={[x, 0.02, -0.08]} c={c} />
          ))}
        </>
      )
    case 'trenzas':
      return (
        <>
          {cap}
          {back(0.3)}
          {[-0.33, 0.33].map((x) => (
            <Bx key={x} s={[0.09, 0.34, 0.09]} p={[x, -0.12, -0.06]} c={c} r={[0, 0, x > 0 ? -0.2 : 0.2]} radius={0.04} />
          ))}
        </>
      )
    case 'mono':
      return (
        <>
          {cap}
          {back(0.3)}
          <Sph r={0.14} p={[0, 0.36, -0.06]} c={c} />
        </>
      )
    case 'rizos':
      return (
        <>
          {[
            [-0.22, 0.28, 0.1],
            [0, 0.32, 0.05],
            [0.22, 0.28, 0.1],
            [-0.27, 0.22, -0.12],
            [0.27, 0.22, -0.12],
            [0, 0.28, -0.2],
            [-0.15, 0.3, -0.05],
            [0.15, 0.3, -0.05],
          ].map((p, i) => (
            <mesh key={i} position={p as V3} castShadow>
              <dodecahedronGeometry args={[0.11, 0]} />
              <Mat color={c} flat />
            </mesh>
          ))}
        </>
      )
    case 'rastas':
      return (
        <>
          {cap}
          {[-0.24, -0.12, 0, 0.12, 0.24].map((x) => (
            <Bx key={x} s={[0.07, 0.5, 0.07]} p={[x, -0.02, -0.25]} c={c} radius={0.03} />
          ))}
          {[-0.3, 0.3].map((x) => (
            <Bx key={x} s={[0.07, 0.42, 0.07]} p={[x, 0.02, -0.1]} c={c} radius={0.03} />
          ))}
        </>
      )
  }
  return null
}

/* ───────────────────────── Barbas y gafas ───────────────────────── */
function Beard({ def }: { def: AvatarDef }) {
  const b = def.beard
  if (!b) return null
  const c = b.color
  switch (b.style) {
    case 'bigote':
      return <Bx s={[0.24, 0.05, 0.05]} p={[0, -0.1, FACE_Z + 0.01]} c={c} radius={0.02} />
    case 'mostacho':
      return (
        <>
          {[-0.09, 0.09].map((x) => (
            <Bx key={x} s={[0.17, 0.06, 0.05]} p={[x, -0.1, FACE_Z + 0.01]} c={c} r={[0, 0, x > 0 ? 0.35 : -0.35]} radius={0.025} />
          ))}
        </>
      )
    case 'perilla':
      return <Bx s={[0.12, 0.1, 0.05]} p={[0, -0.22, FACE_Z]} c={c} radius={0.02} />
    case 'completa':
      return (
        <>
          <Bx s={[0.5, 0.18, 0.12]} p={[0, -0.22, FACE_Z - 0.04]} c={c} radius={0.04} />
          {[-0.28, 0.28].map((x) => (
            <Bx key={x} s={[0.07, 0.3, 0.3]} p={[x, -0.12, 0.08]} c={c} radius={0.03} />
          ))}
          <Bx s={[0.24, 0.05, 0.05]} p={[0, -0.1, FACE_Z + 0.01]} c={c} radius={0.02} />
        </>
      )
    case 'larga':
      return (
        <>
          <Bx s={[0.44, 0.5, 0.12]} p={[0, -0.38, FACE_Z - 0.05]} c={c} radius={0.05} />
          <Bx s={[0.26, 0.06, 0.05]} p={[0, -0.1, FACE_Z + 0.01]} c={c} radius={0.02} />
        </>
      )
  }
  return null
}

function Glasses({ def }: { def: AvatarDef }) {
  const g = def.glasses
  if (!g) return null
  const z = FACE_Z + 0.02
  switch (g) {
    case 'redondas':
      return (
        <>
          {[-0.11, 0.11].map((x) => (
            <Ring key={x} rad={0.075} tube={0.012} p={[x, 0.02, z]} c={DARK} />
          ))}
          <Bx s={[0.07, 0.015, 0.015]} p={[0, 0.03, z]} c={DARK} sharp />
        </>
      )
    case 'monoculo':
      return <Ring rad={0.08} tube={0.014} p={[0.11, 0.02, z]} c={GOLD} />
    case 'sol':
      return (
        <>
          {[-0.11, 0.11].map((x) => (
            <Bx key={x} s={[0.17, 0.1, 0.03]} p={[x, 0.02, z]} c="#1d2430" radius={0.02} />
          ))}
          <Bx s={[0.08, 0.02, 0.02]} p={[0, 0.04, z]} c={DARK} sharp />
        </>
      )
    case 'espiral':
      return (
        <>
          {[-0.11, 0.11].map((x) => (
            <group key={x} position={[x, 0.02, z]}>
              <Cyl rt={0.085} rb={0.085} h={0.02} p={[0, 0, 0]} c={WHITE} r={[Math.PI / 2, 0, 0]} />
              <Ring rad={0.085} tube={0.016} p={[0, 0, 0.005]} c="#c9302b" />
              <Ring rad={0.045} tube={0.012} p={[0, 0, 0.012]} c="#c9302b" />
              <Sph r={0.014} p={[0, 0, 0.02]} c="#c9302b" />
            </group>
          ))}
          <Bx s={[0.06, 0.02, 0.02]} p={[0, 0.03, z]} c="#c9302b" sharp />
        </>
      )
    case 'parche':
      return (
        <>
          <Bx s={[0.15, 0.13, 0.03]} p={[0.11, 0.02, z]} c={DARK} radius={0.03} />
          <Bx s={[0.6, 0.025, 0.02]} p={[0, 0.07, z - 0.02]} c={DARK} r={[0, 0, -0.15]} sharp />
        </>
      )
  }
  return null
}

/* ───────────────────────── Cara ───────────────────────── */
function Face({ def }: { def: AvatarDef }) {
  const face = def.face ?? 'normal'
  const extras = def.extras ?? []
  const brows = def.hair?.color ?? shade(def.skin, 0.55)
  const angry = extras.includes('cejas-enfadadas')
  const noseColor = shade(def.skin, 0.8)
  const eye = (x: number, w = 0.055, h = 0.075) => <Bx key={x} s={[w, h, 0.03]} p={[x, 0.02, FACE_Z]} c={DARK} radius={0.015} />
  if (face === 'calabaza') return null
  if (face === 'liebre') {
    return (
      <>
        {[-0.11, 0.11].map((x) => eye(x, 0.06, 0.08))}
        {/* hocico rosa, bigotes y dientes */}
        <Sph r={0.045} p={[0, -0.05, FACE_Z + 0.02]} c="#e28a9d" />
        {[-1, 1].map((sgn) => (
          <group key={sgn}>
            <Bx s={[0.16, 0.012, 0.012]} p={[sgn * 0.14, -0.05, FACE_Z + 0.01]} c={shade(def.skin, 0.6)} r={[0, 0, sgn * 0.15]} sharp />
            <Bx s={[0.16, 0.012, 0.012]} p={[sgn * 0.14, -0.09, FACE_Z + 0.01]} c={shade(def.skin, 0.6)} r={[0, 0, -sgn * 0.15]} sharp />
          </group>
        ))}
        {[-0.03, 0.03].map((x) => (
          <Bx key={x} s={[0.045, 0.06, 0.03]} p={[x, -0.15, FACE_Z]} c={WHITE} radius={0.01} />
        ))}
        {/* orejas largas */}
        {[-0.13, 0.13].map((x) => (
          <group key={x} position={[x, TOP_Y + 0.28, -0.04]} rotation={[0, 0, x > 0 ? -0.18 : 0.18]}>
            <Bx s={[0.13, 0.6, 0.09]} p={[0, 0, 0]} c={def.skin} radius={0.05} />
            <Bx s={[0.07, 0.44, 0.03]} p={[0, 0, 0.04]} c="#e28a9d" radius={0.02} />
          </group>
        ))}
      </>
    )
  }
  if (face === 'robot') {
    return (
      <>
        {[-0.12, 0.12].map((x) => (
          <mesh key={x} position={[x, 0.03, FACE_Z]}>
            <boxGeometry args={[0.12, 0.1, 0.03]} />
            <Mat color={def.hatAccent ?? '#3aa5d8'} emissive={def.hatAccent ?? '#3aa5d8'} emissiveIntensity={0.7} />
          </mesh>
        ))}
        <Bx s={[0.26, 0.05, 0.03]} p={[0, -0.14, FACE_Z]} c={shade(def.skin, 0.6)} radius={0.01} />
        {[-0.08, 0, 0.08].map((x) => (
          <Bx key={x} s={[0.02, 0.05, 0.035]} p={[x, -0.14, FACE_Z]} c={def.skin} sharp />
        ))}
        {[-0.31, 0.31].map((x) => (
          <Cyl key={x} rt={0.07} rb={0.07} h={0.06} p={[x, 0, 0]} c={shade(def.skin, 0.75)} r={[0, 0, Math.PI / 2]} seg={8} />
        ))}
      </>
    )
  }
  if (face === 'calavera') {
    return (
      <>
        {[-0.12, 0.12].map((x) => (
          <Cyl key={x} rt={0.075} rb={0.075} h={0.03} p={[x, 0.04, FACE_Z]} c={DARK} r={[Math.PI / 2, 0, 0]} seg={10} />
        ))}
        {[-0.12, 0.12].map((x) => (
          <Sph key={x} r={0.03} p={[x, 0.05, FACE_Z + 0.015]} c={WHITE} />
        ))}
        <Cone rad={0.04} h={0.07} p={[0, -0.08, FACE_Z]} c={DARK} r={[Math.PI, 0, 0]} seg={3} />
        <Bx s={[0.22, 0.06, 0.03]} p={[0, -0.19, FACE_Z]} c={DARK} radius={0.01} />
        {[-0.075, -0.025, 0.025, 0.075].map((x) => (
          <Bx key={x} s={[0.03, 0.05, 0.035]} p={[x, -0.19, FACE_Z]} c={WHITE} sharp />
        ))}
      </>
    )
  }
  if (face === 'momia') {
    return (
      <>
        {/* un ojo asoma entre las vendas */}
        <Bx s={[0.09, 0.09, 0.03]} p={[0.1, 0.03, FACE_Z]} c={WHITE} radius={0.02} />
        <Bx s={[0.04, 0.05, 0.035]} p={[0.11, 0.02, FACE_Z]} c={DARK} radius={0.01} />
        <Bx s={[0.14, 0.05, 0.03]} p={[0, -0.14, FACE_Z]} c="#c9302b" radius={0.015} />
        {[-0.03, 0.03].map((x) => (
          <Bx key={x} s={[0.03, 0.03, 0.035]} p={[x, -0.135, FACE_Z]} c={WHITE} sharp />
        ))}
      </>
    )
  }
  if (face === 'zombi') {
    return (
      <>
        <Cyl rt={0.075} rb={0.075} h={0.03} p={[-0.12, 0.03, FACE_Z]} c={WHITE} r={[Math.PI / 2, 0, 0]} seg={10} />
        <Sph r={0.03} p={[-0.1, 0.02, FACE_Z + 0.015]} c={DARK} />
        <Cyl rt={0.055} rb={0.055} h={0.03} p={[0.12, 0.05, FACE_Z]} c={WHITE} r={[Math.PI / 2, 0, 0]} seg={10} />
        <Sph r={0.025} p={[0.13, 0.06, FACE_Z + 0.015]} c={DARK} />
        <Bx s={[0.06, 0.06, 0.04]} p={[0, -0.06, FACE_Z + 0.01]} c={shade(def.skin, 0.75)} radius={0.02} />
        <Bx s={[0.16, 0.02, 0.02]} p={[0.02, -0.16, FACE_Z]} c={DARK} r={[0, 0, 0.2]} sharp />
        {/* cicatriz cosida */}
        <Bx s={[0.02, 0.1, 0.02]} p={[0.2, 0.16, FACE_Z]} c={DARK} r={[0, 0, 0.6]} sharp />
      </>
    )
  }
  // Cara normal
  const clownNose = extras.includes('nariz-payaso')
  return (
    <>
      {[-0.11, 0.11].map((x) => eye(x))}
      {/* cejas */}
      {[-0.11, 0.11].map((x) => (
        <Bx key={x} s={[0.1, 0.022, 0.02]} p={[x, 0.09, FACE_Z]} c={brows} r={[0, 0, angry ? (x > 0 ? 0.35 : -0.35) : 0]} sharp />
      ))}
      {clownNose ? <Sph r={0.07} p={[0, -0.06, FACE_Z + 0.03]} c="#e2574c" /> : <Bx s={[0.05, 0.065, 0.045]} p={[0, -0.06, FACE_Z + 0.01]} c={noseColor} radius={0.015} />}
      {/* boca */}
      <Bx s={[0.11, 0.022, 0.02]} p={[0, -0.16, FACE_Z]} c={shade(def.skin, 0.5)} sharp />
      {extras.includes('mejillas') && [-0.19, 0.19].map((x) => <Cyl key={x} rt={0.05} rb={0.05} h={0.01} p={[x, -0.08, FACE_Z]} c="#f4a6a0" r={[Math.PI / 2, 0, 0]} seg={10} />)}
      {extras.includes('pipa') && (
        <group position={[0.12, -0.17, FACE_Z + 0.02]}>
          <Cyl rt={0.012} rb={0.012} h={0.2} p={[0.04, -0.03, 0.09]} c="#5a3a24" r={[Math.PI / 2 - 0.4, 0, 0]} seg={6} />
          <Cyl rt={0.035} rb={0.03} h={0.06} p={[0.08, -0.08, 0.18]} c="#5a3a24" seg={8} />
        </group>
      )}
      {extras.includes('pendientes') && [-0.31, 0.31].map((x) => <Sph key={x} r={0.03} p={[x, -0.1, 0.05]} c={GOLD} />)}
    </>
  )
}

/* ───────────────────────── Sombreros y capuchas ───────────────────────── */
function Hat({ def }: { def: AvatarDef }) {
  const hat = def.hat
  if (!hat) return null
  const c = def.hatColor ?? DARK
  const a = def.hatAccent ?? GOLD
  const hoodBox = (color: string, w = 0.68, h = 0.62, d = 0.58, dz = -0.09) => <Bx s={[w, h, d]} p={[0, -0.05, dz]} c={color} radius={0.08} />
  switch (hat) {
    case 'gorra':
    case 'beisbol':
      return (
        <group position={[0, TOP_Y - 0.06, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.33, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
            <Mat color={c} />
          </mesh>
          <Bx s={[0.38, 0.04, 0.26]} p={[0, 0.03, 0.34]} c={c} radius={0.015} />
          <Sph r={0.03} p={[0, 0.33, 0]} c={c} />
          {hat === 'beisbol' && (
            <mesh position={[0, 0.15, 0.3]} rotation={[0.5, 0, 0]}>
              <octahedronGeometry args={[0.06, 0]} />
              <Mat color={a} flat />
            </mesh>
          )}
        </group>
      )
    case 'vaquero':
      return (
        <group position={[0, TOP_Y, 0]}>
          <Bx s={[0.96, 0.05, 0.7]} p={[0, 0.02, 0]} c={c} radius={0.02} />
          {[-0.44, 0.44].map((x) => (
            <Bx key={x} s={[0.1, 0.12, 0.66]} p={[x, 0.07, 0]} c={c} r={[0, 0, x > 0 ? -0.5 : 0.5]} radius={0.02} />
          ))}
          <Bx s={[0.5, 0.24, 0.46]} p={[0, 0.15, 0]} c={c} radius={0.05} />
          <Bx s={[0.52, 0.05, 0.48]} p={[0, 0.07, 0]} c={shade(c, 0.6)} radius={0.01} />
          <Bx s={[0.2, 0.06, 0.4]} p={[0, 0.27, 0]} c={shade(c, 0.85)} radius={0.02} />
        </group>
      )
    case 'bruja':
      return (
        <group position={[0, TOP_Y - 0.02, 0]} rotation={[0.05, 0, 0.12]}>
          <Cyl rt={0.55} rb={0.55} h={0.04} p={[0, 0.02, 0]} c={c} seg={14} flat />
          <Cone rad={0.3} h={0.72} p={[0, 0.4, 0]} c={c} seg={9} />
          <Cyl rt={0.31} rb={0.31} h={0.08} p={[0, 0.08, 0]} c={a} seg={12} />
          <Bx s={[0.1, 0.1, 0.03]} p={[0, 0.08, 0.3]} c={GOLD} radius={0.01} />
          <Cone rad={0.09} h={0.2} p={[0.12, 0.82, 0]} c={c} r={[0, 0, -0.9]} seg={7} />
        </group>
      )
    case 'pirata':
      return (
        <group position={[0, TOP_Y - 0.04, 0]}>
          <Bx s={[0.94, 0.07, 0.5]} p={[0, 0.03, -0.04]} c={c} radius={0.03} />
          <Bx s={[0.74, 0.34, 0.1]} p={[0, 0.2, 0.15]} c={c} r={[-0.25, 0, 0]} radius={0.04} />
          {[-0.4, 0.4].map((x) => (
            <Bx key={x} s={[0.14, 0.26, 0.4]} p={[x, 0.14, -0.06]} c={c} r={[0, 0, x > 0 ? -0.6 : 0.6]} radius={0.04} />
          ))}
          <Bx s={[0.74, 0.03, 0.03]} p={[0, 0.06, 0.22]} c={a} sharp />
          {/* calavera del sombrero */}
          <Sph r={0.07} p={[0, 0.24, 0.24]} c={WHITE} />
          {[-0.025, 0.025].map((x) => (
            <Sph key={x} r={0.014} p={[x, 0.25, 0.3]} c={DARK} />
          ))}
        </group>
      )
    case 'casco':
      return (
        <>
          <Bx s={[0.66, 0.5, 0.54]} p={[0, 0.02, -0.06]} c={c} radius={0.1} />
          <Bx s={[0.66, 0.3, 0.12]} p={[0, -0.14, -0.26]} c={c} radius={0.04} />
          {[-0.05, -0.15, -0.25].map((y) => (
            <Bx key={y} s={[0.56, 0.03, 0.03]} p={[0, y, FACE_Z + 0.07]} c={a} sharp />
          ))}
          {[-0.28, 0.28].map((x) => (
            <Bx key={x} s={[0.03, 0.26, 0.12]} p={[x, -0.15, FACE_Z + 0.02]} c={a} sharp />
          ))}
          <Bx s={[0.08, 0.48, 0.5]} p={[0, 0.04, -0.06]} c={a} radius={0.02} />
        </>
      )
    case 'corona':
      return (
        <group position={[0, TOP_Y, 0]}>
          <Cyl rt={0.24} rb={0.22} h={0.14} p={[0, 0.07, 0]} c={c} seg={10} flat />
          {[0, 1, 2, 3, 4].map((i) => {
            const ang = (i / 5) * Math.PI * 2
            return <Cone key={i} rad={0.06} h={0.16} p={[Math.sin(ang) * 0.2, 0.2, Math.cos(ang) * 0.2]} c={c} seg={4} />
          })}
          <mesh position={[0, 0.1, 0.23]}>
            <octahedronGeometry args={[0.06, 0]} />
            <Mat color={a} flat />
          </mesh>
        </group>
      )
    case 'egipcio':
      return (
        <>
          <Bx s={[0.7, 0.62, 0.56]} p={[0, -0.06, -0.1]} c={a} radius={0.06} />
          {[-0.34, 0.34].map((x) => (
            <Bx key={x} s={[0.06, 0.62, 0.5]} p={[x, -0.06, -0.06]} c={c} radius={0.02} />
          ))}
          <Bx s={[0.64, 0.08, 0.06]} p={[0, 0.16, FACE_Z - 0.03]} c={c} radius={0.02} />
          <Bx s={[0.72, 0.08, 0.5]} p={[0, 0.24, -0.1]} c={c} radius={0.02} />
          <Sph r={0.05} p={[0, 0.3, 0.18]} c={c} />
          <Sph r={0.03} p={[0, 0.34, 0.22]} c="#3fb0a0" />
        </>
      )
    case 'gnomo':
      return (
        <group position={[0, TOP_Y - 0.05, 0]} rotation={[0.08, 0, 0.3]}>
          <Cone rad={0.34} h={0.8} p={[0, 0.4, 0]} c={c} seg={9} />
          <Sph r={0.04} p={[0, 0.8, 0]} c={c} />
        </group>
      )
    case 'conico':
      return (
        <group position={[0, TOP_Y - 0.04, 0]}>
          <Cone rad={0.68} h={0.32} p={[0, 0.16, 0]} c={c} seg={12} />
          <Cyl rt={0.66} rb={0.68} h={0.02} p={[0, 0.005, 0]} c={shade(c, 0.85)} seg={12} />
          <group position={[0.28, 0.2, 0.22]}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Sph key={i} r={0.035} p={[Math.cos((i / 5) * Math.PI * 2) * 0.05, 0, Math.sin((i / 5) * Math.PI * 2) * 0.05]} c={a} />
            ))}
            <Sph r={0.025} p={[0, 0.01, 0]} c={GOLD} />
          </group>
        </group>
      )
    case 'antena':
      return (
        <group position={[0, TOP_Y, 0]}>
          <Cyl rt={0.02} rb={0.025} h={0.28} p={[0, 0.14, 0]} c={shade(c, 0.7)} seg={6} />
          <mesh position={[0, 0.32, 0]}>
            <sphereGeometry args={[0.07, 10, 8]} />
            <Mat color={a} emissive={a} emissiveIntensity={0.6} />
          </mesh>
        </group>
      )
    case 'capucha':
      return (
        <>
          {hoodBox(c)}
          <Bx s={[0.62, 0.12, 0.2]} p={[0, 0.26, 0.16]} c={c} radius={0.04} />
          <Bx s={[0.12, 0.16, 0.12]} p={[0, 0.38, -0.02]} c={c} radius={0.04} />
        </>
      )
    case 'polar':
      return (
        <>
          {hoodBox(shade(c, 0.9), 0.7, 0.64, 0.58, -0.08)}
          <mesh position={[0, -0.02, FACE_Z - 0.02]}>
            <torusGeometry args={[0.36, 0.1, 8, 18]} />
            <Mat color={c} flat />
          </mesh>
        </>
      )
    case 'mexicano':
      return (
        <group position={[0, TOP_Y - 0.03, 0]}>
          <Cyl rt={0.8} rb={0.78} h={0.04} p={[0, 0.02, 0]} c={c} seg={14} flat />
          <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.78, 0.06, 6, 18]} />
            <Mat color={a} flat />
          </mesh>
          <Cone rad={0.32} h={0.46} p={[0, 0.27, 0]} c={c} seg={10} />
          <Cyl rt={0.3} rb={0.32} h={0.06} p={[0, 0.09, 0]} c={a} seg={12} />
        </group>
      )
    case 'copa':
      return (
        <group position={[0, TOP_Y - 0.02, 0]}>
          <Cyl rt={0.4} rb={0.4} h={0.04} p={[0, 0.02, 0]} c={c} seg={14} />
          <Cyl rt={0.25} rb={0.24} h={0.44} p={[0, 0.25, 0]} c={c} seg={12} />
          <Cyl rt={0.26} rb={0.26} h={0.07} p={[0, 0.08, 0]} c={a} seg={12} />
        </group>
      )
    case 'fedora':
      return (
        <group position={[0, TOP_Y - 0.02, 0]}>
          <Cyl rt={0.48} rb={0.46} h={0.04} p={[0, 0.02, 0]} c={c} seg={14} />
          <Bx s={[0.5, 0.22, 0.46]} p={[0, 0.14, 0]} c={c} radius={0.06} />
          <Bx s={[0.52, 0.06, 0.48]} p={[0, 0.07, 0]} c={a} radius={0.01} />
          <Bx s={[0.16, 0.05, 0.4]} p={[0, 0.26, 0]} c={shade(c, 0.85)} radius={0.02} />
        </group>
      )
    case 'payaso':
      return (
        <group position={[0, TOP_Y - 0.06, 0]} rotation={[0, 0, 0.1]}>
          <Cone rad={0.3} h={0.72} p={[0, 0.36, 0]} c={c} seg={8} />
          {[0.18, 0.36, 0.54].map((y, i) => (
            <Cyl key={y} rt={0.3 - (y / 0.72) * 0.28 + 0.005} rb={0.3 - (y / 0.72) * 0.28 + 0.03} h={0.06} p={[0, y, 0]} c={i % 2 === 0 ? a : GOLD} seg={8} flat />
          ))}
          <Sph r={0.07} p={[0, 0.74, 0]} c="#e2574c" flat />
        </group>
      )
    case 'lazo':
      return (
        <group position={[0.1, TOP_Y + 0.02, 0]}>
          {[-0.15, 0.15].map((x) => (
            <Sph key={x} r={0.12} p={[x, 0.04, 0]} c={c} sc={[1.1, 0.7, 0.5]} />
          ))}
          <Sph r={0.06} p={[0, 0.04, 0.01]} c={shade(c, 0.85)} />
        </group>
      )
    case 'tiara-mar':
      return (
        <group position={[0, TOP_Y, 0]}>
          <Cyl rt={0.25} rb={0.23} h={0.1} p={[0, 0.05, 0]} c={c} seg={10} flat />
          {[-0.14, 0, 0.14].map((x, i) => (
            <Cone key={x} rad={0.045} h={i === 1 ? 0.34 : 0.22} p={[x, 0.1 + (i === 1 ? 0.17 : 0.11), 0.08]} c={c} seg={4} />
          ))}
          <Cyl rt={0.09} rb={0.09} h={0.02} p={[0, 0.16, 0.24]} c={a} r={[Math.PI / 2, 0, 0]} seg={8} flat />
        </group>
      )
    case 'calabaza':
      return (
        <group>
          <mesh position={[0, 0.02, 0]} scale={[1.15, 1, 1.1]} castShadow>
            <icosahedronGeometry args={[0.38, 1]} />
            <Mat color={c} flat />
          </mesh>
          {/* ojos y boca recortados */}
          {[-0.13, 0.13].map((x) => (
            <Cone key={x} rad={0.07} h={0.1} p={[x, 0.08, 0.36]} c={a} r={[0, 0, 0]} seg={3} />
          ))}
          <Bx s={[0.26, 0.05, 0.05]} p={[0, -0.13, 0.37]} c={a} sharp />
          {[-0.09, 0.06].map((x) => (
            <Bx key={x} s={[0.05, 0.05, 0.05]} p={[x, -0.09, 0.37]} c={a} sharp />
          ))}
          <Cyl rt={0.04} rb={0.05} h={0.12} p={[0, 0.44, 0]} c="#5f9e3d" seg={6} />
          {/* mini sombrero de copa */}
          <group position={[0.14, 0.42, -0.04]} rotation={[0, 0, -0.25]}>
            <Cyl rt={0.2} rb={0.2} h={0.03} p={[0, 0, 0]} c="#2b2b3a" seg={12} />
            <Cyl rt={0.13} rb={0.13} h={0.24} p={[0, 0.13, 0]} c="#2b2b3a" seg={12} />
            <Cyl rt={0.135} rb={0.135} h={0.05} p={[0, 0.04, 0]} c="#e2574c" seg={12} />
          </group>
        </group>
      )
    case 'buho':
      return (
        <>
          {hoodBox(c)}
          {[-0.15, 0.15].map((x) => (
            <group key={x} position={[x, 0.18, FACE_Z + 0.02]}>
              <Cyl rt={0.11} rb={0.11} h={0.03} p={[0, 0, 0]} c={a} r={[Math.PI / 2, 0, 0]} seg={12} />
              <Cyl rt={0.055} rb={0.055} h={0.02} p={[0, 0, 0.02]} c={DARK} r={[Math.PI / 2, 0, 0]} seg={10} />
            </group>
          ))}
          <Cone rad={0.05} h={0.1} p={[0, 0.05, FACE_Z + 0.06]} c={a} r={[Math.PI, 0, 0]} seg={4} />
          {[-0.26, 0.26].map((x) => (
            <Cone key={x} rad={0.09} h={0.18} p={[x, 0.32, -0.08]} c={c} r={[0, 0, x > 0 ? -0.3 : 0.3]} seg={5} />
          ))}
        </>
      )
    case 'tiburon':
      return (
        <>
          {hoodBox(c)}
          <Cone rad={0.12} h={0.3} p={[0, 0.36, -0.16]} c={c} r={[-0.5, 0, 0]} seg={4} />
          {[-0.2, 0.2].map((x) => (
            <Sph key={x} r={0.05} p={[x, 0.22, FACE_Z + 0.02]} c={WHITE} />
          ))}
          {[-0.2, 0.2].map((x) => (
            <Sph key={x} r={0.025} p={[x, 0.22, FACE_Z + 0.06]} c={DARK} />
          ))}
          {[-0.24, -0.12, 0, 0.12, 0.24].map((x) => (
            <Cone key={x} rad={0.05} h={0.1} p={[x, 0.06, FACE_Z + 0.04]} c={a} r={[Math.PI, 0, 0]} seg={3} flat />
          ))}
          {[-0.3, -0.15, 0, 0.15, 0.3].map((x) => (
            <Cone key={x} rad={0.05} h={0.1} p={[x, -0.3, FACE_Z + 0.02]} c={a} seg={3} flat />
          ))}
        </>
      )
    case 'paja':
      return (
        <group position={[0, TOP_Y - 0.02, 0]} rotation={[0.05, 0, -0.08]}>
          <Cyl rt={0.54} rb={0.52} h={0.05} p={[0, 0.02, 0]} c={c} seg={12} flat />
          <Cyl rt={0.24} rb={0.3} h={0.26} p={[0, 0.15, 0]} c={c} seg={10} flat />
          <Bx s={[0.12, 0.1, 0.03]} p={[0.16, 0.14, 0.26]} c={a} radius={0.01} />
        </group>
      )
    case 'hueso':
      return (
        <>
          {hoodBox(c)}
          <group position={[0, TOP_Y + 0.14, -0.04]} rotation={[0, 0.3, 0.18]}>
            <Cyl rt={0.035} rb={0.035} h={0.44} p={[0, 0, 0]} c={a} r={[0, 0, Math.PI / 2]} seg={6} />
            {[-0.22, 0.22].map((x) => (
              <group key={x}>
                <Sph r={0.055} p={[x, 0.03, 0]} c={a} />
                <Sph r={0.055} p={[x, -0.03, 0]} c={a} />
              </group>
            ))}
          </group>
        </>
      )
    case 'cactus':
      return (
        <>
          {hoodBox(c)}
          <group position={[0, TOP_Y + 0.12, -0.02]}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Sph key={i} r={0.07} p={[Math.cos((i / 6) * Math.PI * 2) * 0.1, 0, Math.sin((i / 6) * Math.PI * 2) * 0.1]} c="#e2574c" flat />
            ))}
            <Sph r={0.06} p={[0, 0.03, 0]} c={a} />
          </group>
        </>
      )
    case 'panuelo':
      return (
        <group position={[0, TOP_Y - 0.12, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.36, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
            <Mat color={c} />
          </mesh>
          <Bx s={[0.64, 0.07, 0.1]} p={[0, 0.06, 0.24]} c={a} radius={0.02} />
          <Bx s={[0.1, 0.16, 0.06]} p={[0.06, -0.02, -0.3]} c={c} r={[0.3, 0, -0.5]} radius={0.02} />
          <Bx s={[0.1, 0.14, 0.06]} p={[-0.08, -0.04, -0.3]} c={c} r={[0.3, 0, 0.6]} radius={0.02} />
        </group>
      )
    case 'marinero':
      return (
        <group position={[0, TOP_Y - 0.02, 0]}>
          <Cyl rt={0.3} rb={0.32} h={0.14} p={[0, 0.07, 0]} c={c} seg={12} />
          <Cyl rt={0.36} rb={0.36} h={0.06} p={[0, 0.03, 0]} c={c} seg={12} />
          <Cyl rt={0.33} rb={0.33} h={0.05} p={[0, 0.005, 0]} c={a} seg={12} />
          <Sph r={0.03} p={[0, 0.15, 0]} c={a} />
        </group>
      )
    case 'boina':
      return (
        <group position={[0, TOP_Y - 0.06, 0]} rotation={[0, 0, -0.12]}>
          <mesh castShadow>
            <sphereGeometry args={[0.36, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.4]} />
            <Mat color={c} />
          </mesh>
          <Cyl rt={0.33} rb={0.34} h={0.04} p={[0, 0.02, 0]} c={shade(c, 0.8)} seg={12} />
          <Sph r={0.03} p={[0, 0.36, 0]} c={c} />
        </group>
      )
    case 'gorro-rasta':
      return (
        <group position={[0, TOP_Y - 0.1, -0.02]}>
          <mesh castShadow>
            <sphereGeometry args={[0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <Mat color={c} />
          </mesh>
          <Cyl rt={0.4} rb={0.4} h={0.07} p={[0, 0.06, 0]} c={a} seg={14} />
          <Cyl rt={0.34} rb={0.38} h={0.07} p={[0, 0.2, 0]} c="#5f9e3d" seg={14} />
        </group>
      )
  }
  return null
}

/* ───────────────────────── Extras del cuerpo ───────────────────────── */
function BodyExtras({ def, torsoW, torsoH }: { def: AvatarDef; torsoW: number; torsoH: number }) {
  const extras = def.extras ?? []
  const accent = def.top.accent ?? GOLD
  const zf = 0.15 + 0.01
  const has = (e: string) => extras.includes(e as never)
  return (
    <>
      {has('numero') && <NumberPlate text={def.label ?? '1'} color={accent} bg={def.top.color} />}
      {has('alas') &&
        [-1, 1].map((sgn) => (
          <group key={sgn} position={[sgn * 0.22, 0.32, -0.18]} rotation={[0, sgn * 0.5, sgn * 0.25]}>
            <mesh>
              <sphereGeometry args={[0.32, 8, 6]} />
              <meshStandardMaterial color="#c9b6f0" transparent opacity={0.65} roughness={0.5} />
            </mesh>
            <mesh scale={[0.6, 0.8, 0.2]}>
              <sphereGeometry args={[0.32, 8, 6]} />
              <meshStandardMaterial color="#9fd9c9" transparent opacity={0.6} roughness={0.5} />
            </mesh>
          </group>
        ))}
      {has('cuello-reina') && (
        <mesh position={[0, 0.5, -0.12]} rotation={[0.6, 0, 0]}>
          <cylinderGeometry args={[0.5, 0.14, 0.5, 12, 1, true, Math.PI * 0.5, Math.PI]} />
          <meshStandardMaterial color={WHITE} side={THREE.DoubleSide} roughness={0.9} />
        </mesh>
      )}
      {has('capa') && <Bx s={[0.56, 0.72, 0.03]} p={[0, 0.06, -0.19]} c={accent} radius={0.01} />}
      {has('pajarita') && (
        <group position={[0, 0.4, zf + 0.02]}>
          {[-0.08, 0.08].map((x) => (
            <Bx key={x} s={[0.11, 0.09, 0.05]} p={[x, 0, 0]} c={accent} radius={0.02} />
          ))}
          <Sph r={0.035} p={[0, 0, 0.02]} c={shade(accent, 0.8)} />
        </group>
      )}
      {has('volante') && <Cyl rt={0.38} rb={0.34} h={0.07} p={[0, 0.42, 0]} c={WHITE} seg={9} flat />}
      {has('corbata') && (
        <>
          <Bx s={[0.09, 0.07, 0.04]} p={[0, 0.4, zf + 0.01]} c="#c9302b" radius={0.02} />
          <Bx s={[0.08, 0.24, 0.03]} p={[0, 0.25, zf + 0.01]} c="#c9302b" radius={0.02} />
        </>
      )}
      {has('bata') &&
        [-0.15, 0.15].map((x) => <Bx key={x} s={[0.18, torsoH - 0.02, 0.05]} p={[x, torsoH / 2, zf + 0.01]} c={WHITE} r={[0, 0, x > 0 ? -0.08 : 0.08]} radius={0.02} />)}
      {has('chaleco') && [-0.16, 0.16].map((x) => <Bx key={x} s={[0.17, torsoH - 0.04, 0.05]} p={[x, torsoH / 2, zf + 0.01]} c={accent} radius={0.02} />)}
      {has('cadena') && (
        <>
          <mesh position={[0, 0.36, 0.05]} rotation={[1.35, 0, 0]}>
            <torusGeometry args={[0.2, 0.02, 6, 18]} />
            <Mat color={GOLD} />
          </mesh>
          <mesh position={[0, 0.2, zf + 0.02]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.08, 0.08, 0.03]} />
            <Mat color={GOLD} />
          </mesh>
        </>
      )}
      {has('perlas') && [-3, -2, -1, 0, 1, 2, 3].map((i) => <Sph key={i} r={0.028} p={[i * 0.055, 0.4 - Math.abs(i) * 0.012 - 0.02, zf + 0.02 - Math.abs(i) * 0.012]} c={WHITE} />)}
      {has('colgante') && (
        <>
          <mesh position={[0, 0.38, 0.06]} rotation={[1.35, 0, 0]}>
            <torusGeometry args={[0.17, 0.012, 6, 18]} />
            <Mat color="#5a3a24" />
          </mesh>
          <Cyl rt={0.05} rb={0.05} h={0.02} p={[0, 0.22, zf + 0.01]} c={accent} r={[Math.PI / 2, 0, 0]} seg={6} flat />
        </>
      )}
      {has('panuelo-cuello') && <Bx s={[0.18, 0.18, 0.04]} p={[0, 0.36, zf + 0.01]} c="#c9302b" r={[0, 0, Math.PI / 4]} radius={0.02} />}
      {has('huesos') && (
        <>
          <Bx s={[0.04, torsoH - 0.08, 0.02]} p={[0, torsoH / 2, zf]} c={WHITE} sharp />
          {[0.34, 0.26, 0.18].map((y) => (
            <Bx key={y} s={[0.34, 0.035, 0.02]} p={[0, y, zf]} c={WHITE} radius={0.01} />
          ))}
          <Bx s={[0.2, 0.08, 0.02]} p={[0, 0.06, zf]} c={WHITE} radius={0.02} />
        </>
      )}
      {has('plumas') &&
        [0, 1, 2].map((row) =>
          [-0.18, -0.06, 0.06, 0.18].map((x) => (
            <Sph
              key={`${row}-${x}`}
              r={0.07}
              p={[x + (row % 2) * 0.06 - 0.03, 0.3 - row * 0.1, zf]}
              c={row % 2 === 0 ? accent : shade(def.top.color, 1.2)}
              sc={[1, 1, 0.35]}
              flat
            />
          )),
        )}
      {has('pinchos') &&
        [
          [-0.2, 0.32, 0.12],
          [0.16, 0.24, 0.14],
          [-0.1, 0.12, 0.15],
          [0.22, 0.08, 0.1],
          [-0.24, 0.2, -0.08],
          [0.2, 0.34, -0.1],
        ].map((p, i) => <Cone key={i} rad={0.02} h={0.08} p={p as V3} c={WHITE} r={[Math.PI / 2, 0, 0]} seg={4} />)}
      {has('hoja') && <Sph r={0.1} p={[0.3, 0.3, 0]} c={def.top.color} sc={[0.5, 1.3, 0.5]} flat />}
      {has('vendas') &&
        [0.36, 0.22, 0.08].map((y, i) => (
          <Bx key={y} s={[torsoW + 0.02, 0.05, 0.3 + 0.02]} p={[0, y, 0]} c={shade(def.top.color, 0.88)} r={[0, 0, i % 2 === 0 ? 0.12 : -0.12]} radius={0.01} />
        ))}
      {has('remiendos') && (
        <>
          <Bx s={[0.1, 0.09, 0.02]} p={[-0.13, 0.12, zf]} c={shade(def.top.color, 0.75)} radius={0.01} />
          <Bx s={[0.09, 0.08, 0.02]} p={[0.15, 0.3, zf]} c={shade(def.top.color, 1.25)} radius={0.01} />
        </>
      )}
      {has('rayas-poncho') &&
        [0.34, 0.24, 0.14].map((y, i) => <Bx key={y} s={[torsoW + 0.01, 0.04, 0.31]} p={[0, y, 0]} c={i === 1 ? accent : shade(def.top.color, 0.8)} radius={0.01} />)}
      {has('rombos') && [-0.12, 0, 0.12].map((x) => <Bx key={x} s={[0.08, 0.08, 0.02]} p={[x, 0.16, zf]} c={accent} r={[0, 0, Math.PI / 4]} radius={0.01} />)}
      {has('botones') && [0.3, 0.2, 0.1].map((y) => <Sph key={y} r={0.025} p={[0, y, zf + 0.01]} c={def.top.accent ?? DARK} />)}
      {has('cinturon') && (
        <>
          <Bx s={[torsoW + 0.02, 0.07, 0.32]} p={[0, 0.03, 0]} c="#3a2a1a" radius={0.01} />
          <Bx s={[0.09, 0.07, 0.03]} p={[0, 0.03, zf + 0.01]} c={GOLD} radius={0.01} />
        </>
      )}
      {has('delantal') && (
        <>
          <Bx s={[0.36, 0.3, 0.03]} p={[0, 0.16, zf + 0.01]} c={def.top.accent ?? WHITE} radius={0.02} />
          <Bx s={[torsoW + 0.01, 0.05, 0.31]} p={[0, 0.3, 0]} c={def.top.accent ?? WHITE} radius={0.01} />
          <Bx s={[0.1, 0.05, 0.03]} p={[0, 0.16, zf + 0.03]} c={shade(def.top.accent ?? WHITE, 0.85)} radius={0.01} />
        </>
      )}
      {has('bolso') && (
        <>
          <Bx s={[0.05, 0.5, 0.05]} p={[0.16, 0.3, 0.08]} c="#8a5a3a" r={[0, 0, -0.55]} radius={0.02} />
          <Bx s={[0.2, 0.16, 0.1]} p={[0.32, 0.02, 0.06]} c="#c98b5a" radius={0.03} />
        </>
      )}
      {has('peto') && (
        <>
          <Bx s={[0.3, 0.2, 0.03]} p={[0, 0.3, zf]} c={def.bottom.color} radius={0.01} />
          {[-0.1, 0.1].map((x) => (
            <Bx key={x} s={[0.06, 0.14, 0.03]} p={[x, 0.46, zf - 0.02]} c={def.bottom.color} sharp />
          ))}
          <Bx s={[torsoW + 0.01, 0.2, 0.31]} p={[0, 0.1, 0]} c={def.bottom.color} radius={0.02} />
        </>
      )}
    </>
  )
}

/* ───────────────────────── El avatar ───────────────────────── */

export function Avatar({
  def,
  walking,
  action,
  prop = 'none',
  fixedHeadY,
}: {
  def: AvatarDef
  walking: React.RefObject<number>
  action: React.RefObject<Action>
  prop?: Prop
  fixedHeadY?: number
}) {
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const torso = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const root = useRef<THREE.Group>(null)
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
    ease(legL.current, 'x', act === 'sit' ? -1.45 : swing, a)
    ease(legR.current, 'x', act === 'sit' ? -1.45 : -swing, a)
    root.current.position.y = act === 'sit' ? -0.3 : Math.abs(Math.sin(t * 8)) * 0.05 * k
    let torsoX = 0
    let headY = 0
    let headZ = 0
    let aLx = -swing * 0.8
    let aRx = swing * 0.8
    let aLz = -0.16
    let aRz = 0.16
    switch (act) {
      case 'look':
        headY = Math.sin(t * 1.3) * 0.6
        headZ = Math.sin(t * 0.9) * 0.06
        aLx = 0
        aRx = 0
        break
      case 'wave':
        aRz = 2.45 - Math.sin(t * 7) * 0.3
        aRx = 0
        aLx = 0
        headY = 0.15
        headZ = Math.sin(t * 3.5) * 0.08
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
    if (fixedHeadY !== undefined) headY = fixedHeadY
    ease(torso.current, 'x', torsoX, a)
    ease(head.current, 'y', headY, a)
    ease(head.current, 'z', headZ, a)
    ease(armL.current, 'x', aLx, a)
    ease(armR.current, 'x', aRx, a)
    ease(armL.current, 'z', aLz, a)
    ease(armR.current, 'z', aRz, a)
  })

  const { skin } = def
  const extras = def.extras ?? []
  const sleeves = def.top.sleeves ?? def.top.color
  const skirt = !!def.bottom.skirt
  const legColor = skirt ? skin : def.bottom.color
  const torsoW = 0.5
  const torsoH = 0.44
  const legY = 0.34
  const hideHead = def.face === 'calabaza'
  const handColor = def.face === 'robot' ? shade(skin, 0.85) : skin
  const bones = extras.includes('huesos')

  return (
    <group ref={root} scale={def.scale ?? 1}>
      {/* piernas (pivote en la cadera) */}
      {[-0.12, 0.12].map((x, i) => (
        <group key={x} ref={i === 0 ? legL : legR} position={[x, legY, 0]}>
          <Bx s={[0.16, 0.3, 0.18]} p={[0, -0.15, 0]} c={legColor} radius={0.03} />
          {bones && <Bx s={[0.05, 0.22, 0.02]} p={[0, -0.14, 0.095]} c={WHITE} sharp />}
          <Bx s={[0.18, 0.1, 0.27]} p={[0, -0.3, 0.035]} c={def.shoes} radius={0.035} />
        </group>
      ))}
      <group ref={torso} position={[0, legY, 0]}>
        {/* torso */}
        <Bx s={[torsoW, torsoH, 0.3]} p={[0, torsoH / 2 - 0.02, 0]} c={def.top.color} radius={0.06} />
        {skirt && <Bx s={[0.58, 0.2, 0.38]} p={[0, 0.04, 0]} c={def.bottom.color} radius={0.05} />}
        <BodyExtras def={def} torsoW={torsoW} torsoH={torsoH} />
        {/* cuello */}
        <Cyl rt={0.09} rb={0.1} h={0.1} p={[0, torsoH + 0.02, 0]} c={skin} seg={8} />
        {/* brazos (pivote en el hombro) */}
        {[-0.31, 0.31].map((x, i) => (
          <group key={x} ref={i === 0 ? armL : armR} position={[x, torsoH - 0.06, 0]}>
            <Bx s={[0.13, 0.34, 0.14]} p={[0, -0.16, 0]} c={sleeves} radius={0.04} />
            {bones && <Bx s={[0.04, 0.24, 0.02]} p={[0, -0.16, 0.075]} c={WHITE} sharp />}
            <Sph r={0.075} p={[0, -0.36, 0]} c={handColor} />
            {/* herramienta en la mano derecha */}
            {i === 1 && prop === 'rod' && (
              <mesh position={[0, -0.36, 0.7]} rotation={[Math.PI / 2 - 0.5, 0, 0]}>
                <cylinderGeometry args={[0.012, 0.02, 1.8, 5]} />
                <Mat color={C.woodDark} />
              </mesh>
            )}
            {i === 1 && prop === 'broom' && (
              <group position={[0, -0.36, 0.15]} rotation={[0.5, 0, 0]}>
                <Cyl rt={0.02} rb={0.02} h={1.3} p={[0, 0, 0]} c={C.wood} seg={5} />
                <Bx s={[0.28, 0.22, 0.08]} p={[0, -0.7, 0]} c="#e2c26a" flat radius={0.02} />
              </group>
            )}
            {i === 1 && prop === 'hoe' && (
              <group position={[0, -0.36, 0.15]} rotation={[0.5, 0, 0]}>
                <Cyl rt={0.02} rb={0.02} h={1.3} p={[0, 0, 0]} c={C.wood} seg={5} />
                <Bx s={[0.22, 0.12, 0.03]} p={[0, -0.68, 0.06]} c={C.stoneDark} r={[0.6, 0, 0]} sharp />
              </group>
            )}
            {i === 1 && extras.includes('tridente') && (
              <group position={[0, -0.36, 0.08]} rotation={[0.15, 0, 0]}>
                <Cyl rt={0.02} rb={0.02} h={1.5} p={[0, 0.35, 0]} c={GOLD} seg={6} />
                {[-0.09, 0, 0.09].map((tx, j) => (
                  <Cone key={tx} rad={0.035} h={j === 1 ? 0.24 : 0.18} p={[tx, 1.2 + (j === 1 ? 0.06 : 0), 0]} c={GOLD} seg={4} />
                ))}
                <Bx s={[0.22, 0.05, 0.05]} p={[0, 1.08, 0]} c={GOLD} radius={0.01} />
              </group>
            )}
          </group>
        ))}
        {/* cabeza */}
        <group ref={head} position={[0, HEAD_Y, 0]}>
          {!hideHead && (
            <>
              <Bx s={HEAD} p={[0, 0, 0]} c={skin} radius={0.08} />
              <Face def={def} />
              <Hair def={def} />
              <Beard def={def} />
              <Glasses def={def} />
              {def.face === 'momia' &&
                [0.16, 0.02, -0.14].map((y, i) => <Bx key={y} s={[0.6, 0.07, 0.52]} p={[0, y, 0]} c={shade(skin, 0.9)} r={[0, 0, i % 2 === 0 ? 0.1 : -0.12]} radius={0.01} />)}
              {extras.includes('flor') && (
                <group position={[def.hat === 'conico' ? 0 : 0.24, def.face === 'momia' ? TOP_Y + 0.14 : TOP_Y + 0.02, def.hat === 'conico' ? 0 : 0.05]}>
                  {def.face === 'momia' && <Cyl rt={0.012} rb={0.012} h={0.16} p={[0, -0.08, 0]} c="#5f9e3d" seg={5} />}
                  {def.hat !== 'conico' &&
                    [0, 1, 2, 3, 4].map((i) => (
                      <Sph
                        key={i}
                        r={0.04}
                        p={[Math.cos((i / 5) * Math.PI * 2) * 0.06, 0, Math.sin((i / 5) * Math.PI * 2) * 0.06]}
                        c={def.face === 'momia' ? '#7fc25a' : '#e2574c'}
                      />
                    ))}
                  {def.hat !== 'conico' && <Sph r={0.03} p={[0, 0.01, 0]} c={GOLD} />}
                </group>
              )}
            </>
          )}
          <Hat def={def} />
          {extras.includes('pajaro') && (
            <group position={[-0.2, TOP_Y + 0.3, 0.02]} rotation={[0, 0.6, 0]}>
              <Sph r={0.09} p={[0, 0, 0]} c={WHITE} sc={[1, 0.9, 1.3]} />
              <Sph r={0.06} p={[0, 0.08, 0.1]} c={WHITE} />
              <Cone rad={0.025} h={0.07} p={[0, 0.07, 0.17]} c="#e28a4a" r={[Math.PI / 2, 0, 0]} seg={4} />
              <Sph r={0.012} p={[0.03, 0.1, 0.14]} c={DARK} />
            </group>
          )}
        </group>
      </group>
    </group>
  )
}

/** Avatar quieto que hace algo (para previsualizaciones y escenas). */
export function AvatarPose({ def, action = 'wave', children }: { def: AvatarDef; action?: Action; children?: ReactNode }) {
  const walking = useRef(0)
  const act = useRef<Action>(action)
  act.current = action
  return (
    <group>
      <Avatar def={def} walking={walking} action={act} />
      {children}
    </group>
  )
}
