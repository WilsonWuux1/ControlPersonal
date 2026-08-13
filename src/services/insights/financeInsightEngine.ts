import { getDay, parseISO, subDays } from 'date-fns'
import type { AppData } from '../../types/domain'
import type { PersonalInsight } from './insightTypes'
import { confidenceFromSample, median } from './baselineEngine'

const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

export const financeInsights = (data: Pick<AppData, 'movements' | 'budgets' | 'obligations' | 'funds'>, now = new Date()): PersonalInsight[] => {
  const generatedAt = now.toISOString()
  const last30 = data.movements.filter((movement) => parseISO(movement.dateTime) >= subDays(now, 29))
  const expenses = last30.filter((movement) => movement.type === 'Gasto')
  const insights: PersonalInsight[] = []

  if (expenses.length >= 5) {
    const byDay = new Map<number, number[]>()
    for (const expense of expenses) {
      const day = getDay(parseISO(expense.dateTime))
      byDay.set(day, [...(byDay.get(day) ?? []), expense.amount])
    }
    const strongest = [...byDay.entries()]
      .map(([day, values]) => ({ day, total: values.reduce((sum, value) => sum + value, 0), median: median(values), count: values.length }))
      .sort((left, right) => right.total - left.total)[0]
    insights.push({
      id: 'finance-weekday-expense',
      area: 'finance',
      title: `Tus gastos recientes se concentran mas en ${dayNames[strongest.day]}.`,
      message: `En los ultimos 30 dias ese dia acumulo Q${strongest.total.toFixed(2)} en gastos registrados. La mediana de esos movimientos es Q${strongest.median.toFixed(2)}.`,
      evidence: [`Movimientos de gasto analizados: ${expenses.length}.`, `Registros ese dia: ${strongest.count}.`],
      action: 'Revisar si ese dia conviene separar un monto antes de gastar',
      priority: 'medium',
      confidence: confidenceFromSample(expenses.length),
      sampleSize: expenses.length,
      generatedAt,
    })
  }

  const pendingObligations = data.obligations.filter((obligation) => obligation.status !== 'Pagada' && obligation.status !== 'Cancelada')
  const uncovered = pendingObligations.filter((obligation) => obligation.allocatedAmount < obligation.estimatedAmount - obligation.paidAmount)
  if (uncovered.length > 0) {
    insights.push({
      id: 'finance-uncovered-obligations',
      area: 'finance',
      title: 'Hay obligaciones que aun no estan totalmente cubiertas.',
      message: `${uncovered.length} obligacion(es) tienen monto pendiente por apartar o pagar. Esto ayuda a que el dinero libre no parezca mayor de lo que realmente es.`,
      evidence: uncovered.slice(0, 3).map((obligation) => `${obligation.name}: Q${Math.max(0, obligation.estimatedAmount - obligation.paidAmount - obligation.allocatedAmount).toFixed(2)} pendientes.`),
      action: 'Apartar o registrar pago de la obligacion mas cercana',
      priority: 'high',
      confidence: 'high',
      sampleSize: pendingObligations.length,
      generatedAt,
    })
  }

  return insights
}
