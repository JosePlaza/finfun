import { useGame } from '../store/game'

export function Toast() {
  const toast = useGame((s) => s.toast)
  if (!toast) return null
  return (
    <div
      key={toast.id}
      role="status"
      className="toast-enter absolute left-1/2 top-[calc(env(safe-area-inset-top)+72px)] -translate-x-1/2 z-30 max-w-[88vw] g-panel g-panel--sky !rounded-2xl !border-4 text-ink text-[14px] font-extrabold px-4 py-2.5 text-center pointer-events-none"
    >
      {toast.text}
    </div>
  )
}
