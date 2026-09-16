/**
 * SONIDO DEL JUEGO.
 *
 * Todo pasa por Web Audio: un AudioContext con dos ganancias (música y efectos). Es la única forma de que el
 * volumen funcione en el móvil: iOS ignora `audio.volume` (siempre suena al máximo), pero sí respeta un GainNode.
 *
 *  - Música: un solo <audio> en bucle (ambient.mp3) enchufado al contexto. Los navegadores no dejan sonar nada
 *    hasta que el jugador toca la pantalla, así que arranca con el primer toque y desde entonces obedece a Ajustes.
 *    Se silencia al dejar la pestaña en segundo plano.
 *  - Efectos: el aviso de evento (events.mp3) se decodifica una vez y se dispara como buffer.
 */
import { useEffect, useRef } from 'react'
import { currentMonth, TASK_ACORNS } from '../sim'
import { useGame } from '../store/game'
import { pendingEvents } from './events'

export const MUSIC_SRC = `${import.meta.env.BASE_URL}audio/ambient.mp3`
export const EVENT_SFX_SRC = `${import.meta.env.BASE_URL}audio/events.mp3`

/* ───────────────────────── Motor: contexto y ganancias ───────────────────────── */

type Engine = { ctx: AudioContext; music: GainNode; sfx: GainNode }
let engine: Engine | null = null

function getEngine(): Engine | null {
  if (engine) return engine
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  try {
    const ctx = new AC()
    const music = ctx.createGain()
    const sfx = ctx.createGain()
    music.connect(ctx.destination)
    sfx.connect(ctx.destination)
    engine = { ctx, music, sfx }
    return engine
  } catch {
    return null
  }
}

/** iOS arranca el contexto en pausa: se reanuda con el primer gesto del jugador. */
async function resumeEngine(): Promise<void> {
  const e = getEngine()
  if (e && e.ctx.state !== 'running') await e.ctx.resume().catch(() => undefined)
}

function setGain(node: GainNode, value: number) {
  const e = engine
  if (!e) return
  // Rampa corta: evita chasquidos al mover el deslizador.
  node.gain.cancelScheduledValues(e.ctx.currentTime)
  node.gain.setTargetAtTime(Math.max(0, Math.min(1, value)), e.ctx.currentTime, 0.03)
}

/* ───────────────────────── Música ───────────────────────── */

export function Music() {
  const on = useGame((s) => s.musicOn)
  const volume = useGame((s) => s.musicVolume)
  const audio = useRef<HTMLAudioElement | null>(null)
  const wired = useRef(false)
  const unlocked = useRef(false)

  // Un único elemento de audio para toda la sesión.
  useEffect(() => {
    const a = new Audio(MUSIC_SRC)
    a.loop = true
    a.preload = 'auto'
    a.crossOrigin = 'anonymous'
    audio.current = a
    return () => {
      a.pause()
      audio.current = null
    }
  }, [])

  // Volumen inmediato (por la ganancia; y también en el elemento, por si no hay Web Audio).
  useEffect(() => {
    const e = getEngine()
    if (e) setGain(e.music, volume)
    if (audio.current && !e) audio.current.volume = volume
  }, [volume])

  // Encendido/apagado, y el primer gesto del jugador desbloquea la reproducción.
  useEffect(() => {
    const a = audio.current
    if (!a) return
    const play = async () => {
      if (!useGame.getState().musicOn || document.hidden) return
      await resumeEngine()
      const e = getEngine()
      if (e && !wired.current) {
        try {
          e.ctx.createMediaElementSource(a).connect(e.music)
          wired.current = true
        } catch {
          /* sin Web Audio: el elemento suena directo */
        }
      }
      if (e) setGain(e.music, useGame.getState().musicVolume)
      else a.volume = useGame.getState().musicVolume
      a.play()
        .then(() => (unlocked.current = true))
        .catch(() => undefined)
    }
    if (!on) {
      a.pause()
      return
    }
    void play()
    const gesture = () => {
      void play()
      if (unlocked.current) {
        window.removeEventListener('pointerdown', gesture)
        window.removeEventListener('touchend', gesture)
        window.removeEventListener('keydown', gesture)
      }
    }
    window.addEventListener('pointerdown', gesture)
    window.addEventListener('touchend', gesture)
    window.addEventListener('keydown', gesture)
    const visibility = () => (document.hidden ? a.pause() : void play())
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.removeEventListener('pointerdown', gesture)
      window.removeEventListener('touchend', gesture)
      window.removeEventListener('keydown', gesture)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [on])

  return null
}

/* ───────────────────────── Efectos de sonido ───────────────────────── */

let sfxBuffer: AudioBuffer | null = null
let sfxLoading: Promise<AudioBuffer | null> | null = null
let sfxEl: HTMLAudioElement | null = null

async function loadSfx(): Promise<AudioBuffer | null> {
  if (sfxBuffer) return sfxBuffer
  const e = getEngine()
  if (!e) return null
  if (!sfxLoading) {
    sfxLoading = fetch(EVENT_SFX_SRC)
      .then((r) => r.arrayBuffer())
      .then((data) => e.ctx.decodeAudioData(data))
      .then((buf) => (sfxBuffer = buf))
      .catch(() => null)
  }
  return sfxLoading
}

/** Suena el aviso de evento nuevo (si los efectos están activados). También sirve para "probar" desde Ajustes. */
export function playEventSfx(force = false) {
  const { sfxOn, sfxVolume } = useGame.getState()
  if (!sfxOn && !force) return
  const e = getEngine()
  if (e) {
    void (async () => {
      await resumeEngine()
      const buf = await loadSfx()
      if (!buf) return
      setGain(e.sfx, sfxVolume)
      const src = e.ctx.createBufferSource()
      src.buffer = buf
      src.connect(e.sfx)
      src.start()
    })()
    return
  }
  // Sin Web Audio (muy raro hoy): elemento de audio normal.
  if (!sfxEl) {
    sfxEl = new Audio(EVENT_SFX_SRC)
    sfxEl.preload = 'auto'
  }
  sfxEl.volume = sfxVolume
  sfxEl.currentTime = 0
  sfxEl.play().catch(() => undefined)
}

/**
 * Vigila los eventos pendientes: cuando aparece uno que no estaba (paga en el buzón, dividendo, ruleta…),
 * suena el aviso. Los que ya había al abrir el juego no suenan.
 */
export function EventSounds() {
  const game = useGame((s) => s.game)
  const nowMs = useGame((s) => s.nowMs)
  const acornsFound = useGame((s) => s.acornsFound)
  const seenDiary = useGame((s) => s.seenDiary)
  const seenBankOpen = useGame((s) => s.seenBankOpen)
  const seenWorld = useGame((s) => s.seenWorld)
  const seenMissions = useGame((s) => s.seenMissions)
  const known = useRef<Set<string> | null>(null)

  // Precarga el aviso en cuanto hay contexto (tras el primer gesto), para que no llegue tarde la primera vez.
  useEffect(() => {
    const warm = () => {
      void resumeEngine().then(loadSfx)
      window.removeEventListener('pointerdown', warm)
    }
    window.addEventListener('pointerdown', warm)
    return () => window.removeEventListener('pointerdown', warm)
  }, [])

  useEffect(() => {
    if (!game) return
    const month = currentMonth(game, nowMs)
    const acornsLeft = game.taskDoneMonth < month ? TASK_ACORNS - acornsFound.length : 0
    const ids = pendingEvents(game, acornsLeft, { seenDiary, seenBankOpen, seenWorld, seenMissions }).map((e) => e.id)
    if (!known.current) {
      known.current = new Set(ids)
      return
    }
    const fresh = ids.filter((id) => !known.current!.has(id))
    known.current = new Set(ids)
    // Las bellotas cambian de número al recogerlas y la paga vuelve cada día: solo avisamos de lo realmente nuevo.
    if (fresh.length > 0) playEventSfx()
  }, [game, nowMs, acornsFound, seenDiary, seenBankOpen, seenWorld, seenMissions])

  return null
}
