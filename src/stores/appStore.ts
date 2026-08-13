import { create } from 'zustand'
import { db } from '../db/database'
import { loadAppData, replaceAllData, seedIfEmpty } from '../db/repository'
import {
  createInitialHabits,
  createStarterAccount,
  createDefaultSettings,
  createInitialFunds,
  createInitialObligations,
  createInitialBudgets,
  initialMotivationLinks,
  initialPrinciples,
} from '../db/initialData'
import { applyDebtPayment, applyObligationPayment, obligationStatus } from '../services/financeCalculations'
import { showDeviceNotification } from '../services/deviceNotifications'
import { generateInternalNotifications } from '../services/insights/notificationEngine'
import { createLinkedTrainingHabitEntry, isTrainingHabitName } from '../services/linkedActivities'
import { calculateSleepDurationHours, calculateWorkSessionDuration } from '../services/timeCalculations'
import type {
  AppData,
  AppSettings,
  AppNotification,
  Budget,
  CareLog,
  Course,
  CourseActivity,
  DailyCheckIn,
  Debt,
  DebtPayment,
  FinancialAccount,
  FinancialMovement,
  Fund,
  Habit,
  HabitEntry,
  HydrationLog,
  MealLog,
  MotivationLink,
  MoodEnergyLog,
  Obligation,
  Principle,
  Priority,
  Project,
  RecreationLog,
  SleepLog,
  SocialLog,
  StudySession,
  StudyTopic,
  Task,
  TrainingLog,
  WorkSession,
  EntityStatus,
  WeightLog,
} from '../types/domain'
import type { ToastMessage } from '../types/forms'
import { newId, nowIso, todayIso, toDateKey } from '../utils/date'

type EntityDraft<T extends { id: string; createdAt: string; updatedAt: string; schemaVersion: number }> = Omit<
  T,
  'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'
> &
  Partial<Pick<T, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'>>

interface AppStore {
  data: AppData | null
  loading: boolean
  locked: boolean
  activeTimerId?: string
  activeStudySessionId?: string
  toasts: ToastMessage[]
  load: () => Promise<void>
  completeOnboarding: (settings: Partial<AppSettings>, accounts: FinancialAccount[], debts: Debt[], obligations: Obligation[], enabledHabitIds: string[]) => Promise<void>
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>
  addToast: (toast: Omit<ToastMessage, 'id'>) => void
  dismissToast: (id: string) => void
  unlock: () => void
  lock: () => void
  addHabit: (habit: EntityDraft<Habit>) => Promise<void>
  updateHabit: (habit: Habit) => Promise<void>
  archiveHabit: (id: string) => Promise<void>
  restoreHabit: (id: string) => Promise<void>
  deleteHabit: (id: string) => Promise<void>
  upsertHabitEntry: (entry: EntityDraft<HabitEntry>) => Promise<void>
  addPriority: (priority: EntityDraft<Priority>) => Promise<void>
  updatePriority: (priority: Priority) => Promise<void>
  deletePriority: (id: string) => Promise<void>
  addProject: (project: EntityDraft<Project>) => Promise<void>
  updateProject: (project: Project) => Promise<void>
  addTask: (task: EntityDraft<Task>) => Promise<void>
  updateTask: (task: Task) => Promise<void>
  addWorkSession: (session: EntityDraft<WorkSession>) => Promise<void>
  updateWorkSession: (session: WorkSession) => Promise<void>
  startTimer: (session: EntityDraft<WorkSession>) => Promise<void>
  finishTimer: (id: string, result: string, focusLevel: number) => Promise<void>
  addRecreationLog: (log: EntityDraft<RecreationLog>) => Promise<void>
  addSleepLog: (log: EntityDraft<SleepLog>) => Promise<void>
  addMealLog: (log: EntityDraft<MealLog>) => Promise<void>
  addTrainingLog: (log: EntityDraft<TrainingLog>) => Promise<void>
  addHydrationLog: (log: EntityDraft<HydrationLog>) => Promise<void>
  addCareLog: (log: EntityDraft<CareLog>) => Promise<void>
  addSocialLog: (log: EntityDraft<SocialLog>) => Promise<void>
  addAccount: (account: EntityDraft<FinancialAccount>) => Promise<void>
  addMovement: (movement: EntityDraft<FinancialMovement>) => Promise<void>
  updateMovement: (movement: FinancialMovement) => Promise<void>
  deleteMovement: (id: string) => Promise<void>
  addBudget: (budget: EntityDraft<Budget>) => Promise<void>
  deleteBudget: (id: string) => Promise<void>
  addObligation: (obligation: EntityDraft<Obligation>) => Promise<void>
  updateObligation: (obligation: Obligation) => Promise<void>
  addDebt: (debt: EntityDraft<Debt>) => Promise<void>
  addFund: (fund: EntityDraft<Fund>) => Promise<void>
  allocateFund: (fundId: string, amount: number) => Promise<void>
  deleteFund: (id: string) => Promise<void>
  payObligation: (payload: { obligationId: string; accountId: string; amount: number; fundId?: string }) => Promise<void>
  payDebt: (payload: { debtId: string; accountId: string; amount: number; date?: string }) => Promise<void>
  addPrinciple: (principle: EntityDraft<Principle>) => Promise<void>
  updatePrinciple: (principle: Principle) => Promise<void>
  addMotivationLink: (link: EntityDraft<MotivationLink>) => Promise<void>
  updateMotivationLink: (link: MotivationLink) => Promise<void>
  deleteMotivationLink: (id: string) => Promise<void>
  updateDailyCheckIn: (checkIn: EntityDraft<DailyCheckIn>) => Promise<void>
  addMoodEnergyLog: (log: EntityDraft<MoodEnergyLog>) => Promise<void>
  addWeightLog: (log: EntityDraft<WeightLog>) => Promise<void>
  addCourse: (course: EntityDraft<Course>) => Promise<void>
  updateCourse: (course: Course) => Promise<void>
  addStudyTopic: (topic: EntityDraft<StudyTopic>) => Promise<void>
  updateStudyTopic: (topic: StudyTopic) => Promise<void>
  addCourseActivity: (activity: EntityDraft<CourseActivity>) => Promise<void>
  updateCourseActivity: (activity: CourseActivity) => Promise<void>
  addStudySession: (session: EntityDraft<StudySession>) => Promise<void>
  startStudySession: (session: EntityDraft<StudySession>) => Promise<void>
  finishStudySession: (
    id: string,
    update: Pick<StudySession, 'comprehension' | 'difficulty' | 'focusLevel'> &
      Partial<Pick<StudySession, 'result' | 'understood' | 'struggledWith' | 'nextReview' | 'notes'>>,
  ) => Promise<void>
  addAppNotification: (notification: EntityDraft<AppNotification>) => Promise<void>
  markNotificationRead: (id: string) => Promise<void>
  dismissNotification: (id: string) => Promise<void>
  resetAll: () => Promise<void>
  replaceData: (data: AppData) => Promise<void>
}

const withBase = <T extends { id: string; createdAt: string; updatedAt: string; schemaVersion: number }>(draft: EntityDraft<T>): T => {
  const stamp = nowIso()
  return {
    ...draft,
    id: draft.id ?? newId(),
    createdAt: draft.createdAt ?? stamp,
    updatedAt: stamp,
    schemaVersion: draft.schemaVersion ?? 1,
  } as T
}

const refresh = async (set: (partial: Partial<AppStore>) => void): Promise<void> => {
  set({ data: await loadAppData(), loading: false })
}

const updateLoadedData = (set: (partial: Partial<AppStore>) => void, updater: (data: AppData) => AppData): boolean => {
  const current = useAppStore.getState().data
  if (!current) return false
  set({ data: updater(current), loading: false })
  return true
}

export const useAppStore = create<AppStore>((set, get) => ({
  data: null,
  loading: true,
  locked: false,
  activeStudySessionId: undefined,
  toasts: [],
  load: async () => {
    await seedIfEmpty()
    const data = await loadAppData()
    const persistentStorage =
      typeof navigator !== 'undefined' && navigator.storage && 'persist' in navigator.storage ? await navigator.storage.persist() : false
    if (persistentStorage !== data.settings.persistentStorage) {
      await db.settings.put({ ...data.settings, persistentStorage, updatedAt: nowIso() })
    }
    const notificationDrafts = generateInternalNotifications(data)
    if (notificationDrafts.length > 0) {
      const records = notificationDrafts.map((notification) => withBase<AppNotification>(notification))
      await db.appNotifications.bulkAdd(records)
      if (data.settings.deviceNotificationsEnabled) {
        await Promise.all(records.slice(0, 1).map((notification) => showDeviceNotification(notification)))
      }
    }
    set({ data: await loadAppData(), loading: false, locked: data.settings.lockEnabled })
  },
  completeOnboarding: async (settings, accounts, debts, obligations, enabledHabitIds) => {
    const current = await loadAppData()
    const mergedSettings = { ...current.settings, ...settings, onboardingCompleted: true, updatedAt: nowIso() }
    const habits = current.habits.map((habit) => {
      const status: EntityStatus = enabledHabitIds.length === 0 || enabledHabitIds.includes(habit.id) ? 'active' : 'archived'
      return {
        ...habit,
        status,
        updatedAt: nowIso(),
      }
    })
    await db.transaction('rw', db.settings, db.habits, db.accounts, db.debts, db.obligations, async () => {
      await db.settings.put(mergedSettings)
      await db.habits.bulkPut(habits)
      if (accounts.length > 0) await db.accounts.bulkPut(accounts)
      if (debts.length > 0) await db.debts.bulkPut(debts)
      if (obligations.length > 0) await db.obligations.bulkPut(obligations)
    })
    await refresh(set)
  },
  updateSettings: async (settings) => {
    const current = await db.settings.toCollection().first()
    if (!current) return
    const record = { ...current, ...settings, updatedAt: nowIso() }
    await db.settings.put(record)
    if (!updateLoadedData(set, (data) => ({ ...data, settings: record }))) await refresh(set)
  },
  addToast: (toast) => set({ toasts: [...get().toasts, { ...toast, id: newId() }] }),
  dismissToast: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
  unlock: () => set({ locked: false }),
  lock: () => set({ locked: true }),
  addHabit: async (habit) => {
    await db.habits.add(withBase<Habit>(habit))
    await refresh(set)
  },
  updateHabit: async (habit) => {
    await db.habits.put({ ...habit, updatedAt: nowIso() })
    await refresh(set)
  },
  archiveHabit: async (id) => {
    const habit = await db.habits.get(id)
    if (!habit) return
    await db.habits.put({ ...habit, status: 'archived', archivedAt: nowIso(), updatedAt: nowIso() })
    await refresh(set)
  },
  restoreHabit: async (id) => {
    const habit = await db.habits.get(id)
    if (!habit) return
    await db.habits.put({ ...habit, status: 'active', archivedAt: undefined, updatedAt: nowIso() })
    await refresh(set)
  },
  deleteHabit: async (id) => {
    await db.transaction('rw', db.habits, db.habitEntries, async () => {
      await db.habits.delete(id)
      await db.habitEntries.where('habitId').equals(id).delete()
    })
    await refresh(set)
  },
  upsertHabitEntry: async (entry) => {
    const existing = await db.habitEntries.where('[habitId+date]').equals([entry.habitId, entry.date]).first()
    await db.habitEntries.put(withBase<HabitEntry>({ ...entry, id: existing?.id, createdAt: existing?.createdAt }))
    await refresh(set)
  },
  addPriority: async (priority) => {
    await db.priorities.add(withBase<Priority>(priority))
    await refresh(set)
  },
  updatePriority: async (priority) => {
    await db.priorities.put({ ...priority, updatedAt: nowIso() })
    await refresh(set)
  },
  deletePriority: async (id) => {
    await db.priorities.delete(id)
    await refresh(set)
  },
  addProject: async (project) => {
    const record = withBase<Project>(project)
    await db.projects.add(record)
    if (!updateLoadedData(set, (data) => ({ ...data, projects: [...data.projects, record] }))) await refresh(set)
  },
  updateProject: async (project) => {
    const record = { ...project, updatedAt: nowIso() }
    await db.projects.put(record)
    if (!updateLoadedData(set, (data) => ({ ...data, projects: data.projects.map((item) => (item.id === record.id ? record : item)) }))) await refresh(set)
  },
  addTask: async (task) => {
    const record = withBase<Task>(task)
    await db.tasks.add(record)
    if (!updateLoadedData(set, (data) => ({ ...data, tasks: [...data.tasks, record] }))) await refresh(set)
  },
  updateTask: async (task) => {
    const record = { ...task, updatedAt: nowIso() }
    await db.tasks.put(record)
    if (!updateLoadedData(set, (data) => ({ ...data, tasks: data.tasks.map((item) => (item.id === record.id ? record : item)) }))) await refresh(set)
  },
  addWorkSession: async (session) => {
    await db.workSessions.add(withBase<WorkSession>(session))
    await refresh(set)
  },
  updateWorkSession: async (session) => {
    await db.workSessions.put({ ...session, updatedAt: nowIso() })
    await refresh(set)
  },
  startTimer: async (session) => {
    const record = withBase<WorkSession>({ ...session, startedAt: nowIso(), durationMinutes: 0, effectiveMinutes: 0 })
    await db.workSessions.add(record)
    set({ activeTimerId: record.id })
    await refresh(set)
  },
  finishTimer: async (id, result, focusLevel) => {
    const session = await db.workSessions.get(id)
    if (!session) return
    const endedAt = nowIso()
    const duration = calculateWorkSessionDuration(session.startedAt, endedAt, session.breakMinutes)
    await db.workSessions.put({ ...session, ...duration, endedAt, result, focusLevel, updatedAt: nowIso() })
    set({ activeTimerId: undefined })
    await refresh(set)
  },
  addRecreationLog: async (log) => {
    const record = withBase<RecreationLog>(log)
    await db.recreationLogs.add(record)
    if (!updateLoadedData(set, (data) => ({ ...data, recreationLogs: [...data.recreationLogs, record] }))) await refresh(set)
  },
  addSleepLog: async (log) => {
    const durationHours = calculateSleepDurationHours(log.sleepAt, log.wakeAt, log.napMinutes)
    await db.sleepLogs.add(withBase<SleepLog>({ ...log, durationHours }))
    await refresh(set)
  },
  addMealLog: async (log) => {
    await db.mealLogs.add(withBase<MealLog>(log))
    await refresh(set)
  },
  addTrainingLog: async (log) => {
    const record = withBase<TrainingLog>(log)
    let linkedHabitEntry: HabitEntry | undefined
    await db.transaction('rw', db.trainingLogs, db.habits, db.habitEntries, async () => {
      await db.trainingLogs.add(record)
      const trainingHabit = await db.habits.filter((habit) => habit.status === 'active' && isTrainingHabitName(habit.name)).first()
      if (!trainingHabit) return
      const date = toDateKey(record.dateTime)
      const existingEntry = await db.habitEntries.where('[habitId+date]').equals([trainingHabit.id, date]).first()
      linkedHabitEntry = withBase<HabitEntry>(createLinkedTrainingHabitEntry(trainingHabit, existingEntry, date, record.durationMinutes))
      await db.habitEntries.put(linkedHabitEntry)
    })
    if (
      !updateLoadedData(set, (data) => ({
        ...data,
        trainingLogs: [...data.trainingLogs, record],
        habitEntries: linkedHabitEntry
          ? data.habitEntries.some((entry) => entry.id === linkedHabitEntry?.id)
            ? data.habitEntries.map((entry) => (entry.id === linkedHabitEntry?.id ? linkedHabitEntry : entry))
            : [...data.habitEntries, linkedHabitEntry]
          : data.habitEntries,
      }))
    )
      await refresh(set)
  },
  addHydrationLog: async (log) => {
    const record = withBase<HydrationLog>(log)
    await db.hydrationLogs.add(record)
    if (!updateLoadedData(set, (data) => ({ ...data, hydrationLogs: [...data.hydrationLogs, record] }))) await refresh(set)
  },
  addCareLog: async (log) => {
    const record = withBase<CareLog>(log)
    await db.careLogs.add(record)
    if (!updateLoadedData(set, (data) => ({ ...data, careLogs: [...data.careLogs, record] }))) await refresh(set)
  },
  addSocialLog: async (log) => {
    await db.socialLogs.add(withBase<SocialLog>(log))
    await refresh(set)
  },
  addAccount: async (account) => {
    const record = withBase<FinancialAccount>(account)
    await db.accounts.add(record)
    if (!updateLoadedData(set, (data) => ({ ...data, accounts: [...data.accounts, record] }))) await refresh(set)
  },
  addMovement: async (movement) => {
    const record = withBase<FinancialMovement>(movement)
    await db.movements.add(record)
    if (!updateLoadedData(set, (data) => ({ ...data, movements: [...data.movements, record] }))) await refresh(set)
  },
  updateMovement: async (movement) => {
    const record = { ...movement, updatedAt: nowIso() }
    await db.movements.put(record)
    if (!updateLoadedData(set, (data) => ({ ...data, movements: data.movements.map((item) => (item.id === record.id ? record : item)) }))) await refresh(set)
  },
  deleteMovement: async (id) => {
    await db.movements.delete(id)
    if (!updateLoadedData(set, (data) => ({ ...data, movements: data.movements.filter((movement) => movement.id !== id) }))) await refresh(set)
  },
  addBudget: async (budget) => {
    const record = withBase<Budget>(budget)
    await db.budgets.add(record)
    if (!updateLoadedData(set, (data) => ({ ...data, budgets: [...data.budgets, record] }))) await refresh(set)
  },
  deleteBudget: async (id) => {
    await db.budgets.delete(id)
    if (!updateLoadedData(set, (data) => ({ ...data, budgets: data.budgets.filter((budget) => budget.id !== id) }))) await refresh(set)
  },
  addObligation: async (obligation) => {
    const record = withBase<Obligation>(obligation)
    const saved = { ...record, status: obligationStatus(record) }
    await db.obligations.add(saved)
    if (!updateLoadedData(set, (data) => ({ ...data, obligations: [...data.obligations, saved] }))) await refresh(set)
  },
  updateObligation: async (obligation) => {
    const record = { ...obligation, status: obligationStatus(obligation), updatedAt: nowIso() }
    await db.obligations.put(record)
    if (!updateLoadedData(set, (data) => ({ ...data, obligations: data.obligations.map((item) => (item.id === record.id ? record : item)) }))) await refresh(set)
  },
  addDebt: async (debt) => {
    const record = withBase<Debt>(debt)
    await db.debts.add(record)
    if (!updateLoadedData(set, (data) => ({ ...data, debts: [...data.debts, record] }))) await refresh(set)
  },
  addFund: async (fund) => {
    const record = withBase<Fund>(fund)
    await db.funds.add(record)
    if (!updateLoadedData(set, (data) => ({ ...data, funds: [...data.funds, record] }))) await refresh(set)
  },
  allocateFund: async (fundId, amount) => {
    const fund = await db.funds.get(fundId)
    if (!fund) return
    const record = { ...fund, currentAmount: Math.max(0, fund.currentAmount + amount), updatedAt: nowIso() }
    await db.funds.put(record)
    if (!updateLoadedData(set, (data) => ({ ...data, funds: data.funds.map((item) => (item.id === record.id ? record : item)) }))) await refresh(set)
  },
  deleteFund: async (id) => {
    await db.funds.delete(id)
    if (!updateLoadedData(set, (data) => ({ ...data, funds: data.funds.filter((fund) => fund.id !== id) }))) await refresh(set)
  },
  payObligation: async ({ obligationId, accountId, amount, fundId }) => {
    const obligation = await db.obligations.get(obligationId)
    if (!obligation) return
    const fund = fundId ? await db.funds.get(fundId) : undefined
    const movement = withBase<FinancialMovement>({
      dateTime: nowIso(),
      accountId,
      type: 'Pago de obligacion',
      amount,
      category: obligation.category,
      description: `Pago de ${obligation.name}`,
      obligationId,
      fundId,
      tags: ['obligacion'],
    })
    await db.transaction('rw', db.movements, db.obligations, db.funds, async () => {
      await db.movements.add(movement)
      const nextObligation = { ...applyObligationPayment(obligation, amount, fund ? amount : 0), updatedAt: nowIso() }
      await db.obligations.put(nextObligation)
      if (fund) {
        const nextFund = { ...fund, currentAmount: Math.max(0, fund.currentAmount - amount), updatedAt: nowIso() }
        await db.funds.put(nextFund)
      }
    })
    if (!updateLoadedData(set, (data) => ({
      ...data,
      movements: [...data.movements, movement],
      obligations: data.obligations.map((item) => (item.id === obligation.id ? { ...applyObligationPayment(item, amount, fund ? amount : 0), updatedAt: nowIso() } : item)),
      funds: fund ? data.funds.map((item) => (item.id === fund.id ? { ...item, currentAmount: Math.max(0, item.currentAmount - amount), updatedAt: nowIso() } : item)) : data.funds,
    }))) await refresh(set)
  },
  payDebt: async ({ debtId, accountId, amount, date }) => {
    const debt = await db.debts.get(debtId)
    if (!debt) return
    const paymentDate = date || todayIso()
    const today = todayIso()
    const movementDateTime = paymentDate === today ? nowIso() : `${paymentDate}T12:00:00`

    const movement = withBase<FinancialMovement>({
      dateTime: movementDateTime,
      accountId,
      type: 'Pago de deuda',
      amount,
      category: 'Deudas personales',
      description: `Pago de ${debt.name}`,
      debtId,
      tags: ['deuda'],
    })
    const debtPayment = withBase<DebtPayment>({ debtId, movementId: movement.id, amount, date: paymentDate })
    await db.transaction('rw', db.movements, db.debts, db.debtPayments, async () => {
      await db.movements.add(movement)
      const nextDebt = { ...applyDebtPayment(debt, amount), updatedAt: nowIso() }
      await db.debts.put(nextDebt)
      await db.debtPayments.add(debtPayment)
    })
    if (!updateLoadedData(set, (data) => ({
      ...data,
      movements: [...data.movements, movement],
      debts: data.debts.map((item) => (item.id === debt.id ? { ...applyDebtPayment(item, amount), updatedAt: nowIso() } : item)),
      debtPayments: [...data.debtPayments, debtPayment],
    }))) await refresh(set)
  },
  addPrinciple: async (principle) => {
    await db.principles.add(withBase<Principle>(principle))
    await refresh(set)
  },
  updatePrinciple: async (principle) => {
    await db.principles.put({ ...principle, updatedAt: nowIso() })
    await refresh(set)
  },
  addMotivationLink: async (link) => {
    const record = withBase<MotivationLink>(link)
    await db.motivationLinks.add(record)
    if (!updateLoadedData(set, (data) => ({ ...data, motivationLinks: [...data.motivationLinks, record] }))) await refresh(set)
  },
  updateMotivationLink: async (link) => {
    const record = { ...link, updatedAt: nowIso() }
    await db.motivationLinks.put(record)
    if (!updateLoadedData(set, (data) => ({ ...data, motivationLinks: data.motivationLinks.map((item) => (item.id === record.id ? record : item)) }))) await refresh(set)
  },
  deleteMotivationLink: async (id) => {
    await db.motivationLinks.delete(id)
    if (!updateLoadedData(set, (data) => ({ ...data, motivationLinks: data.motivationLinks.filter((item) => item.id !== id) }))) await refresh(set)
  },
  updateDailyCheckIn: async (checkIn) => {
    const existing = await db.dailyCheckIns.where('date').equals(checkIn.date).first()
    const record = withBase<DailyCheckIn>({ ...checkIn, id: existing?.id, createdAt: existing?.createdAt })
    await db.dailyCheckIns.put(record)
    if (!updateLoadedData(set, (data) => ({ ...data, dailyCheckIns: existing ? data.dailyCheckIns.map((item) => (item.id === record.id ? record : item)) : [...data.dailyCheckIns, record] }))) await refresh(set)
  },
  addMoodEnergyLog: async (log) => {
    const record = withBase<MoodEnergyLog>(log)
    await db.moodEnergyLogs.add(record)
    if (!updateLoadedData(set, (data) => ({ ...data, moodEnergyLogs: [...data.moodEnergyLogs, record] }))) await refresh(set)
  },
  addWeightLog: async (log) => {
    const record = withBase<WeightLog>(log)
    const current = await db.settings.toCollection().first()
    await db.transaction('rw', db.weightLogs, db.settings, async () => {
      await db.weightLogs.add(record)
      if (current) await db.settings.put({ ...current, weightLb: record.weightLb, weightKg: undefined, updatedAt: nowIso() })
    })
    if (!updateLoadedData(set, (data) => ({ ...data, settings: { ...data.settings, weightLb: record.weightLb, weightKg: undefined, updatedAt: nowIso() }, weightLogs: [...data.weightLogs, record] }))) await refresh(set)
  },
  addCourse: async (course) => {
    const record = withBase<Course>(course)
    await db.courses.add(record)
    if (!updateLoadedData(set, (data) => ({ ...data, courses: [...data.courses, record] }))) await refresh(set)
  },
  updateCourse: async (course) => {
    const record = { ...course, updatedAt: nowIso() }
    await db.courses.put(record)
    if (!updateLoadedData(set, (data) => ({ ...data, courses: data.courses.map((item) => (item.id === record.id ? record : item)) }))) await refresh(set)
  },
  addStudyTopic: async (topic) => {
    const record = withBase<StudyTopic>(topic)
    await db.studyTopics.add(record)
    if (!updateLoadedData(set, (data) => ({ ...data, studyTopics: [...data.studyTopics, record] }))) await refresh(set)
  },
  updateStudyTopic: async (topic) => {
    const record = { ...topic, updatedAt: nowIso() }
    await db.studyTopics.put(record)
    if (!updateLoadedData(set, (data) => ({ ...data, studyTopics: data.studyTopics.map((item) => (item.id === record.id ? record : item)) }))) await refresh(set)
  },
  addCourseActivity: async (activity) => {
    const record = withBase<CourseActivity>(activity)
    await db.courseActivities.add(record)
    if (!updateLoadedData(set, (data) => ({ ...data, courseActivities: [...data.courseActivities, record] }))) await refresh(set)
  },
  updateCourseActivity: async (activity) => {
    const record = { ...activity, updatedAt: nowIso() }
    await db.courseActivities.put(record)
    if (!updateLoadedData(set, (data) => ({ ...data, courseActivities: data.courseActivities.map((item) => (item.id === record.id ? record : item)) }))) await refresh(set)
  },
  addStudySession: async (session) => {
    const record = withBase<StudySession>(session)
    await db.studySessions.add(record)
    if (!updateLoadedData(set, (data) => ({ ...data, studySessions: [...data.studySessions, record] }))) await refresh(set)
  },
  startStudySession: async (session) => {
    const record = withBase<StudySession>({ ...session, startedAt: nowIso(), durationMinutes: 0, breakMinutes: 0, effectiveMinutes: 0 })
    await db.studySessions.add(record)
    set({ activeStudySessionId: record.id })
    if (!updateLoadedData(set, (data) => ({ ...data, studySessions: [...data.studySessions, record] }))) await refresh(set)
  },
  finishStudySession: async (id, update) => {
    const session = await db.studySessions.get(id)
    if (!session) return
    const endedAt = nowIso()
    const duration = calculateWorkSessionDuration(session.startedAt, endedAt, session.breakMinutes)
    const record = { ...session, ...duration, ...update, endedAt, updatedAt: nowIso() }
    await db.studySessions.put(record)
    set({ activeStudySessionId: undefined })
    if (!updateLoadedData(set, (data) => ({ ...data, studySessions: data.studySessions.map((item) => (item.id === record.id ? record : item)) }))) await refresh(set)
  },
  addAppNotification: async (notification) => {
    const existing = await db.appNotifications.where('fingerprint').equals(notification.fingerprint).first()
    if (existing && !existing.dismissedAt) return
    const record = withBase<AppNotification>(notification)
    await db.appNotifications.add(record)
    if (useAppStore.getState().data?.settings.deviceNotificationsEnabled) {
      await showDeviceNotification(record)
    }
    if (!updateLoadedData(set, (data) => ({ ...data, appNotifications: [...data.appNotifications, record] }))) await refresh(set)
  },
  markNotificationRead: async (id) => {
    const notification = await db.appNotifications.get(id)
    if (!notification) return
    const record = { ...notification, readAt: nowIso(), updatedAt: nowIso() }
    await db.appNotifications.put(record)
    if (!updateLoadedData(set, (data) => ({ ...data, appNotifications: data.appNotifications.map((item) => (item.id === record.id ? record : item)) }))) await refresh(set)
  },
  dismissNotification: async (id) => {
    const notification = await db.appNotifications.get(id)
    if (!notification) return
    const record = { ...notification, dismissedAt: nowIso(), updatedAt: nowIso() }
    await db.appNotifications.put(record)
    if (!updateLoadedData(set, (data) => ({ ...data, appNotifications: data.appNotifications.map((item) => (item.id === record.id ? record : item)) }))) await refresh(set)
  },
  resetAll: async () => {
    const settings = createDefaultSettings()
    await replaceAllData({
      settings,
      habits: createInitialHabits(settings.sleepGoalHours),
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
      accounts: [createStarterAccount(settings.currency)],
      movements: [],
      budgets: createInitialBudgets(),
      obligations: createInitialObligations(),
      debts: [],
      debtPayments: [],
      funds: createInitialFunds(),
      principles: initialPrinciples,
      motivationLinks: initialMotivationLinks,
      dailyCheckIns: [],
      moodEnergyLogs: [],
      weightLogs: [],
      hydrationLogs: [],
      courses: [],
      studyTopics: [],
      courseActivities: [],
      studySessions: [],
      appNotifications: [],
    })
    await refresh(set)
  },
  replaceData: async (data) => {
    await replaceAllData(data)
    await refresh(set)
  },
}))
