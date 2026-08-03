export const formatCurrency = (amount: number, currency = 'GTQ'): string =>
  new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)

export const formatMinutes = (minutes: number): string => {
  const safe = Math.max(0, Math.round(minutes))
  const hours = Math.floor(safe / 60)
  const rest = safe % 60
  if (hours === 0) return `${rest} min`
  if (rest === 0) return `${hours} h`
  return `${hours} h ${rest} min`
}

export const percent = (value: number): string => `${Math.round(value * 100)}%`
