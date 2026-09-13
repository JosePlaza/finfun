import { useGame } from '../store/game'

export function Toast() {
  const toast = useGame((s) => s.toast)
  if (!toast) return null
  return (
    <div
      key={toast.id}
      role="status"
      className="toast-enter absolute left-1/2 top-[calc(env(safe-area-inset-top)+76px)] -translate-x-1/2 z-30 max-w-[88vw] bg-ink text-white text-[15px] font-semibold px-4 py-2.5 rounded-2xl shadow-lg text-center pointer-events-none"
    >
      {toast.text}
    </div>
  )
}
