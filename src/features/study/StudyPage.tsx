import { zodResolver } from '@hookform/resolvers/zod'
import { BookOpen, CheckCircle2, Clock, GraduationCap, ListChecks, Play, Plus, Square } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { StatCard } from '../../components/StatCard'
import { studyInsights, studyMinutesThisWeek } from '../../services/insights/studyInsightEngine'
import { useAppStore } from '../../stores/appStore'
import type { Course, CourseActivityPriority, CourseActivityType, StudySessionType, StudyTopicStatus } from '../../types/domain'
import { nowIso } from '../../utils/date'
import { formatMinutes } from '../../utils/format'

const courseSchema = z.object({
  name: z.string().trim().min(1, 'Nombre requerido').max(100),
  language: z.string().trim().max(40).optional(),
  targetWeeklyMinutes: z.coerce.number().min(0).max(10080).optional(),
})

const topicSchema = z.object({
  name: z.string().trim().min(1, 'Tema requerido').max(120),
  importance: z.coerce.number().min(1).max(5),
  currentMastery: z.coerce.number().min(1).max(5),
  difficulty: z.coerce.number().min(1).max(5),
})

const activitySchema = z.object({
  title: z.string().trim().min(1, 'Actividad requerida').max(140),
  type: z.enum(['assignment', 'exam', 'quiz', 'project', 'reading', 'presentation', 'practice', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  dueDate: z.string().optional(),
  estimatedMinutes: z.coerce.number().min(0).max(10080).optional(),
})

const sessionSchema = z.object({
  durationMinutes: z.coerce.number().min(1).max(1440),
  type: z.enum(['class', 'reading', 'practice', 'review', 'assignment', 'project', 'language', 'other']),
  focusLevel: z.coerce.number().min(1).max(5),
  difficulty: z.coerce.number().min(1).max(5),
  comprehension: z.coerce.number().min(1).max(5),
  struggledWith: z.string().trim().max(400).optional(),
  nextReview: z.string().trim().max(400).optional(),
})

type CourseFormInput = z.input<typeof courseSchema>
type TopicFormInput = z.input<typeof topicSchema>
type ActivityFormInput = z.input<typeof activitySchema>
type SessionFormInput = z.input<typeof sessionSchema>
type CourseForm = z.output<typeof courseSchema>
type TopicForm = z.output<typeof topicSchema>
type ActivityForm = z.output<typeof activitySchema>
type SessionForm = z.output<typeof sessionSchema>

const colors = ['#2563eb', '#16a34a', '#7c3aed', '#ea580c', '#0891b2', '#db2777']

export function StudyPage() {
  const data = useAppStore((state) => state.data)
  const addCourse = useAppStore((state) => state.addCourse)
  const addStudyTopic = useAppStore((state) => state.addStudyTopic)
  const addCourseActivity = useAppStore((state) => state.addCourseActivity)
  const updateCourseActivity = useAppStore((state) => state.updateCourseActivity)
  const addStudySession = useAppStore((state) => state.addStudySession)
  const startStudySession = useAppStore((state) => state.startStudySession)
  const finishStudySession = useAppStore((state) => state.finishStudySession)
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>(data?.courses.find((course) => course.status === 'active')?.id)

  const courseForm = useForm<CourseFormInput, unknown, CourseForm>({ resolver: zodResolver(courseSchema), defaultValues: { name: '', language: '', targetWeeklyMinutes: 240 } })
  const topicForm = useForm<TopicFormInput, unknown, TopicForm>({ resolver: zodResolver(topicSchema), defaultValues: { name: '', importance: 3, currentMastery: 2, difficulty: 3 } })
  const activityForm = useForm<ActivityFormInput, unknown, ActivityForm>({ resolver: zodResolver(activitySchema), defaultValues: { title: '', type: 'assignment', priority: 'medium', dueDate: '', estimatedMinutes: 60 } })
  const sessionForm = useForm<SessionFormInput, unknown, SessionForm>({ resolver: zodResolver(sessionSchema), defaultValues: { durationMinutes: 25, type: 'practice', focusLevel: 3, difficulty: 3, comprehension: 3, struggledWith: '', nextReview: '' } })

  const courses = data?.courses.filter((course) => course.status === 'active') ?? []
  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? courses[0]
  const courseTopics = selectedCourse ? data?.studyTopics.filter((topic) => topic.courseId === selectedCourse.id) ?? [] : []
  const courseActivities = selectedCourse ? data?.courseActivities.filter((activity) => activity.courseId === selectedCourse.id) ?? [] : []
  const activeSession = data?.studySessions.find((session) => !session.endedAt)
  const weeklyMinutes = data ? studyMinutesThisWeek(data) : 0
  const insights = useMemo(() => (data ? studyInsights(data) : []), [data])
  const completedSessions = data?.studySessions.filter((session) => session.endedAt) ?? []
  const averageComprehension = completedSessions.length
    ? completedSessions.reduce((total, session) => total + session.comprehension, 0) / completedSessions.length
    : 0

  if (!data) return null

  const createCourse = async (values: CourseForm) => {
    const course: Omit<Course, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'> = {
      name: values.name,
      language: values.language || undefined,
      targetWeeklyMinutes: values.targetWeeklyMinutes ?? 0,
      color: colors[courses.length % colors.length],
      status: 'active',
    }
    await addCourse(course)
    courseForm.reset({ name: '', language: '', targetWeeklyMinutes: 240 })
  }

  const createTopic = async (values: TopicForm) => {
    if (!selectedCourse) return
    await addStudyTopic({
      courseId: selectedCourse.id,
      name: values.name,
      importance: values.importance,
      currentMastery: values.currentMastery,
      difficulty: values.difficulty,
      status: values.currentMastery >= 4 ? 'reviewing' : 'learning',
    })
    topicForm.reset({ name: '', importance: 3, currentMastery: 2, difficulty: 3 })
  }

  const createActivity = async (values: ActivityForm) => {
    if (!selectedCourse) return
    await addCourseActivity({
      courseId: selectedCourse.id,
      topicIds: [],
      title: values.title,
      type: values.type as CourseActivityType,
      priority: values.priority as CourseActivityPriority,
      dueDate: values.dueDate || undefined,
      estimatedMinutes: values.estimatedMinutes ?? 0,
      status: 'pending',
    })
    activityForm.reset({ title: '', type: 'assignment', priority: 'medium', dueDate: '', estimatedMinutes: 60 })
  }

  const createSession = async (values: SessionForm) => {
    if (!selectedCourse) return
    const startedAt = nowIso()
    await addStudySession({
      courseId: selectedCourse.id,
      topicIds: [],
      startedAt,
      endedAt: startedAt,
      durationMinutes: values.durationMinutes,
      breakMinutes: 0,
      effectiveMinutes: values.durationMinutes,
      type: values.type as StudySessionType,
      focusLevel: values.focusLevel,
      difficulty: values.difficulty,
      comprehension: values.comprehension,
      struggledWith: values.struggledWith || undefined,
      nextReview: values.nextReview || undefined,
    })
    sessionForm.reset({ durationMinutes: 25, type: 'practice', focusLevel: 3, difficulty: 3, comprehension: 3, struggledWith: '', nextReview: '' })
  }

  const quickStart = async () => {
    if (!selectedCourse) return
    await startStudySession({
      courseId: selectedCourse.id,
      topicIds: [],
      startedAt: nowIso(),
      durationMinutes: 0,
      breakMinutes: 0,
      effectiveMinutes: 0,
      type: 'practice',
      focusLevel: 3,
      difficulty: 3,
      comprehension: 3,
    })
  }

  const quickFinish = async () => {
    if (!activeSession) return
    await finishStudySession(activeSession.id, {
      focusLevel: 3,
      difficulty: 3,
      comprehension: 3,
      result: 'Sesion finalizada',
    })
  }

  return (
    <div className="study-page stack">
      <section className="stat-grid">
        <StatCard label="Estudio semana" value={formatMinutes(weeklyMinutes)} icon={<Clock />} tone="blue" />
        <StatCard label="Cursos activos" value={String(courses.length)} icon={<GraduationCap />} tone="green" />
        <StatCard label="Actividades pendientes" value={String(data.courseActivities.filter((activity) => activity.status !== 'completed').length)} icon={<ListChecks />} tone="gold" />
        <StatCard label="Comprension media" value={averageComprehension ? `${averageComprehension.toFixed(1)}/5` : 'sin datos'} icon={<BookOpen />} tone="slate" />
      </section>

      <section className="panel study-hero">
        <div>
          <h2>Estudio</h2>
          <p>Registra cursos, temas, actividades y sesiones. El sistema usa esos datos para recomendar el siguiente paso academico con evidencia.</p>
        </div>
        <div className="study-timer-actions">
          {activeSession ? (
            <Button icon={<Square size={18} />} onClick={() => void quickFinish()}>
              Finalizar sesion
            </Button>
          ) : (
            <Button icon={<Play size={18} />} onClick={() => void quickStart()} disabled={!selectedCourse}>
              Iniciar sesion
            </Button>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Cursos</h2>
          <span>{selectedCourse ? `Seleccionado: ${selectedCourse.name}` : 'Crea un curso para empezar'}</span>
        </div>
        <form className="form-grid three" onSubmit={(event) => void courseForm.handleSubmit(createCourse)(event)}>
          <label>
            Nombre
            <input {...courseForm.register('name')} placeholder="Ej. Ingles, Universidad, Certificacion" />
          </label>
          <label>
            Idioma
            <input {...courseForm.register('language')} placeholder="Opcional" />
          </label>
          <label>
            Meta semanal min
            <input type="number" {...courseForm.register('targetWeeklyMinutes')} />
          </label>
          <Button type="submit" icon={<Plus size={18} />}>Crear curso</Button>
        </form>
        {courses.length > 0 ? (
          <div className="study-course-list">
            {courses.map((course) => (
              <button key={course.id} type="button" className={course.id === selectedCourse?.id ? 'active' : undefined} onClick={() => setSelectedCourseId(course.id)}>
                <span style={{ background: course.color }} />
                {course.name}
              </button>
            ))}
          </div>
        ) : (
          <EmptyState title="Sin cursos" description="Agrega cursos de universidad, idiomas, certificaciones o estudio autodidacta." />
        )}
      </section>

      {selectedCourse ? (
        <section className="study-grid">
          <article className="panel">
            <div className="panel-header">
              <h2>Temas</h2>
              <span>Fortalezas y refuerzos</span>
            </div>
            <form className="form-stack" onSubmit={(event) => void topicForm.handleSubmit(createTopic)(event)}>
              <label>
                Tema
                <input {...topicForm.register('name')} placeholder="Ej. Listening, estadistica inferencial" />
              </label>
              <div className="form-grid three">
                <label>Importancia<input type="number" {...topicForm.register('importance')} /></label>
                <label>Dominio<input type="number" {...topicForm.register('currentMastery')} /></label>
                <label>Dificultad<input type="number" {...topicForm.register('difficulty')} /></label>
              </div>
              <Button type="submit" icon={<Plus size={18} />}>Agregar tema</Button>
            </form>
            <div className="study-list">
              {courseTopics.map((topic) => (
                <div key={topic.id} className="study-row">
                  <strong>{topic.name}</strong>
                  <span>Dominio {topic.currentMastery}/5 · dificultad {topic.difficulty}/5 · {topic.status as StudyTopicStatus}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <h2>Actividades</h2>
              <span>Fechas y carga</span>
            </div>
            <form className="form-stack" onSubmit={(event) => void activityForm.handleSubmit(createActivity)(event)}>
              <label>
                Actividad
                <input {...activityForm.register('title')} placeholder="Ej. Examen, tarea, lectura" />
              </label>
              <div className="form-grid two">
                <label>Tipo<select {...activityForm.register('type')}><option value="assignment">Tarea</option><option value="exam">Examen</option><option value="reading">Lectura</option><option value="practice">Practica</option><option value="project">Proyecto</option><option value="other">Otro</option></select></label>
                <label>Prioridad<select {...activityForm.register('priority')}><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option><option value="critical">Critica</option></select></label>
                <label>Vence<input type="date" {...activityForm.register('dueDate')} /></label>
                <label>Estimado min<input type="number" {...activityForm.register('estimatedMinutes')} /></label>
              </div>
              <Button type="submit" icon={<Plus size={18} />}>Agregar actividad</Button>
            </form>
            <div className="study-list">
              {courseActivities.map((activity) => (
                <div key={activity.id} className="study-row">
                  <div>
                    <strong>{activity.title}</strong>
                    <span>{activity.priority} · {activity.dueDate ?? 'sin fecha'} · {activity.status}</span>
                  </div>
                  {activity.status !== 'completed' ? (
                    <Button variant="secondary" icon={<CheckCircle2 size={16} />} onClick={() => void updateCourseActivity({ ...activity, status: 'completed' })}>
                      Completar
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <h2>Registro rapido</h2>
              <span>Sesion terminada</span>
            </div>
            <form className="form-stack" onSubmit={(event) => void sessionForm.handleSubmit(createSession)(event)}>
              <div className="form-grid two">
                <label>Minutos<input type="number" {...sessionForm.register('durationMinutes')} /></label>
                <label>Tipo<select {...sessionForm.register('type')}><option value="practice">Practica</option><option value="reading">Lectura</option><option value="review">Repaso</option><option value="assignment">Tarea</option><option value="language">Idioma</option><option value="other">Otro</option></select></label>
                <label>Enfoque<input type="number" {...sessionForm.register('focusLevel')} /></label>
                <label>Dificultad<input type="number" {...sessionForm.register('difficulty')} /></label>
                <label>Comprension<input type="number" {...sessionForm.register('comprehension')} /></label>
              </div>
              <label>Que costo<input {...sessionForm.register('struggledWith')} placeholder="Opcional" /></label>
              <label>Que repasar<input {...sessionForm.register('nextReview')} placeholder="Opcional" /></label>
              <Button type="submit" icon={<Plus size={18} />}>Guardar sesion</Button>
            </form>
          </article>

          <article className="panel">
            <div className="panel-header">
              <h2>Lectura academica</h2>
              <span>No genera conclusiones sin datos</span>
            </div>
            <div className="insight-list">
              {insights.map((insight) => (
                <div key={insight.id} className="insight-card">
                  <strong>{insight.title}</strong>
                  <p>{insight.message}</p>
                  <small>{insight.evidence.join(' ')}</small>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}
    </div>
  )
}
