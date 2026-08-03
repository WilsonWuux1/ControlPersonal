import { CheckCircle2, Info, TriangleAlert, XCircle } from 'lucide-react'
import { useEffect } from 'react'
import { useAppStore } from '../stores/appStore'

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: XCircle,
}

export function ToastHost() {
  const toasts = useAppStore((state) => state.toasts)
  const dismiss = useAppStore((state) => state.dismissToast)

  useEffect(() => {
    if (toasts.length === 0) return undefined
    const timer = window.setTimeout(() => dismiss(toasts[0].id), 4500)
    return () => window.clearTimeout(timer)
  }, [dismiss, toasts])

  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = icons[toast.tone]
        return (
          <button key={toast.id} type="button" className={`toast toast-${toast.tone}`} onClick={() => dismiss(toast.id)}>
            <Icon size={18} />
            <span>
              <strong>{toast.title}</strong>
              {toast.detail ? <small>{toast.detail}</small> : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
