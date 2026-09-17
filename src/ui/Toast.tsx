/**
 * TOAST: aviso corto que entra por arriba, se queda un par de segundos y se va por arriba.
 * Se anima con transiciones (clase `toast--in` justo después de montarse; se quita a los 2,2 s) y el
 * store lo desmonta a los 2,6 s.
 */
import { useEffect, useState } from 'react'
import { useGame } from '../store/game'

export function Toast() {
  const toast = useGame((s) => s.toast)
  const [shown, setShown] = useState<number | null>(null)
  useEffect(() => {
    if (!toast) return
    // Un frame en el estado inicial (fuera de pantalla) y después dentro; a los 2,2 s vuelve a salir.
    const inT = setTimeout(() => setShown(toast.id), 20)
    const out = setTimeout(() => setShown(null), 2200)
    return () => {
      clearTimeout(inT)
      clearTimeout(out)
    }
  }, [toast])
  if (!toast) return null
  return (
    <div key={toast.id} role="status" className={`toast pointer-events-none ${shown === toast.id ? 'toast--in' : ''}`} style={{ top: 'calc(env(safe-area-inset-top, 0px) + 112px)' }}>
      {toast.text}
    </div>
  )
}
