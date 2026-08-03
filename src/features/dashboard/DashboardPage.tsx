import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Battery, CalendarDays, Check, Coins, Moon, Play, Quote, ShieldCheck, Sun } from 'lucide-react'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { StatCard } from '../../components/StatCard'
import { useAppStore } from '../../stores/appStore'
import { calculateFinancialSummary } from '../../services/financeCalculations'
import { calculateHabitDayScore, dayColor } from '../../services/habitScoring'
import { dailyEffectiveWorkMinutes } from '../../services/timeCalculations'
import { formatCurrency, formatMinutes, percent } from '../../utils/format'
import { friendlyDate, nowIso, todayIso } from '../../utils/date'
import type { MotivationLink } from '../../types/domain'

export function DashboardPage() {
  const data = useAppStore((state) => state.data)
  const addPriority = useAppStore((state) => state.addPriority)
  const updatePriority = useAppStore((state) => state.updatePriority)
  const updateDailyCheckIn = useAppStore((state) => state.updateDailyCheckIn)
  const addMoodEnergyLog = useAppStore((state) => state.addMoodEnergyLog)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const addSleepLog = useAppStore((state) => state.addSleepLog)
  const addToast = useAppStore((state) => state.addToast)
  const [priorityTitle, setPriorityTitle] = useState('')
  const [draftEnergy, setDraftEnergy] = useState(3)
  const [draftMood, setDraftMood] = useState(3)
  const [moodPrompt, setMoodPrompt] = useState<MotivationLink | null>(null)
  const [showMoodPrompt, setShowMoodPrompt] = useState(false)
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
  const motivationPool = data.motivationLinks.filter((item) => item.url && (item.favorite || !item.localNote))
  const suggestedMotivation = motivationPool.length > 0 ? motivationPool[new Date().getDate() % motivationPool.length] : undefined
  const lowState = (checkIn?.energy ?? draftEnergy) <= 2 || (checkIn?.mood ?? draftMood) <= 2
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
    if (draftEnergy <= 2 || draftMood <= 2) {
      setMoodPrompt(suggestedMotivation ?? null)
      setShowMoodPrompt(true)
      addToast({ title: 'Estado bajo registrado', detail: 'Te mostre una sugerencia para recuperar el dia.', tone: 'warning' })
    }
  }

  const startSleep = async () => {
    await updateSettings({ activeSleepStartedAt: nowIso() })
    addToast({ title: 'Hora de dormir guardada', tone: 'success' })
  }

  const wakeUp = async () => {
    if (!data.settings.activeSleepStartedAt) {
      addToast({ title: 'No hay hora de dormir activa', detail: 'Presiona primero Me voy a dormir.', tone: 'warning' })
      return
    }
    await addSleepLog({
      date: today,
      sleepAt: data.settings.activeSleepStartedAt,
      wakeAt: nowIso(),
      interruptions: 0,
      napMinutes: 0,
      durationHours: 0,
      quality: 3,
      wakeEnergy: draftEnergy,
      lateWork: false,
    })
    await updateSettings({ activeSleepStartedAt: undefined })
    addToast({ title: 'Sueno registrado', detail: 'Puedes ajustar detalles en Bienestar si lo necesitas.', tone: 'success' })
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
      </div>

      <section className="sleep-capture compact">
        <div>
          <strong>{data.settings.activeSleepStartedAt ? 'Descanso activo' : 'Registro de sueno'}</strong>
          <p>{data.settings.activeSleepStartedAt ? `Inicio: ${data.settings.activeSleepStartedAt.slice(11, 16)}` : 'Acciones rapidas para usar al dormir y al despertar.'}</p>
        </div>
        <div className="actions">
          <Button aria-label="Iniciar sueno desde Hoy" variant="secondary" onClick={startSleep} icon={<Moon size={18} />} disabled={Boolean(data.settings.activeSleepStartedAt)}>
            Me voy a dormir
          </Button>
          <Button aria-label="Finalizar sueno desde Hoy" onClick={wakeUp} icon={<Sun size={18} />} disabled={!data.settings.activeSleepStartedAt}>
            Desperte
          </Button>
        </div>
      </section>

      <section className="daily-focus-grid">
        {principle ? (
          <article className="daily-focus-card principle-focus">
            <div>
              <Quote size={20} />
              <strong>Frase del dia</strong>
            </div>
            <p>{principle.text}</p>
          </article>
        ) : null}
        {lowState && suggestedMotivation ? (
          <article className="daily-focus-card motivation-focus">
            <div>
              <Play size={20} />
              <strong>Animo bajo detectado</strong>
            </div>
            <p>{suggestedMotivation.title}</p>
            {suggestedMotivation.personalNote ? <span>{suggestedMotivation.personalNote}</span> : null}
            <a className="button button-primary" href={suggestedMotivation.url} target="_blank" rel="noreferrer">
              <Play size={18} />
              <span>Ver ahora</span>
            </a>
          </article>
        ) : null}
      </section>

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
          {workMinutes > 600 ? <p className="notice warning">Superaste 10 horas de trabajo efectivo. Registra el dato, pero revisa el exceso de jornada.</p> : null}
          <p className="muted">
            Sueño reciente:{' '}
            {data.sleepLogs[0] ? `${data.sleepLogs.sort((a, b) => b.date.localeCompare(a.date))[0].durationHours} h` : 'sin registros'}
          </p>
        </section>
      </div>
      <Modal title="Recuperar el dia" open={showMoodPrompt} onClose={() => setShowMoodPrompt(false)}>
        <div className="mood-prompt">
          <div className="mood-prompt-icon">
            <ShieldCheck size={28} />
          </div>
          <div>
            <strong>Tu estado esta bajo. Haz una pausa antes de seguir.</strong>
            <p>No tienes que resolver todo ahora. Elige una accion pequena, recupera algo de energia y vuelve con menos presion.</p>
          </div>
          {principle ? (
            <blockquote>{principle.text}</blockquote>
          ) : null}
          {moodPrompt?.url ? (
            <article className="mood-video-card">
              <span>Video sugerido</span>
              <strong>{moodPrompt.title}</strong>
              {moodPrompt.personalNote ? <p>{moodPrompt.personalNote}</p> : null}
              <a className="button button-primary" href={moodPrompt.url} target="_blank" rel="noreferrer">
                <Play size={18} />
                <span>Ver ahora</span>
              </a>
            </article>
          ) : (
            <div className="notice info">
              <p>Guarda videos o notas en Motivacion para que aparezca una recomendacion directa cuando tu animo o energia bajen.</p>
            </div>
          )}
          <div className="list compact">
            {data.settings.dayRescueActions.slice(0, 3).map((action) => (
              <div className="list-row" key={action}>
                <ShieldCheck size={18} />
                <span>{action}</span>
              </div>
            ))}
          </div>
          <div className="actions">
            <Button onClick={() => setShowMoodPrompt(false)}>Entendido</Button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
