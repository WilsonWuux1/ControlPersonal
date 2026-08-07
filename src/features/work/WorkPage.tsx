import { useMemo, useState } from 'react'
import {
  BarChart3,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Clock,
  // FolderKanban,
  ListTodo,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Square,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '../../components/Button'
import { QuickActionModal } from '../../components/QuickActionModal'
import { useAppStore } from '../../stores/appStore'
import { dailyEffectiveWorkMinutes } from '../../services/timeCalculations'
import { formatMinutes } from '../../utils/format'
import { todayIso } from '../../utils/date'
import {
  workFocusLabel,
  workFocusOptions,
} from '../../services/workFocus'

const colors = [
  '#2563eb',
  '#16a34a',
  '#f59e0b',
  '#7c3aed',
  '#dc2626',
  '#0891b2',
]

type WorkSection = 'organization' | 'analysis' | 'sessions' | null
type OrganizationView = 'projects' | 'tasks'
type AnalysisView = 'type' | 'time' | 'focus'

export function WorkPage() {
  const data = useAppStore((state) => state.data)
  const startTimer = useAppStore((state) => state.startTimer)
  const finishTimer = useAppStore((state) => state.finishTimer)
  const updateWorkSession = useAppStore(
    (state) => state.updateWorkSession,
  )
  const activeTimerId = useAppStore(
    (state) => state.activeTimerId,
  )
  const addProject = useAppStore((state) => state.addProject)
  const updateProject = useAppStore(
    (state) => state.updateProject,
  )
  const addTask = useAppStore((state) => state.addTask)
  const updateTask = useAppStore((state) => state.updateTask)

  const [quick, setQuick] = useState(false)
  const [openSection, setOpenSection] =
    useState<WorkSection>('analysis')
  const [organizationView, setOrganizationView] =
    useState<OrganizationView>('tasks')
  const [analysisView, setAnalysisView] =
    useState<AnalysisView>('time')
  const [projectName, setProjectName] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [finishResult, setFinishResult] = useState('')
  const [finishFocus, setFinishFocus] = useState(4)

  const today = todayIso()

  const metrics = useMemo(() => {
    if (!data) return null

    const todayMinutes = dailyEffectiveWorkMinutes(
      data.workSessions,
      today,
    )

    const finishedSessions = data.workSessions.filter(
      (session) => session.endedAt,
    )

    const total = finishedSessions.reduce(
      (sum, session) => sum + session.effectiveMinutes,
      0,
    )

    const totalBreaks = finishedSessions.reduce(
      (sum, session) => sum + session.breakMinutes,
      0,
    )

    const focusAverage = finishedSessions.length
      ? Number(
          (
            finishedSessions.reduce(
              (sum, session) =>
                sum + session.focusLevel,
              0,
            ) / finishedSessions.length
          ).toFixed(1),
        )
      : 0

    const productiveSessions = finishedSessions.filter(
      (session) =>
        session.effectiveMinutes > 0 &&
        session.focusLevel >= 4 &&
        session.result.trim(),
    ).length

    const productivityRate = finishedSessions.length
      ? Math.round(
          (productiveSessions /
            finishedSessions.length) *
            100,
        )
      : 0

    const byType = Object.entries(
      finishedSessions.reduce<Record<string, number>>(
        (acc, session) => {
          acc[session.type] =
            (acc[session.type] ?? 0) +
            session.effectiveMinutes

          return acc
        },
        {},
      ),
    ).map(([name, value]) => ({ name, value }))

    const byDay = Object.values(
      finishedSessions.reduce<
        Record<
          string,
          {
            date: string
            fullDate: string
            minutos: number
            pausas: number
            sesiones: number
            enfoqueTotal: number
            enfoque: number
          }
        >
      >((acc, session) => {
        const date = session.startedAt.slice(0, 10)

        acc[date] ??= {
          date: date.slice(5),
          fullDate: date,
          minutos: 0,
          pausas: 0,
          sesiones: 0,
          enfoqueTotal: 0,
          enfoque: 0,
        }

        acc[date].minutos += session.effectiveMinutes
        acc[date].pausas += session.breakMinutes
        acc[date].sesiones += 1
        acc[date].enfoqueTotal += session.focusLevel
        acc[date].enfoque = Number(
          (
            acc[date].enfoqueTotal /
            acc[date].sesiones
          ).toFixed(1),
        )

        return acc
      }, {}),
    )
      .toSorted((a, b) =>
        a.fullDate.localeCompare(b.fullDate),
      )
      .slice(-14)

    return {
      todayMinutes,
      total,
      totalBreaks,
      focusAverage,
      productiveSessions,
      productivityRate,
      byType,
      byDay,
    }
  }, [data, today])

  if (!data || !metrics) return null

  const activeSession =
    data.workSessions.find(
      (session) =>
        session.id === activeTimerId &&
        !session.endedAt,
    ) ??
    data.workSessions.find(
      (session) => !session.endedAt,
    )

  const recentSessions = data.workSessions
    .filter((session) => session.endedAt)
    .toSorted((a, b) =>
      b.startedAt.localeCompare(a.startedAt),
    )
    .slice(0, 6)

  const activeProjects = data.projects.filter(
    (project) => project.status === 'active',
  )

  const archivedProjects = data.projects.filter(
    (project) => project.status !== 'active',
  )

  const pendingTasks = data.tasks.filter(
    (task) => !task.completed,
  )

  const completedTasks = data.tasks.filter(
    (task) => task.completed,
  )

  const toggleSection = (
    section: Exclude<WorkSection, null>,
  ) => {
    setOpenSection((current) =>
      current === section ? null : section,
    )
  }

  const createProject = async () => {
    if (!projectName.trim()) return

    await addProject({
      name: projectName.trim(),
      status: 'active',
      color: '#2563eb',
    })

    setProjectName('')
  }

  const createTask = async () => {
    if (!taskTitle.trim()) return

    await addTask({
      title: taskTitle.trim(),
      completed: false,
      status: 'active',
    })

    setTaskTitle('')
  }

  const startWork = async () => {
    await startTimer({
      breakMinutes: 0,
      type: 'Trabajo profundo',
      result: '',
      focusLevel: 3,
      tags: [],
      startedAt: new Date().toISOString(),
      durationMinutes: 0,
      effectiveMinutes: 0,
    })
  }

  const finishWork = async () => {
    if (!activeSession) return

    await finishTimer(
      activeSession.id,
      finishResult.trim() || 'Sesión finalizada',
      finishFocus,
    )

    setFinishResult('')
    setFinishFocus(4)
  }

  return (
    <section className="page work-mobile-page">
      <header className="work-page-header">
        <div>
          <p>Tiempo efectivo y resultados</p>
          <h2>Trabajo</h2>
        </div>

        <Button
          variant="secondary"
          onClick={() => setQuick(true)}
          icon={<Plus size={17} aria-hidden="true" />}
        >
          Manual
        </Button>
      </header>

      <div
        className="work-summary-grid"
        aria-label="Resumen de trabajo"
      >
        <article
          className={`work-summary-card ${
            metrics.todayMinutes > 600
              ? 'tone-red'
              : 'tone-blue'
          }`}
        >
          <Clock size={17} aria-hidden="true" />
          <span>Hoy</span>
          <strong>
            {formatMinutes(metrics.todayMinutes)}
          </strong>
        </article>

        <article className="work-summary-card tone-violet">
          <Briefcase size={17} aria-hidden="true" />
          <span>Total</span>
          <strong>{formatMinutes(metrics.total)}</strong>
        </article>

        <article className="work-summary-card tone-green">
          <Play size={17} aria-hidden="true" />
          <span>Enfoque</span>
          <strong>{metrics.focusAverage}/5</strong>
        </article>

        <article className="work-summary-card tone-gold wide-left">
          <Pause size={17} aria-hidden="true" />
          <span>Pausas</span>
          <strong>
            {formatMinutes(metrics.totalBreaks)}
          </strong>
        </article>

        <article className="work-summary-card tone-slate wide-right">
          <Square size={17} aria-hidden="true" />
          <span>Productivas</span>
          <strong>
            {metrics.productivityRate}%
          </strong>
        </article>
      </div>

      <section className="work-collapse" >
        <button
          type="button"
          className="work-collapse__summary"
          aria-expanded={openSection === 'analysis'}
          onClick={() => toggleSection('analysis')}
        >
          <div>
            <strong>Análisis de trabajo</strong>
            <span>
              Distribución, tiempo, pausas y enfoque
            </span>
          </div>

          <div className="work-collapse__end">
            <BarChart3 size={17} aria-hidden="true" />

            <ChevronDown
              size={18}
              className={
                openSection === 'analysis'
                  ? 'is-open'
                  : undefined
              }
              aria-hidden="true"
            />
          </div>
        </button>

        {openSection === 'analysis' ? (
          <div className="work-collapse__body">
            <div
              className="work-tabs three"
              role="tablist"
              aria-label="Tipo de análisis"
            >
              <button
                type="button"
                className={
                  analysisView === 'type'
                    ? 'is-active'
                    : undefined
                }
                aria-selected={
                  analysisView === 'type'
                }
                onClick={() =>
                  setAnalysisView('type')
                }
              >
                Tipo
              </button>

              <button
                type="button"
                className={
                  analysisView === 'time'
                    ? 'is-active'
                    : undefined
                }
                aria-selected={
                  analysisView === 'time'
                }
                onClick={() =>
                  setAnalysisView('time')
                }
              >
                Tiempo
              </button>

              <button
                type="button"
                className={
                  analysisView === 'focus'
                    ? 'is-active'
                    : undefined
                }
                aria-selected={
                  analysisView === 'focus'
                }
                onClick={() =>
                  setAnalysisView('focus')
                }
              >
                Enfoque
              </button>
            </div>

            <div className="work-chart-box">
              {analysisView === 'type' ? (
                metrics.byType.length > 0 ? (
                  <ResponsiveContainer
                    width="100%"
                    height={220}
                  >
                    <PieChart>
                      <Pie
                        data={metrics.byType}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={76}
                        isAnimationActive={false}
                      >
                        {metrics.byType.map(
                          (entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={
                                colors[
                                  index % colors.length
                                ]
                              }
                            />
                          ),
                        )}
                      </Pie>

                      <Tooltip
                        formatter={(value) =>
                          formatMinutes(Number(value))
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="muted work-empty">
                    Finaliza una sesión para ver la
                    distribución del tiempo.
                  </p>
                )
              ) : analysisView === 'time' ? (
                metrics.byDay.length > 0 ? (
                  <ResponsiveContainer
                    width="100%"
                    height={220}
                  >
                    <BarChart
                      data={metrics.byDay}
                      margin={{
                        top: 8,
                        right: 8,
                        left: -18,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip
                        formatter={(value) =>
                          formatMinutes(Number(value))
                        }
                      />
                      <Bar
                        dataKey="minutos"
                        name="Efectivos"
                        fill="#2563eb"
                        radius={[5, 5, 0, 0]}
                        isAnimationActive={false}
                      />
                      <Bar
                        dataKey="pausas"
                        name="Pausas"
                        fill="#f59e0b"
                        radius={[5, 5, 0, 0]}
                        isAnimationActive={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="muted work-empty">
                    Aún no hay sesiones finalizadas.
                  </p>
                )
              ) : metrics.byDay.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height={220}
                >
                  <LineChart
                    data={metrics.byDay}
                    margin={{
                      top: 8,
                      right: 8,
                      left: -18,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      domain={[0, 5]}
                      ticks={[0, 1, 2, 3, 4, 5]}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="enfoque"
                      name="Enfoque"
                      stroke="#16a34a"
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="muted work-empty">
                  Aún no hay enfoque registrado.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </section>

      <section
        className={`work-timer-card${
          activeSession ? ' is-active' : ''
        }`}
      >
        <header className="work-timer-card__header">
          <div className="work-timer-card__identity">
            <span className="work-timer-card__icon">
              {activeSession ? (
                <Play size={18} aria-hidden="true" />
              ) : (
                <Clock size={18} aria-hidden="true" />
              )}
            </span>

            <div>
              <strong>
                {activeSession
                  ? 'Sesión activa'
                  : 'Temporizador'}
              </strong>

              <span>
                {activeSession
                  ? `${activeSession.type} · pausa ${activeSession.breakMinutes} min`
                  : 'Registra únicamente trabajo efectivo'}
              </span>
            </div>
          </div>

          {!activeSession ? (
            <Button
              onClick={() => void startWork()}
              icon={<Play size={17} aria-hidden="true" />}
            >
              Iniciar
            </Button>
          ) : null}
        </header>

        {activeSession ? (
          <div className="work-active-session">
            <div className="work-finish-fields">
              <label className="work-result-field">
                Resultado

                <input
                  value={finishResult}
                  onChange={(event) =>
                    setFinishResult(event.target.value)
                  }
                  placeholder="Qué quedó terminado"
                />
              </label>

              <label>
                Enfoque

                <select
                  value={finishFocus}
                  onChange={(event) =>
                    setFinishFocus(
                      Number(event.target.value),
                    )
                  }
                >
                  {workFocusOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="work-timer-actions">
              <Button
                variant="secondary"
                onClick={() =>
                  updateWorkSession({
                    ...activeSession,
                    breakMinutes:
                      activeSession.breakMinutes + 5,
                  })
                }
                icon={
                  <Pause
                    size={16}
                    aria-hidden="true"
                  />
                }
              >
                Pausa +5
              </Button>

              <Button
                onClick={() => void finishWork()}
                icon={
                  <Square
                    size={16}
                    aria-hidden="true"
                  />
                }
              >
                Finalizar
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="work-collapse">
        <button
          type="button"
          className="work-collapse__summary"
          aria-expanded={
            openSection === 'organization'
          }
          onClick={() =>
            toggleSection('organization')
          }
        >
          <div>
            <strong>Proyectos y tareas</strong>
            <span>
              {activeProjects.length} proyectos ·{' '}
              {pendingTasks.length} tareas pendientes
            </span>
          </div>

          <div className="work-collapse__end">
            <span className="work-count">
              {activeProjects.length +
                pendingTasks.length}
            </span>

            <ChevronDown
              size={18}
              className={
                openSection === 'organization'
                  ? 'is-open'
                  : undefined
              }
              aria-hidden="true"
            />
          </div>
        </button>

        {openSection === 'organization' ? (
          <div className="work-collapse__body">
            <div
              className="work-tabs"
              role="tablist"
              aria-label="Organización del trabajo"
            >
              <button
                type="button"
                className={
                  organizationView === 'tasks'
                    ? 'is-active'
                    : undefined
                }
                aria-selected={
                  organizationView === 'tasks'
                }
                onClick={() =>
                  setOrganizationView('tasks')
                }
              >
                Tareas ({pendingTasks.length})
              </button>

              <button
                type="button"
                className={
                  organizationView === 'projects'
                    ? 'is-active'
                    : undefined
                }
                aria-selected={
                  organizationView === 'projects'
                }
                onClick={() =>
                  setOrganizationView('projects')
                }
              >
                Proyectos ({activeProjects.length})
              </button>
            </div>

            {organizationView === 'tasks' ? (
              <>
                <div className="work-create-row">
                  <input
                    value={taskTitle}
                    onChange={(event) =>
                      setTaskTitle(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void createTask()
                      }
                    }}
                    placeholder="Nueva tarea"
                    aria-label="Nueva tarea"
                  />

                  <Button
                    onClick={() => void createTask()}
                    disabled={!taskTitle.trim()}
                  >
                    Crear
                  </Button>
                </div>

                <div className="work-item-list">
                  {pendingTasks.map((task) => (
                    <article
                      className="work-item-row"
                      key={task.id}
                    >
                      <span className="work-item-icon">
                        <ListTodo
                          size={16}
                          aria-hidden="true"
                        />
                      </span>

                      <div>
                        <strong>{task.title}</strong>
                        <span>Pendiente</span>
                      </div>

                      <button
                        type="button"
                        className="work-item-action"
                        aria-label={`Terminar ${task.title}`}
                        title="Marcar como terminada"
                        onClick={() =>
                          updateTask({
                            ...task,
                            completed: true,
                            status: 'archived',
                            archivedAt:
                              new Date().toISOString(),
                          })
                        }
                      >
                        <CheckCircle2
                          size={17}
                          aria-hidden="true"
                        />
                      </button>
                    </article>
                  ))}

                  {pendingTasks.length === 0 ? (
                    <p className="muted work-empty">
                      No hay tareas pendientes.
                    </p>
                  ) : null}
                </div>

                {completedTasks.length > 0 ? (
                  <details className="work-completed-group">
                    <summary>
                      Terminadas ({completedTasks.length})
                    </summary>

                    <div className="work-item-list">
                      {completedTasks.map((task) => (
                        <article
                          className="work-item-row is-complete"
                          key={task.id}
                        >
                          <span className="work-item-icon">
                            <CheckCircle2
                              size={16}
                              aria-hidden="true"
                            />
                          </span>

                          <div>
                            <strong>{task.title}</strong>
                            <span>Terminada</span>
                          </div>

                          <button
                            type="button"
                            className="work-item-action"
                            aria-label={`Reabrir ${task.title}`}
                            title="Reabrir"
                            onClick={() =>
                              updateTask({
                                ...task,
                                completed: false,
                                status: 'active',
                                archivedAt: undefined,
                              })
                            }
                          >
                            <RotateCcw
                              size={16}
                              aria-hidden="true"
                            />
                          </button>
                        </article>
                      ))}
                    </div>
                  </details>
                ) : null}
              </>
            ) : (
              <>
                <div className="work-create-row">
                  <input
                    value={projectName}
                    onChange={(event) =>
                      setProjectName(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void createProject()
                      }
                    }}
                    placeholder="Nuevo proyecto"
                    aria-label="Nuevo proyecto"
                  />

                  <Button
                    onClick={() => void createProject()}
                    disabled={!projectName.trim()}
                  >
                    Crear
                  </Button>
                </div>

                <div className="work-item-list">
                  {activeProjects.map((project) => (
                    <article
                      className="work-item-row"
                      key={project.id}
                    >
                      <span
                        className="work-project-dot"
                        style={{
                          background: project.color,
                        }}
                      />

                      <div>
                        <strong>{project.name}</strong>
                        <span>Activo</span>
                      </div>

                      <button
                        type="button"
                        className="work-item-action"
                        aria-label={`Terminar ${project.name}`}
                        title="Terminar proyecto"
                        onClick={() =>
                          updateProject({
                            ...project,
                            status: 'archived',
                            archivedAt:
                              new Date().toISOString(),
                          })
                        }
                      >
                        <CheckCircle2
                          size={17}
                          aria-hidden="true"
                        />
                      </button>
                    </article>
                  ))}

                  {activeProjects.length === 0 ? (
                    <p className="muted work-empty">
                      No hay proyectos activos.
                    </p>
                  ) : null}
                </div>

                {archivedProjects.length > 0 ? (
                  <details className="work-completed-group">
                    <summary>
                      Terminados ({archivedProjects.length})
                    </summary>

                    <div className="work-item-list">
                      {archivedProjects.map((project) => (
                        <article
                          className="work-item-row is-complete"
                          key={project.id}
                        >
                          <span
                            className="work-project-dot"
                            style={{
                              background:
                                project.color,
                            }}
                          />

                          <div>
                            <strong>
                              {project.name}
                            </strong>
                            <span>Terminado</span>
                          </div>

                          <button
                            type="button"
                            className="work-item-action"
                            aria-label={`Reabrir ${project.name}`}
                            title="Reabrir proyecto"
                            onClick={() =>
                              updateProject({
                                ...project,
                                status: 'active',
                                archivedAt: undefined,
                              })
                            }
                          >
                            <RotateCcw
                              size={16}
                              aria-hidden="true"
                            />
                          </button>
                        </article>
                      ))}
                    </div>
                  </details>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </section>


      <section className="work-collapse">
        <button
          type="button"
          className="work-collapse__summary"
          aria-expanded={openSection === 'sessions'}
          onClick={() => toggleSection('sessions')}
        >
          <div>
            <strong>Sesiones finalizadas</strong>
            <span>
              Resultado, duración y nivel de enfoque
            </span>
          </div>

          <div className="work-collapse__end">
            <span className="work-count">
              {recentSessions.length}
            </span>

            <ChevronDown
              size={18}
              className={
                openSection === 'sessions'
                  ? 'is-open'
                  : undefined
              }
              aria-hidden="true"
            />
          </div>
        </button>

        {openSection === 'sessions' ? (
          <div className="work-collapse__body">
            <div className="work-session-list">
              {recentSessions.map((session) => (
                <article
                  className="work-session-row"
                  key={session.id}
                >
                  <span className="work-session-icon">
                    <Briefcase
                      size={16}
                      aria-hidden="true"
                    />
                  </span>

                  <div>
                    <strong>
                      {session.result || session.type}
                    </strong>

                    <span>
                      {session.startedAt.slice(0, 10)} ·{' '}
                      {formatMinutes(
                        session.effectiveMinutes,
                      )}
                    </span>
                  </div>

                  <b>
                    {workFocusLabel(
                      session.focusLevel,
                    )}
                  </b>
                </article>
              ))}

              {recentSessions.length === 0 ? (
                <p className="muted work-empty">
                  Aún no hay sesiones finalizadas.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <QuickActionModal
        open={quick}
        onClose={() => setQuick(false)}
        initialTab="work"
      />
    </section>
  )
}