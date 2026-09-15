import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/**
 * Si algo falla al dibujar, en vez de una pantalla en blanco se muestra el error y dos salidas:
 * recargar, o borrar la partida guardada (útil cuando una versión nueva no entiende un guardado viejo).
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Finfun: error de render', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="min-h-full flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,#7fd4f5_0%,#3aa5d8_60%,#2b86b3_100%)]">
        <div className="g-panel g-panel--red p-6 pt-9 w-full max-w-sm text-center">
          <div className="g-ribbon">Vaya…</div>
          <div className="text-5xl mb-2" aria-hidden="true">
            🐢
          </div>
          <h1 className="g-title text-xl m-0">La isla no ha podido dibujarse</h1>
          <p className="text-ink-l font-semibold text-sm mt-2 mb-0 break-words">{this.state.error.message}</p>
          <div className="grid gap-3 mt-5">
            <button type="button" className="g-btn g-btn--block" onClick={() => location.reload()}>
              Recargar
            </button>
            <button
              type="button"
              className="g-btn g-btn--block g-btn--cream"
              onClick={() => {
                localStorage.removeItem('finfun-save-v1')
                location.reload()
              }}
            >
              Borrar la partida y empezar de nuevo
            </button>
          </div>
        </div>
      </div>
    )
  }
}
