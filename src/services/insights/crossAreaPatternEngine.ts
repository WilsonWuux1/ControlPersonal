import { parseISO, subDays } from 'date-fns'
import type { AppData } from '../../types/domain'
import type { PersonalInsight } from './insightTypes'

const dateKey = (value: string): string => value.slice(0, 10)
const average = (values: number[]): number => (values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0)

export const crossAreaPatterns = (data: AppData, now = new Date()): PersonalInsight[] => {
  const generatedAt = now.toISOString()
  const start = subDays(now, 44)
  const workByDate = new Map<string, number>()
  const mealExpenseByDate = new Map<string, number>()
  const energyByDate = new Map<string, number>()

  for (const session of data.workSessions) {
    if (parseISO(session.startedAt) < start) continue
    const key = dateKey(session.startedAt)
    workByDate.set(key, (workByDate.get(key) ?? 0) + session.effectiveMinutes)
  }

  for (const movement of data.movements) {
    if (parseISO(movement.dateTime) < start || movement.type !== 'Gasto') continue
    const category = movement.category.toLowerCase()
    if (!category.includes('comida')) continue
    const key = dateKey(movement.dateTime)
    mealExpenseByDate.set(key, (mealExpenseByDate.get(key) ?? 0) + movement.amount)
  }

  for (const log of data.moodEnergyLogs) {
    if (parseISO(log.dateTime) < start) continue
    energyByDate.set(log.date, log.energy)
  }
  for (const checkIn of data.dailyCheckIns) {
    if (parseISO(`${checkIn.date}T00:00:00`) < start) continue
    if (!energyByDate.has(checkIn.date)) energyByDate.set(checkIn.date, checkIn.energy)
  }

  const comparableDates = [...new Set([...workByDate.keys(), ...mealExpenseByDate.keys(), ...energyByDate.keys()])]
  const longWorkDates = comparableDates.filter((date) => (workByDate.get(date) ?? 0) >= 360)
  const shortWorkDates = comparableDates.filter((date) => (workByDate.get(date) ?? 0) > 0 && (workByDate.get(date) ?? 0) < 360)
  const lowEnergyLongWorkDates = longWorkDates.filter((date) => (energyByDate.get(date) ?? 5) <= 2)

  const insights: PersonalInsight[] = []
  if (longWorkDates.length >= 5 && shortWorkDates.length >= 5) {
    const longAverage = average(longWorkDates.map((date) => mealExpenseByDate.get(date) ?? 0))
    const shortAverage = average(shortWorkDates.map((date) => mealExpenseByDate.get(date) ?? 0))
    const difference = longAverage - shortAverage
    if (difference > 20) {
      insights.push({
        id: 'pattern-work-food-expense',
        area: 'general',
        title: 'Trabajo largo y comida parecen conectarse.',
        message: `En tus registros, los dias con mas de 6 horas de trabajo coinciden con Q${difference.toFixed(2)} mas de gasto medio en comida que los dias de trabajo mas corto. No significa que el trabajo lo cause, pero si es una senal util para planificar.`,
        evidence: [`Dias largos comparados: ${longWorkDates.length}.`, `Dias cortos comparados: ${shortWorkDates.length}.`],
        action: 'En dias largos, deja comida resuelta o separa un monto pequeno para que el cansancio no decida por ti.',
        priority: 'high',
        confidence: longWorkDates.length + shortWorkDates.length >= 20 ? 'medium' : 'low',
        sampleSize: longWorkDates.length + shortWorkDates.length,
        generatedAt,
      })
    }
  }

  if (lowEnergyLongWorkDates.length >= 3) {
    const affectedExpense = average(lowEnergyLongWorkDates.map((date) => mealExpenseByDate.get(date) ?? 0))
    insights.push({
      id: 'pattern-low-energy-long-work',
      area: 'general',
      title: 'Cansancio y jornada larga merecen vigilancia.',
      message: `Has tenido ${lowEnergyLongWorkDates.length} dias recientes con energia baja y trabajo largo. En esos dias el gasto medio en comida fue Q${affectedExpense.toFixed(2)}.`,
      evidence: lowEnergyLongWorkDates.slice(0, 3).map((date) => `${date}: ${workByDate.get(date) ?? 0} min de trabajo, energia ${energyByDate.get(date) ?? 'sin registro'}/5.`),
      action: 'Cuando registres energia baja, reduce decisiones: pausa breve, agua y comida definida antes de seguir trabajando.',
      priority: 'high',
      confidence: lowEnergyLongWorkDates.length >= 10 ? 'medium' : 'low',
      sampleSize: lowEnergyLongWorkDates.length,
      generatedAt,
    })
  }

  return insights
}
