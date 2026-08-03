import { db } from './database'
import {
  createDefaultSettings,
  createInitialBudgets,
  createInitialFunds,
  createInitialHabits,
  createInitialObligations,
  createStarterAccount,
  initialMotivationLinks,
  initialPrinciples,
} from './initialData'
import type { AppData, AppSettings, BackupEntityName } from '../types/domain'

export const entityTables = {
  settings: db.settings,
  habits: db.habits,
  habitEntries: db.habitEntries,
  priorities: db.priorities,
  projects: db.projects,
  tasks: db.tasks,
  workSessions: db.workSessions,
  recreationLogs: db.recreationLogs,
  sleepLogs: db.sleepLogs,
  mealLogs: db.mealLogs,
  trainingLogs: db.trainingLogs,
  careLogs: db.careLogs,
  socialLogs: db.socialLogs,
  accounts: db.accounts,
  movements: db.movements,
  budgets: db.budgets,
  obligations: db.obligations,
  debts: db.debts,
  debtPayments: db.debtPayments,
  funds: db.funds,
  principles: db.principles,
  motivationLinks: db.motivationLinks,
  dailyCheckIns: db.dailyCheckIns,
  moodEnergyLogs: db.moodEnergyLogs,
  weightLogs: db.weightLogs,
} as const

export const entityNames = Object.keys(entityTables) as BackupEntityName[]

export const seedIfEmpty = async (): Promise<void> => {
  const count = await db.settings.count()
  if (count > 0) return
  const settings = createDefaultSettings()
  await db.transaction('rw', Object.values(entityTables), async () => {
    await db.settings.add(settings)
    await db.habits.bulkAdd(createInitialHabits(settings.sleepGoalHours))
    await db.accounts.add(createStarterAccount(settings.currency))
    await db.funds.bulkAdd(createInitialFunds())
    await db.obligations.bulkAdd(createInitialObligations())
    await db.budgets.bulkAdd(createInitialBudgets())
    await db.principles.bulkAdd(initialPrinciples)
    await db.motivationLinks.bulkAdd(initialMotivationLinks)
  })
}

export const getSettings = async (): Promise<AppSettings> => {
  const existing = await db.settings.toCollection().first()
  if (existing) return existing
  const settings = createDefaultSettings()
  await db.settings.add(settings)
  return settings
}

export const loadAppData = async (): Promise<AppData> => {
  await seedIfEmpty()
  const settings = await getSettings()
  return {
    settings,
    habits: await db.habits.orderBy('order').toArray(),
    habitEntries: await db.habitEntries.toArray(),
    priorities: await db.priorities.orderBy('order').toArray(),
    projects: await db.projects.toArray(),
    tasks: await db.tasks.toArray(),
    workSessions: await db.workSessions.toArray(),
    recreationLogs: await db.recreationLogs.toArray(),
    sleepLogs: await db.sleepLogs.toArray(),
    mealLogs: await db.mealLogs.toArray(),
    trainingLogs: await db.trainingLogs.toArray(),
    careLogs: await db.careLogs.toArray(),
    socialLogs: await db.socialLogs.toArray(),
    accounts: await db.accounts.toArray(),
    movements: await db.movements.toArray(),
    budgets: await db.budgets.toArray(),
    obligations: await db.obligations.toArray(),
    debts: await db.debts.toArray(),
    debtPayments: await db.debtPayments.toArray(),
    funds: await db.funds.toArray(),
    principles: await db.principles.orderBy('order').toArray(),
    motivationLinks: await db.motivationLinks.toArray(),
    dailyCheckIns: await db.dailyCheckIns.toArray(),
    moodEnergyLogs: await db.moodEnergyLogs.toArray(),
    weightLogs: await db.weightLogs.toArray(),
  }
}

export const replaceAllData = async (data: AppData): Promise<void> => {
  await db.transaction('rw', Object.values(entityTables), async () => {
    for (const table of Object.values(entityTables)) {
      await table.clear()
    }
    await db.settings.add(data.settings)
    await db.habits.bulkAdd(data.habits)
    await db.habitEntries.bulkAdd(data.habitEntries)
    await db.priorities.bulkAdd(data.priorities)
    await db.projects.bulkAdd(data.projects)
    await db.tasks.bulkAdd(data.tasks)
    await db.workSessions.bulkAdd(data.workSessions)
    await db.recreationLogs.bulkAdd(data.recreationLogs)
    await db.sleepLogs.bulkAdd(data.sleepLogs)
    await db.mealLogs.bulkAdd(data.mealLogs)
    await db.trainingLogs.bulkAdd(data.trainingLogs)
    await db.careLogs.bulkAdd(data.careLogs)
    await db.socialLogs.bulkAdd(data.socialLogs)
    await db.accounts.bulkAdd(data.accounts)
    await db.movements.bulkAdd(data.movements)
    await db.budgets.bulkAdd(data.budgets)
    await db.obligations.bulkAdd(data.obligations)
    await db.debts.bulkAdd(data.debts)
    await db.debtPayments.bulkAdd(data.debtPayments)
    await db.funds.bulkAdd(data.funds)
    await db.principles.bulkAdd(data.principles)
    await db.motivationLinks.bulkAdd(data.motivationLinks)
    await db.dailyCheckIns.bulkAdd(data.dailyCheckIns)
    await db.moodEnergyLogs.bulkAdd(data.moodEnergyLogs ?? [])
    await db.weightLogs.bulkAdd(data.weightLogs ?? [])
  })
}
