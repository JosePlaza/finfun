/**
 * GALERÍA DE AVATARES (solo desarrollo): abre /avatares.html con `npm run dev` para ver todos los avatares
 * del catálogo en una rejilla, saludando. Sirve para revisar el diseño sin entrar en el juego.
 */
import { StrictMode, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { AVATARS, LIEBRE_AVATAR, NEIGHBORS } from '../scene/avatars/catalog'
import { Avatar } from '../scene/avatars/Avatar'
import type { Action } from '../scene/Ambient'

const COLS = 7
const ALL = [...AVATARS, ...NEIGHBORS, LIEBRE_AVATAR]
const GAP_X = 2.0
const GAP_Y = 2.3

function Turning({ children, i }: { children: React.ReactNode; i: number }) {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.6 + i) * 0.35
  })
  return <group ref={g}>{children}</group>
}

function Gallery() {
  const rows = Math.ceil(ALL.length / COLS)
  const walking = useRef(0)
  const actions: Action[] = ['wave', 'look', 'walk', 'wave', 'look', 'carry', 'work']
  return (
    <Canvas shadows camera={{ position: [0, 0, 26], fov: 30 }} gl={{ antialias: true }}>
      <color attach="background" args={['#1b1b1b']} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 8, 6]} intensity={1.6} castShadow />
      <directionalLight position={[-4, 3, -2]} intensity={0.4} />
      <group position={[(-(COLS - 1) * GAP_X) / 2, ((rows - 1) * GAP_Y) / 2 - 0.65, 0]}>
        {ALL.map((def, i) => {
          const act = { current: actions[i % actions.length] } as React.RefObject<Action>
          return (
            <group key={def.id} position={[(i % COLS) * GAP_X, -Math.floor(i / COLS) * GAP_Y, 0]}>
              <Turning i={i}>
                <Avatar def={def} walking={i % 6 === 2 ? ({ current: 1 } as React.RefObject<number>) : walking} action={act} />
              </Turning>
            </group>
          )
        })}
      </group>
    </Canvas>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Gallery />
  </StrictMode>,
)
