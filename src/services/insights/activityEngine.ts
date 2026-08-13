import { differenceInCalendarDays, parseISO, subDays } from 'date-fns'
import type { AppData } from '../../types/domain'

export interface ActivityProfile {
  last7DaysMinutes: number
  last28DaysMinutes: number
  trainingDays7: number
  trainingDays28: number
  averageIntensity: number
  averageEnergyBefore: number
  averageEnergyAfter: number
  consistency: number
  trend: 'decreasing' | 'stable' | 'increasing'
  readiness: 'recover' | 'maintain' | 'progress-slightly' | 'progress'
}

const average = (values: number[]): number => (values.length ? Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(1)) : 0)

export const buildActivityProfile = (data: Pick<AppData, 'trainingLogs' | 'sleepLogs' | 'settings'>, now = new Date()): ActivityProfile => {
  const last7Start = subDays(now, 6)
  const last28Start = subDays(now, 27)
  const last7 = data.trainingLogs.filter((log) => parseISO(log.dateTime) >= last7Start)
  const last28 = data.trainingLogs.filter((log) => parseISO(log.dateTime) >= last28Start)
  const previous28 = data.trainingLogs.filter((log) => {
    const date = parseISO(log.dateTime)
    return date < last28Start && differenceInCalendarDays(last28Start, date) <= 28
  })
  const last7Days = new Set(last7.map((log) => log.dateTime.slice(0, 10))).size
  const last28Days = new Set(last28.map((log) => log.dateTime.slice(0, 10))).size
  const last28Minutes = last28.reduce((total, log) => total + log.durationMinutes, 0)
  const previous28Minutes = previous28.reduce((total, log) => total + log.durationMinutes, 0)
  const trend =
    last28Minutes > previous28Minutes * 1.15 && last28Minutes > 0
      ? 'increasing'
      : last28Minutes < previous28Minutes * 0.85 && previous28Minutes > 0
        ? 'decreasing'
        : 'stable'
  const averageSleep = data.sleepLogs.length
    ? data.sleepLogs.slice(-7).reduce((total, log) => total + log.durationHours, 0) / Math.min(7, data.sleepLogs.length)
    : 0
  const intensity = average(last28.map((log) => log.intensity))
  const energyBefore = average(last28.map((log) => log.energyBefore))
  const energyAfter = average(last28.map((log) => log.energyAfter))
  const consistency = Number((last28Days / 28).toFixed(2))
  const lowSleep = averageSleep > 0 && averageSleep < data.settings.sleepGoalHours - 1
  const readiness =
    lowSleep || energyAfter < energyBefore - 0.5
      ? 'recover'
      : last28Days >= 8 && intensity <= 3 && energyAfter >= energyBefore
        ? 'progress-slightly'
        : last28Days >= 12 && intensity >= 3 && energyAfter >= energyBefore
          ? 'progress'
          : 'maintain'

  return {
    last7DaysMinutes: last7.reduce((total, log) => total + log.durationMinutes, 0),
    last28DaysMinutes: last28Minutes,
    trainingDays7: last7Days,
    trainingDays28: last28Days,
    averageIntensity: intensity,
    averageEnergyBefore: energyBefore,
    averageEnergyAfter: energyAfter,
    consistency,
    trend,
    readiness,
  }
}
