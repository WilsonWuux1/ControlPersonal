import type { AppData } from '../../types/domain'
import { todayIso } from '../../utils/date'
import { averageSleepHours, dailyEffectiveWorkMinutes } from '../timeCalculations'
import { buildActivityProfile } from './activityEngine'
import { crossAreaPatterns } from './crossAreaPatternEngine'
import { financeInsights } from './financeInsightEngine'
import { studyInsights, studyMinutesThisWeek } from './studyInsightEngine'
import type { DailyEvaluation, PersonalInsight } from './insightTypes'

export const generateDailyEvaluation = (data: AppData, now = new Date()): DailyEvaluation => {
  const today = todayIso()
  const checkIn = data.dailyCheckIns.find((item) => item.date === today)
  const todayMoodEnergyLogs = data.moodEnergyLogs
    .filter((item) => item.date === today)
    .sort((left, right) => right.dateTime.localeCompare(left.dateTime))
  const latestMoodEnergy = todayMoodEnergyLogs[0]
  const activity = buildActivityProfile(data, now)
  const sleepAverage = averageSleepHours(data.sleepLogs)
  const workMinutes = dailyEffectiveWorkMinutes(data.workSessions, today)
  const insights: PersonalInsight[] = [
    ...crossAreaPatterns(data, now),
    ...studyInsights(data, now),
    ...financeInsights(data, now),
  ].slice(0, 4)

  const energy = checkIn?.energy ?? latestMoodEnergy?.energy
  const mood = checkIn?.mood ?? latestMoodEnergy?.mood
  const hasEnergy = typeof energy === 'number'
  const hasMood = typeof mood === 'number'
  const lowEnergy = (energy ?? 3) <= 2
  const lowMood = (mood ?? 3) <= 2
  const goodEnergy = (energy ?? 0) >= 4
  const goodMood = (mood ?? 0) >= 4
  const strongActivity = activity.last7DaysMinutes >= 120
  const needsPersonalSignals = !hasEnergy || !hasMood

  const title = needsPersonalSignals
    ? 'Me falta saber como te sientes.'
    : lowEnergy || lowMood
      ? 'Hoy conviene recuperar energia.'
      : goodEnergy && goodMood && strongActivity
        ? 'Vas construyendo una buena base.'
        : 'El dia esta estable.'

  const strongestPattern = insights.find((insight) => insight.area === 'general' && insight.priority === 'high')

  const message = strongestPattern
    ? `${strongestPattern.message} Por eso hoy conviene actuar antes de que ese patron se repita.`
    : needsPersonalSignals
    ? 'Puedo leer tus registros de trabajo, actividad, sueno y finanzas, pero todavia no se si hoy estas cansado, animado, disperso o estable. Ese dato cambia mucho el consejo: no es lo mismo estar sin actividad por descanso que por apatia.'
    : lowEnergy || lowMood
      ? 'Tu lectura personal esta baja. Cuando energia o animo bajan, el sistema prioriza acciones cortas porque suelen funcionar mejor que exigirte una rutina completa.'
      : goodEnergy && goodMood && strongActivity
        ? 'Tus senales principales van bien. El siguiente paso no es exigirte mas, sino mantener lo que ya esta funcionando.'
        : 'Tu dia no se ve perdido, pero tampoco hay suficiente impulso registrado. Conviene cerrar una accion pequena para que el progreso no dependa solo de motivacion.'

  const mainAction = strongestPattern?.action ?? (needsPersonalSignals
    ? 'Guarda energia y animo. Con eso puedo relacionar si tus decisiones vienen mas de cansancio, falta de sueno, trabajo acumulado o desorden de comida.'
    : activity.readiness === 'recover'
      ? 'Haz una pausa corta, toma agua y usa movimiento suave para recuperar energia sin exigirte de mas.'
      : activity.last7DaysMinutes < 30
        ? 'Haz 5 a 10 minutos de movimiento. Sirve para mantener continuidad sin convertirlo en una rutina pesada.'
        : goodEnergy && goodMood && strongActivity
          ? 'Manten el ritmo: registra una accion clave y evita subir intensidad solo por sentir que puedes hacer mas.'
          : 'Elige una accion de cierre: movimiento corto, prioridad simple o preparar comida para que el cansancio no decida por ti.')

  const evidence = [
    hasEnergy ? `Tu energia hoy esta en ${energy}/5.` : 'Aun no registraste tu energia de hoy.',
    hasMood ? `Tu animo hoy esta en ${mood}/5.` : 'Aun no registraste tu animo de hoy.',
    workMinutes > 0 ? `Hoy llevas ${workMinutes} min de trabajo efectivo.` : 'No hay trabajo efectivo registrado hoy.',
    activity.last7DaysMinutes > 0
      ? `En los ultimos 7 dias registraste ${activity.last7DaysMinutes} min de entrenamiento o movimiento.`
      : 'No hay actividad fisica registrada en los ultimos 7 dias.',
  ]
  if (sleepAverage > 0) evidence.push(`Tu sueno promedio registrado es ${sleepAverage.toFixed(1)} h.`)
  const studyMinutes = studyMinutesThisWeek(data, now)
  if (studyMinutes > 0) evidence.push(`Estudio esta semana: ${studyMinutes} min.`)

  return {
    title,
    message,
    mainAction,
    evidence,
    insights,
  }
}
