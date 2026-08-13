import type { AppData } from '../../types/domain'
import { todayIso } from '../../utils/date'
import { averageSleepHours, dailyEffectiveWorkMinutes } from '../timeCalculations'
import { buildActivityProfile } from './activityEngine'
import { financeInsights } from './financeInsightEngine'
import { studyInsights, studyMinutesThisWeek } from './studyInsightEngine'
import type { DailyEvaluation, PersonalInsight } from './insightTypes'

export const generateDailyEvaluation = (data: AppData, now = new Date()): DailyEvaluation => {
  const today = todayIso()
  const checkIn = data.dailyCheckIns.find((item) => item.date === today)
  const activity = buildActivityProfile(data, now)
  const sleepAverage = averageSleepHours(data.sleepLogs)
  const workMinutes = dailyEffectiveWorkMinutes(data.workSessions, today)
  const insights: PersonalInsight[] = [
    ...studyInsights(data, now),
    ...financeInsights(data, now),
  ].slice(0, 4)
  const lowEnergy = (checkIn?.energy ?? 3) <= 2
  const lowMood = (checkIn?.mood ?? 3) <= 2
  const title = lowEnergy || lowMood ? 'Conviene bajar la friccion.' : 'Tienes una base para avanzar.'
  const activityAction =
    activity.readiness === 'recover'
      ? 'Haz una pausa corta, toma agua y deja el entrenamiento en movimiento suave.'
      : activity.last7DaysMinutes < 30
        ? 'Registra 5 a 10 minutos de movimiento para mantener continuidad.'
        : 'Mantén el siguiente paso pequeno y concreto.'
  const evidence = [
    `Energia registrada: ${checkIn?.energy ?? 'sin registro'}/5.`,
    `Animo registrado: ${checkIn?.mood ?? 'sin registro'}/5.`,
    `Trabajo efectivo hoy: ${workMinutes} min.`,
    `Actividad ultimos 7 dias: ${activity.last7DaysMinutes} min.`,
  ]
  if (sleepAverage > 0) evidence.push(`Sueno promedio registrado: ${sleepAverage.toFixed(1)} h.`)
  const studyMinutes = studyMinutesThisWeek(data, now)
  if (studyMinutes > 0) evidence.push(`Estudio esta semana: ${studyMinutes} min.`)

  return {
    title,
    message: lowEnergy || lowMood
      ? 'Tus registros sugieren que hoy es mejor recuperar energia antes que exigirte mas intensidad.'
      : 'Tus registros no muestran una senal fuerte de alarma; el mejor avance sigue siendo una accion concreta.',
    mainAction: activityAction,
    evidence,
    insights,
  }
}
