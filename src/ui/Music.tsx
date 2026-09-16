/**
 * MÚSICA DE FONDO. Un solo <audio> en bucle. Los navegadores no dejan sonar nada hasta que el jugador toca la
 * pantalla, así que la música arranca con el primer toque (si está activada) y desde entonces obedece a Ajustes.
 * Se silencia al dejar la pestaña en segundo plano.
 */
import { useEffect, useRef } from 'react'
import { useGame } from '../store/game'

export const MUSIC_SRC = `${import.meta.env.BASE_URL}audio/finfun.mp3`

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
