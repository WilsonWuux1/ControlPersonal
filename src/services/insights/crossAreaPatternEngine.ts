import { addDays, format, parseISO, subDays } from 'date-fns'
import type { AppData, MealReason } from '../../types/domain'
import type { InsightConfidence, InsightPriority, PersonalInsight } from './insightTypes'

interface DailyPatternProfile {
  date: string
  energyValues: number[]
  moodValues: number[]
  sleepHours?: number
  wakeEnergy?: number
  workMinutes: number
  trainingMinutes: number
  scrollMinutes: number
  creativeMinutes: number
  studyMinutes: number
  studyFocusValues: number[]
  studyComprehensionValues: number[]
  foodExpense: number
  unplannedMeals: number
  rushedMeals: number
  emotionalMeals: number
  habitScoreValues: number[]
}

const emotionalMealReasons: MealReason[] = ['Ansiedad', 'Aburrimiento', 'Antojo', 'Conveniencia']
const priorityRank: Record<InsightPriority, number> = { high: 3, medium: 2, low: 1 }
const confidenceRank: Record<InsightConfidence, number> = { high: 4, medium: 3, low: 2, insufficient: 1 }

const dateKey = (value: string): string => value.slice(0, 10)
const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0)
const average = (values: number[]): number => (values.length ? sum(values) / values.length : 0)
const money = (value: number): string => `Q${value.toFixed(2)}`

const buildDateKeys = (start: Date, end: Date): string[] => {
  const keys: string[] = []
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    keys.push(format(cursor, 'yyyy-MM-dd'))
  }
  return keys
}

const emptyProfile = (date: string): DailyPatternProfile => ({
  date,
  energyValues: [],
  moodValues: [],
  workMinutes: 0,
  trainingMinutes: 0,
  scrollMinutes: 0,
  creativeMinutes: 0,
  studyMinutes: 0,
  studyFocusValues: [],
  studyComprehensionValues: [],
  foodExpense: 0,
  unplannedMeals: 0,
  rushedMeals: 0,
  emotionalMeals: 0,
  habitScoreValues: [],
})

const averageEnergy = (day: DailyPatternProfile): number | undefined => {
  const values = [...day.energyValues]
  if (typeof day.wakeEnergy === 'number') values.push(day.wakeEnergy)
  return values.length ? average(values) : undefined
}

const averageMood = (day: DailyPatternProfile): number | undefined => (day.moodValues.length ? average(day.moodValues) : undefined)
const averageStudyFocus = (day: DailyPatternProfile): number | undefined => (day.studyFocusValues.length ? average(day.studyFocusValues) : undefined)
const averageStudyComprehension = (day: DailyPatternProfile): number | undefined =>
  day.studyComprehensionValues.length ? average(day.studyComprehensionValues) : undefined

const compareNumberGroups = (
  leftDays: DailyPatternProfile[],
  rightDays: DailyPatternProfile[],
  selector: (day: DailyPatternProfile) => number | undefined,
): { leftAverage: number, rightAverage: number, difference: number, leftCount: number, rightCount: number } => {
  const leftValues = leftDays.map(selector).filter((value): value is number => typeof value === 'number')
  const rightValues = rightDays.map(selector).filter((value): value is number => typeof value === 'number')
  return {
    leftAverage: average(leftValues),
    rightAverage: average(rightValues),
    difference: average(leftValues) - average(rightValues),
    leftCount: leftValues.length,
    rightCount: rightValues.length,
  }
}

const confidenceFromSamples = (sampleSize: number): InsightConfidence => {
  if (sampleSize >= 20) return 'high'
  if (sampleSize >= 10) return 'medium'
  return 'low'
}

const pushInsight = (insights: PersonalInsight[], insight: PersonalInsight): void => {
  insights.push(insight)
}

export const crossAreaPatterns = (data: AppData, now = new Date()): PersonalInsight[] => {
  const generatedAt = now.toISOString()
  const start = subDays(now, 44)
  const profiles = new Map<string, DailyPatternProfile>()
  const getProfile = (date: string): DailyPatternProfile => {
    const existing = profiles.get(date)
    if (existing) return existing
    const created = emptyProfile(date)
    profiles.set(date, created)
    return created
  }

  for (const date of buildDateKeys(start, now)) getProfile(date)

  for (const session of data.workSessions) {
    if (parseISO(session.startedAt) < start) continue
    getProfile(dateKey(session.startedAt)).workMinutes += session.effectiveMinutes
  }

  for (const log of data.moodEnergyLogs) {
    if (parseISO(log.dateTime) < start) continue
    const profile = getProfile(log.date)
    profile.energyValues.push(log.energy)
    profile.moodValues.push(log.mood)
  }

  for (const checkIn of data.dailyCheckIns) {
    if (parseISO(`${checkIn.date}T00:00:00`) < start) continue
    const profile = getProfile(checkIn.date)
    profile.energyValues.push(checkIn.energy)
    profile.moodValues.push(checkIn.mood)
  }

  for (const sleep of data.sleepLogs) {
    if (parseISO(`${sleep.date}T00:00:00`) < start) continue
    const profile = getProfile(sleep.date)
    profile.sleepHours = sleep.durationHours
    profile.wakeEnergy = sleep.wakeEnergy
  }

  for (const training of data.trainingLogs) {
    if (parseISO(training.dateTime) < start) continue
    const profile = getProfile(dateKey(training.dateTime))
    profile.trainingMinutes += training.durationMinutes
    profile.energyValues.push(training.energyBefore, training.energyAfter)
  }

  for (const log of data.recreationLogs) {
    if (parseISO(log.dateTime) < start) continue
    const profile = getProfile(dateKey(log.dateTime))
    if (log.type === 'Desplazamiento automatico') profile.scrollMinutes += log.durationMinutes
    if (log.type === 'Creacion de contenido') profile.creativeMinutes += log.durationMinutes
  }

  for (const meal of data.mealLogs) {
    if (parseISO(meal.dateTime) < start) continue
    const profile = getProfile(dateKey(meal.dateTime))
    if (!meal.planned) profile.unplannedMeals += 1
    if (meal.rushed) profile.rushedMeals += 1
    if (emotionalMealReasons.includes(meal.reason)) profile.emotionalMeals += 1
  }

  for (const movement of data.movements) {
    if (parseISO(movement.dateTime) < start || movement.type !== 'Gasto') continue
    const category = movement.category.toLowerCase()
    const description = movement.description.toLowerCase()
    const tags = movement.tags.map((tag) => tag.toLowerCase())
    const looksLikeFood = category.includes('comida') || description.includes('comida') || tags.some((tag) => tag.includes('comida'))
    if (looksLikeFood) getProfile(dateKey(movement.dateTime)).foodExpense += movement.amount
  }

  for (const session of data.studySessions) {
    if (parseISO(session.startedAt) < start) continue
    const profile = getProfile(dateKey(session.startedAt))
    profile.studyMinutes += session.effectiveMinutes
    profile.studyFocusValues.push(session.focusLevel)
    profile.studyComprehensionValues.push(session.comprehension)
  }

  const habitById = new Map(data.habits.map((habit) => [habit.id, habit]))
  for (const entry of data.habitEntries) {
    if (parseISO(`${entry.date}T00:00:00`) < start) continue
    const habit = habitById.get(entry.habitId)
    if (!habit || habit.status !== 'active') continue
    if (entry.status === 'paused' || entry.status === 'not_applicable' || entry.status === 'unregistered') continue
    const score = habit.excellentValue > 0 ? Math.min(100, (entry.value / habit.excellentValue) * 100) : 0
    getProfile(entry.date).habitScoreValues.push(score)
  }

  const days = [...profiles.values()].sort((left, right) => left.date.localeCompare(right.date))
  const daysWithSleep = days.filter((day) => typeof day.sleepHours === 'number')
  const lowSleepDays = daysWithSleep.filter((day) => (day.sleepHours ?? 0) < 6)
  const enoughSleepDays = daysWithSleep.filter((day) => (day.sleepHours ?? 0) >= 7)
  const activeDays = days.filter((day) => day.trainingMinutes >= 10)
  const inactiveDays = days.filter((day) => day.trainingMinutes === 0)
  const longWorkDays = days.filter((day) => day.workMinutes >= 360)
  const shortWorkDays = days.filter((day) => day.workMinutes > 0 && day.workMinutes < 360)
  const highScrollDays = days.filter((day) => day.scrollMinutes >= 45)
  const lowScrollDays = days.filter((day) => day.scrollMinutes > 0 && day.scrollMinutes < 30)
  const studyDays = days.filter((day) => day.studyMinutes > 0)
  const lowEnergyOrMoodDays = days.filter((day) => (averageEnergy(day) ?? 5) <= 2.5 || (averageMood(day) ?? 5) <= 2.5)
  const stableEnergyMoodDays = days.filter((day) => (averageEnergy(day) ?? 0) >= 3.5 && (averageMood(day) ?? 0) >= 3.5)
  const insights: PersonalInsight[] = []

  if (lowSleepDays.length >= 3 && enoughSleepDays.length >= 3) {
    const energyComparison = compareNumberGroups(lowSleepDays, enoughSleepDays, averageEnergy)
    if (energyComparison.leftCount >= 3 && energyComparison.rightCount >= 3 && energyComparison.difference <= -0.7) {
      pushInsight(insights, {
        id: 'pattern-sleep-energy',
        area: 'sleep',
        title: 'Tu energia parece depender bastante del sueno.',
        message: `Cuando duermes menos de 6 h, tu energia promedio queda en ${energyComparison.leftAverage.toFixed(1)}/5; cuando llegas a 7 h o mas sube a ${energyComparison.rightAverage.toFixed(1)}/5. Esto sugiere que algunos dias de baja energia no son falta de voluntad, sino recuperacion incompleta.`,
        evidence: [`Dias con poco sueno: ${energyComparison.leftCount}.`, `Dias con sueno suficiente: ${energyComparison.rightCount}.`],
        action: 'Si amaneces bajo, no empieces por exigirte mas: protege una hora de dormir, hidrata y deja una accion pequena de movimiento.',
        priority: 'high',
        confidence: confidenceFromSamples(energyComparison.leftCount + energyComparison.rightCount),
        sampleSize: energyComparison.leftCount + energyComparison.rightCount,
        generatedAt,
      })
    }
  }

  const lowSleepHighScrollDays = lowSleepDays.filter((day) => day.scrollMinutes >= 45)
  if (lowSleepHighScrollDays.length >= 3) {
    pushInsight(insights, {
      id: 'pattern-sleep-scroll',
      area: 'recreation',
      title: 'Poco sueno y scroll se estan juntando.',
      message: `En ${lowSleepHighScrollDays.length} dias recientes dormiste menos de 6 h y tambien registraste al menos 45 min de scroll automatico. Puede pasar porque el cansancio baja la resistencia a contenido facil, y luego ese scroll deja menos margen para cerrar el dia mejor.`,
      evidence: lowSleepHighScrollDays.slice(0, 3).map((day) => `${day.date}: ${day.sleepHours?.toFixed(1)} h de sueno, ${day.scrollMinutes} min de scroll.`),
      action: 'En dias de poco sueno, cambia la meta: antes de abrir TikTok deja listo dormir, agua o una tarea minima. El objetivo es cortar el ciclo cansancio-scroll.',
      priority: 'high',
      confidence: confidenceFromSamples(lowSleepHighScrollDays.length),
      sampleSize: lowSleepHighScrollDays.length,
      generatedAt,
    })
  }

  if (activeDays.length >= 3 && inactiveDays.length >= 5) {
    const energyComparison = compareNumberGroups(activeDays, inactiveDays, averageEnergy)
    const moodComparison = compareNumberGroups(activeDays, inactiveDays, averageMood)
    const hasEnergySignal = energyComparison.leftCount >= 3 && energyComparison.rightCount >= 3 && energyComparison.difference >= 0.6
    const hasMoodSignal = moodComparison.leftCount >= 3 && moodComparison.rightCount >= 3 && moodComparison.difference >= 0.6
    if (hasEnergySignal || hasMoodSignal) {
      pushInsight(insights, {
        id: 'pattern-activity-mood-energy',
        area: 'activity',
        title: 'Moverte parece mejorar tu estado del dia.',
        message: `Los dias con al menos 10 min de entrenamiento o movimiento salen mejor que los dias sin actividad registrada. Energia: ${energyComparison.leftAverage.toFixed(1)} vs ${energyComparison.rightAverage.toFixed(1)}/5. Animo: ${moodComparison.leftAverage.toFixed(1)} vs ${moodComparison.rightAverage.toFixed(1)}/5. Esto conecta con tu regla: mas movimiento puede darte mas energia.`,
        evidence: [`Dias con movimiento: ${activeDays.length}.`, `Dias sin movimiento: ${inactiveDays.length}.`],
        action: 'Cuando no quieras entrenar, registra solo 10 min. Si el patron se mantiene, esa accion pequena vale mas que esperar motivacion perfecta.',
        priority: 'high',
        confidence: confidenceFromSamples(activeDays.length + inactiveDays.length),
        sampleSize: activeDays.length + inactiveDays.length,
        generatedAt,
      })
    }
  }

  const longWorkWithoutTrainingDays = longWorkDays.filter((day) => day.trainingMinutes === 0)
  if (longWorkDays.length >= 4 && longWorkWithoutTrainingDays.length / longWorkDays.length >= 0.6) {
    pushInsight(insights, {
      id: 'pattern-work-training-displacement',
      area: 'work',
      title: 'El trabajo largo esta desplazando el entrenamiento.',
      message: `En ${longWorkWithoutTrainingDays.length} de ${longWorkDays.length} dias con mas de 6 h de trabajo no aparece entrenamiento registrado. Esto puede explicar por que trabajar mucho no siempre se siente como avanzar: produce actividad, pero puede quitarte energia corporal y continuidad personal.`,
      evidence: [`Dias largos sin entrenamiento: ${longWorkWithoutTrainingDays.length}.`, `Dias largos totales: ${longWorkDays.length}.`],
      action: 'Antes de una jornada larga, agenda movimiento corto al inicio o al cierre. No lo trates como rutina completa; tratalo como mantenimiento.',
      priority: 'medium',
      confidence: confidenceFromSamples(longWorkDays.length),
      sampleSize: longWorkDays.length,
      generatedAt,
    })
  }

  if (longWorkDays.length >= 5 && shortWorkDays.length >= 5) {
    const longAverage = average(longWorkDays.map((day) => day.foodExpense))
    const shortAverage = average(shortWorkDays.map((day) => day.foodExpense))
    const difference = longAverage - shortAverage
    if (difference > 20) {
      pushInsight(insights, {
        id: 'pattern-work-food-expense',
        area: 'finance',
        title: 'Trabajo largo y gasto en comida parecen conectarse.',
        message: `En dias con mas de 6 h de trabajo gastas en comida ${money(difference)} mas en promedio que en dias de trabajo mas corto. Puede pasar porque cuando terminas cansado decides con hambre, prisa o poca energia, no con plan.`,
        evidence: [`Dias largos comparados: ${longWorkDays.length}.`, `Dias cortos comparados: ${shortWorkDays.length}.`],
        action: 'En dias largos, deja comida resuelta o separa un monto definido para comida. Asi el cansancio no decide por tu presupuesto.',
        priority: 'high',
        confidence: confidenceFromSamples(longWorkDays.length + shortWorkDays.length),
        sampleSize: longWorkDays.length + shortWorkDays.length,
        generatedAt,
      })
    }
  }

  const lowSignalMealDays = lowEnergyOrMoodDays.filter((day) => day.unplannedMeals + day.rushedMeals + day.emotionalMeals > 0)
  if (lowEnergyOrMoodDays.length >= 4 && lowSignalMealDays.length / lowEnergyOrMoodDays.length >= 0.5) {
    pushInsight(insights, {
      id: 'pattern-low-signal-meals',
      area: 'food',
      title: 'Comer sin plan aparece mas cuando bajas energia o animo.',
      message: `En ${lowSignalMealDays.length} de ${lowEnergyOrMoodDays.length} dias con energia o animo bajo tambien aparece comida no planificada, apresurada o por antojo/ansiedad. No es fallo personal: cuando estas bajo, decidir comida cuesta mas.`,
      evidence: [`Dias bajos con comida impulsiva: ${lowSignalMealDays.length}.`, `Dias bajos analizados: ${lowEnergyOrMoodDays.length}.`],
      action: 'Cuando registres energia o animo bajo, deja una comida simple definida antes de hacer otras cosas. El sistema esta detectando que ahi conviene quitar decisiones.',
      priority: 'high',
      confidence: confidenceFromSamples(lowEnergyOrMoodDays.length),
      sampleSize: lowEnergyOrMoodDays.length,
      generatedAt,
    })
  }

  if (studyDays.length >= 4) {
    const studyAfterEnoughSleep = studyDays.filter((day) => (day.sleepHours ?? 0) >= 7)
    const studyAfterLowSleep = studyDays.filter((day) => typeof day.sleepHours === 'number' && (day.sleepHours ?? 0) < 6)
    const comprehensionComparison = compareNumberGroups(studyAfterEnoughSleep, studyAfterLowSleep, averageStudyComprehension)
    const focusComparison = compareNumberGroups(studyAfterEnoughSleep, studyAfterLowSleep, averageStudyFocus)
    if (
      comprehensionComparison.leftCount >= 2 &&
      comprehensionComparison.rightCount >= 2 &&
      (comprehensionComparison.difference >= 0.6 || focusComparison.difference >= 0.6)
    ) {
      pushInsight(insights, {
        id: 'pattern-sleep-study',
        area: 'study',
        title: 'El estudio rinde distinto segun tu descanso.',
        message: `Cuando estudias despues de dormir 7 h o mas, tu comprension promedio es ${comprehensionComparison.leftAverage.toFixed(1)}/5; con menos de 6 h baja a ${comprehensionComparison.rightAverage.toFixed(1)}/5. Esto sugiere que algunos temas no necesitan mas presion, sino mejor momento para repasarlos.`,
        evidence: [`Sesiones con buen descanso: ${comprehensionComparison.leftCount}.`, `Sesiones con poco descanso: ${comprehensionComparison.rightCount}.`],
        action: 'Pon temas dificiles despues de buen descanso. En dias cansados usa repaso ligero o practica corta.',
        priority: 'medium',
        confidence: confidenceFromSamples(comprehensionComparison.leftCount + comprehensionComparison.rightCount),
        sampleSize: comprehensionComparison.leftCount + comprehensionComparison.rightCount,
        generatedAt,
      })
    }
  }

  if (highScrollDays.length >= 3 && lowScrollDays.length >= 3) {
    const moodComparison = compareNumberGroups(highScrollDays, lowScrollDays, averageMood)
    if (moodComparison.leftCount >= 3 && moodComparison.rightCount >= 3 && moodComparison.difference <= -0.5) {
      pushInsight(insights, {
        id: 'pattern-scroll-mood',
        area: 'recreation',
        title: 'El scroll alto coincide con peor animo.',
        message: `Los dias con 45 min o mas de scroll automatico muestran animo promedio ${moodComparison.leftAverage.toFixed(1)}/5; los dias con scroll bajo quedan en ${moodComparison.rightAverage.toFixed(1)}/5. Puede ser que el scroll aparezca porque ya venias bajo, o que despues te deje peor. En ambos casos conviene vigilarlo.`,
        evidence: [`Dias con scroll alto: ${moodComparison.leftCount}.`, `Dias con scroll bajo: ${moodComparison.rightCount}.`],
        action: 'Cuando quieras abrir scroll, primero registra animo. Si esta bajo, cambia a video motivacional, movimiento breve o contenido creativo con limite.',
        priority: 'medium',
        confidence: confidenceFromSamples(moodComparison.leftCount + moodComparison.rightCount),
        sampleSize: moodComparison.leftCount + moodComparison.rightCount,
        generatedAt,
      })
    }
  }

  const highCreativeLowScrollDays = days.filter((day) => day.creativeMinutes >= 30 && day.scrollMinutes < 30)
  if (highCreativeLowScrollDays.length >= 3 && stableEnergyMoodDays.length >= 3) {
    const overlap = highCreativeLowScrollDays.filter((day) => (averageMood(day) ?? 0) >= 3.5 || (averageEnergy(day) ?? 0) >= 3.5)
    if (overlap.length / highCreativeLowScrollDays.length >= 0.5) {
      pushInsight(insights, {
        id: 'pattern-creative-recreation',
        area: 'recreation',
        title: 'Crear contenido parece una mejor recreacion que solo consumir.',
        message: `En ${overlap.length} de ${highCreativeLowScrollDays.length} dias con contenido creativo y poco scroll, energia o animo quedaron estables. Esto importa porque no todo TikTok es igual: crear con intencion puede funcionar como recreacion, mientras el scroll automatico tiende a diluir el dia.`,
        evidence: [`Dias creativos con poco scroll: ${highCreativeLowScrollDays.length}.`, `Dias estables dentro de ese grupo: ${overlap.length}.`],
        action: 'Si vas a usar TikTok, decide antes si sera crear o desplazarte. Crear puede ser premio; scroll necesita limite.',
        priority: 'low',
        confidence: confidenceFromSamples(highCreativeLowScrollDays.length),
        sampleSize: highCreativeLowScrollDays.length,
        generatedAt,
      })
    }
  }

  const daysWithHabitScores = days.filter((day) => day.habitScoreValues.length > 0)
  if (daysWithHabitScores.length >= 5) {
    const strongHabitDays = daysWithHabitScores.filter((day) => average(day.habitScoreValues) >= 70)
    const weakHabitDays = daysWithHabitScores.filter((day) => average(day.habitScoreValues) < 40)
    const moodComparison = compareNumberGroups(strongHabitDays, weakHabitDays, averageMood)
    if (moodComparison.leftCount >= 2 && moodComparison.rightCount >= 2 && moodComparison.difference >= 0.6) {
      pushInsight(insights, {
        id: 'pattern-habits-mood',
        area: 'general',
        title: 'Cumplir habitos esta acompanando mejor animo.',
        message: `Los dias con mejor avance de habitos muestran animo promedio ${moodComparison.leftAverage.toFixed(1)}/5 frente a ${moodComparison.rightAverage.toFixed(1)}/5 en dias flojos. Esto no significa hacerlo todo perfecto; significa que completar piezas pequenas parece sostener tu estado.`,
        evidence: [`Dias fuertes de habitos: ${moodComparison.leftCount}.`, `Dias flojos de habitos: ${moodComparison.rightCount}.`],
        action: 'En dias complicados, elige dos habitos base en vez de intentar todos. El sistema premia continuidad, no perfeccion.',
        priority: 'medium',
        confidence: confidenceFromSamples(moodComparison.leftCount + moodComparison.rightCount),
        sampleSize: moodComparison.leftCount + moodComparison.rightCount,
        generatedAt,
      })
    }
  }

  return insights.sort((left, right) => {
    const priorityDifference = priorityRank[right.priority] - priorityRank[left.priority]
    if (priorityDifference !== 0) return priorityDifference
    const confidenceDifference = confidenceRank[right.confidence] - confidenceRank[left.confidence]
    if (confidenceDifference !== 0) return confidenceDifference
    return (right.sampleSize ?? 0) - (left.sampleSize ?? 0)
  })
}
