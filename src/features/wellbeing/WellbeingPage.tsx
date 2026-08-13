import { useState } from 'react'
import {
  Apple,
  BarChart3,
  ChevronDown,
  Clock3,
  Dumbbell,
  Droplets,
  Heart,
  Lightbulb,
  Moon,
  // Scale,
  Sparkles,
  Video,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { QuickActionModal } from '../../components/QuickActionModal'
import { useAppStore } from '../../stores/appStore'
import { averageSleepHours } from '../../services/timeCalculations'
import { calculateHydrationGuidance } from '../../services/hydrationGuidance'
import { formatMinutes } from '../../utils/format'
import { nowIso, todayIso } from '../../utils/date'
import {
  motivationForLowMood,
  recommendationSeed,
} from '../../services/personalInsights'
import type { RecreationLog } from '../../types/domain'

type WellbeingSection =
  | 'recreation'
  | 'trends'
  | 'recommendations'
  | 'history'
  | null

type TrendView = 'sleep' | 'food' | 'training' | 'weight'
type HistoryView = 'sleep' | 'food' | 'weight'

export function WellbeingPage() {
  const data = useAppStore((state) => state.data)
  const addTrainingLog = useAppStore(
    (state) => state.addTrainingLog,
  )
  const addCareLog = useAppStore(
    (state) => state.addCareLog,
  )
  const addRecreationLog = useAppStore(
    (state) => state.addRecreationLog,
  )
  const addHydrationLog = useAppStore(
    (state) => state.addHydrationLog,
  )
  const addToast = useAppStore((state) => state.addToast)
  const updateSettings = useAppStore(
    (state) => state.updateSettings,
  )

  const [quick, setQuick] = useState(false)
  const [openSection, setOpenSection] =
    useState<WellbeingSection>('trends')
  const [trendView, setTrendView] =
    useState<TrendView>('sleep')
  const [historyView, setHistoryView] =
    useState<HistoryView>('sleep')

  const [recreationType, setRecreationType] =
    useState<RecreationLog['type']>(
      'Consumo intencional',
    )
  const [recreationMinutes, setRecreationMinutes] =
    useState(15)
  const [recreationFeeling, setRecreationFeeling] =
    useState('Neutral')

  const [trainingFinishOpen, setTrainingFinishOpen] =
    useState(false)
  const [trainingIntensity, setTrainingIntensity] =
    useState(3)
  const [trainingEnergyAfter, setTrainingEnergyAfter] =
    useState(3)
  const [hydrationAmount, setHydrationAmount] =
    useState(250)

  if (!data) return null

  const today = todayIso()

  const todayCheckIn = data.dailyCheckIns.find(
    (item) => item.date === today,
  )

  const latestTodayEnergy =
    data.moodEnergyLogs
      .filter((item) => item.date === today)
      .toSorted((a, b) =>
        a.dateTime.localeCompare(b.dateTime),
      )
      .at(-1)?.energy ??
    todayCheckIn?.energy ??
    3

  const avgSleep = averageSleepHours(data.sleepLogs)

  const plannedMeals = data.mealLogs.length
    ? data.mealLogs.filter((meal) => meal.planned)
        .length / data.mealLogs.length
    : 0

  const socialMinutes = data.socialLogs.reduce(
    (sum, log) => sum + log.durationMinutes,
    0,
  )

  const creativeMinutes = data.recreationLogs
    .filter(
      (log) => log.type === 'Creacion de contenido',
    )
    .reduce(
      (sum, log) => sum + log.durationMinutes,
      0,
    )

  const scrollMinutes = data.recreationLogs
    .filter(
      (log) =>
        log.type === 'Desplazamiento automatico',
    )
    .reduce(
      (sum, log) => sum + log.durationMinutes,
      0,
    )

  const todayHydrationMl = data.hydrationLogs
    .filter((log) => log.dateTime.slice(0, 10) === today)
    .reduce((sum, log) => sum + (log.amountMl ?? 0), 0)

  const todayTrainingMinutes = data.trainingLogs
    .filter((log) => log.dateTime.slice(0, 10) === today)
    .reduce((sum, log) => sum + log.durationMinutes, 0)

  const hydrationGuidance = calculateHydrationGuidance(
    data.settings,
    { trainingMinutes: todayTrainingMinutes },
  )

  const registerHydration = async (
    amountMl: number,
    notes?: string,
  ) => {
    await addHydrationLog({
      dateTime: nowIso(),
      amountMl,
      type: 'water',
      notes,
    })
    addToast({
      title: 'Agua registrada',
      detail: `${amountMl} ml agregados al dia.`,
      tone: 'success',
    })
  }

  const sleepData = data.sleepLogs
    .toSorted((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map((log) => ({
      fecha: log.date.slice(5),
      horas: log.durationHours,
      energia: log.wakeEnergy,
    }))

  /*
   * Se conserva la clave única y la etiqueta completa
   * para que el Tooltip de alimentación funcione bien.
   */
  const foodData = data.mealLogs
    .toSorted((a, b) =>
      a.dateTime.localeCompare(b.dateTime),
    )
    .slice(-14)
    .map((log) => ({
      clave: log.id,
      fechaHora: log.dateTime,
      etiqueta: new Date(
        log.dateTime,
      ).toLocaleString('es-GT', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      hambre: Number(log.hungerBefore),
      saciedad: Number(log.satietyAfter),
    }))

  const weightData = data.weightLogs
    .toSorted((a, b) =>
      a.dateTime.localeCompare(b.dateTime),
    )
    .slice(-14)
    .map((log) => ({
      clave: log.id,
      fechaHora: log.dateTime,
      etiqueta: new Date(
        log.dateTime,
      ).toLocaleDateString('es-GT', {
        day: '2-digit',
        month: '2-digit',
      }),
      peso: Number(log.weightLb),
    }))

  const trainingData = Object.values(
    data.trainingLogs.reduce<
      Record<
        string,
        {
          dateKey: string
          fecha: string
          minutos: number
          sesiones: number
          intensidadTotal: number
          intensidad: number
        }
      >
    >((acc, log) => {
      const date = new Date(log.dateTime)

      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateKey = `${year}-${month}-${day}`

      acc[dateKey] ??= {
        dateKey,
        fecha: `${day}/${month}`,
        minutos: 0,
        sesiones: 0,
        intensidadTotal: 0,
        intensidad: 0,
      }

      acc[dateKey].minutos += log.durationMinutes
      acc[dateKey].sesiones += 1
      acc[dateKey].intensidadTotal += log.intensity
      acc[dateKey].intensidad = Number(
        (
          acc[dateKey].intensidadTotal /
          acc[dateKey].sesiones
        ).toFixed(1),
      )

      return acc
    }, {}),
  )
    .toSorted((a, b) =>
      a.dateKey.localeCompare(b.dateKey),
    )
    .slice(-14)

  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString([], {
      day: '2-digit',
      month: '2-digit',
    })

  const recentSleepLogs = data.sleepLogs
    .toSorted((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)

  const recentMealLogs = data.mealLogs
    .toSorted((a, b) =>
      b.dateTime.localeCompare(a.dateTime),
    )
    .slice(0, 7)

  const recentWeightLogs = data.weightLogs
    .toSorted((a, b) =>
      b.dateTime.localeCompare(a.dateTime),
    )
    .slice(0, 7)

  const recommendations =
    recommendationSeed(data).slice(0, 4)

  const lowMoodMotivation =
    motivationForLowMood(data)

  const toggleSection = (
    section: Exclude<WellbeingSection, null>,
  ) => {
    setOpenSection((current) =>
      current === section ? null : section,
    )
  }

  const saveRecreation = async (
    type = recreationType,
    minutes = recreationMinutes,
  ) => {
    if (minutes <= 0) return

    await addRecreationLog({
      dateTime: new Date().toISOString(),
      platform: 'TikTok',
      type,
      durationMinutes: minutes,
      feelingAfter: recreationFeeling,
      planned:
        type !== 'Desplazamiento automatico',
    })

    addToast({
      title: 'Recreación registrada',
      detail: `${type} - ${formatMinutes(minutes)}`,
      tone: 'success',
    })
  }

  const trainingStartedAt =
    data.settings.activeTrainingStartedAt

  const trainingEnergyBefore =
    data.settings.activeTrainingEnergyBefore ??
    latestTodayEnergy

  const startTraining = async () => {
    if (trainingStartedAt) return

    const startedAt = new Date().toISOString()

    await updateSettings({
      activeTrainingStartedAt: startedAt,
      activeTrainingEnergyBefore: latestTodayEnergy,
    })

    addToast({
      title: 'Entrenamiento iniciado',
      detail: `Inicio: ${new Date(
        startedAt,
      ).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })} · Energía ${latestTodayEnergy}/5`,
      tone: 'success',
    })
  }

  const openTrainingFinish = () => {
    if (!trainingStartedAt) return

    setTrainingIntensity(3)
    setTrainingEnergyAfter(latestTodayEnergy)
    setTrainingFinishOpen(true)
  }

  const finishTraining = async () => {
    if (!trainingStartedAt) return

    const endedAt = new Date().toISOString()

    const durationMinutes = Math.max(
      1,
      Math.round(
        (new Date(endedAt).getTime() -
          new Date(trainingStartedAt).getTime()) /
          60_000,
      ),
    )

    await addTrainingLog({
      dateTime: trainingStartedAt,
      type: 'Entrenamiento completo en casa',
      durationMinutes,
      intensity: trainingIntensity,
      exercises: '',
      energyBefore: trainingEnergyBefore,
      energyAfter: trainingEnergyAfter,
    })

    await updateSettings({
      activeTrainingStartedAt: undefined,
      activeTrainingEnergyBefore: undefined,
    })

    setTrainingFinishOpen(false)

    addToast({
      title: 'Entrenamiento terminado',
      detail: `${formatMinutes(
        durationMinutes,
      )} · intensidad ${
        trainingIntensity === 2
          ? 'suave'
          : trainingIntensity === 3
            ? 'normal'
            : 'intensa'
      }`,
      tone: 'success',
    })
  }

  const registerQuickSkincare = async () => {
    await addCareLog({
      dateTime: new Date().toISOString(),
      type: 'Skincare',
      notes: 'Rutina registrada',
    })

    addToast({
      title: 'Skincare registrado',
      detail: 'Rutina agregada a registros recientes',
      tone: 'success',
    })
  }

  return (
    <section className="page wellbeing-mobile-page">
      {/* <header className="wellbeing-page-header">
        <div>
          <p>Salud, descanso y equilibrio</p>
          <h2>Bienestar</h2>
        </div>

        <Button
          onClick={() => setQuick(true)}
          icon={<Apple size={17} aria-hidden="true" />}
        >
          Registrar
        </Button>
      </header> */}

      <div
        className="wellbeing-summary-grid"
        aria-label="Resumen de bienestar"
      >
        <article className="wellbeing-summary-card tone-blue">
          <Moon size={17} aria-hidden="true" />
          <span>Sueño</span>
          <strong>{avgSleep} h</strong>
          <small>
            Meta {data.settings.sleepGoalHours} h
          </small>
        </article>

        <article className="wellbeing-summary-card tone-green">
          <Apple size={17} aria-hidden="true" />
          <span>Planificadas</span>
          <strong>
            {Math.round(plannedMeals * 100)}%
          </strong>
        </article>

        <article className="wellbeing-summary-card tone-gold">
          <Dumbbell size={17} aria-hidden="true" />
          <span>Entrenos</span>
          <strong>{data.trainingLogs.length}</strong>
        </article>

        <article className="wellbeing-summary-card tone-slate">
          <Heart size={17} aria-hidden="true" />
          <span>Vida personal</span>
          <strong>
            {formatMinutes(socialMinutes)}
          </strong>
        </article>

        <article className="wellbeing-summary-card tone-violet">
          <Video size={17} aria-hidden="true" />
          <span>Creativo</span>
          <strong>
            {formatMinutes(creativeMinutes)}
          </strong>
        </article>

        <article
          className={`wellbeing-summary-card ${
            scrollMinutes > creativeMinutes
              ? 'tone-red'
              : 'tone-green'
          }`}
        >
          <Video size={17} aria-hidden="true" />
          <span>Scroll</span>
          <strong>
            {formatMinutes(scrollMinutes)}
          </strong>
        </article>
      </div>

      <section className="wellbeing-hydration-card">
        <div className="wellbeing-hydration-card__summary">
          <Droplets size={20} aria-hidden="true" />
          <div>
            <strong>Hidratacion</strong>
            <span>
              Hoy llevas {todayHydrationMl} ml
              {hydrationGuidance.referenceMl
                ? ` de una referencia de ${hydrationGuidance.referenceMl} ml`
                : ''}
            </span>
          </div>
        </div>
        <p>{hydrationGuidance.message}</p>
        <div className="wellbeing-hydration-actions">
          <Button
            variant="secondary"
            onClick={() =>
              void registerHydration(
                data.settings.hydrationGlassMl ?? 250,
                'Vaso',
              )
            }
          >
            + vaso
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              void registerHydration(
                data.settings.hydrationBottleMl ?? 600,
                'Botella',
              )
            }
          >
            + botella
          </Button>
          <label>
            Cantidad ml
            <input
              type="number"
              min={1}
              value={hydrationAmount}
              onChange={(event) =>
                setHydrationAmount(Number(event.target.value))
              }
            />
          </label>
          <Button
            onClick={() =>
              void registerHydration(
                Math.max(1, hydrationAmount),
                'Cantidad manual',
              )
            }
          >
            Agregar
          </Button>
        </div>
      </section>


      <section className="wellbeing-collapse">
        <button
          type="button"
          className="wellbeing-collapse__summary"
          aria-expanded={openSection === 'trends'}
          onClick={() => toggleSection('trends')}
        >
          <div>
            <strong>Tendencias</strong>
            <span>
              Sueño, energía y alimentación
            </span>
          </div>

          <div className="wellbeing-collapse__end">
            <BarChart3 size={17} aria-hidden="true" />

            <ChevronDown
              size={18}
              className={
                openSection === 'trends'
                  ? 'is-open'
                  : undefined
              }
              aria-hidden="true"
            />
          </div>
        </button>

        {openSection === 'trends' ? (
          <div className="wellbeing-collapse__body">
            <div
              className="wellbeing-tabs four"
              role="tablist"
              aria-label="Tipo de tendencia"
            >
              <button
                type="button"
                className={
                  trendView === 'sleep'
                    ? 'is-active'
                    : undefined
                }
                aria-selected={trendView === 'sleep'}
                onClick={() =>
                  setTrendView('sleep')
                }
              >
                Sueño y energía
              </button>

              <button
                type="button"
                className={
                  trendView === 'food'
                    ? 'is-active'
                    : undefined
                }
                aria-selected={trendView === 'food'}
                onClick={() => setTrendView('food')}
              >
                Comida
              </button>

              <button
                type="button"
                className={
                  trendView === 'training'
                    ? 'is-active'
                    : undefined
                }
                aria-selected={
                  trendView === 'training'
                }
                onClick={() =>
                  setTrendView('training')
                }
              >
                Entrenos
              </button>

              <button
                type="button"
                className={
                  trendView === 'weight'
                    ? 'is-active'
                    : undefined
                }
                aria-selected={
                  trendView === 'weight'
                }
                onClick={() =>
                  setTrendView('weight')
                }
              >
                Peso
              </button>
            </div>

            <div className="wellbeing-chart-box">
              {trendView === 'sleep' ? (
                sleepData.length > 0 ? (
                  <ResponsiveContainer
                    width="100%"
                    height={220}
                  >
                    <LineChart
                      data={sleepData}
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
                        dataKey="fecha"
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="horas"
                        name="Horas"
                        stroke="#2563eb"
                        strokeWidth={2}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="energia"
                        name="Energía"
                        stroke="#16a34a"
                        strokeWidth={2}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="muted wellbeing-empty">
                    No hay registros de sueño.
                  </p>
                )
              ) : trendView === 'food' ? (
                foodData.length > 0 ? (
                  <ResponsiveContainer
                    width="100%"
                    height={220}
                  >
                    <BarChart
                      data={foodData}
                      accessibilityLayer={false}
                      margin={{
                        top: 8,
                        right: 8,
                        left: -18,
                        bottom: 14,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="clave"
                        tickFormatter={(clave) => {
                          const registro =
                            foodData.find(
                              (item) =>
                                item.clave ===
                                String(clave),
                            )

                          return (
                            registro?.etiqueta.slice(
                              0,
                              5,
                            ) ?? ''
                          )
                        }}
                        tick={{ fontSize: 10 }}
                        interval="preserveStartEnd"
                      />

                      <YAxis
                        domain={[0, 5]}
                        ticks={[0, 1, 2, 3, 4, 5]}
                        allowDecimals={false}
                        tick={{ fontSize: 10 }}
                      />

                      <Tooltip
                        trigger="hover"
                        shared={false}
                        cursor={{
                          fill: 'rgba(37, 99, 235, 0.08)',
                        }}
                        wrapperStyle={{
                          zIndex: 1000,
                          pointerEvents: 'none',
                        }}
                        labelFormatter={(clave) => {
                          const registro =
                            foodData.find(
                              (item) =>
                                item.clave ===
                                String(clave),
                            )

                          return registro
                            ? `Fecha: ${registro.etiqueta}`
                            : ''
                        }}
                        formatter={(value, name) => [
                          `${Number(value)}/5`,
                          String(name),
                        ]}
                      />

                      <Bar
                        dataKey="hambre"
                        name="Hambre antes"
                        fill="#f59e0b"
                        radius={[5, 5, 0, 0]}
                        isAnimationActive={false}
                      />

                      <Bar
                        dataKey="saciedad"
                        name="Saciedad después"
                        fill="#16a34a"
                        radius={[5, 5, 0, 0]}
                        isAnimationActive={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="muted wellbeing-empty">
                    No hay registros de alimentación.
                  </p>
                )
              ) : trendView === 'training' ? (
                trainingData.length > 0 ? (
                  <ResponsiveContainer
                    width="100%"
                    height={230}
                  >
                    <ComposedChart
                      data={trainingData}
                      margin={{
                        top: 8,
                        right: 0,
                        left: -18,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="fecha"
                        tick={{ fontSize: 10 }}
                      />

                      <YAxis
                        yAxisId="minutes"
                        tick={{ fontSize: 10 }}
                      />

                      <YAxis
                        yAxisId="intensity"
                        orientation="right"
                        domain={[0, 5]}
                        ticks={[0, 1, 2, 3, 4, 5]}
                        allowDecimals={false}
                        tick={{ fontSize: 10 }}
                        width={24}
                      />

                      <Tooltip
                        formatter={(value, name) => [
                          name === 'Minutos'
                            ? formatMinutes(
                                Number(value),
                              )
                            : `${Number(value)}/5`,
                          String(name),
                        ]}
                      />

                      <Legend
                        wrapperStyle={{
                          fontSize: 11,
                        }}
                      />

                      <Bar
                        yAxisId="minutes"
                        dataKey="minutos"
                        name="Minutos"
                        fill="#2563eb"
                        radius={[5, 5, 0, 0]}
                        isAnimationActive={false}
                      />

                      <Line
                        yAxisId="intensity"
                        type="monotone"
                        dataKey="intensidad"
                        name="Intensidad"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="muted wellbeing-empty">
                    Inicia y termina un entrenamiento
                    para ver la tendencia.
                  </p>
                )
              ) : weightData.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height={230}
                >
                  <LineChart
                    data={weightData}
                    margin={{
                      top: 8,
                      right: 10,
                      left: -8,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                    />

                    <XAxis
                      dataKey="clave"
                      tickFormatter={(clave) => {
                        const registro =
                          weightData.find(
                            (item) =>
                              item.clave ===
                              String(clave),
                          )

                        return registro?.etiqueta ?? ''
                      }}
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />

                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 10 }}
                      width={42}
                    />

                    <Tooltip
                      wrapperStyle={{
                        zIndex: 1000,
                        pointerEvents: 'none',
                      }}
                      labelFormatter={(clave) => {
                        const registro =
                          weightData.find(
                            (item) =>
                              item.clave ===
                              String(clave),
                          )

                        return registro
                          ? `Fecha: ${registro.etiqueta}`
                          : ''
                      }}
                      formatter={(value) => [
                        `${Number(value).toFixed(1)} lb`,
                        'Peso',
                      ]}
                    />

                    <Line
                      type="monotone"
                      dataKey="peso"
                      name="Peso"
                      stroke="#7c3aed"
                      strokeWidth={2.5}
                      dot={{
                        r: 3,
                        fill: '#7c3aed',
                      }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="muted wellbeing-empty">
                  Registra tu peso para ver la tendencia.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </section>




      <section
        className="wellbeing-quick-actions"
        aria-label="Acciones rápidas"
      >
        <button
          type="button"
          className={
            trainingStartedAt
              ? 'is-training-active'
              : undefined
          }
          aria-pressed={Boolean(trainingStartedAt)}
          onClick={() =>
            void (
              trainingStartedAt
                ? openTrainingFinish()
                : startTraining()
            )
          }
        >
          <Dumbbell size={18} aria-hidden="true" />

          <span>
            {trainingStartedAt
              ? 'Entreno terminado'
              : 'Entreno'}
          </span>

          <small>
            {trainingStartedAt
              ? `Desde ${new Date(
                  trainingStartedAt,
                ).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : 'Iniciar'}
          </small>
        </button>

        <button
          type="button"
          onClick={() => void registerQuickSkincare()}
        >
          <Sparkles size={18} aria-hidden="true" />
          <span>Skincare</span>
          <small>Rutina</small>
        </button>

        <button
          type="button"
          onClick={() =>
            void saveRecreation(
              'Creacion de contenido',
              30,
            )
          }
        >
          <Video size={18} aria-hidden="true" />
          <span>TikTok</span>
          <small>Creativo</small>
        </button>
      </section>

      <section className="wellbeing-collapse">
        <button
          type="button"
          className="wellbeing-collapse__summary"
          aria-expanded={openSection === 'recreation'}
          onClick={() => toggleSection('recreation')}
        >
          <div>
            <strong>Recreación y TikTok</strong>
            <span>
              Registra creación, consumo o scroll
            </span>
          </div>

          <ChevronDown
            size={18}
            className={
              openSection === 'recreation'
                ? 'is-open'
                : undefined
            }
            aria-hidden="true"
          />
        </button>

        {openSection === 'recreation' ? (
          <div className="wellbeing-collapse__body">
            <div className="wellbeing-recreation-form">
              <label className="wellbeing-field-wide">
                Tipo de uso

                <select
                  value={recreationType}
                  onChange={(event) =>
                    setRecreationType(
                      event.target
                        .value as RecreationLog['type'],
                    )
                  }
                >
                  <option>
                    Creacion de contenido
                  </option>
                  <option>
                    Consumo intencional
                  </option>
                  <option>
                    Desplazamiento automatico
                  </option>
                </select>
              </label>

              <label>
                Minutos

                <input
                  type="number"
                  min="1"
                  value={recreationMinutes}
                  onChange={(event) =>
                    setRecreationMinutes(
                      Number(event.target.value),
                    )
                  }
                />
              </label>

              <label>
                Cómo me sentí

                <input
                  value={recreationFeeling}
                  onChange={(event) =>
                    setRecreationFeeling(
                      event.target.value,
                    )
                  }
                />
              </label>
            </div>

            <div className="wellbeing-form-actions">
              <Button
                onClick={() =>
                  void saveRecreation()
                }
                disabled={recreationMinutes <= 0}
                icon={
                  <Video
                    size={17}
                    aria-hidden="true"
                  />
                }
              >
                Guardar uso
              </Button>

              <Button
                variant="secondary"
                onClick={() =>
                  void saveRecreation(
                    'Desplazamiento automatico',
                    10,
                  )
                }
              >
                Scroll +10
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="wellbeing-collapse">
        <button
          type="button"
          className="wellbeing-collapse__summary"
          aria-expanded={
            openSection === 'recommendations'
          }
          onClick={() =>
            toggleSection('recommendations')
          }
        >
          <div>
            <strong>
              Recomendaciones personales
            </strong>
            <span>
              Calculadas con tu perfil y registros
            </span>
          </div>

          <div className="wellbeing-collapse__end">
            <span className="wellbeing-count">
              {recommendations.length}
            </span>

            <ChevronDown
              size={18}
              className={
                openSection === 'recommendations'
                  ? 'is-open'
                  : undefined
              }
              aria-hidden="true"
            />
          </div>
        </button>

        {openSection === 'recommendations' ? (
          <div className="wellbeing-collapse__body">
            <div className="wellbeing-recommendation-list">
              {recommendations.map((item) => (
                <article key={item}>
                  <Lightbulb
                    size={16}
                    aria-hidden="true"
                  />
                  <p>{item}</p>
                </article>
              ))}
            </div>

            {lowMoodMotivation.length > 0 ? (
              <div className="wellbeing-motivation-list">
                {lowMoodMotivation.map((item) => (
                  <article key={item.id}>
                    <strong>{item.title}</strong>

                    <span>
                      {item.personalNote ??
                        item.url ??
                        'Motivación registrada'}
                    </span>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="wellbeing-collapse">
        <button
          type="button"
          className="wellbeing-collapse__summary"
          aria-expanded={openSection === 'history'}
          onClick={() => toggleSection('history')}
        >
          <div>
            <strong>Registros recientes</strong>
            <span>
              Sueño, alimentación y peso
            </span>
          </div>

          <div className="wellbeing-collapse__end">
            <Clock3 size={17} aria-hidden="true" />

            <ChevronDown
              size={18}
              className={
                openSection === 'history'
                  ? 'is-open'
                  : undefined
              }
              aria-hidden="true"
            />
          </div>
        </button>

        {openSection === 'history' ? (
          <div className="wellbeing-collapse__body">
            <div
              className="wellbeing-tabs three"
              role="tablist"
              aria-label="Tipo de registros"
            >
              <button
                type="button"
                className={
                  historyView === 'sleep'
                    ? 'is-active'
                    : undefined
                }
                aria-selected={
                  historyView === 'sleep'
                }
                onClick={() =>
                  setHistoryView('sleep')
                }
              >
                Sueño ({recentSleepLogs.length})
              </button>

              <button
                type="button"
                className={
                  historyView === 'food'
                    ? 'is-active'
                    : undefined
                }
                aria-selected={
                  historyView === 'food'
                }
                onClick={() =>
                  setHistoryView('food')
                }
              >
                Comidas ({recentMealLogs.length})
              </button>

              <button
                type="button"
                className={
                  historyView === 'weight'
                    ? 'is-active'
                    : undefined
                }
                aria-selected={
                  historyView === 'weight'
                }
                onClick={() =>
                  setHistoryView('weight')
                }
              >
                Peso ({recentWeightLogs.length})
              </button>
            </div>

            {historyView === 'sleep' ? (
              <div className="wellbeing-history-list">
                {recentSleepLogs.length === 0 ? (
                  <p className="muted wellbeing-empty">
                    No hay registros de sueño.
                  </p>
                ) : (
                  recentSleepLogs.map((log) => (
                    <article key={log.id}>
                      <div>
                        <strong>
                          {formatDate(
                            `${log.date}T00:00:00`,
                          )}
                        </strong>

                        <span>{log.date}</span>
                      </div>

                      <div>
                        <strong>
                          {formatTime(log.sleepAt)} –{' '}
                          {formatTime(log.wakeAt)}
                        </strong>

                        <span>
                          {log.durationHours.toFixed(1)} h
                        </span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            ) : historyView === 'food' ? (
              <div className="wellbeing-history-list">
                {recentMealLogs.length === 0 ? (
                  <p className="muted wellbeing-empty">
                    No hay registros de alimentación.
                  </p>
                ) : (
                  recentMealLogs.map((meal) => (
                    <article key={meal.id}>
                      <div>
                        <strong>
                          {formatDate(meal.dateTime)}
                        </strong>

                        <span>
                          {formatTime(meal.dateTime)}
                        </span>
                      </div>

                      <div>
                        <strong>{meal.mealType}</strong>

                        <span>
                          {meal.description ||
                            'Sin descripción'}
                        </span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            ) : (
              <div className="wellbeing-history-list">
                {recentWeightLogs.length === 0 ? (
                  <p className="muted wellbeing-empty">
                    No hay registros de peso.
                  </p>
                ) : (
                  recentWeightLogs.map((log) => (
                    <article key={log.id}>
                      <div>
                        <strong>
                          {formatDate(log.dateTime)}
                        </strong>

                        <span>
                          {formatTime(log.dateTime)}
                        </span>
                      </div>

                      <div>
                        <strong>
                          {Number(log.weightLb).toFixed(1)} lb
                        </strong>

                        <span>
                          {log.notes || 'Peso registrado'}
                        </span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            )}
          </div>
        ) : null}
      </section>

      <Modal
        title="Terminar entrenamiento"
        open={trainingFinishOpen}
        onClose={() => setTrainingFinishOpen(false)}
      >
        <div className="wellbeing-training-finish">
          <div className="wellbeing-training-finish__summary">
            <Dumbbell size={18} aria-hidden="true" />

            <div>
              <strong>Entrenamiento en curso</strong>

              <span>
                Inicio{' '}
                {trainingStartedAt
                  ? new Date(
                      trainingStartedAt,
                    ).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '--:--'}
                {' · '}Energía antes{' '}
                {trainingEnergyBefore}/5
              </span>
            </div>
          </div>

          <fieldset className="wellbeing-training-choice">
            <legend>¿Qué tan intenso fue?</legend>

            <div className="wellbeing-training-choice__grid">
              {[
                { value: 2, label: 'Suave' },
                { value: 3, label: 'Normal' },
                { value: 5, label: 'Intenso' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={
                    trainingIntensity === option.value
                      ? 'is-active'
                      : undefined
                  }
                  aria-pressed={
                    trainingIntensity === option.value
                  }
                  onClick={() =>
                    setTrainingIntensity(option.value)
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="wellbeing-training-choice">
            <legend>¿Con cuánta energía terminaste?</legend>

            <div className="wellbeing-training-energy-grid">
              {[
                { value: 1, label: 'Muy baja' },
                { value: 2, label: 'Baja' },
                { value: 3, label: 'Normal' },
                { value: 4, label: 'Alta' },
                { value: 5, label: 'Muy alta' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={
                    trainingEnergyAfter === option.value
                      ? 'is-active'
                      : undefined
                  }
                  aria-pressed={
                    trainingEnergyAfter === option.value
                  }
                  onClick={() =>
                    setTrainingEnergyAfter(option.value)
                  }
                >
                  <strong>{option.value}</strong>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <p className="wellbeing-training-note">
            La energía inicial se toma automáticamente del
            estado de energía registrado hoy. La intensidad y
            la energía final quedan guardadas en el entrenamiento.
          </p>

          <div className="wellbeing-training-finish__actions">
            <Button
              onClick={() => void finishTraining()}
            >
              Guardar entrenamiento
            </Button>

            <Button
              variant="ghost"
              onClick={() => setTrainingFinishOpen(false)}
            >
              Seguir entrenando
            </Button>
          </div>
        </div>
      </Modal>

      <QuickActionModal
        open={quick}
        onClose={() => setQuick(false)}
        initialTab="meal"
      />
    </section>
  )
}
