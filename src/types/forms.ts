export interface SelectOption {
  value: string
  label: string
}

export interface ToastMessage {
  id: string
  title: string
  detail?: string
  tone: 'info' | 'success' | 'warning' | 'danger'
}
