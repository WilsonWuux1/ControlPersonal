import { useState, type ReactElement } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  Coins,
  Dumbbell,
  Heart,
  Moon,
  Printer,
  Sparkles,
  Target,
  UserRound,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '../../components/Button'
import { useAppStore } from '../../stores/appStore'
import { calculateFinancialSummary } from '../../services/financeCalculations'
import { calculateHabitDayScore } from '../../services/habitScoring'
import { averageSleepHours } from '../../services/timeCalculations'
import { todayIso } from '../../utils/date'
import { formatCurrency, formatMinutes } from '../../utils/format'
import { bodyProfileSummary, getProfileSummary, motivationForLowMood, recommendationSeed } from '../../services/personalInsights'
import { generateDailyEvaluation } from '../../services/insights/evaluationEngine'
import { crossAreaPatterns } from '../../services/insights/crossAreaPatternEngine'
import { financeInsights } from '../../services/insights/financeInsightEngine'
import { studyInsights } from '../../services/insights/studyInsightEngine'

const clampPercent = (value: number): number => Math.min(100, Math.max(0, Math.round(value)))
const habitLineColors = ['#16a34a', '#2563eb', '#db2777', '#9333ea', '#e11d48', '#0f766e', '#0284c7']
const trackedHabitNames = ['Entrenamiento', 'Lectura', 'Cuidado personal y skincare', 'Meditacion', 'Tiempo de pareja', 'Trabajo productivo', 'Tiempo con familia o amigos']
const insightAreaLabels: Record<string, string> = {
  general: 'General',
  sleep: 'Sueno',
  energy: 'Energia',
  mood: 'Animo',
  activity: 'Actividad',
  food: 'Comida',
  work: 'Trabajo',
  study: 'Estudio',
  finance: 'Finanzas',
  recreation: 'Recreacion',
}
const patternStrengthLabels: Record<string, string> = {
  insufficient: 'Datos insuficientes',
  low: 'Senal inicial',
  medium: 'Patron posible',
  high: 'Patron fuerte',
}

const localDateKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const monthStart = (date: string): string => `${date.slice(0, 7)}-01`
const yearStart = (date: string): string => `${date.slice(0, 4)}-01-01`


const addDays = (date: Date, days: number): Date => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}
const datesBetween = (start: string, end: string): string[] => {
  const dates: string[] = []
  const current = new Date(`${start}T00:00:00`)
  const limit = new Date(`${end}T00:00:00`)
  while (current.getTime() <= limit.getTime()) {
    dates.push(localDateKey(current))
    current.setDate(current.getDate() + 1)
  }
  return dates
}
const average = (values: number[]): number => (values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)) : 0)
const sumNumbers = (values: number[]): number => values.reduce((sum, value) => sum + value, 0)
const dateFromIso = (value: string): string => {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? value.slice(0, 10)
    : localDateKey(date)
}
const shortDate = (value: string): string => value.slice(5)
const formatSignedCurrency = (value: number, currency: string): string => `${value >= 0 ? '+' : '-'}${formatCurrency(Math.abs(value), currency)}`

interface ReportMetric {
  label: string
  value: string
  detail: string
}

interface ReportSection {
  title: string
  body: string
}

interface PrintableReport {
  userName: string
  range: string
  generatedAt: string
  metrics: ReportMetric[]
  sections: ReportSection[]
}

type ProgressPeriod = 'today' | 'week' | 'month' | 'year' | 'custom'


const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const renderPrintableReport = (payload: PrintableReport): string => {
  const metrics = payload.metrics
    .map(
      (metric) => `
        <article class="metric">
          <span>${escapeHtml(metric.label)}</span>
          <strong>${escapeHtml(metric.value)}</strong>
          <p>${escapeHtml(metric.detail)}</p>
        </article>
      `,
    )
    .join('')
  const sections = payload.sections
    .map(
      (section) => `
        <section class="section">
          <h2>${escapeHtml(section.title)}</h2>
          <p>${escapeHtml(section.body)}</p>
        </section>
      `,
    )
    .join('')

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Informe Control Personal</title>
  <style>
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #111827;
      background: #ffffff;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
    }
    .document { width: 100%; }
    header {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 18px;
      padding-bottom: 14px;
      border-bottom: 2px solid #2563eb;
      margin-bottom: 18px;
    }
    .eyebrow {
      color: #2563eb;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    h1 {
      margin: 4px 0 6px;
      font-size: 24pt;
      line-height: 1.05;
    }
    .meta {
      color: #475569;
      text-align: right;
      font-size: 9pt;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 18px;
    }
    .metric {
      min-height: 78px;
      padding: 10px;
      border: 1px solid #dbe3ef;
      border-radius: 6px;
      background: #f8fafc;
      break-inside: avoid;
    }
    .metric span {
      display: block;
      color: #475569;
      font-size: 8.5pt;
      font-weight: 700;
    }
    .metric strong {
      display: block;
      margin-top: 4px;
      font-size: 15pt;
    }
    .metric p {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 8.5pt;
    }
    .section {
      padding: 12px 0;
      border-top: 1px solid #e2e8f0;
      break-inside: avoid;
    }
    .section h2 {
      margin: 0 0 6px;
      color: #0f172a;
      font-size: 13pt;
    }
    .section p {
      margin: 0;
      color: #334155;
    }
    footer {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 8.5pt;
    }
    @media screen {
      body { background: #e5e7eb; padding: 24px; }
      .document {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        padding: 18mm;
        background: #ffffff;
        box-shadow: 0 18px 45px rgba(15, 23, 42, .16);
      }
    }
  </style>
</head>
<body>
  <main class="document">
    <header>
      <div>
        <div class="eyebrow">Control Personal</div>
        <h1>Informe de progreso</h1>
        <p>${escapeHtml(payload.userName)}</p>
      </div>
      <div class="meta">
        <strong>Periodo</strong><br />
        ${escapeHtml(payload.range)}<br /><br />
        <strong>Generado</strong><br />
        ${escapeHtml(payload.generatedAt)}
      </div>
    </header>
    <section class="metrics">${metrics}</section>
    ${sections}
    <footer>
      Este informe resume tus registros locales del periodo seleccionado. Sirve para seguimiento personal y toma de decisiones practicas.
    </footer>
  </main>
</body>
</html>`
}

const printReport = (payload: PrintableReport): void => {
  const reportWindow = window.open('', '_blank')
  if (!reportWindow) {
    window.print()
    return
  }
  reportWindow.document.open()
  reportWindow.document.write(renderPrintableReport(payload))
  reportWindow.document.close()
  reportWindow.focus()
  window.setTimeout(() => reportWindow.print(), 250)
}

export function ProgressPage() {
  const data = useAppStore((state) => state.data)
  const [startDate, setStartDate] = useState(() => monthStart(todayIso()))
  const [endDate, setEndDate] = useState(() => todayIso())
  const [periodMode, setPeriodMode] = useState<ProgressPeriod>('month')
  const [periodOpen, setPeriodOpen] = useState(false)
  if (!data) return null

  const today = todayIso()
  const selectPeriod = (
  mode: Exclude<ProgressPeriod, 'custom'>,
) => {
  setPeriodMode(mode)
  setPeriodOpen(false)

  if (mode === 'today') {
    setStartDate(today)
    setEndDate(today)
    return
  }

  if (mode === 'week') {
    setStartDate(
      localDateKey(
        addDays(new Date(`${today}T00:00:00`), -6),
      ),
    )
    setEndDate(today)
    return
  }

  if (mode === 'month') {
    setStartDate(monthStart(today))
    setEndDate(today)
    return
  }

  setStartDate(yearStart(today))
  setEndDate(today)
}

const selectedPeriodStyle = {
  background: '#2563eb',
  borderColor: '#2563eb',
  color: '#ffffff',
}
  const safeStart = startDate <= endDate ? startDate : endDate
  const safeEnd = startDate <= endDate ? endDate : startDate
  const periodDates = datesBetween(safeStart, safeEnd)
  const analysisDates = periodDates.filter((date) => date <= today)
  const inRange = (date: string): boolean => date >= safeStart && date <= safeEnd

  const filteredHabitEntries = data.habitEntries.filter((entry) => inRange(entry.date))
  const filteredWorkSessions = data.workSessions.filter((session) => inRange(dateFromIso(session.startedAt)))
  const filteredSleepLogs = data.sleepLogs.filter((log) => inRange(log.date))
  const filteredMealLogs = data.mealLogs.filter((log) => inRange(dateFromIso(log.dateTime)))
  const filteredTrainingLogs = data.trainingLogs.filter((log) => inRange(dateFromIso(log.dateTime)))
  const filteredSocialLogs = data.socialLogs.filter((log) => inRange(dateFromIso(log.dateTime)))
  const filteredRecreationLogs = data.recreationLogs.filter((log) => inRange(dateFromIso(log.dateTime)))
  const filteredMovements = data.movements.filter((movement) => inRange(dateFromIso(movement.dateTime)))
  const filteredDailyCheckIns = data.dailyCheckIns.filter((item) => inRange(item.date))
  const filteredMoodEnergyLogs = data.moodEnergyLogs.filter((item) => inRange(item.date))
  const filteredWeightLogs = data.weightLogs.filter((log) => inRange(log.date)).toSorted((a, b) => a.dateTime.localeCompare(b.dateTime))

  const finance = calculateFinancialSummary(data.accounts, data.movements, data.funds, data.debts, data.obligations)
  const periodFinance = calculateFinancialSummary(data.accounts, filteredMovements, data.funds, data.debts, data.obligations)
  const habitDayScores = analysisDates.map((date) => calculateHabitDayScore(data.habits, data.habitEntries, date, data.settings.habitScoreWeights))
  const habitPercent = clampPercent(
    average(habitDayScores.map((score) => (score.possible ? (score.score / score.possible) * 100 : 0))),
  )
  const workMinutes = filteredWorkSessions.reduce((sum, session) => sum + session.effectiveMinutes, 0)
  const sleep = averageSleepHours(filteredSleepLogs)
  const socialMinutes = filteredSocialLogs.reduce((sum, item) => sum + item.durationMinutes, 0)
  const workouts = filteredTrainingLogs.length
  const profile = getProfileSummary(data.settings)
  const bodySummary = bodyProfileSummary({ ...data, sleepLogs: filteredSleepLogs, mealLogs: filteredMealLogs, trainingLogs: filteredTrainingLogs })
  const recommendations = recommendationSeed(data)
  const motivation = motivationForLowMood(data)
  const dailyEvaluation = generateDailyEvaluation(data)
  const patternInsights = [...crossAreaPatterns(data), ...studyInsights(data), ...financeInsights(data)].slice(0, 4)
  const plannedMeals = filteredMealLogs.length ? filteredMealLogs.filter((meal) => meal.planned).length / filteredMealLogs.length : 0
  const scrollMinutes = filteredRecreationLogs.filter((log) => log.type === 'Desplazamiento automatico').reduce((sum, log) => sum + log.durationMinutes, 0)
  const creativeMinutes = filteredRecreationLogs.filter((log) => log.type === 'Creacion de contenido').reduce((sum, log) => sum + log.durationMinutes, 0)
  const finishedWorkSessions = filteredWorkSessions.filter((session) => session.endedAt && session.result.trim().length > 0).length
  const averageFocus = average(filteredWorkSessions.map((session) => session.focusLevel).filter((focus) => focus > 0))
  const debtPaid = filteredMovements.filter((movement) => movement.type === 'Pago de deuda').reduce((sum, movement) => sum + movement.amount, 0)
  const obligationPaid = filteredMovements.filter((movement) => movement.type === 'Pago de obligacion').reduce((sum, movement) => sum + movement.amount, 0)
  const averageMood = average([...filteredDailyCheckIns.map((item) => item.mood), ...filteredMoodEnergyLogs.map((item) => item.mood)])
  const averageEnergy = average([...filteredDailyCheckIns.map((item) => item.energy), ...filteredMoodEnergyLogs.map((item) => item.energy)])

  const trackedHabits = trackedHabitNames
    .map((name) => data.habits.find((habit) => habit.name === name))
    .filter((habit): habit is NonNullable<typeof habit> => Boolean(habit))
  const consistencyData = periodDates.map((date) => {
    const dayScore = calculateHabitDayScore(data.habits, data.habitEntries, date, data.settings.habitScoreWeights)
    return {
      fecha: shortDate(date),
      consistencia: clampPercent(dayScore.possible ? (dayScore.score / dayScore.possible) * 100 : 0),
      minimos: clampPercent(dayScore.minimumPercent * 100),
      objetivos: clampPercent(dayScore.targetPercent * 100),
    }
  })
  const habitData = periodDates.map((date) => {
    const row: Record<string, string | number> = { fecha: shortDate(date) }
    for (const trackedHabit of trackedHabits) {
      const entry = filteredHabitEntries.find((item) => item.habitId === trackedHabit.id && item.date === date)
      row[trackedHabit.id] = entry ? clampPercent((entry.value / Math.max(1, trackedHabit.targetValue)) * 100) : 0
    }
    return row
  })
  const moodLogDates = new Set(filteredMoodEnergyLogs.map((item) => item.date))
  const moodEnergyData = [
    ...filteredDailyCheckIns
      .filter((item) => !moodLogDates.has(item.date))
      .map((item) => ({ dateTime: `${item.date}T12:00:00.000Z`, fecha: shortDate(item.date), energia: item.energy, animo: item.mood })),
    ...filteredMoodEnergyLogs.map((item) => ({ dateTime: item.dateTime, fecha: item.dateTime.slice(5, 16).replace('T', ' '), energia: item.energy, animo: item.mood })),
  ].toSorted((a, b) => a.dateTime.localeCompare(b.dateTime))
  const sleepTrendData = filteredSleepLogs
    .toSorted((a, b) => a.date.localeCompare(b.date))
    .map((log) => ({ fecha: shortDate(log.date), horas: log.durationHours, calidad: log.quality, energia: log.wakeEnergy }))
  const foodTrendData = filteredMealLogs
  .toSorted((a, b) => a.dateTime.localeCompare(b.dateTime))
  .map((log) => ({
    clave: log.id,
    etiqueta: new Date(log.dateTime).toLocaleString('es-GT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    hambre: Number(log.hungerBefore),
    saciedad: Number(log.satietyAfter),
    planificada: log.planned ? 5 : 0,
  }))
  const financeData = periodDates.map((date) => ({
    fecha: shortDate(date),
    ingresos: sumNumbers(filteredMovements.filter((movement) => dateFromIso(movement.dateTime) === date && (movement.type === 'Ingreso' || movement.type === 'Reembolso')).map((movement) => movement.amount)),
    gastos: sumNumbers(filteredMovements.filter((movement) => dateFromIso(movement.dateTime) === date && (movement.type === 'Gasto' || movement.type === 'Pago de deuda' || movement.type === 'Pago de obligacion')).map((movement) => movement.amount)),
  }))
  const tiktokData = ['Creacion de contenido', 'Consumo intencional', 'Desplazamiento automatico'].map((type) => ({
    type,
    minutos: filteredRecreationLogs.filter((log) => log.type === type).reduce((sum, log) => sum + log.durationMinutes, 0),
  }))
  const weightData = filteredWeightLogs.map((log) => ({
  clave: log.id,
  etiqueta: new Date(log.dateTime).toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }),
  peso: Number(log.weightLb),
}))

  const trainingMinutes = sumNumbers(
    filteredTrainingLogs.map(
      (log) => Number(log.durationMinutes) || 0,
    ),
  )

  const averageTrainingIntensity = average(
    filteredTrainingLogs
      .map((log) => Number(log.intensity))
      .filter((value) => value > 0),
  )

  const trainingTrendData = periodDates.map((date) => {
    const logs = filteredTrainingLogs.filter(
      (log) => dateFromIso(log.dateTime) === date,
    )

    return {
      fecha: shortDate(date),
      minutos: sumNumbers(
        logs.map(
          (log) => Number(log.durationMinutes) || 0,
        ),
      ),
      intensidad: logs.length
        ? average(
            logs
              .map((log) => Number(log.intensity))
              .filter((value) => value > 0),
          )
        : null,
      energiaAntes: logs.length
        ? average(
            logs
              .map((log) => Number(log.energyBefore))
              .filter((value) => value > 0),
          )
        : null,
      energiaDespues: logs.length
        ? average(
            logs
              .map((log) => Number(log.energyAfter))
              .filter((value) => value > 0),
          )
        : null,
    }
  })

  const workTrendData = periodDates.map((date) => {
    const sessions = filteredWorkSessions.filter(
      (session) =>
        dateFromIso(session.startedAt) === date,
    )

    return {
      fecha: shortDate(date),
      minutos: sumNumbers(
        sessions.map(
          (session) =>
            Number(session.effectiveMinutes) || 0,
        ),
      ),
      enfoque: sessions.length
        ? average(
            sessions
              .map((session) =>
                Number(session.focusLevel),
              )
              .filter((value) => value > 0),
          )
        : null,
    }
  })

  const socialTrendData = periodDates.map((date) => {
    const logs = filteredSocialLogs.filter(
      (log) => dateFromIso(log.dateTime) === date,
    )

    return {
      fecha: shortDate(date),
      minutos: sumNumbers(
        logs.map(
          (log) => Number(log.durationMinutes) || 0,
        ),
      ),
      calidad: logs.length
        ? average(
            logs
              .map((log) => Number(log.quality))
              .filter((value) => value > 0),
          )
        : null,
    }
  })

  const profileLine = `${profile.age ? `${profile.age} anos` : 'edad pendiente'}, ${profile.heightCm ? `${profile.heightCm} cm` : 'altura pendiente'}, ${profile.weightLb ? `${profile.weightLb} lb` : 'peso pendiente'}`
  const bmiReferenceLine =
    profile.bmiReferenceMin && profile.bmiReferenceMax ? `${profile.bmiReferenceMin}-${profile.bmiReferenceMax}` : 'Pendiente'
  const weightReferenceLine =
    profile.referenceWeightMinLb && profile.referenceWeightMaxLb ? `${profile.referenceWeightMinLb}-${profile.referenceWeightMaxLb} lb` : 'Pendiente'
  const targetWeightLine = profile.referenceWeightTargetLb ? `${profile.referenceWeightTargetLb} lb` : 'Pendiente'
  const distanceLine =
    profile.weightToReferenceLb === undefined
      ? 'Pendiente'
      : profile.weightToReferenceLb === 0
        ? 'En rango'
        : `${profile.weightToReferenceLb} lb fuera`
  const bmiPosition = profile.bodyMassIndex ? Math.min(100, Math.max(0, ((profile.bodyMassIndex - 15) / 25) * 100)) : undefined
  const workPercent = clampPercent((workMinutes / Math.max(1, analysisDates.length * 480)) * 100)
  const sleepPercent = clampPercent(data.settings.sleepGoalHours ? (sleep / data.settings.sleepGoalHours) * 100 : 0)
  const trainingPercent = workouts > 0 ? 100 : 0
  const mealPercent = clampPercent(plannedMeals * 100)
  const wellbeingPercent = clampPercent((sleepPercent + mealPercent + trainingPercent) / 3)
  const recreationPercent = creativeMinutes + scrollMinutes === 0 ? 0 : clampPercent((creativeMinutes / Math.max(creativeMinutes + scrollMinutes, 1)) * 100)
  const financePercent = clampPercent((finance.freeMoney > 0 ? 55 : 15) + (finance.debtPending === 0 ? 25 : 0) + (finance.obligationPending === 0 ? 20 : 0))
  const areaCards = [
    {
      title: 'Habitos',
      icon: <Target size={18} />,
      score: habitPercent,
      tone: habitPercent >= 80 ? 'good' : habitPercent >= 45 ? 'warn' : 'bad',
      value: `${habitPercent}%`,
      detail: `${new Set(filteredHabitEntries.map((entry) => entry.date)).size} dias con registros`,
      action: habitPercent >= 80 ? 'Sostener ritmo' : 'Completar minimo clave',
    },
    {
      title: 'Trabajo',
      icon: <BarChart3 size={18} />,
      score: workPercent,
      tone: workMinutes > analysisDates.length * 600 ? 'bad' : workPercent >= 75 ? 'good' : workPercent >= 25 ? 'warn' : 'quiet',
      value: formatMinutes(workMinutes),
      detail: `${finishedWorkSessions} sesiones finalizadas`,
      action: averageFocus >= 4 ? 'Buen enfoque' : 'Cerrar con resultado',
    },
    {
      title: 'Bienestar',
      icon: <Moon size={18} />,
      score: wellbeingPercent,
      tone: wellbeingPercent >= 75 ? 'good' : wellbeingPercent >= 45 ? 'warn' : 'bad',
      value: `${sleep} h`,
      detail: `${mealPercent}% comidas, ${workouts} entrenos`,
      action: sleepPercent < 80 ? 'Priorizar sueno' : 'Mantener rutina',
    },
    {
      title: 'Recreacion',
      icon: <Heart size={18} />,
      score: recreationPercent,
      tone: scrollMinutes > creativeMinutes && scrollMinutes > 0 ? 'bad' : recreationPercent >= 50 ? 'good' : 'quiet',
      value: formatMinutes(creativeMinutes),
      detail: `${formatMinutes(scrollMinutes)} scroll automatico`,
      action: scrollMinutes > creativeMinutes ? 'Cambiar scroll por intencional' : 'Recreacion bajo control',
    },
    {
      title: 'Finanzas',
      icon: <Coins size={18} />,
      score: financePercent,
      tone: finance.freeMoney < 0 ? 'bad' : financePercent >= 75 ? 'good' : financePercent >= 45 ? 'warn' : 'bad',
      value: formatCurrency(finance.freeMoney, data.settings.currency),
      detail: `Periodo ${formatSignedCurrency(periodFinance.netFlow, data.settings.currency)}`,
      action: finance.freeMoney < 0 ? 'Revisar gastos' : 'Mantener margen',
    },
  ]

 const weightChange: number | undefined =
  filteredWeightLogs.length >= 2
    ? Number(
        (
          Number(filteredWeightLogs.at(-1)?.weightLb ?? 0) -
          Number(filteredWeightLogs[0].weightLb ?? 0)
        ).toFixed(1),
      )
    : undefined

  const report = {
    overview:
      habitPercent >= 70
        ? `En este periodo vas con una consistencia de ${habitPercent}%. La base esta funcionando: conviene mantener los habitos que ya aparecen varias veces en el calendario y no subir dificultad demasiado rapido.`
        : `En este periodo vas con una consistencia de ${habitPercent}%. Lo mas util ahora es elegir dos o tres habitos base y repetirlos con una meta pequena antes de intentar cubrir todo.`,
    habits:
      trackedHabits.length === 0
        ? 'Todavia no hay habitos clave activos para comparar entrenamiento, lectura, cuidado personal, meditacion, pareja, trabajo y familia.'
        : `La grafica de habitos clave compara ${trackedHabits.length} areas dia por dia. Los dias sin registro quedan visibles en cero para que el mes no oculte huecos.`,
    body:
      profile.bodyMassIndex && profile.bmiCategory
        ? `${bodySummary.title} Tu IMC actual es ${profile.bodyMassIndex} y corresponde a ${profile.bmiCategory.toLowerCase()}. ${weightChange === undefined ? 'Desde ahora, cada peso registrado quedara en historial para ver tendencia.' : `En este rango tu peso cambio ${weightChange} lb.`}`
        : 'Completa fecha de nacimiento, altura y peso para que el informe pueda leer tu perfil corporal y mostrar tendencia de peso.',
    work:
      workMinutes > 0
        ? `Registraste ${formatMinutes(workMinutes)} de trabajo efectivo y ${finishedWorkSessions} sesiones finalizadas. ${averageFocus >= 4 ? 'El enfoque promedio fue alto.' : 'Conviene cerrar cada actividad con resultado y cuidar bloques mas cortos si el enfoque baja.'}`
        : 'No hay trabajo efectivo registrado en este rango. Un bloque corto con resultado concreto ya daria una referencia para comparar.',
    finances:
      `En finanzas el periodo quedo en ${formatSignedCurrency(periodFinance.netFlow, data.settings.currency)}: ingresos ${formatCurrency(periodFinance.income, data.settings.currency)} y salidas ${formatCurrency(periodFinance.expense, data.settings.currency)}. Pagaste ${formatCurrency(debtPaid, data.settings.currency)} en deudas y ${formatCurrency(obligationPaid, data.settings.currency)} en obligaciones. Tu dinero libre actual es ${formatCurrency(finance.freeMoney, data.settings.currency)}.`,
    wellbeing:
      sleep > 0
        ? `Tu sueno promedio fue ${sleep} h frente a una meta de ${data.settings.sleepGoalHours} h. ${mealPercent >= 70 ? 'La alimentacion planificada va bien.' : 'La alimentacion necesita mas registros planificados para encontrar un patron claro.'} Animo promedio ${averageMood || 'sin datos'} y energia promedio ${averageEnergy || 'sin datos'}.`
        : `No hay sueno registrado en este rango. Alimentacion planificada ${mealPercent}% y entrenamientos ${workouts}.`,
  }
  const printableReport: PrintableReport = {
    userName: data.settings.userName || 'Perfil personal',
    range: `${safeStart} a ${safeEnd}`,
    generatedAt: new Date().toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' }),
    metrics: [
      { label: 'Consistencia', value: `${habitPercent}%`, detail: `${new Set(filteredHabitEntries.map((entry) => entry.date)).size} dias con registros` },
      { label: 'Trabajo efectivo', value: formatMinutes(workMinutes), detail: `${finishedWorkSessions} sesiones finalizadas` },
      { label: 'Sueno promedio', value: `${sleep} h`, detail: `Meta personal ${data.settings.sleepGoalHours} h` },
      { label: 'Animo promedio', value: averageMood ? `${averageMood}/5` : 'Sin datos', detail: `Energia ${averageEnergy ? `${averageEnergy}/5` : 'sin datos'}` },
      { label: 'Balance periodo', value: formatSignedCurrency(periodFinance.netFlow, data.settings.currency), detail: `Ingresos ${formatCurrency(periodFinance.income, data.settings.currency)}` },
      { label: 'Dinero libre actual', value: formatCurrency(finance.freeMoney, data.settings.currency), detail: `Deuda ${formatCurrency(finance.debtPending, data.settings.currency)}` },
    ],
    sections: [
      { title: 'Lectura general', body: report.overview },
      { title: 'Habitos', body: report.habits },
      { title: 'Perfil y peso', body: report.body },
      { title: 'Trabajo', body: report.work },
      { title: 'Finanzas', body: report.finances },
      { title: 'Sueno, animo y alimentacion', body: report.wellbeing },
    ],
  }

  return (
    <section className="page progress-analysis-page">
      <section className="progress-analysis-toolbar no-print">
        <button
          type="button"
          className="progress-period-trigger"
          aria-expanded={periodOpen}
          aria-controls="progress-period-controls"
          onClick={() =>
            setPeriodOpen((current) => !current)
          }
        >
          <div>
            <span>Periodo de análisis</span>

            <strong>
              {periodMode === 'today' && 'Hoy'}
              {periodMode === 'week' && 'Últimos 7 días'}
              {periodMode === 'month' && 'Mes actual'}
              {periodMode === 'year' && 'Año actual'}
              {periodMode === 'custom' && 'Personalizado'}
            </strong>

            <small>
              {safeStart === safeEnd
                ? safeStart
                : `${safeStart} al ${safeEnd}`}
            </small>
          </div>

          <div className="progress-period-trigger__icons">
            <CalendarDays
              size={18}
              aria-hidden="true"
            />

            <ChevronDown
              size={18}
              className={periodOpen ? 'is-open' : undefined}
              aria-hidden="true"
            />
          </div>
        </button>

        <Button
          variant="secondary"
          className="progress-print-button"
          aria-label="Generar reporte PDF"
          title="Generar reporte PDF"
          onClick={() =>
            printReport(printableReport)
          }
          icon={<Printer size={17} aria-hidden="true" />}
        >
          PDF
        </Button>

        {periodOpen ? (
          <div
            id="progress-period-controls"
            className="progress-period-controls"
          >
            <div className="progress-period-options">
              <Button
                variant="secondary"
                style={
                  periodMode === 'today'
                    ? selectedPeriodStyle
                    : undefined
                }
                onClick={() => selectPeriod('today')}
              >
                Hoy
              </Button>

              <Button
                variant="secondary"
                style={
                  periodMode === 'week'
                    ? selectedPeriodStyle
                    : undefined
                }
                onClick={() => selectPeriod('week')}
              >
                Semana
              </Button>

              <Button
                variant="secondary"
                style={
                  periodMode === 'month'
                    ? selectedPeriodStyle
                    : undefined
                }
                onClick={() => selectPeriod('month')}
              >
                Mes
              </Button>

              <Button
                variant="secondary"
                style={
                  periodMode === 'year'
                    ? selectedPeriodStyle
                    : undefined
                }
                onClick={() => selectPeriod('year')}
              >
                Año
              </Button>

              <Button
                variant="secondary"
                className="progress-period-custom-button"
                style={
                  periodMode === 'custom'
                    ? selectedPeriodStyle
                    : undefined
                }
                onClick={() =>
                  setPeriodMode('custom')
                }
              >
                Personalizado
              </Button>
            </div>

            {periodMode === 'custom' ? (
              <div className="progress-custom-dates">
                <label>
                  Fecha inicial

                  <input
                    type="date"
                    value={startDate}
                    max={endDate}
                    onChange={(event) =>
                      setStartDate(
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  Fecha final

                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    max={today}
                    onChange={(event) =>
                      setEndDate(
                        event.target.value,
                      )
                    }
                  />
                </label>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="panel progress-evaluation-panel">
        <div className="progress-evaluation-main">
          <span>Evaluacion personal</span>
          <h2>{dailyEvaluation.title}</h2>
          <p>{dailyEvaluation.message}</p>
          <div>
            <strong>Que hacer ahora</strong>
            <p>{dailyEvaluation.mainAction}</p>
          </div>
          <details>
            <summary>Que estoy tomando en cuenta</summary>
            <ul>
              {dailyEvaluation.evidence.slice(0, 5).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
        </div>
        {patternInsights.length > 0 ? (
          <div className="progress-pattern-grid">
            {patternInsights.map((insight) => (
              <article key={insight.id}>
                <span>{patternStrengthLabels[insight.confidence]} / {insightAreaLabels[insight.area]}</span>
                <strong>{insight.title}</strong>
                <p>{insight.message}</p>
                {insight.action ? <small>{insight.action}</small> : null}
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section
        className="progress-analysis-kpis"
        aria-label="Resumen del periodo"
      >
        <article className="progress-analysis-kpi tone-blue">
          <span className="progress-analysis-kpi__icon">
            <Target size={17} aria-hidden="true" />
          </span>

          <span>Hábitos</span>
          <strong>{habitPercent}%</strong>
          <small>
            {
              new Set(
                filteredHabitEntries.map(
                  (entry) => entry.date,
                ),
              ).size
            }{' '}
            días
          </small>
        </article>

        <article className="progress-analysis-kpi tone-violet">
          <span className="progress-analysis-kpi__icon">
            <BarChart3 size={17} aria-hidden="true" />
          </span>

          <span>Trabajo</span>
          <strong>
            {formatMinutes(workMinutes)}
          </strong>
          <small>
            {finishedWorkSessions} sesiones
          </small>
        </article>

        <article className="progress-analysis-kpi tone-indigo">
          <span className="progress-analysis-kpi__icon">
            <Moon size={17} aria-hidden="true" />
          </span>

          <span>Sueño</span>
          <strong>{sleep} h</strong>
          <small>
            Meta {data.settings.sleepGoalHours} h
          </small>
        </article>

        <article className="progress-analysis-kpi tone-green">
          <span className="progress-analysis-kpi__icon">
            <Dumbbell
              size={17}
              aria-hidden="true"
            />
          </span>

          <span>Entrenos</span>
          <strong>{workouts}</strong>
          <small>En el periodo</small>
        </article>

        <article className="progress-analysis-kpi tone-gold">
          <span className="progress-analysis-kpi__icon">
            <Heart size={17} aria-hidden="true" />
          </span>

          <span>Vida social</span>
          <strong>
            {formatMinutes(socialMinutes)}
          </strong>
          <small>Tiempo registrado</small>
        </article>

        <article className="progress-analysis-kpi tone-slate">
          <span className="progress-analysis-kpi__icon">
            <Coins size={17} aria-hidden="true" />
          </span>

          <span>Dinero libre</span>
          <strong>
            {formatCurrency(
              finance.freeMoney,
              data.settings.currency,
            )}
          </strong>
          <small>
            Flujo{' '}
            {formatSignedCurrency(
              periodFinance.netFlow,
              data.settings.currency,
            )}
          </small>
        </article>
      </section>

      <section className="panel progress-area-overview">
        <div className="progress-analysis-section-heading">
          <div>
            <span>Lectura rápida</span>
            <h2>Estado por área</h2>
          </div>

          <CalendarDays
            size={19}
            aria-hidden="true"
          />
        </div>

        <div className="progress-area-grid">
          {areaCards.map((area) => (
            <article
              className={`progress-area-card area-${area.tone}`}
              key={area.title}
            >
              <header>
                <span>{area.icon}</span>
                <strong>{area.title}</strong>
                <b>{area.score}%</b>
              </header>

              <div className="progress-area-card__value">
                {area.value}
              </div>

              <div
                className="progress-area-card__bar"
                role="progressbar"
                aria-label={`${area.title} ${area.score}%`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={area.score}
              >
                <span
                  style={{
                    width: `${area.score}%`,
                  }}
                />
              </div>

              <footer>
                <span>{area.detail}</span>
                <strong>{area.action}</strong>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <section className="progress-chart-section">
        <div className="progress-analysis-section-heading progress-chart-section__heading">
          <div>
            <span>Comportamiento diario</span>
            <h2>Hábitos y consistencia</h2>
          </div>
        </div>

        <div className="progress-chart-grid">
          <ChartPanel
            title="Consistencia del periodo"
            subtitle="Consistencia general, mínimos y objetivos"
            className="progress-chart-wide"
            height={245}
          >
            <LineChart
              data={consistencyData}
              margin={{
                top: 8,
                right: 10,
                left: -16,
                bottom: 0,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="fecha"
                interval="preserveStartEnd"
                tick={{ fontSize: 10 }}
              />

              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(value) =>
                  `${value}%`
                }
                tick={{ fontSize: 10 }}
              />

              <Tooltip
                formatter={(value) =>
                  `${Number(value)}%`
                }
              />

              <Legend
                wrapperStyle={{
                  fontSize: '11px',
                  paddingTop: '6px',
                }}
              />

              <Line
                type="monotone"
                dataKey="consistencia"
                name="Consistencia"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />

              <Line
                type="monotone"
                dataKey="minimos"
                name="Mínimos"
                stroke="#16a34a"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />

              <Line
                type="monotone"
                dataKey="objetivos"
                name="Objetivos"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartPanel>

          <ChartPanel
            title="Hábitos clave"
            subtitle={
              trackedHabits.length > 0
                ? `${trackedHabits.length} hábitos comparados contra su meta`
                : 'Sin hábitos clave disponibles'
            }
            className="progress-chart-wide"
            height={255}
          >
            <LineChart
              data={habitData}
              margin={{
                top: 8,
                right: 10,
                left: -16,
                bottom: 0,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="fecha"
                interval="preserveStartEnd"
                tick={{ fontSize: 10 }}
              />

              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(value) =>
                  `${value}%`
                }
                tick={{ fontSize: 10 }}
              />

              <Tooltip
                formatter={(value) =>
                  `${Number(value)}%`
                }
              />

              <Legend
                wrapperStyle={{
                  fontSize: '10px',
                  paddingTop: '6px',
                }}
              />

              {trackedHabits.map(
                (trackedHabit, index) => (
                  <Line
                    key={trackedHabit.id}
                    type="monotone"
                    dataKey={trackedHabit.id}
                    name={trackedHabit.name}
                    stroke={
                      habitLineColors[
                        index %
                          habitLineColors.length
                      ]
                    }
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                ),
              )}
            </LineChart>
          </ChartPanel>
        </div>
      </section>

      <section className="progress-chart-section">
        <div className="progress-analysis-section-heading progress-chart-section__heading">
          <div>
            <span>Actividad y rendimiento</span>
            <h2>Trabajo, entrenamiento y vida personal</h2>
          </div>
        </div>

        <div className="progress-chart-grid">
          <ChartPanel
            title="Entrenamientos"
            subtitle={
              filteredTrainingLogs.length > 0
                ? `${formatMinutes(
                    trainingMinutes,
                  )} · ${filteredTrainingLogs.length} sesiones · intensidad media ${
                    averageTrainingIntensity || '—'
                  }/5`
                : 'Sin entrenamientos registrados en el periodo'
            }
            className="progress-chart-wide"
            height={255}
          >
            <ComposedChart
              data={trainingTrendData}
              margin={{
                top: 8,
                right: 4,
                left: -14,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="fecha"
                interval="preserveStartEnd"
                tick={{ fontSize: 10 }}
              />

              <YAxis
                yAxisId="minutes"
                tick={{ fontSize: 10 }}
              />

              <YAxis
                yAxisId="score"
                orientation="right"
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
                allowDecimals={false}
                tick={{ fontSize: 10 }}
                width={24}
              />

              <Tooltip
                formatter={(value, name) => [
                  String(name) === 'Minutos'
                    ? formatMinutes(Number(value))
                    : `${Number(value).toFixed(1)}/5`,
                  String(name),
                ]}
              />

              <Legend
                wrapperStyle={{
                  fontSize: '10px',
                  paddingTop: '6px',
                }}
              />

              <Bar
                yAxisId="minutes"
                dataKey="minutos"
                name="Minutos"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />

              <Line
                yAxisId="score"
                type="monotone"
                dataKey="intensidad"
                name="Intensidad"
                stroke="#f59e0b"
                strokeWidth={2}
                connectNulls
                dot={{ r: 3 }}
                isAnimationActive={false}
              />

              <Line
                yAxisId="score"
                type="monotone"
                dataKey="energiaAntes"
                name="Energía antes"
                stroke="#7c3aed"
                strokeWidth={2}
                connectNulls
                dot={false}
                isAnimationActive={false}
              />

              <Line
                yAxisId="score"
                type="monotone"
                dataKey="energiaDespues"
                name="Energía después"
                stroke="#16a34a"
                strokeWidth={2}
                connectNulls
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ChartPanel>

          <ChartPanel
            title="Trabajo efectivo"
            subtitle={`${formatMinutes(
              workMinutes,
            )} · enfoque medio ${
              averageFocus || '—'
            }/5`}
            height={235}
          >
            <ComposedChart
              data={workTrendData}
              margin={{
                top: 8,
                right: 4,
                left: -14,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="fecha"
                interval="preserveStartEnd"
                tick={{ fontSize: 10 }}
              />

              <YAxis
                yAxisId="minutes"
                tick={{ fontSize: 10 }}
              />

              <YAxis
                yAxisId="score"
                orientation="right"
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
                allowDecimals={false}
                tick={{ fontSize: 10 }}
                width={24}
              />

              <Tooltip
                formatter={(value, name) => [
                  String(name) === 'Minutos efectivos'
                    ? formatMinutes(Number(value))
                    : `${Number(value).toFixed(1)}/5`,
                  String(name),
                ]}
              />

              <Legend
                wrapperStyle={{
                  fontSize: '10px',
                  paddingTop: '6px',
                }}
              />

              <Bar
                yAxisId="minutes"
                dataKey="minutos"
                name="Minutos efectivos"
                fill="#0f766e"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />

              <Line
                yAxisId="score"
                type="monotone"
                dataKey="enfoque"
                name="Enfoque"
                stroke="#7c3aed"
                strokeWidth={2}
                connectNulls
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ChartPanel>

          <ChartPanel
            title="Vida personal y social"
            subtitle={`${formatMinutes(
              socialMinutes,
            )} registrados en el periodo`}
            height={235}
          >
            <ComposedChart
              data={socialTrendData}
              margin={{
                top: 8,
                right: 4,
                left: -14,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="fecha"
                interval="preserveStartEnd"
                tick={{ fontSize: 10 }}
              />

              <YAxis
                yAxisId="minutes"
                tick={{ fontSize: 10 }}
              />

              <YAxis
                yAxisId="score"
                orientation="right"
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
                allowDecimals={false}
                tick={{ fontSize: 10 }}
                width={24}
              />

              <Tooltip
                formatter={(value, name) => [
                  String(name) === 'Minutos'
                    ? formatMinutes(Number(value))
                    : `${Number(value).toFixed(1)}/5`,
                  String(name),
                ]}
              />

              <Legend
                wrapperStyle={{
                  fontSize: '10px',
                  paddingTop: '6px',
                }}
              />

              <Bar
                yAxisId="minutes"
                dataKey="minutos"
                name="Minutos"
                fill="#db2777"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />

              <Line
                yAxisId="score"
                type="monotone"
                dataKey="calidad"
                name="Calidad"
                stroke="#2563eb"
                strokeWidth={2}
                connectNulls
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ChartPanel>
        </div>
      </section>

      <section className="progress-chart-section">
        <div className="progress-analysis-section-heading progress-chart-section__heading">
          <div>
            <span>Bienestar y cuerpo</span>
            <h2>Estado físico y emocional</h2>
          </div>
        </div>

        <div className="progress-chart-grid">
          <ChartPanel
            title="Energía y ánimo"
            subtitle={`Promedio: energía ${
              averageEnergy || '—'
            } · ánimo ${averageMood || '—'}`}
            height={225}
          >
            <LineChart
              data={moodEnergyData}
              margin={{
                top: 8,
                right: 10,
                left: -20,
                bottom: 0,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="fecha"
                interval="preserveStartEnd"
                tick={{ fontSize: 10 }}
              />

              <YAxis
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
                tick={{ fontSize: 10 }}
              />

              <Tooltip />

              <Legend
                wrapperStyle={{
                  fontSize: '10px',
                  paddingTop: '6px',
                }}
              />

              <Line
                type="monotone"
                dataKey="energia"
                name="Energía"
                stroke="#16a34a"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />

              <Line
                type="monotone"
                dataKey="animo"
                name="Ánimo"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartPanel>

          <ChartPanel
            title="Sueño"
            subtitle={`Promedio ${sleep} h · meta ${data.settings.sleepGoalHours} h`}
            height={225}
          >
            <LineChart
              data={sleepTrendData}
              margin={{
                top: 8,
                right: 10,
                left: -20,
                bottom: 0,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="fecha"
                interval="preserveStartEnd"
                tick={{ fontSize: 10 }}
              />

              <YAxis tick={{ fontSize: 10 }} />

              <Tooltip />

              <Legend
                wrapperStyle={{
                  fontSize: '10px',
                  paddingTop: '6px',
                }}
              />

              <Line
                type="monotone"
                dataKey="horas"
                name="Horas"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />

              <Line
                type="monotone"
                dataKey="calidad"
                name="Calidad"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />

              <Line
                type="monotone"
                dataKey="energia"
                name="Energía al despertar"
                stroke="#16a34a"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartPanel>

          <ChartPanel
            title="Alimentación consciente"
            subtitle={`Planificadas ${mealPercent}% · hambre y saciedad en escala 0–5`}
            height={240}
          >
            <LineChart
              data={foodTrendData}
              margin={{
                top: 8,
                right: 10,
                left: -20,
                bottom: 0,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="clave"
                interval="preserveStartEnd"
                tick={{ fontSize: 10 }}
                tickFormatter={(clave) => {
                  const registro =
                    foodTrendData.find(
                      (item) =>
                        item.clave ===
                        String(clave),
                    )

                  return registro?.etiqueta.slice(
                    0,
                    5,
                  ) ?? ''
                }}
              />

              <YAxis
                domain={[0, 5]}
                ticks={[0, 1, 2, 3, 4, 5]}
                allowDecimals={false}
                tick={{ fontSize: 10 }}
              />

              <Tooltip
                cursor={{
                  stroke: '#94a3b8',
                  strokeDasharray: '3 3',
                }}
                wrapperStyle={{
                  zIndex: 1000,
                  pointerEvents: 'none',
                }}
                labelFormatter={(clave) => {
                  const registro =
                    foodTrendData.find(
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

              <Legend
                wrapperStyle={{
                  fontSize: '10px',
                  paddingTop: '6px',
                }}
              />

              <Line
                dataKey="hambre"
                name="Hambre"
                type="monotone"
                stroke="#f59e0b"
                strokeWidth={2}
                isAnimationActive={false}
                dot={{
                  r: 3,
                  stroke: '#f59e0b',
                  strokeWidth: 2,
                  fill: '#fff',
                }}
                activeDot={{
                  r: 6,
                  stroke: '#f59e0b',
                  strokeWidth: 2,
                  fill: '#fff',
                }}
              />

              <Line
                dataKey="saciedad"
                name="Saciedad"
                type="monotone"
                stroke="#16a34a"
                strokeWidth={2}
                isAnimationActive={false}
                dot={{
                  r: 3,
                  stroke: '#16a34a',
                  strokeWidth: 2,
                  fill: '#fff',
                }}
                activeDot={{
                  r: 6,
                  stroke: '#16a34a',
                  strokeWidth: 2,
                  fill: '#fff',
                }}
              />

              <Line
                dataKey="planificada"
                name="Planificada"
                type="monotone"
                stroke="#2563eb"
                strokeWidth={2}
                isAnimationActive={false}
                dot={false}
              />
            </LineChart>
          </ChartPanel>

          <ChartPanel
            title="Peso"
            subtitle={
              weightChange === undefined
                ? 'Registra al menos dos pesos para ver el cambio'
                : `Cambio del periodo: ${
                    weightChange >= 0 ? '+' : ''
                  }${weightChange} lb`
            }
            height={240}
          >
            <LineChart
              data={weightData}
              margin={{
                top: 8,
                right: 10,
                left: -10,
                bottom: 0,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="clave"
                interval="preserveStartEnd"
                tick={{ fontSize: 10 }}
                tickFormatter={(clave) => {
                  const registro =
                    weightData.find(
                      (item) =>
                        item.clave ===
                        String(clave),
                    )

                  return registro?.etiqueta.slice(
                    0,
                    5,
                  ) ?? ''
                }}
              />

              <YAxis
                domain={[
                  'dataMin - 5',
                  'dataMax + 5',
                ]}
                tick={{ fontSize: 10 }}
              />

              <Tooltip
                cursor={{
                  stroke: '#94a3b8',
                  strokeDasharray: '3 3',
                }}
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
                  `${Number(value).toFixed(
                    1,
                  )} lb`,
                  'Peso',
                ]}
              />

              <Line
                dataKey="peso"
                name="Peso"
                type="monotone"
                stroke="#0f766e"
                strokeWidth={3}
                isAnimationActive={false}
                dot={{
                  r: 4,
                  stroke: '#0f766e',
                  strokeWidth: 2,
                  fill: '#fff',
                }}
                activeDot={{
                  r: 7,
                  stroke: '#0f766e',
                  strokeWidth: 3,
                  fill: '#fff',
                }}
              />
            </LineChart>
          </ChartPanel>
        </div>
      </section>

      <section className="progress-chart-section">
        <div className="progress-analysis-section-heading progress-chart-section__heading">
          <div>
            <span>Recursos y uso del tiempo</span>
            <h2>Finanzas y recreación</h2>
          </div>
        </div>

        <div className="progress-chart-grid">
          <ChartPanel
            title="Ingresos y gastos"
            subtitle={`Balance del periodo ${formatSignedCurrency(
              periodFinance.netFlow,
              data.settings.currency,
            )}`}
            height={230}
          >
            <BarChart
              data={financeData}
              margin={{
                top: 8,
                right: 8,
                left: -12,
                bottom: 0,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="fecha"
                interval="preserveStartEnd"
                tick={{ fontSize: 10 }}
              />

              <YAxis tick={{ fontSize: 10 }} />

              <Tooltip
                formatter={(value, name) => [
                  formatCurrency(
                    Number(value),
                    data.settings.currency,
                  ),
                  String(name),
                ]}
              />

              <Legend
                wrapperStyle={{
                  fontSize: '10px',
                  paddingTop: '6px',
                }}
              />

              <Bar
                dataKey="ingresos"
                name="Ingresos"
                fill="#16a34a"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />

              <Bar
                dataKey="gastos"
                name="Gastos"
                fill="#dc2626"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartPanel>

          <ChartPanel
            title="TikTok por tipo"
            subtitle={`${formatMinutes(
              creativeMinutes,
            )} creativo · ${formatMinutes(
              scrollMinutes,
            )} scroll`}
            height={230}
          >
            <BarChart
              data={tiktokData}
              margin={{
                top: 8,
                right: 8,
                left: -18,
                bottom: 12,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="type"
                tick={{ fontSize: 9 }}
                interval={0}
                tickFormatter={(value) => {
                  if (
                    value ===
                    'Creacion de contenido'
                  ) {
                    return 'Creación'
                  }

                  if (
                    value ===
                    'Consumo intencional'
                  ) {
                    return 'Intencional'
                  }

                  return 'Scroll'
                }}
              />

              <YAxis tick={{ fontSize: 10 }} />

              <Tooltip
                formatter={(value) =>
                  formatMinutes(Number(value))
                }
              />

              <Bar
                dataKey="minutos"
                name="Minutos"
                fill="#2563eb"
                radius={[5, 5, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartPanel>
        </div>
      </section>

      <section className="panel progress-personal-reading">
        <div className="progress-analysis-section-heading">
          <div>
            <span>Contexto personal</span>
            <h2>Lectura personal</h2>
          </div>

          <Sparkles size={19} aria-hidden="true" />
        </div>

        <div className="progress-personal-grid">
          <article className="progress-profile-compact">
            <header>
              <span>
                <UserRound
                  size={18}
                  aria-hidden="true"
                />
              </span>

              <div>
                <strong>Perfil base</strong>
                <small>{profileLine}</small>
              </div>
            </header>

            <div className="bmi-scale-card">
              <div className="bmi-scale-heading">
                <span>IMC actual</span>
                <strong>
                  {profile.bodyMassIndex ?? '--'}
                </strong>
              </div>

              <div
                className="bmi-scale"
                aria-label="Escala visual de IMC"
              >
                <span className="bmi-segment bmi-low">
                  Bajo
                </span>

                <span className="bmi-segment bmi-reference">
                  Referencia
                </span>

                <span className="bmi-segment bmi-over">
                  Sobre
                </span>

                <span className="bmi-segment bmi-high">
                  Obesidad
                </span>

                {bmiPosition !== undefined ? (
                  <span
                    className="bmi-marker"
                    style={{
                      left: `${bmiPosition}%`,
                    }}
                  />
                ) : null}
              </div>

              <div className="bmi-scale-labels">
                <span>18.5</span>
                <span>24.9</span>
                <span>30</span>
              </div>
            </div>

            <div className="progress-body-mini-grid">
              <div>
                <span>IMC ideal</span>
                <strong>
                  {profile.bmiReferenceTarget ??
                    'Pendiente'}
                </strong>
              </div>

              <div>
                <span>Rango IMC</span>
                <strong>{bmiReferenceLine}</strong>
              </div>

              <div>
                <span>Rango peso</span>
                <strong>
                  {weightReferenceLine}
                </strong>
              </div>

              <div>
                <span>Peso estimado</span>
                <strong>{targetWeightLine}</strong>
              </div>

              <div className="progress-body-mini-wide">
                <span>Distancia al rango</span>
                <strong>{distanceLine}</strong>
              </div>
            </div>

            <div className="progress-profile-links">
              <Link
                className="button button-secondary"
                to="/configuracion"
              >
                Editar perfil
              </Link>

              <Link
                className="button button-secondary"
                to="/bienestar"
              >
                Bienestar
              </Link>

              <Link
                className="button button-secondary"
                to="/motivacion"
              >
                Motivación
              </Link>
            </div>
          </article>

          <div className="progress-insight-list">
            <article className="progress-insight-card is-primary">
              <strong>{bodySummary.title}</strong>
              <p>{bodySummary.description}</p>
            </article>

            {recommendations
              .slice(0, 4)
              .map((item) => (
                <article
                  className="progress-insight-card"
                  key={item}
                >
                  <p>{item}</p>
                </article>
              ))}
          </div>
        </div>

        {motivation.length > 0 ? (
          <div className="progress-motivation-compact">
            <strong>Motivación disponible</strong>

            <div>
              {motivation
                .slice(0, 3)
                .map((item) => (
                  <article key={item.id}>
                    <strong>{item.title}</strong>
                    <span>
                      {item.personalNote ??
                        item.url ??
                        'Motivación guardada'}
                    </span>
                  </article>
                ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="panel progress-conclusions">
        <div className="progress-analysis-section-heading">
          <div>
            <span>Interpretación automática</span>
            <h2>Conclusiones del periodo</h2>
          </div>

          <span className="progress-range-label">
            {safeStart} · {safeEnd}
          </span>
        </div>

        <div className="progress-conclusion-grid">
          {[
            ['Lectura general', report.overview],
            ['Hábitos', report.habits],
            ['Perfil y peso', report.body],
            ['Trabajo', report.work],
            ['Finanzas', report.finances],
            [
              'Sueño, ánimo y alimentación',
              report.wellbeing,
            ],
          ].map(([title, body]) => (
            <article key={title}>
              <strong>{title}</strong>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}

function ChartPanel({
  title,
  subtitle,
  children,
  className = '',
  height = 230,
}: {
  title: string
  subtitle?: string
  children: ReactElement
  className?: string
  height?: number
}) {
  return (
    <section
      className={`panel progress-analysis-chart ${className}`}
    >
      <div className="progress-analysis-chart__header">
        <div>
          <h3>{title}</h3>

          {subtitle ? (
            <span>{subtitle}</span>
          ) : null}
        </div>
      </div>

      <div className="progress-analysis-chart__canvas">
        <ResponsiveContainer
          width="100%"
          height={height}
        >
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  )
}
