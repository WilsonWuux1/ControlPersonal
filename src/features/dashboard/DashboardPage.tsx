import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Battery,
  CalendarDays,
  Check,
  Coins,
  Moon,
  Play,
  Quote,
  ShieldCheck,
  Sun,
} from 'lucide-react'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { useAppStore } from '../../stores/appStore'
import { calculateFinancialSummary } from '../../services/financeCalculations'
import {
  calculateHabitDayScore,
  // dayColor,
} from '../../services/habitScoring'
import { dailyEffectiveWorkMinutes } from '../../services/timeCalculations'
import { generateDailyEvaluation } from '../../services/insights/evaluationEngine'
import {
  formatCurrency,
  formatMinutes,
  percent,
} from '../../utils/format'
import {
  friendlyDate,
  nowIso,
  todayIso,
} from '../../utils/date'
import type { MotivationLink } from '../../types/domain'

export function DashboardPage() {
  const data = useAppStore((state) => state.data)
  const addPriority = useAppStore((state) => state.addPriority)
  const updatePriority = useAppStore(
    (state) => state.updatePriority,
  )
  const updateDailyCheckIn = useAppStore(
    (state) => state.updateDailyCheckIn,
  )
  const addMoodEnergyLog = useAppStore(
    (state) => state.addMoodEnergyLog,
  )
  const updateSettings = useAppStore(
    (state) => state.updateSettings,
  )
  const addSleepLog = useAppStore(
    (state) => state.addSleepLog,
  )
  const addToast = useAppStore((state) => state.addToast)

  const [priorityTitle, setPriorityTitle] = useState('')
  const [draftEnergy, setDraftEnergy] = useState(3)
  const [draftMood, setDraftMood] = useState(3)
  const [moodPrompt, setMoodPrompt] =
    useState<MotivationLink | null>(null)
  const [showMoodPrompt, setShowMoodPrompt] =
    useState(false)

  const today = todayIso()

  const summary = useMemo(
    () =>
      data
        ? calculateFinancialSummary(
            data.accounts,
            data.movements,
            data.funds,
            data.debts,
            data.obligations,
          )
        : null,
    [data],
  )

  const habitScore = useMemo(
    () =>
      data
        ? calculateHabitDayScore(
            data.habits,
            data.habitEntries,
            today,
            data.settings.habitScoreWeights,
          )
        : null,
    [data, today],
  )

  const dailyEvaluation = useMemo(
    () => (data ? generateDailyEvaluation(data) : null),
    [data],
  )

  /*
   * Este valor puede calcularse antes del retorno porque
   * usa encadenamiento opcional.
   */
  const checkIn = data?.dailyCheckIns.find(
    (item) => item.date === today,
  )

  /*
   * Todos los hooks deben ejecutarse antes de cualquier
   * retorno condicional.
   */
  useEffect(() => {
    setDraftEnergy(checkIn?.energy ?? 3)
    setDraftMood(checkIn?.mood ?? 3)
  }, [checkIn?.energy, checkIn?.mood])

  if (!data || !summary || !habitScore || !dailyEvaluation) return null

  const priorities = data.priorities
    .filter(
      (priority) =>
        priority.date === today &&
        !priority.generalBacklog,
    )
    .toSorted((a, b) => a.order - b.order)
    .slice(0, 3)

  // const nextObligation = data.obligations
  //   .filter(
  //     (obligation) =>
  //       obligation.status !== 'Pagada' &&
  //       obligation.status !== 'Cancelada',
  //   )
  //   .toSorted((a, b) =>
  //     a.dueDate.localeCompare(b.dueDate),
  //   )[0]

  /*
   * toSorted evita modificar directamente los arrays
   * almacenados en Zustand.
   */
  const lastMeal = data.mealLogs
    .toSorted((a, b) =>
      b.dateTime.localeCompare(a.dateTime),
    )[0]

  const recentSleep = data.sleepLogs
    .toSorted((a, b) =>
      b.date.localeCompare(a.date),
    )[0]

  const activePrinciples = data.principles.filter(
    (item) => item.status === 'active',
  )

  const principle =
    activePrinciples.length > 0
      ? activePrinciples[
          new Date().getDate() %
            activePrinciples.length
        ]
      : undefined

  const motivationPool = data.motivationLinks.filter(
    (item) =>
      item.url &&
      (item.favorite || !item.localNote),
  )

  const suggestedMotivation =
    motivationPool.length > 0
      ? motivationPool[
          new Date().getDate() %
            motivationPool.length
        ]
      : undefined

  const lowState =
    (checkIn?.energy ?? draftEnergy) <= 2 ||
    (checkIn?.mood ?? draftMood) <= 2

  const workMinutes = dailyEffectiveWorkMinutes(
    data.workSessions,
    today,
  )

  const recovered =
    checkIn?.rescueCompleted ?? false

  // const color = dayColor(
  //   habitScore.score,
  //   habitScore.possible,
  //   recovered,
  // )

  const completedPriorities = priorities.filter(
    (item) => item.completed,
  ).length

  const activeSleep =
    data.settings.activeSleepStartedAt

  const createPriority = async () => {
    if (!priorityTitle.trim()) return
    if (priorities.length >= 3) return

    await addPriority({
      date: today,
      title: priorityTitle.trim(),
      order: priorities.length + 1,
      completed: false,
      generalBacklog: false,
    })

    setPriorityTitle('')
  }

  const saveState = async () => {
    await updateDailyCheckIn({
      date: today,
      energy: draftEnergy,
      mood: draftMood,
      dayRescueActive:
        checkIn?.dayRescueActive ?? false,
      rescueCompleted:
        checkIn?.rescueCompleted ?? false,
    })

    await addMoodEnergyLog({
      date: today,
      dateTime: nowIso(),
      energy: draftEnergy,
      mood: draftMood,
      source: 'dashboard',
    })

    if (draftEnergy <= 2 || draftMood <= 2) {
      setMoodPrompt(suggestedMotivation ?? null)
      setShowMoodPrompt(true)

      addToast({
        title: 'Estado bajo registrado',
        detail:
          'Te mostré una sugerencia para recuperar el día.',
        tone: 'warning',
      })
    }
  }

  const startSleep = async () => {
    await updateSettings({
      activeSleepStartedAt: nowIso(),
    })

    addToast({
      title: 'Hora de dormir guardada',
      tone: 'success',
    })
  }

  const wakeUp = async () => {
    if (!activeSleep) {
      addToast({
        title: 'No hay hora de dormir activa',
        detail:
          'Presiona primero Me voy a dormir.',
        tone: 'warning',
      })

      return
    }

    await addSleepLog({
      date: today,
      sleepAt: activeSleep,
      wakeAt: nowIso(),
      interruptions: 0,
      napMinutes: 0,
      durationHours: 0,
      quality: 3,
      wakeEnergy: draftEnergy,
      lateWork: false,
    })

    await updateSettings({
      activeSleepStartedAt: undefined,
    })

    addToast({
      title: 'Sueño registrado',
      detail:
        'Puedes ajustar los detalles en Bienestar.',
      tone: 'success',
    })
  }

  return (
    <section className="page dashboard-mobile">
      {/* Encabezado compacto */}

      <header className="dashboard-hero-compact">
        <div>
          <p>{friendlyDate(today)}</p>

          <h2>
            {data.settings.userName
              ? `Hola, ${data.settings.userName}`
              : 'Hoy'}
          </h2>
        </div>

        <span>
          Local · Respaldo:{' '}
          {data.settings.lastBackupAt
            ? friendlyDate(
                data.settings.lastBackupAt,
              )
            : 'pendiente'}
        </span>
      </header>

      {/* Acción de sueño: solo se muestra la acción disponible */}

      <section
        className={`dashboard-sleep-row${
          activeSleep ? ' is-active' : ''
        }`}
      >
        <div className="dashboard-sleep-info">
          <span className="dashboard-sleep-icon">
            {activeSleep ? (
              <Sun size={18} aria-hidden="true" />
            ) : (
              <Moon size={18} aria-hidden="true" />
            )}
          </span>

          <div>
            <strong>
              {activeSleep
                ? 'Descanso activo'
                : 'Registro de sueño'}
            </strong>

            <small>
              {activeSleep
                ? `Desde las ${new Date(
                    activeSleep,
                  ).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : 'Guarda la hora al acostarte'}
            </small>
          </div>
        </div>

        {activeSleep ? (
          <Button
            aria-label="Finalizar sueño"
            onClick={wakeUp}
            icon={
              <Sun size={17} aria-hidden="true" />
            }
          >
            Desperté
          </Button>
        ) : (
          <Button
            aria-label="Iniciar sueño"
            variant="secondary"
            onClick={startSleep}
            icon={
              <Moon size={17} aria-hidden="true" />
            }
          >
            Dormir
          </Button>
        )}
      </section>

      {/* Frase del día en una sola franja */}

      <section className="dashboard-daily-evaluation">
        <div>
          <span>Lectura del dia</span>
          <h3>{dailyEvaluation.title}</h3>
          <p>{dailyEvaluation.message}</p>
        </div>

        <div className="dashboard-daily-evaluation__action">
          <strong>Que hacer ahora</strong>
          <p>{dailyEvaluation.mainAction}</p>
        </div>

        <details>
          <summary>Que estoy tomando en cuenta</summary>
          <ul>
            {dailyEvaluation.evidence.slice(0, 4).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      </section>

      {principle ? (
        <article className="dashboard-quote-strip">
          <Quote size={18} aria-hidden="true" />

          <div>
            <strong>Frase del día</strong>
            <p>{principle.text}</p>
          </div>
        </article>
      ) : null}

      {/* Métricas compactas */}

      <div
        className="dashboard-kpi-grid"
        aria-label="Resumen del día"
      >
        <article className="dashboard-kpi kpi-blue">
          <span className="dashboard-kpi__icon">
            <Battery size={17} />
          </span>

          <span>Energía</span>
          <strong>
            {checkIn?.energy ?? draftEnergy}/5
          </strong>
        </article>

        <article className="dashboard-kpi kpi-violet">
          <span className="dashboard-kpi__icon">
            <ShieldCheck size={17} />
          </span>

          <span>Ánimo</span>
          <strong>
            {checkIn?.mood ?? draftMood}/5
          </strong>
        </article>

        <article
          className={`dashboard-kpi ${
            workMinutes > 600
              ? 'kpi-red'
              : 'kpi-green'
          }`}
        >
          <span className="dashboard-kpi__icon">
            <CalendarDays size={17} />
          </span>

          <span>Trabajo</span>
          <strong>
            {formatMinutes(workMinutes)}
          </strong>
        </article>

        <article className="dashboard-kpi kpi-gold">
          <span className="dashboard-kpi__icon">
            <Coins size={17} />
          </span>

          <span>Dinero libre</span>
          <strong>
            {formatCurrency(
              summary.freeMoney,
              data.settings.currency,
            )}
          </strong>
        </article>

        <article className="dashboard-kpi kpi-slate">
          <span className="dashboard-kpi__icon">
            <ArrowDown size={17} />
          </span>

          <span>Apartado</span>
          <strong>
            {formatCurrency(
              summary.allocated,
              data.settings.currency,
            )}
          </strong>
        </article>

        <article className="dashboard-kpi kpi-blue">
          <span className="dashboard-kpi__icon">
            <ArrowUp size={17} />
          </span>

          <span>Hábitos</span>
          <strong>
            {percent(
              habitScore.possible
                ? habitScore.score /
                    habitScore.possible
                : 0,
            )}
          </strong>
        </article>
      </div>

      {/* Prioridades: bloque principal siempre visible */}

      <section className="panel dashboard-priorities">
        <div className="dashboard-section-heading">
          <div>
            <h2>Prioridades</h2>
            <span>Máximo tres para hoy</span>
          </div>

          <strong>
            {completedPriorities}/3
          </strong>
        </div>

        {priorities.length < 3 ? (
          <div className="dashboard-priority-create">
            <input
              value={priorityTitle}
              onChange={(event) =>
                setPriorityTitle(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void createPriority()
                }
              }}
              placeholder="Nueva prioridad"
              aria-label="Nueva prioridad"
            />

            <Button
              onClick={createPriority}
              disabled={!priorityTitle.trim()}
            >
              Agregar
            </Button>
          </div>
        ) : null}

        <div className="dashboard-priority-list">
          {priorities.map((priority) => (
            <article
              key={priority.id}
              className={`dashboard-priority-row${
                priority.completed
                  ? ' is-complete'
                  : ''
              }`}
            >
              <button
                type="button"
                className={
                  priority.completed
                    ? 'check active'
                    : 'check'
                }
                aria-label={
                  priority.completed
                    ? `Desmarcar ${priority.title}`
                    : `Completar ${priority.title}`
                }
                aria-pressed={priority.completed}
                onClick={() =>
                  updatePriority({
                    ...priority,
                    completed:
                      !priority.completed,
                  })
                }
              >
                <Check
                  size={15}
                  aria-hidden="true"
                />
              </button>

              <input
                value={priority.title}
                aria-label={`Editar ${priority.title}`}
                onChange={(event) =>
                  updatePriority({
                    ...priority,
                    title: event.target.value,
                  })
                }
              />

              <button
                type="button"
                className="dashboard-priority-backlog"
                aria-label={`Mover ${priority.title} a pendientes`}
                title="Mover a pendientes"
                onClick={() =>
                  updatePriority({
                    ...priority,
                    date: today,
                    generalBacklog: true,
                  })
                }
              >
                <ArrowDown
                  size={16}
                  aria-hidden="true"
                />
              </button>
            </article>
          ))}

          {priorities.length === 0 ? (
            <p className="muted dashboard-empty">
              Todavía no has definido prioridades.
            </p>
          ) : null}
        </div>
      </section>

      {/* Estado del día plegable */}

      <details className="dashboard-collapse">
        <summary>
          <div>
            <strong>Estado del día</strong>

            <span>
              Energía {draftEnergy}/5 · Ánimo{' '}
              {draftMood}/5
            </span>
          </div>

          <span className="dashboard-collapse-action">
            Editar
          </span>
        </summary>

        <div className="dashboard-collapse-body">
          <div className="dashboard-range-grid">
            <label className="dashboard-range-card">
              <span>
                Energía
                <strong>{draftEnergy}/5</strong>
              </span>

              <input
                type="range"
                min="1"
                max="5"
                value={draftEnergy}
                onChange={(event) =>
                  setDraftEnergy(
                    Number(event.target.value),
                  )
                }
              />
            </label>

            <label className="dashboard-range-card">
              <span>
                Ánimo
                <strong>{draftMood}/5</strong>
              </span>

              <input
                type="range"
                min="1"
                max="5"
                value={draftMood}
                onChange={(event) =>
                  setDraftMood(
                    Number(event.target.value),
                  )
                }
              />
            </label>
          </div>

          <Button onClick={saveState}>
            Guardar estado
          </Button>

          <div className="dashboard-info-grid">
            <article>
              <span>Última comida</span>

              <strong>
                {lastMeal
                  ? `${lastMeal.mealType} · ${lastMeal.description}`
                  : 'Sin registros'}
              </strong>
            </article>

         

            <article>
              <span>Sueño reciente</span>

              <strong>
                {recentSleep
                  ? `${recentSleep.durationHours} h`
                  : 'Sin registros'}
              </strong>
            </article>
          </div>

          {workMinutes > 600 ? (
            <div className="notice warning">
              <p>
                Superaste 10 horas de trabajo
                efectivo. Conviene revisar el
                exceso de jornada.
              </p>
            </div>
          ) : null}
        </div>
      </details>

      {/* Salvar el día plegable */}

      <details
        className={`dashboard-collapse dashboard-rescue${
          recovered ? ' is-complete' : ''
        }`}
      >
        <summary>
          <div>
            <strong>Salvar el día</strong>

            <span>
              {recovered
                ? 'Día recuperado'
                : 'Acciones mínimas para días difíciles'}
            </span>
          </div>

          <span className="dashboard-collapse-action">
            {recovered ? 'Listo' : 'Ver'}
          </span>
        </summary>

        <div className="dashboard-collapse-body">
          <ul className="dashboard-rescue-list">
            {data.settings.dayRescueActions.map(
              (action) => (
                <li key={action}>
                  <ShieldCheck
                    size={16}
                    aria-hidden="true"
                  />

                  <span>{action}</span>
                </li>
              ),
            )}
          </ul>

          <Button
            disabled={recovered}
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
            {recovered
              ? 'Día recuperado'
              : 'Marcar día recuperado'}
          </Button>
        </div>
      </details>

      {/* Recomendación visible únicamente cuando es necesaria */}

      {lowState && suggestedMotivation ? (
        <article className="dashboard-motivation-compact">
          <div>
            <span className="dashboard-motivation-icon">
              <Play size={18} aria-hidden="true" />
            </span>

            <div>
              <strong>
                Ánimo bajo detectado
              </strong>

              <span>
                {suggestedMotivation.title}
              </span>
            </div>
          </div>

          <a
            className="button button-primary"
            href={suggestedMotivation.url}
            target="_blank"
            rel="noreferrer"
          >
            Ver
          </a>
        </article>
      ) : null}

      {/* Modal existente */}

      <Modal
        title="Recuperar el día"
        open={showMoodPrompt}
        onClose={() => setShowMoodPrompt(false)}
      >
        <div className="mood-prompt">
          <div className="mood-prompt-icon">
            <ShieldCheck size={28} />
          </div>

          <div>
            <strong>
              Tu estado está bajo. Haz una pausa
              antes de seguir.
            </strong>

            <p>
              No tienes que resolver todo ahora.
              Elige una acción pequeña, recupera
              algo de energía y vuelve con menos
              presión.
            </p>
          </div>

          {principle ? (
            <blockquote>
              {principle.text}
            </blockquote>
          ) : null}

          {moodPrompt?.url ? (
            <article className="mood-video-card">
              <span>Video sugerido</span>
              <strong>{moodPrompt.title}</strong>

              {moodPrompt.personalNote ? (
                <p>{moodPrompt.personalNote}</p>
              ) : null}

              <a
                className="button button-primary"
                href={moodPrompt.url}
                target="_blank"
                rel="noreferrer"
              >
                <Play size={18} />
                <span>Ver ahora</span>
              </a>
            </article>
          ) : (
            <div className="notice info">
              <p>
                Guarda videos o notas en
                Motivación para recibir una
                recomendación cuando tu ánimo o
                energía bajen.
              </p>
            </div>
          )}

          <div className="list compact">
            {data.settings.dayRescueActions
              .slice(0, 3)
              .map((action) => (
                <div
                  className="list-row"
                  key={action}
                >
                  <ShieldCheck size={18} />
                  <span>{action}</span>
                </div>
              ))}
          </div>

          <div className="actions">
            <Button
              onClick={() =>
                setShowMoodPrompt(false)
              }
            >
              Entendido
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
