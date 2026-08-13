import { describe, expect, it } from 'vitest'
import type { AppData, Budget, Debt, FinancialAccount, FinancialMovement, Fund, Habit, HabitEntry, Obligation } from '../types/domain'
import {
  applyDebtPayment,
  applyObligationPayment,
  budgetSpent,
  calculateAccountBalances,
  calculateFinancialSummary,
  distributePaycheck,
  movementImpactForAccount,
  transferIsNeutral,
} from './financeCalculations'
import { calculateHabitDayScore, dayColor, statusFromValue } from './habitScoring'
import { calculateSleepDurationHours, calculateWorkSessionDuration } from './timeCalculations'
import { detectDuplicateIds, normalizeAppData } from './backupService'
import { bodyProfileSummary, getProfileSummary } from './personalInsights'
import { createDefaultSettings } from '../db/initialData'
import { createLinkedTrainingHabitEntry, isTrainingHabitName } from './linkedActivities'
import { calculateHydrationGuidance } from './hydrationGuidance'
import { confidenceFromSample, numericBaseline } from './insights/baselineEngine'
import { classifyMealText } from './insights/foodInsightEngine'
import { buildActivityProfile } from './insights/activityEngine'
import { studyInsights } from './insights/studyInsightEngine'

const stamp = '2026-08-03T12:00:00.000Z'

const account = (id: string, openingBalance: number): FinancialAccount => ({
  id,
  createdAt: stamp,
  updatedAt: stamp,
  schemaVersion: 1,
  name: id,
  type: 'Cuenta bancaria',
  currency: 'GTQ',
  openingBalance,
  status: 'active',
  color: '#2563eb',
  icon: 'Landmark',
})

const movement = (input: Partial<FinancialMovement> & Pick<FinancialMovement, 'id' | 'accountId' | 'type' | 'amount'>): FinancialMovement => ({
  createdAt: stamp,
  updatedAt: stamp,
  schemaVersion: 1,
  dateTime: stamp,
  category: 'Comida',
  description: input.id,
  tags: [],
  ...input,
})

const habit = (id: string): Habit => ({
  id,
  createdAt: stamp,
  updatedAt: stamp,
  schemaVersion: 1,
  name: 'Entrenamiento',
  description: '',
  category: 'Esenciales',
  icon: 'Dumbbell',
  unit: 'minutos',
  minimumValue: 5,
  targetValue: 30,
  excellentValue: 45,
  frequency: 'daily',
  specificDays: [0, 1, 2, 3, 4, 5, 6],
  startDate: '2026-08-01',
  status: 'active',
  weight: 1,
  color: '#2563eb',
  order: 1,
})

const habitEntry = (id: string, habitId: string, value: number): HabitEntry => ({
  id,
  habitId,
  value,
  status: 'target',
  date: '2026-08-03',
  createdAt: stamp,
  updatedAt: stamp,
  schemaVersion: 1,
})

const budget = (category: string, amount: number): Budget => ({
  id: `budget-${category}`,
  createdAt: stamp,
  updatedAt: stamp,
  schemaVersion: 1,
  name: category,
  category,
  period: 'monthly',
  amount,
  rollover: false,
  alertPercent: 85,
  status: 'active',
})

const debt = (): Debt => ({
  id: 'debt-1',
  createdAt: stamp,
  updatedAt: stamp,
  schemaVersion: 1,
  creditor: 'Banco',
  name: 'Tarjeta',
  originalAmount: 1000,
  currentBalance: 600,
  minimumPayment: 100,
  type: 'Banco',
  priority: 'Alta',
})

const obligation = (): Obligation => ({
  id: 'obligation-1',
  createdAt: stamp,
  updatedAt: stamp,
  schemaVersion: 1,
  name: 'Servicio del carro',
  estimatedAmount: 1000,
  dueDate: '2026-09-01',
  priority: 'Alta',
  category: 'Vehiculo',
  allocatedAmount: 500,
  paidAmount: 0,
  status: 'Parcialmente financiada',
  recurrence: 'none',
})

const fund = (currentAmount: number): Fund => ({
  id: 'fund-1',
  createdAt: stamp,
  updatedAt: stamp,
  schemaVersion: 1,
  name: 'Ahorro',
  currentAmount,
  status: 'active',
  color: '#16a34a',
})

describe('finance calculations', () => {
  it('calculates balances and keeps transfers neutral for income and expense reports', () => {
    const accounts = [account('cash', 1000), account('bank', 200)]
    const transfer = movement({ id: 'm1', accountId: 'cash', destinationAccountId: 'bank', type: 'Transferencia', amount: 150 })
    const income = movement({ id: 'm2', accountId: 'cash', type: 'Ingreso', amount: 300 })
    const expense = movement({ id: 'm3', accountId: 'bank', type: 'Gasto', amount: 50 })
    const balances = calculateAccountBalances(accounts, [transfer, income, expense])
    const summary = calculateFinancialSummary(accounts, [transfer, income, expense], [], [], [])

    expect(movementImpactForAccount(transfer, 'cash')).toBe(-150)
    expect(movementImpactForAccount(transfer, 'bank')).toBe(150)
    expect(transferIsNeutral(transfer)).toBe(true)
    expect(balances.find((item) => item.accountId === 'cash')?.calculatedBalance).toBe(1150)
    expect(balances.find((item) => item.accountId === 'bank')?.calculatedBalance).toBe(300)
    expect(summary.income).toBe(300)
    expect(summary.expense).toBe(50)
  })

  it('subtracts active funds from free money', () => {
    const summary = calculateFinancialSummary([account('cash', 1000)], [], [fund(250)], [], [])
    expect(summary.totalLiquid).toBe(1000)
    expect(summary.allocated).toBe(250)
    expect(summary.freeMoney).toBe(750)
  })

  it('applies debt and obligation payments consistently', () => {
    expect(applyDebtPayment(debt(), 200).currentBalance).toBe(400)
    expect(() => applyDebtPayment(debt(), 700)).toThrow('saldo negativo')

    const paid = applyObligationPayment(obligation(), 300, 300)
    expect(paid.paidAmount).toBe(300)
    expect(paid.allocatedAmount).toBe(200)
    expect(paid.status).toBe('Parcialmente pagada')
  })

  it('calculates budget spending and paycheck distribution', () => {
    const movements = [
      movement({ id: 'food', accountId: 'cash', type: 'Gasto', amount: 125, category: 'Comida', dateTime: '2026-08-03T12:00:00.000Z' }),
      movement({ id: 'old-food', accountId: 'cash', type: 'Gasto', amount: 50, category: 'Comida', dateTime: '2026-07-03T12:00:00.000Z' }),
    ]
    expect(budgetSpent(budget('Comida', 500), movements, '2026-08')).toBe(125)
    expect(distributePaycheck(1000, [{ fundId: 'fund-1', amount: 400 }])).toEqual({ totalAllocated: 400, freeAmount: 600 })
    expect(() => distributePaycheck(100, [{ fundId: 'fund-1', amount: 101 }])).toThrow('supera')
  })
})

describe('habit and time calculations', () => {
  it('scores habits without treating unregistered as a red failure', () => {
    const training = habit('habit-1')
    const reading = { ...habit('habit-2'), weight: 2 }
    const result = calculateHabitDayScore([training, reading], [habitEntry('entry-1', 'habit-1', 30)], '2026-08-03')

    expect(statusFromValue(training, 45)).toBe('excellent')
    expect(result.score).toBe(1)
    expect(result.possible).toBe(3)
    expect(result.minimumPercent).toBe(0.5)
    expect(dayColor(0, 3, false)).toBe('gray')
    expect(dayColor(1, 3, true)).toBe('blue')
  })

  it('calculates effective work and sleep durations', () => {
    expect(calculateWorkSessionDuration('2026-08-03T08:00:00.000Z', '2026-08-03T10:30:00.000Z', 20)).toEqual({
      durationMinutes: 150,
      effectiveMinutes: 130,
    })
    expect(calculateSleepDurationHours('2026-08-03T04:00:00.000Z', '2026-08-03T11:30:00.000Z', 30)).toBe(8)
  })

  it('links wellbeing training minutes to the training habit entry', () => {
    const training = habit('habit-1')
    const existing = habitEntry('entry-1', 'habit-1', 5)
    const linked = createLinkedTrainingHabitEntry(training, existing, '2026-08-03', 28)

    expect(isTrainingHabitName('Entrenamiento')).toBe(true)
    expect(isTrainingHabitName('Lectura')).toBe(false)
    expect(linked.id).toBe('entry-1')
    expect(linked.value).toBe(33)
    expect(linked.status).toBe('target')
  })
})

describe('clarity engines', () => {
  it('calculates baselines and confidence without overclaiming small samples', () => {
    const baseline = numericBaseline([10, 12, 11, 20, 22, 24])

    expect(baseline.median).toBe(16)
    expect(baseline.trend).toBe('increasing')
    expect(confidenceFromSample(4)).toBe('insufficient')
    expect(confidenceFromSample(22)).toBe('medium')
  })

  it('classifies food text conservatively', () => {
    const chicken = classifyMealText('Pollo')
    const fullMeal = classifyMealText('2 huevos con frijoles, fresas y fresco')

    expect(chicken.proteinSource).toBe(true)
    expect(chicken.confidence).toBe('low')
    expect(chicken.ultraProcessedLikely).toBeUndefined()
    expect(fullMeal.legume).toBe(true)
    expect(fullMeal.fruit).toBe(true)
    expect(fullMeal.sugaryDrink).toBe(true)
  })

  it('does not recommend aggressive activity for very low registered activity', () => {
    const profile = buildActivityProfile({
      settings: { ...createDefaultSettings(), sleepGoalHours: 7 },
      trainingLogs: [],
      sleepLogs: [],
    })

    expect(profile.last7DaysMinutes).toBe(0)
    expect(profile.readiness).toBe('maintain')
  })

  it('creates study insight without inventing academic conclusions', () => {
    const insights = studyInsights({
      courses: [],
      courseActivities: [],
      studySessions: [],
      studyTopics: [],
    })

    expect(insights[0].confidence).toBe('insufficient')
    expect(insights[0].title).toContain('cursos activos')
  })
})

describe('backup helpers', () => {
  it('detects duplicate UUIDs before merging backup data', () => {
    const baseData = {
      settings: { id: 'settings-1' },
      habits: [{ id: 'habit-1' }],
      movements: [{ id: 'movement-1' }],
    } as unknown as AppData
    const incomingData = {
      settings: { id: 'settings-2' },
      habits: [{ id: 'habit-1' }, { id: 'habit-2' }],
      movements: [{ id: 'movement-3' }],
    } as unknown as AppData

    expect(detectDuplicateIds(baseData, incomingData)).toEqual(['habit-1'])
  })

  it('normalizes old backups without the new collections', () => {
    const oldData = {
      settings: createDefaultSettings(),
      habits: [],
      habitEntries: [],
      priorities: [],
      projects: [],
      tasks: [],
      workSessions: [],
      recreationLogs: [],
      sleepLogs: [],
      mealLogs: [],
      trainingLogs: [],
      careLogs: [],
      socialLogs: [],
      accounts: [],
      movements: [],
      budgets: [],
      obligations: [],
      debts: [],
      debtPayments: [],
      funds: [],
      principles: [],
      motivationLinks: [],
      dailyCheckIns: [],
      moodEnergyLogs: [],
      weightLogs: [],
    } as unknown as AppData

    const normalized = normalizeAppData(oldData)

    expect(normalized.courses).toEqual([])
    expect(normalized.hydrationLogs).toEqual([])
    expect(normalized.appNotifications).toEqual([])
  })
})

describe('personal profile insights', () => {
  it('calculates BMI from pounds and keeps legacy stored weight as pounds', () => {
    const profile = getProfileSummary(
      {
        birthDate: '1992-08-03',
        heightCm: 162,
        weightKg: 202,
      } as AppData['settings'],
      new Date('2026-08-03T12:00:00.000Z'),
    )

    expect(profile.weightLb).toBe(202)
    expect(profile.bodyMassIndex).toBe(34.9)
    expect(profile.referenceWeightMinLb).toBeCloseTo(107, 1)
    expect(profile.referenceWeightMaxLb).toBeCloseTo(144.1, 1)
    expect(profile.referenceWeightTargetLb).toBeCloseTo(127.3, 1)
  })

  it('writes a concrete body summary with an initial weight target', () => {
    const summary = bodyProfileSummary({
      settings: {
        ...createDefaultSettings(),
        birthDate: '1992-08-03',
        heightCm: 162,
        weightLb: 202,
        sleepGoalHours: 7,
      },
      trainingLogs: [],
      mealLogs: [],
      sleepLogs: [],
    })

    expect(summary.title).toBe('Tu peso requiere atencion.')
    expect(summary.description).toContain('IMC de 34.9')
    expect(summary.description).toContain('obesidad grado I')
    expect(summary.description).toContain('meta inicial de 192 lb')
  })

  it('calculates hydration guidance from profile and daily conditions', () => {
    const guidance = calculateHydrationGuidance(
      {
        ...createDefaultSettings(),
        birthDate: '1992-08-03',
        heightCm: 162,
        weightLb: 202,
      },
      { trainingMinutes: 45, highHeat: true },
    )

    expect(guidance.status).toBe('reference')
    expect(guidance.referenceMl).toBeGreaterThan(2700)
    expect(guidance.evidence).toContain('Entrenamiento registrado: 45 min.')
    expect(guidance.message).toContain('vasos')
  })
})
