import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Battery, CalendarDays, Check, Coins, Plus, ShieldCheck } from 'lucide-react'
import { Button } from '../../components/Button'
import { QuickActionModal } from '../../components/QuickActionModal'
import { StatCard } from '../../components/StatCard'
import { useAppStore } from '../../stores/appStore'
import { calculateFinancialSummary } from '../../services/financeCalculations'
import { calculateHabitDayScore, dayColor } from '../../services/habitScoring'
import { dailyEffectiveWorkMinutes } from '../../services/timeCalculations'
import { formatCurrency, formatMinutes, percent } from '../../utils/format'
import { friendlyDate, nowIso, todayIso } from '../../utils/date'

export function DashboardPage() {
  const data = useAppStore((state) => state.data)
  const addPriority = useAppStore((state) => state.addPriority)
  const updatePriority = useAppStore((state) => state.updatePriority)
  const updateDailyCheckIn = useAppStore((state) => state.updateDailyCheckIn)
  const addMoodEnergyLog = useAppStore((state) => state.addMoodEnergyLog)
  const [quick, setQuick] = useState(false)
  const [priorityTitle, setPriorityTitle] = useState('')
  const [draftEnergy, setDraftEnergy] = useState(3)
  const [draftMood, setDraftMood] = useState(3)
  const today = todayIso()

  const summary = useMemo(
    () => (data ? calculateFinancialSummary(data.accounts, data.movements, data.funds, data.debts, data.obligations) : null),
    [data],
  )
  const habitScore = useMemo(
    () => (data ? calculateHabitDayScore(data.habits, data.habitEntries, today, data.settings.habitScoreWeights) : null),
    [data, today],
  )

  if (!data || !summary || !habitScore) return null
  const checkIn = data.dailyCheckIns.find((item) => item.date === today)
  const priorities = data.priorities.filter((priority) => priority.date === today && !priority.generalBacklog).sort((a, b) => a.order - b.order).slice(0, 3)
  const nextObligation = data.obligations
    .filter((obligation) => obligation.status !== 'Pagada' && obligation.status !== 'Cancelada')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
  const lastMeal = data.mealLogs.sort((a, b) => b.dateTime.localeCompare(a.dateTime))[0]
  const principle = data.principles.filter((item) => item.status === 'active')[new Date().getDate() % Math.max(1, data.principles.length)]
  const workMinutes = dailyEffectiveWorkMinutes(data.workSessions, today)
  const recovered = checkIn?.rescueCompleted ?? false
  const color = dayColor(habitScore.score, habitScore.possible, recovered)

  useEffect(() => {
    setDraftEnergy(checkIn?.energy ?? 3)
    setDraftMood(checkIn?.mood ?? 3)
  }, [checkIn?.energy, checkIn?.mood])

  const createPriority = async () => {
    if (!priorityTitle.trim()) return
    await addPriority({ date: today, title: priorityTitle.trim(), order: priorities.length + 1, completed: false, generalBacklog: false })
    setPriorityTitle('')
  }

  const saveState = async () => {
    await updateDailyCheckIn({
      date: today,
      energy: draftEnergy,
      mood: draftMood,
      dayRescueActive: checkIn?.dayRescueActive ?? false,
      rescueCompleted: checkIn?.rescueCompleted ?? false,
    })
    await addMoodEnergyLog({ date: today, dateTime: nowIso(), energy: draftEnergy, mood: draftMood, source: 'dashboard' })
  }

  return (
    <section className="page stack">
      <div className="hero-band">
        <div>
          <p>{friendlyDate(today)}</p>
          <h2>{data.settings.userName ? `Hola, ${data.settings.userName}` : 'Hoy'}</h2>
          <span>
            Datos en IndexedDB local. Ultimo respaldo:{' '}
            {data.settings.lastBackupAt ? friendlyDate(data.settings.lastBackupAt) : 'sin respaldo registrado'}.
          </span>
        </div>
        <Button onClick={() => setQuick(true)} icon={<Plus size={18} />}>
          Accion rapida
        </Button>
      </div>

      <div className="stat-grid">
        <StatCard label="Energia" value={`${checkIn?.energy ?? 3}/5`} icon={<Battery />} hint="Editable abajo" />
        <StatCard label="Animo" value={`${checkIn?.mood ?? 3}/5`} icon={<ShieldCheck />} />
        <StatCard label="Trabajo efectivo" value={formatMinutes(workMinutes)} icon={<CalendarDays />} tone={workMinutes > 600 ? 'red' : 'green'} />
        <StatCard label="Dinero libre" value={formatCurrency(summary.freeMoney, data.settings.currency)} icon={<Coins />} tone="gold" />
        <StatCard label="Dinero apartado" value={formatCurrency(summary.allocated, data.settings.currency)} icon={<ArrowDown />} tone="slate" />
        <StatCard label="Progreso de habitos" value={percent(habitScore.possible ? habitScore.score / habitScore.possible : 0)} hint={`Color del dia: ${color}`} icon={<ArrowUp />} />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Tres prioridades</h2>
            <span>{priorities.filter((item) => item.completed).length}/3 completas</span>
          </div>
          <div className="inline-form">
            <input value={priorityTitle} onChange={(event) => setPriorityTitle(event.target.value)} placeholder="Crear prioridad" />
            <Button onClick={createPriority}>Agregar</Button>
          </div>
          <div className="list">
            {priorities.map((priority) => (
              <article key={priority.id} className="list-row">
                <button
                  type="button"
                  className={priority.completed ? 'check active' : 'check'}
                  aria-label="Marcar prioridad"
                  onClick={() => updatePriority({ ...priority, completed: !priority.completed })}
                >
                  <Check size={16} />
                </button>
                <input value={priority.title} onChange={(event) => updatePriority({ ...priority, title: event.target.value })} />
                <Button variant="ghost" onClick={() => updatePriority({ ...priority, date: today, generalBacklog: true })}>
                  Pendiente
                </Button>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Salvar el dia</h2>
            <span>{checkIn?.rescueCompleted ? 'Dia recuperado' : 'Disponible'}</span>
          </div>
          <p className="muted">Para dias de cansancio: tres acciones minimas configurables.</p>
          <div className="list compact">
            {data.settings.dayRescueActions.map((action) => (
              <div className="list-row" key={action}>
                <ShieldCheck size={18} />
                <span>{action}</span>
              </div>
            ))}
          </div>
          <Button
            onClick={() =>
              updateDailyCheckIn({
                date: today,
                energy: checkIn?.energy ?? 3,
                mood: checkIn?.mood ?? 3,
                dayRescueActive: true,
                rescueCompleted: true,
              })
            }
          >
            Marcar dia recuperado
          </Button>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Estado del dia</h2>
          </div>
          <div className="form-grid two">
            <label>
              Energia: {draftEnergy}/5
              <input
                type="range"
                min="1"
                max="5"
                value={draftEnergy}
                onChange={(event) => setDraftEnergy(Number(event.target.value))}
              />
            </label>
            <label>
              Animo: {draftMood}/5
              <input
                type="range"
                min="1"
                max="5"
                value={draftMood}
                onChange={(event) => setDraftMood(Number(event.target.value))}
              />
            </label>
          </div>
          <div className="actions">
            <Button onClick={saveState}>Guardar estado</Button>
            <span className="muted">Mover los controles no registra historial hasta guardar.</span>
          </div>
          <p>Ultima comida: {lastMeal ? `${lastMeal.mealType} - ${lastMeal.description}` : 'sin registros'}</p>
          <p>Proxima obligacion: {nextObligation ? `${nextObligation.name} (${friendlyDate(nextObligation.dueDate)})` : 'sin obligaciones pendientes'}</p>
          <p>Principio del dia: {principle?.text}</p>
          {workMinutes > 600 ? <p className="notice warning">Superaste 10 horas de trabajo efectivo. Registra el dato, pero revisa el exceso de jornada.</p> : null}
          <p className="muted">
            Sueño reciente:{' '}
            {data.sleepLogs[0] ? `${data.sleepLogs.sort((a, b) => b.date.localeCompare(a.date))[0].durationHours} h` : 'sin registros'}
          </p>
        </section>
      </div>
      <QuickActionModal open={quick} onClose={() => setQuick(false)} />
    </section>
  )
}
