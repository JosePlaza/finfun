/**
 * PERFIL DEL JUGADOR. Arriba, el avatar elegido en 3D mirando alrededor (gira despacio); debajo, el nombre
 * del jugador y su nivel. La colección de avatares está plegada: se abre con el botón y el cambio se aplica al
 * momento y se guarda en la cuenta.
 */
import { Suspense, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '../store/game'
import { AVATARS, avatarOr } from '../scene/avatars/catalog'
import { Avatar } from '../scene/avatars/Avatar'
import type { Action } from '../scene/Ambient'
import { playAcornSfx } from './Music'
import { AvatarHead } from './AvatarHead'
import { BADGES, badgeStatus, currentMonth, TIER_NAMES } from '../sim'

function Turntable({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.7) * 0.45
  })
  return <group ref={g}>{children}</group>
}

/** Previsualización 3D de un avatar: fondo transparente sobre el panel, luz cálida como en la isla. */
export function AvatarPreview({ id, action = 'look', className = '' }: { id: string; action?: Action; className?: string }) {
  const def = avatarOr(id)
  const walking = useRef(0)
  const act = useRef<Action>(action)
  act.current = action
  return (
    <div className={`avatar-stage ${className}`}>
      <Canvas dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }} camera={{ position: [0, 1.0, 3.9], fov: 30 }} onCreated={({ camera }) => camera.lookAt(0, 0.6, 0)}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[2.5, 4, 3]} intensity={1.5} />
        <directionalLight position={[-3, 2, -2]} intensity={0.35} />
        <Suspense fallback={null}>
          <Turntable>
            <Avatar def={def} walking={walking} action={act} />
          </Turntable>
        </Suspense>
        {/* peana */}
        <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.62, 24]} />
          <meshStandardMaterial color="#e6d9bf" roughness={1} />
        </mesh>
      </Canvas>
    </div>
  )
}

export function PerfilContent() {
  const account = useGame((s) => s.account)
  const game = useGame((s) => s.game)
  const avatar = useGame((s) => s.avatar)
  const setAvatar = useGame((s) => s.setAvatar)
  const current = avatarOr(avatar)
  const name = account?.username ?? 'Jugador'
  const [open, setOpen] = useState(false)

  const choose = (id: string) => {
    if (id === avatar) return
    setAvatar(id)
    playAcornSfx()
  }

  return (
    <>
      <div className="g-inset p-3 flex flex-col items-center">
        <AvatarPreview id={avatar} />
        <div className="text-center -mt-1">
          <div className="font-display font-extrabold text-ink text-[22px] leading-tight">{name}</div>
          <div className="text-[13px] font-extrabold text-ink-3">Nivel {game?.world ?? 1}</div>
        </div>
      </div>

      <button type="button" onClick={() => setOpen((v) => !v)} className={`g-btn g-btn--block g-btn--sm mt-3 ${open ? 'g-btn--cream' : 'g-btn--green'}`} aria-expanded={open}>
        {open ? 'Cerrar colección' : `Cambiar avatar · ${current.name}`}
      </button>
      {open && (
        <>
          <div className="avatar-grid mt-3">
            {AVATARS.map((a) => {
              const on = a.id === avatar
              return (
                <button key={a.id} type="button" onClick={() => choose(a.id)} className={`avatar-chip ${on ? 'avatar-chip--on' : ''}`} aria-pressed={on} title={a.name}>
                  <AvatarHead id={a.id} size={56} className="avatar-chip__icon" />
                  <span className="avatar-chip__name">{a.name}</span>
                </button>
              )
            })}
          </div>
          <p className="m-0 mt-3 text-[12px] font-bold text-ink-3 leading-snug">Tu avatar pasea por la isla con los vecinos. Puedes cambiarlo cuando quieras.</p>
        </>
      )}

      {game && <Insignias />}
    </>
  )
}

/* ───────────────────────── Insignias ───────────────────────── */

const TIER_CLASS = ['', 'badge--bronce', 'badge--plata', 'badge--oro']

/** Las insignias: medalla por familia con el nivel conseguido (bronce, plata, oro) y lo que falta para el siguiente. */
function Insignias() {
  const game = useGame((s) => s.game)!
  const nowMs = useGame((s) => s.nowMs)
  const month = currentMonth(game, nowMs)
  const rows = BADGES.map((def) => ({ def, st: badgeStatus(def, game, month) }))
  const earned = rows.reduce((n, r) => n + r.st.earned, 0)
  const total = rows.reduce((n, r) => n + r.def.tiers.length, 0)
  return (
    <>
      <div className="flex items-center justify-between mt-4 mb-2">
        <span className="g-label">Insignias</span>
        <span className="text-[12px] font-extrabold text-ink-3 tabular-nums">
          {earned}/{total}
        </span>
      </div>
      <div className="badge-grid">
        {rows.map(({ def, st }) => {
          const pct = st.next !== null ? Math.min(100, Math.round((st.value / st.next) * 100)) : 100
          return (
            <div key={def.id} className={`badge ${st.earned > 0 ? TIER_CLASS[st.earned] : 'badge--off'}`} title={`${def.name}: ${st.valueText} ${def.what}`}>
              <div className="badge__medal" aria-hidden="true">
                <span className="badge__icon">{def.icon}</span>
                {st.earned > 0 && <span className="badge__tier">{TIER_NAMES[st.earned]}</span>}
              </div>
              <div className="badge__name">{def.name}</div>
              <div className="badge__what">{def.what}</div>
              <div className="badge__bar">
                <i style={{ width: `${pct}%` }} />
              </div>
              <div className="badge__count">{st.maxed ? `${st.valueText} · ¡Oro!` : `${st.valueText} / ${st.nextText}`}</div>
            </div>
          )
        })}
      </div>
    </>
  )
}
