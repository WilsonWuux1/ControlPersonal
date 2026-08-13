import type { AppData, AppNotification } from '../../types/domain'
import { todayIso } from '../../utils/date'
import type { PersonalInsight } from './insightTypes'
import { generateDailyEvaluation } from './evaluationEngine'

type NotificationDraft = Omit<AppNotification, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'>

const hasOpenNotification = (data: Pick<AppData, 'appNotifications'>, fingerprint: string): boolean =>
  data.appNotifications.some((notification) => notification.fingerprint === fingerprint && !notification.dismissedAt)

const fromInsight = (insight: PersonalInsight): NotificationDraft => ({
  type: insight.area === 'study' ? 'Estudio' : insight.area === 'finance' ? 'Finanzas' : 'Evaluaciones',
  title: insight.title,
  message: insight.action ? `${insight.message} Siguiente paso: ${insight.action}.` : insight.message,
  priority: insight.priority,
  actionRoute: insight.area === 'study' ? '/estudio' : insight.area === 'finance' ? '/finanzas' : '/progreso',
  fingerprint: `${todayIso()}-${insight.id}`,
})

export const generateInternalNotifications = (data: AppData, now = new Date()): NotificationDraft[] => {
  const preferences = data.settings.notificationPreferences
  if (preferences && !preferences.general) return []
  const evaluation = generateDailyEvaluation(data, now)
  const drafts = evaluation.insights
    .filter((insight) => insight.priority !== 'low')
    .map(fromInsight)
    .filter((notification) => !hasOpenNotification(data, notification.fingerprint))

  const today = todayIso()
  const pendingHabits = data.habits.filter(
    (habit) => habit.status === 'active' && !data.habitEntries.some((entry) => entry.habitId === habit.id && entry.date === today),
  )
  if ((!preferences || preferences.habits) && pendingHabits.length >= 3) {
    const easiest = [...pendingHabits].sort((left, right) => left.minimumValue - right.minimumValue)[0]
    const fingerprint = `${today}-pending-habits`
    if (!hasOpenNotification(data, fingerprint)) {
      drafts.unshift({
        type: 'Habitos',
        title: 'Todavia hay habitos sin registrar.',
        message: `Hay ${pendingHabits.length} habitos pendientes. Si tienes poco tiempo, empieza por ${easiest.name}: su minimo es ${easiest.minimumValue} ${easiest.unit}.`,
        actionRoute: '/habitos',
        priority: 'medium',
        fingerprint,
      })
    }
  }

  return drafts.slice(0, 3)
}
