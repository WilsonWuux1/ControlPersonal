import { parseISO, subDays } from 'date-fns'
import type { AppData, Course } from '../../types/domain'
import type { PersonalInsight } from './insightTypes'

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0)
const average = (values: number[]): number => (values.length ? Number((sum(values) / values.length).toFixed(1)) : 0)
const priorityLabel = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Critica',
} as const
const activityStatusLabel = {
  pending: 'Pendiente',
  'in-progress': 'En progreso',
  completed: 'Completada',
} as const
const topicStatusLabel = {
  'not-started': 'Sin iniciar',
  learning: 'Aprendiendo',
  reviewing: 'Repasando',
  mastered: 'Dominado',
} as const

export const studyMinutesThisWeek = (data: Pick<AppData, 'studySessions'>, now = new Date()): number => {
  const start = subDays(now, 6)
  return sum(data.studySessions.filter((session) => parseISO(session.startedAt) >= start).map((session) => session.effectiveMinutes))
}

export const studyInsights = (data: Pick<AppData, 'courses' | 'courseActivities' | 'studySessions' | 'studyTopics'>, now = new Date()): PersonalInsight[] => {
  const insights: PersonalInsight[] = []
  const activeCourses = data.courses.filter((course) => course.status === 'active')
  const generatedAt = now.toISOString()
  const upcoming = data.courseActivities
    .filter((activity) => activity.status !== 'completed' && activity.dueDate)
    .sort((left, right) => String(left.dueDate).localeCompare(String(right.dueDate)))[0]

  if (activeCourses.length === 0) {
    insights.push({
      id: 'study-no-courses',
      area: 'study',
      title: 'Aun no hay cursos activos.',
      message: 'Agrega tu primer curso para que el sistema pueda comparar tiempo, actividades y temas por estudiar.',
      evidence: ['No hay cursos activos registrados.'],
      action: 'Crear curso',
      priority: 'medium',
      confidence: 'insufficient',
      generatedAt,
    })
    return insights
  }

  if (upcoming) {
    const course = data.courses.find((item): item is Course => item.id === upcoming.courseId)
    insights.push({
      id: `study-upcoming-${upcoming.id}`,
      area: 'study',
      title: `${upcoming.title} es la siguiente actividad academica.`,
      message: `${course?.name ?? 'Un curso'} tiene una actividad pendiente con fecha limite ${upcoming.dueDate}. Conviene decidir si tu proxima sesion debe avanzar eso antes de abrir contenido nuevo.`,
      evidence: [`Prioridad: ${priorityLabel[upcoming.priority]}.`, `Estado: ${activityStatusLabel[upcoming.status]}.`],
      action: 'Programar sesion de estudio',
      priority: upcoming.priority === 'critical' || upcoming.priority === 'high' ? 'high' : 'medium',
      confidence: 'medium',
      sampleSize: data.courseActivities.length,
      generatedAt,
    })
  }

  const weakTopic = data.studyTopics
    .filter((topic) => topic.status !== 'mastered')
    .sort((left, right) => right.importance + right.difficulty - left.importance - left.difficulty || left.currentMastery - right.currentMastery)[0]

  if (weakTopic) {
    insights.push({
      id: `study-topic-${weakTopic.id}`,
      area: 'study',
      title: `${weakTopic.name} necesita refuerzo.`,
      message: `El tema combina importancia ${weakTopic.importance}/5, dificultad ${weakTopic.difficulty}/5 y dominio actual ${weakTopic.currentMastery}/5.`,
      evidence: [`Estado actual: ${topicStatusLabel[weakTopic.status]}.`],
      action: 'Hacer una sesion corta de practica o repaso',
      priority: weakTopic.importance >= 4 ? 'high' : 'medium',
      confidence: data.studyTopics.length >= 3 ? 'medium' : 'low',
      sampleSize: data.studyTopics.length,
      generatedAt,
    })
  }

  const completedSessions = data.studySessions.filter((session) => session.endedAt)
  if (completedSessions.length >= 3) {
    const comprehension = average(completedSessions.map((session) => session.comprehension))
    insights.push({
      id: 'study-comprehension',
      area: 'study',
      title: 'Comprension academica registrada.',
      message: `Tu comprension media en sesiones terminadas es ${comprehension}/5. Usa este dato para elegir entre avanzar contenido o repasar.`,
      evidence: [`Sesiones terminadas: ${completedSessions.length}.`],
      priority: 'low',
      confidence: completedSessions.length >= 10 ? 'medium' : 'low',
      sampleSize: completedSessions.length,
      generatedAt,
    })
  }

  return insights
}
