import { AvatarHeadFactory } from './ui/AvatarHead'
import { useEffect } from 'react'
import { Island } from './scene/Island'
import { isDevMode, useGame } from './store/game'
import { RecenterButton, TopBar } from './ui/Hud'
import { AuthScreen } from './ui/Auth'
import { Coach } from './ui/Coach'
import { hasSupabase } from './lib/supabase'
import { EventSounds, Music } from './ui/Music'
import { NameIsland } from './ui/NameIsland'
import { Panels } from './ui/Panels'
import { Toast } from './ui/Toast'
import { DevBar } from './ui/DevBar'
import { CelebrationOverlay, InflationWheelOverlay, RescueOverlay, StormOverlay } from './ui/Overlays'
import { ErrorBoundary } from './ui/ErrorBoundary'

export default function App() {
  const game = useGame((s) => s.game)
  const account = useGame((s) => s.account)
  const ready = useGame((s) => s.ready)
  const boot = useGame((s) => s.boot)
  const tick = useGame((s) => s.tick)

  useEffect(() => {
    void boot()
    // El reloj de la isla se revisa cada 20 s y cada vez que la pestaña vuelve a estar visible.
    const id = setInterval(tick, 20_000)
    const onVisible = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', tick)
    }
  }, [boot, tick])

  if (!ready) {
    return <div className="h-full flex items-center justify-center text-ink-2 font-display text-xl">Cargando la isla…</div>
  }

  if (hasSupabase && !account) return <AuthScreen />
  if (!game) return <NameIsland />

  return (
    <ErrorBoundary>
      <div className="relative h-full w-full overflow-hidden">
        <Island />
        <Music />
        <AvatarHeadFactory />
        <EventSounds />
        <TopBar />
        <RecenterButton />
        <Panels />
        <Coach />
        <Toast />
        <InflationWheelOverlay />
        <StormOverlay />
        <CelebrationOverlay />
        <RescueOverlay />
        {isDevMode && <DevBar />}
      </div>
    </ErrorBoundary>
  )
}
