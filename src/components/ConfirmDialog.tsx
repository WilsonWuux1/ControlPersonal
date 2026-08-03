import { AlertTriangle } from 'lucide-react'
import { Button } from './Button'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', onCancel, onConfirm }: ConfirmDialogProps) {
  return (
    <Modal title={title} open={open} onClose={onCancel}>
      <div className="stack">
        <div className="notice danger">
          <AlertTriangle size={20} />
          <p>{message}</p>
        </div>
        <div className="actions">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
