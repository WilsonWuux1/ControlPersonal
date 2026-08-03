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
  const foodData = data.mealLogs.slice(-14).map((log) => ({ fecha: log.dateTime.slice(5, 10), hambre: log.hungerBefore, saciedad: log.satietyAfter }))
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
            <BarChart data={foodData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hambre" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              <Bar dataKey="saciedad" fill="#16a34a" radius={[6, 6, 0, 0]} />
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
          <h2>Registros recientes</h2>
          <span>Seguimiento personal de tus registros diarios.</span>
        </div>
        <div className="mobile-card-list">
          {[...data.sleepLogs, ...data.mealLogs, ...data.trainingLogs, ...data.careLogs, ...data.socialLogs, ...data.recreationLogs].slice(-12).map((item) => (
            <article key={item.id} className="mobile-card">
              <strong>{'date' in item ? item.date : item.dateTime.slice(0, 10)}</strong>
              <span>{'description' in item ? item.description : 'type' in item ? item.type : 'Registro'}</span>
            </article>
          ))}
        </div>
      </section>


      <QuickActionModal open={quick} onClose={() => setQuick(false)} initialTab="meal" />
    </section>
  )
}

function PlusIcon() {
  return <Apple size={18} />
}
