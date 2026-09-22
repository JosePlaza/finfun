/**
 * CABEZAS DE LOS AVATARES como imagen fija. En vez de emojis (o de treinta escenas 3D vivas), un único
 * lienzo oculto dibuja la cabeza de cada avatar del catálogo una sola vez, la convierte en PNG y la guarda.
 * `AvatarHead` pinta esa imagen donde haga falta: el botón de perfil del HUD y la rejilla de la colección.
 */
import { useEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { create } from 'zustand'
import { AVATARS, avatarOr, type AvatarDef } from '../scene/avatars/catalog'
import { Avatar } from '../scene/avatars/Avatar'
import type { Action } from '../scene/Ambient'

interface HeadStore {
  urls: Record<string, string>
  done: boolean
  set: (id: string, url: string) => void
  finish: () => void
}

const useHeads = create<HeadStore>((set) => ({
  urls: {},
  done: false,
  set: (id, url) => set((s) => ({ urls: { ...s.urls, [id]: url } })),
  finish: () => set({ done: true }),
}))

const SIZE = 160
if (import.meta.env.DEV) (window as unknown as { finfunHeads: unknown }).finfunHeads = useHeads
/** Centro de la cabeza (grupo del torso a 0,34 + cabeza a 0,7) y encuadre: chin y sombrero incluidos. */
const HEAD_CENTER_Y = 1.04

const zero = { current: 0 } as React.RefObject<number>
const look = { current: 'look' } as React.RefObject<Action>

/** Recorre el catálogo: monta un avatar, lo dibuja, guarda el PNG y pasa al siguiente. */
function Snapper({ defs }: { defs: AvatarDef[] }) {
  const { gl, scene, camera } = useThree()
  const [i, setI] = useState(0)
  const def = defs[i]
  useEffect(() => {
    if (!def) {
      useHeads.getState().finish()
      return
    }
    // Al llegar aquí (efecto tras el commit) los meshes ya están en la escena: se dibuja al momento, sin esperar
    // a un frame (en móviles lentos, cada frame del lienzo principal tardaría y las cabezas irían a cuentagotas).
    const sc = def.scale ?? 1
    const cy = HEAD_CENTER_Y * sc + 0.08
    camera.position.set(0, cy + 0.14, 1.9)
    camera.lookAt(0, cy, 0)
    camera.updateProjectionMatrix()
    gl.setClearColor(0x000000, 0)
    gl.render(scene, camera)
    try {
      useHeads.getState().set(def.id, gl.domElement.toDataURL('image/png'))
    } catch {
      /* sin lienzo legible: se queda el marcador */
    }
    const t = setTimeout(() => setI(i + 1), 0)
    return () => clearTimeout(t)
  }, [i, def, gl, scene, camera])
  if (!def) return null
  return <Avatar key={def.id} def={def} walking={zero} action={look} />
}

/** Lienzo oculto que genera las cabezas al arrancar. Se monta una vez (App) y desaparece al terminar. */
export function AvatarHeadFactory() {
  const done = useHeads((s) => s.done)
  if (done) return null
  return (
    <div aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, width: SIZE, height: SIZE, pointerEvents: 'none' }}>
      <Canvas frameloop="never" dpr={1} gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }} camera={{ fov: 34, position: [0, 1.2, 2.45] }}>
        <ambientLight intensity={0.95} />
        <directionalLight position={[2.5, 4, 3]} intensity={1.5} />
        <directionalLight position={[-3, 2, -2]} intensity={0.35} />
        <Snapper defs={AVATARS} />
      </Canvas>
    </div>
  )
}

/** La cabeza de un avatar, fija. Mientras no está lista, un círculo del color de su piel. */
export function AvatarHead({ id, size = 44, className = '' }: { id: string; size?: number; className?: string }) {
  const url = useHeads((s) => s.urls[id])
  const def = avatarOr(id)
  if (!url) return <span className={`avatar-head avatar-head--wait ${className}`} style={{ width: size, height: size, background: def.skin }} aria-hidden="true" />
  return <img src={url} alt="" width={size} height={size} className={`avatar-head ${className}`} draggable={false} />
}
