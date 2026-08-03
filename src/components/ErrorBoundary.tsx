import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  message?: string
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Control Personal error boundary', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <main className="fallback">
        <h1>No se pudo mostrar esta pantalla</h1>
        <p>{this.state.message ?? 'Ocurrio un error inesperado.'}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Recargar
        </button>
      </main>
    )
  }
}
