import type { SleepLog, WorkSession } from '../types/domain'
import { minutesBetweenIso } from '../utils/date'

export const calculateWorkSessionDuration = (startedAt: string, endedAt: string, breakMinutes: number): { durationMinutes: number; effectiveMinutes: number } => {
  const durationMinutes = minutesBetweenIso(startedAt, endedAt)
  return { durationMinutes, effectiveMinutes: Math.max(0, durationMinutes - breakMinutes) }
}

export const dailyEffectiveWorkMinutes = (sessions: WorkSession[], date: string): number =>
  sessions.filter((session) => session.startedAt.startsWith(date)).reduce((total, session) => total + session.effectiveMinutes, 0)

export const calculateSleepDurationHours = (sleepAt: string, wakeAt: string, napMinutes: number): number => {
  const nightMinutes = minutesBetweenIso(sleepAt, wakeAt)
  return Number(((nightMinutes + napMinutes) / 60).toFixed(2))
}

export const averageSleepHours = (logs: SleepLog[]): number => {
  if (logs.length === 0) return 0
  return Number((logs.reduce((total, log) => total + log.durationHours, 0) / logs.length).toFixed(2))
}
