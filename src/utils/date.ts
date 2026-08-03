import { differenceInMinutes, format, parseISO, startOfDay } from 'date-fns'

export const nowIso = (): string => new Date().toISOString()

export const todayIso = (): string => format(new Date(), 'yyyy-MM-dd')

export const newId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const toDateKey = (value: string | Date): string => format(typeof value === 'string' ? parseISO(value) : value, 'yyyy-MM-dd')

export const minutesBetweenIso = (start: string, end: string): number => Math.max(0, differenceInMinutes(parseISO(end), parseISO(start)))

export const dateTimeLocalValue = (date = new Date()): string => format(date, "yyyy-MM-dd'T'HH:mm")

export const fromDateTimeLocal = (value: string): string => new Date(value).toISOString()

export const friendlyDate = (value: string): string => format(parseISO(value), 'dd/MM/yyyy')

export const monthKey = (value: string): string => format(parseISO(value), 'yyyy-MM')

export const daysSince = (value?: string): number | null => {
  if (!value) return null
  const diff = startOfDay(new Date()).getTime() - startOfDay(parseISO(value)).getTime()
  return Math.floor(diff / 86_400_000)
}
