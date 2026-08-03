import { useMemo, useState } from 'react'
import { Briefcase, Clock, Pause, Play, Plus, Square } from 'lucide-react'
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, BarChart, CartesianGrid, XAxis, YAxis, Bar, LineChart, Line } from 'recharts'
import { Button } from '../../components/Button'
import { StatCard } from '../../components/StatCard'
import { useAppStore } from '../../stores/appStore'
import { dailyEffectiveWorkMinutes } from '../../services/timeCalculations'
import { formatMinutes } from '../../utils/format'
import { todayIso } from '../../utils/date'
import { QuickActionModal } from '../../components/QuickActionModal'
import { workFocusLabel, workFocusOptions } from '../../services/workFocus'

const colors = ['#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#dc2626', '#0891b2']

export function WorkPage() {
  const data = useAppStore((state) => state.data)
  const startTimer = useAppStore((state) => state.startTimer)
  const finishTimer = useAppStore((state) => state.finishTimer)
  const updateWorkSession = useAppStore((state) => state.updateWorkSession)
  const activeTimerId = useAppStore((state) => state.activeTimerId)
  const addProject = useAppStore((state) => state.addProject)
  const updateProject = useAppStore((state) => state.updateProject)
  const addTask = useAppStore((state) => state.addTask)
  const updateTask = useAppStore((state) => state.updateTask)
  const [quick, setQuick] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [finishResult, setFinishResult] = useState('')
  const [finishFocus, setFinishFocus] = useState(4)
  const today = todayIso()

  const metrics = useMemo(() => {
    if (!data) return null
    const todayMinutes = dailyEffectiveWorkMinutes(data.workSessions, today)
    const finishedSessions = data.workSessions.filter((session) => session.endedAt)
    const total = finishedSessions.reduce((sum, session) => sum + session.effectiveMinutes, 0)
    const totalBreaks = finishedSessions.reduce((sum, session) => sum + session.breakMinutes, 0)
    const focusAverage = finishedSessions.length ? Number((finishedSessions.reduce((sum, session) => sum + session.focusLevel, 0) / finishedSessions.length).toFixed(1)) : 0
    const productiveSessions = finishedSessions.filter((session) => session.effectiveMinutes > 0 && session.focusLevel >= 4 && session.result.trim()).length
    const productivityRate = finishedSessions.length ? Math.round((productiveSessions / finishedSessions.length) * 100) : 0
    const byType = Object.entries(
      finishedSessions.reduce<Record<string, number>>((acc, session) => {
        acc[session.type] = (acc[session.type] ?? 0) + session.effectiveMinutes
        return acc
      }, {}),
    ).map(([name, value]) => ({ name, value }))
    const byDay = Object.values(
      finishedSessions.reduce<Record<string, { date: string; minutos: number; pausas: number; sesiones: number; enfoqueTotal: number; enfoque: number }>>((acc, session) => {
        const date = session.startedAt.slice(0, 10)
        acc[date] ??= { date: date.slice(5), minutos: 0, pausas: 0, sesiones: 0, enfoqueTotal: 0, enfoque: 0 }
        acc[date].minutos += session.effectiveMinutes
        acc[date].pausas += session.breakMinutes
        acc[date].sesiones += 1
        acc[date].enfoqueTotal += session.focusLevel
        acc[date].enfoque = Number((acc[date].enfoqueTotal / acc[date].sesiones).toFixed(1))
        return acc
      }, {}),
    ).slice(-14)
    return { todayMinutes, total, totalBreaks, focusAverage, productiveSessions, productivityRate, byType, byDay }
  }, [data, today])

  if (!data || !metrics) return null
  const activeSession = data.workSessions.find((session) => !session.endedAt) ?? (activeTimerId ? data.workSessions.find((session) => session.id === activeTimerId) : undefined)
  const recentSessions = data.workSessions
    .filter((session) => session.endedAt)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 6)

  return (
    <section className="page stack">
      <div className="stat-grid">
        <StatCard label="Tiempo efectivo hoy" value={formatMinutes(metrics.todayMinutes)} icon={<Clock />} tone={metrics.todayMinutes > 600 ? 'red' : 'blue'} />
        <StatCard label="Total registrado" value={formatMinutes(metrics.total)} icon={<Briefcase />} />
        <StatCard label="Enfoque promedio" value={`${metrics.focusAverage}/5`} icon={<Play />} tone="green" />
        <StatCard label="Pausas registradas" value={formatMinutes(metrics.totalBreaks)} icon={<Pause />} tone="gold" />
        <StatCard label="Sesiones productivas" value={`${metrics.productivityRate}%`} hint={`${metrics.productiveSessions} con resultado y enfoque alto`} icon={<Square />} tone="slate" />
      </div>

      <section className="panel">
        <div className="panel-header">
          <h2>Temporizador</h2>
          <Button variant="secondary" onClick={() => setQuick(true)} icon={<Plus size={18} />}>
            Registro manual
          </Button>
        </div>
        {activeSession ? (
          <div className="timer-box">
            <div>
              <strong>Sesion activa</strong>
              <span>
                {activeSession.type} - pausa acumulada {activeSession.breakMinutes} min
              </span>
            </div>
            <div className="timer-actions">
              <Button
                variant="secondary"
                onClick={() => updateWorkSession({ ...activeSession, breakMinutes: activeSession.breakMinutes + 5 })}
                icon={<Pause size={18} />}
              >
                Pausa +5 min
              </Button>
              <label>
                Resultado
                <input value={finishResult} onChange={(event) => setFinishResult(event.target.value)} placeholder="Que quedo terminado" />
              </label>
              <label>
                Enfoque
                <select value={finishFocus} onChange={(event) => setFinishFocus(Number(event.target.value))}>
                  {workFocusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                onClick={async () => {
                  await finishTimer(activeSession.id, finishResult.trim() || 'Sesion finalizada', finishFocus)
                  setFinishResult('')
                  setFinishFocus(4)
                }}
                icon={<Square size={18} />}
              >
                Finalizar actividad
              </Button>
            </div>
          </div>
        ) : (
          <div className="timer-box">
            <div>
              <strong>Listo para registrar trabajo efectivo</strong>
              <span>No se asume productividad por estar frente a la computadora.</span>
            </div>
            <Button
              onClick={() =>
                startTimer({
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
              icon={<Play size={18} />}
            >
              Iniciar
            </Button>
            <span className="muted">La pausa aparece cuando hay una sesion activa.</span>
          </div>
        )}
      </section>

      <div className="two-column">
        <section className="panel">
          <div className="panel-header">
            <h2>Proyectos y tareas</h2>
          </div>
          <div className="inline-form">
            <input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Nuevo proyecto" />
            <Button
              onClick={async () => {
                if (!projectName.trim()) return
                await addProject({ name: projectName.trim(), status: 'active', color: '#2563eb' })
                setProjectName('')
              }}
            >
              Crear
            </Button>
          </div>
          <div className="inline-form">
            <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Nueva tarea" />
            <Button
              onClick={async () => {
                if (!taskTitle.trim()) return
                await addTask({ title: taskTitle.trim(), completed: false, status: 'active' })
                setTaskTitle('')
              }}
            >
              Crear
            </Button>
          </div>
          <div className="list compact">
            {data.projects.map((project) => (
              <div className="list-row work-item-row" key={project.id}>
                <span className="dot" style={{ background: project.color }} />
                <span>{project.name}</span>
                <span className="status-pill">{project.status === 'active' ? 'Activo' : 'Terminado'}</span>
                <Button
                  variant="ghost"
                  onClick={() => updateProject({ ...project, status: project.status === 'active' ? 'archived' : 'active', archivedAt: project.status === 'active' ? new Date().toISOString() : undefined })}
                >
                  {project.status === 'active' ? 'Terminar' : 'Reabrir'}
                </Button>
              </div>
            ))}
            {data.tasks.map((task) => (
              <div className="list-row work-item-row" key={task.id}>
                <Briefcase size={16} />
                <span>{task.title}</span>
                <span className="status-pill">{task.completed ? 'Terminada' : 'Pendiente'}</span>
                <Button
                  variant="ghost"
                  onClick={() =>
                    updateTask({
                      ...task,
                      completed: !task.completed,
                      status: task.completed ? 'active' : 'archived',
                      archivedAt: task.completed ? undefined : new Date().toISOString(),
                    })
                  }
                >
                  {task.completed ? 'Reabrir' : 'Terminar'}
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Tiempo por tipo de trabajo</h2>
            <span>Minutos efectivos agrupados por categoria de sesion.</span>
          </div>
          {metrics.byType.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={metrics.byType} dataKey="value" nameKey="name" outerRadius={90}>
                  {metrics.byType.map((entry, index) => (
                    <Cell key={entry.name} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatMinutes(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="muted">Finaliza una sesion para ver en que tipo de trabajo se fue el tiempo.</p>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <h2>Tiempo, pausas y enfoque por dia</h2>
          <span>Usa sesiones finalizadas; las pausas se restan del tiempo efectivo.</span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={metrics.byDay}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => formatMinutes(Number(value))} />
            <Bar dataKey="minutos" fill="#2563eb" radius={[6, 6, 0, 0]} />
            <Bar dataKey="pausas" fill="#f59e0b" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>Enfoque registrado</h2>
          <span>Promedio diario de 1 a 5.</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={metrics.byDay}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 5]} />
            <Tooltip />
            <Line dataKey="enfoque" stroke="#16a34a" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>Sesiones finalizadas</h2>
          <span>Resultado y enfoque quedan guardados.</span>
        </div>
        <div className="mobile-card-list">
          {recentSessions.map((session) => (
            <article className="mobile-card" key={session.id}>
              <strong>{session.result || session.type}</strong>
              <span>
                {session.startedAt.slice(0, 10)} - {formatMinutes(session.effectiveMinutes)} efectivos - {workFocusLabel(session.focusLevel)}
              </span>
            </article>
          ))}
          {recentSessions.length === 0 ? <p className="muted">Aun no hay sesiones finalizadas.</p> : null}
        </div>
      </section>
      <QuickActionModal open={quick} onClose={() => setQuick(false)} initialTab="work" />
    </section>
  )
}
