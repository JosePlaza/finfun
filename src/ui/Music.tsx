/**
 * SONIDO DEL JUEGO.
 * Música de fondo: un solo <audio> en bucle (ambient.mp3). Los navegadores no dejan sonar nada hasta que el jugador toca la
 * pantalla, así que la música arranca con el primer toque (si está activada) y desde entonces obedece a Ajustes.
 * Se silencia al dejar la pestaña en segundo plano.
 */
import { useEffect, useRef } from 'react'
import { currentMonth, TASK_ACORNS } from '../sim'
import { useGame } from '../store/game'
import { pendingEvents } from './events'

export const MUSIC_SRC = `${import.meta.env.BASE_URL}audio/ambient.mp3`
export const EVENT_SFX_SRC = `${import.meta.env.BASE_URL}audio/events.mp3`

export function Music() {
  const on = useGame((s) => s.musicOn)
  const volume = useGame((s) => s.musicVolume)
  const audio = useRef<HTMLAudioElement | null>(null)
  const unlocked = useRef(false)

  // Un único elemento de audio para toda la sesión.
  useEffect(() => {
    const a = new Audio(MUSIC_SRC)
    a.loop = true
    a.preload = 'auto'
    audio.current = a
    return () => {
      a.pause()
      audio.current = null
    }
  }, [])

  // Volumen inmediato.
  useEffect(() => {
    if (audio.current) audio.current.volume = volume
  }, [volume])

  // Encendido/apagado, y el primer gesto del jugador desbloquea la reproducción.
  useEffect(() => {
    const a = audio.current
    if (!a) return
    const play = () => {
      if (!useGame.getState().musicOn || document.hidden) return
      a.volume = useGame.getState().musicVolume
      a.play().then(() => (unlocked.current = true)).catch(() => undefined)
    }
    if (!on) {
      a.pause()
      return
    }
    play()
    const gesture = () => {
      play()
      if (unlocked.current) {
        window.removeEventListener('pointerdown', gesture)
        window.removeEventListener('keydown', gesture)
      }
    }
    window.addEventListener('pointerdown', gesture)
    window.addEventListener('keydown', gesture)
    const visibility = () => (document.hidden ? a.pause() : play())
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.removeEventListener('pointerdown', gesture)
      window.removeEventListener('keydown', gesture)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [on])

  return null
}

/* ───────────────────────── Efectos de sonido ───────────────────────── */

let sfxEl: HTMLAudioElement | null = null

/** Suena el aviso de evento nuevo (si los efectos están activados). También sirve para "probar" desde Ajustes. */
export function playEventSfx(force = false) {
  const { sfxOn, sfxVolume } = useGame.getState()
  if (!sfxOn && !force) return
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
