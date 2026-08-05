import { useState } from 'react'
import { Apple, Dumbbell, Heart, Moon, Sparkles, Video } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Bar, BarChart } from 'recharts'
import { Button } from '../../components/Button'
import { QuickActionModal } from '../../components/QuickActionModal'
import { StatCard } from '../../components/StatCard'
import { useAppStore } from '../../stores/appStore'
import { averageSleepHours } from '../../services/timeCalculations'
import { formatMinutes } from '../../utils/format'
import { motivationForLowMood, recommendationSeed } from '../../services/personalInsights'
import type { RecreationLog } from '../../types/domain'

export function WellbeingPage() {
  const data = useAppStore((state) => state.data)
  const addTrainingLog = useAppStore((state) => state.addTrainingLog)
  const addCareLog = useAppStore((state) => state.addCareLog)
  const addRecreationLog = useAppStore((state) => state.addRecreationLog)
  const addToast = useAppStore((state) => state.addToast)
  const [quick, setQuick] = useState(false)
  const [recreationType, setRecreationType] = useState<RecreationLog['type']>('Consumo intencional')
  const [recreationMinutes, setRecreationMinutes] = useState(15)
  const [recreationFeeling, setRecreationFeeling] = useState('Neutral')
  if (!data) return null

  const avgSleep = averageSleepHours(data.sleepLogs)
  const plannedMeals = data.mealLogs.length ? data.mealLogs.filter((meal) => meal.planned).length / data.mealLogs.length : 0
  const socialMinutes = data.socialLogs.reduce((sum, log) => sum + log.durationMinutes, 0)
  const creativeMinutes = data.recreationLogs.filter((log) => log.type === 'Creacion de contenido').reduce((sum, log) => sum + log.durationMinutes, 0)
  const scrollMinutes = data.recreationLogs.filter((log) => log.type === 'Desplazamiento automatico').reduce((sum, log) => sum + log.durationMinutes, 0)
  const sleepData = data.sleepLogs.slice(-14).map((log) => ({ fecha: log.date.slice(5), horas: log.durationHours, energia: log.wakeEnergy }))
  const foodData = data.mealLogs
  .slice(-14)
  .map((log) => ({
    clave: log.id,
    fechaHora: log.dateTime,
    etiqueta: new Date(log.dateTime).toLocaleString('es-GT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    hambre: Number(log.hungerBefore),
    saciedad: Number(log.satietyAfter),
  }))
  const formatTime = (value: string) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const formatDate = (value: string) => new Date(value).toLocaleDateString([], { day: '2-digit', month: '2-digit' })
  const recentSleepLogs = data.sleepLogs
    .toSorted((a, b) => a.date.localeCompare(b.date))
    .slice(-7)
  const recentMealLogs = data.mealLogs
    .toSorted((a, b) => a.dateTime.localeCompare(b.dateTime))
    .slice(-7)
  const recommendations = recommendationSeed(data).slice(0, 4)
  const lowMoodMotivation = motivationForLowMood(data)

  const saveRecreation = async (type = recreationType, minutes = recreationMinutes) => {
    await addRecreationLog({
      dateTime: new Date().toISOString(),
      platform: 'TikTok',
      type,
      durationMinutes: minutes,
      feelingAfter: recreationFeeling,
      planned: type !== 'Desplazamiento automatico',
    })
    addToast({ title: 'Recreacion registrada', detail: `${type} - ${formatMinutes(minutes)}`, tone: 'success' })
  }

  return (
    <section className="page stack">
      <div className="stat-grid">
        <StatCard label="Sueno promedio" value={`${avgSleep} h`} hint={`Meta ${data.settings.sleepGoalHours} h`} icon={<Moon />} />
        <StatCard label="Comidas planificadas" value={`${Math.round(plannedMeals * 100)}%`} icon={<Apple />} tone="green" />
        <StatCard label="Entrenamientos" value={String(data.trainingLogs.length)} icon={<Dumbbell />} tone="gold" />
        <StatCard label="Vida personal" value={formatMinutes(socialMinutes)} icon={<Heart />} tone="slate" />
        <StatCard label="Tiempo creativo" value={formatMinutes(creativeMinutes)} icon={<Video />} />
        <StatCard label="Scroll automatico" value={formatMinutes(scrollMinutes)} icon={<Video />} tone={scrollMinutes > creativeMinutes ? 'red' : 'green'} />
      </div>

      <div className="quick-strip">
        <Button onClick={() => setQuick(true)} icon={<PlusIcon />}>
          Registrar comida, sueno o vida social
        </Button>
        <Button
          variant="secondary"
          onClick={async () => {
            await addTrainingLog({
              dateTime: new Date().toISOString(),
              type: 'Entrenamiento completo en casa',
              durationMinutes: 20,
              intensity: 3,
              exercises: '',
              energyBefore: 3,
              energyAfter: 4,
            })
            addToast({ title: 'Entrenamiento registrado', detail: '20 min en casa', tone: 'success' })
          }}
          icon={<Dumbbell size={18} />}
        >
          Entrenamiento rapido
        </Button>
        <Button
          variant="secondary"
          onClick={async () => {
            await addCareLog({ dateTime: new Date().toISOString(), type: 'Skincare', notes: 'Rutina registrada' })
            addToast({ title: 'Skincare registrado', detail: 'Rutina agregada a registros recientes', tone: 'success' })
          }}
          icon={<Sparkles size={18} />}
        >
          Skincare
        </Button>
        <Button
          variant="secondary"
          onClick={() => saveRecreation('Creacion de contenido', 30)}
          icon={<Video size={18} />}
        >
          TikTok creativo
        </Button>
      </div>

      <section className="panel">
        <div className="panel-header">
          <h2>Recreacion y TikTok</h2>
          <span>Estos registros alimentan tiempo creativo, intencional y scroll automatico.</span>
        </div>
        <div className="form-grid two">
          <label>
            Tipo de uso
            <select value={recreationType} onChange={(event) => setRecreationType(event.target.value as RecreationLog['type'])}>
              <option>Creacion de contenido</option>
              <option>Consumo intencional</option>
              <option>Desplazamiento automatico</option>
            </select>
          </label>
          <label>
            Minutos
            <input type="number" min="1" value={recreationMinutes} onChange={(event) => setRecreationMinutes(Number(event.target.value))} />
          </label>
          <label>
            Como me senti despues
            <input value={recreationFeeling} onChange={(event) => setRecreationFeeling(event.target.value)} />
          </label>
          <div className="actions align-end">
            <Button onClick={() => saveRecreation()} icon={<Video size={18} />}>
              Guardar uso
            </Button>
            <Button variant="secondary" onClick={() => saveRecreation('Desplazamiento automatico', 10)}>
              Scroll +10 min
            </Button>
          </div>
        </div>
      </section>

      <div className="two-column">
        <section className="panel">
          <div className="panel-header">
            <h2>Sueno, energia y productividad</h2>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={sleepData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="horas" stroke="#2563eb" strokeWidth={2} />
              <Line type="monotone" dataKey="energia" stroke="#16a34a" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </section>
        <section className="panel">
          <div className="panel-header">
            <h2>Alimentacion consciente</h2>
          </div>
          <ResponsiveContainer width="100%" height={280}>
  <BarChart
    data={foodData}
    accessibilityLayer={false}
    margin={{ top: 10, right: 10, left: 0, bottom: 15 }}
  >
    <CartesianGrid strokeDasharray="3 3" />

    <XAxis
      dataKey="clave"
      tickFormatter={(clave) => {
        const registro = foodData.find(
          (item) => item.clave === String(clave),
        )

        return registro?.etiqueta ?? ''
      }}
      interval="preserveStartEnd"
    />

    <YAxis
      domain={[0, 5]}
      ticks={[0, 1, 2, 3, 4, 5]}
      allowDecimals={false}
    />

    <Tooltip
      trigger="hover"
      shared={false}
      cursor={{ fill: 'rgba(37, 99, 235, 0.08)' }}
      wrapperStyle={{
        zIndex: 1000,
        pointerEvents: 'none',
      }}
      labelFormatter={(clave) => {
        const registro = foodData.find(
          (item) => item.clave === String(clave),
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
      radius={[6, 6, 0, 0]}
      isAnimationActive={false}
    />

    <Bar
      dataKey="saciedad"
      name="Saciedad después"
      fill="#16a34a"
      radius={[6, 6, 0, 0]}
      isAnimationActive={false}
    />
  </BarChart>
</ResponsiveContainer>
        </section>
      </div>
      <section className="panel">
        <div className="panel-header">
          <h2>Recomendaciones personales</h2>
          <span>Calculadas con tu perfil y registros.</span>
        </div>
        <div className="insight-grid">
          {recommendations.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
        {lowMoodMotivation.length > 0 ? (
          <div className="mobile-card-list">
            {lowMoodMotivation.map((item) => (
              <article className="mobile-card" key={item.id}>
                <strong>{item.title}</strong>
                <span>{item.personalNote ?? item.url ?? 'Motivacion registrada'}</span>
              </article>
            ))}
          </div>
        ) : null}
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>Horarios de sueño</h2>
          <span>Últimos registros con horario de inicio, fin y duración.</span>
        </div>
        <div className="list">
          {recentSleepLogs.length === 0 ? (
            <p className="muted">No hay registros de sueño.</p>
          ) : (
            recentSleepLogs.map((log) => (
              <div key={log.id} className="list-row">
                <span>{formatDate(`${log.date}T00:00:00`)} ({log.date})</span>
                <strong>{`${formatTime(log.sleepAt)} - ${formatTime(log.wakeAt)}`}</strong>
                <span>{`${log.durationHours.toFixed(1)} h`}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Horarios de alimentación</h2>
          <span>Últimas comidas con hora y tipo de registro.</span>
        </div>
        <div className="list">
          {recentMealLogs.length === 0 ? (
            <p className="muted">No hay registros de alimentación.</p>
          ) : (
            recentMealLogs.map((meal) => (
              <div key={meal.id} className="list-row">
                <span>{formatDate(meal.dateTime)}</span>
                <strong>{formatTime(meal.dateTime)}</strong>
                <span>{meal.mealType}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <QuickActionModal open={quick} onClose={() => setQuick(false)} initialTab="meal" />
    </section>
  )
}

function PlusIcon() {
  return <Apple size={18} />
}
