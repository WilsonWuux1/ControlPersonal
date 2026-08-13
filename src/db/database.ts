import Dexie, { type Table } from 'dexie'
import type {
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
  WeightLog,
} from '../types/domain'

export class ControlPersonalDatabase extends Dexie {
  settings!: Table<AppSettings, string>
  habits!: Table<Habit, string>
  habitEntries!: Table<HabitEntry, string>
  priorities!: Table<Priority, string>
  projects!: Table<Project, string>
  tasks!: Table<Task, string>
  workSessions!: Table<WorkSession, string>
  recreationLogs!: Table<RecreationLog, string>
  sleepLogs!: Table<SleepLog, string>
  mealLogs!: Table<MealLog, string>
  trainingLogs!: Table<TrainingLog, string>
  careLogs!: Table<CareLog, string>
  socialLogs!: Table<SocialLog, string>
  accounts!: Table<FinancialAccount, string>
  movements!: Table<FinancialMovement, string>
  budgets!: Table<Budget, string>
  obligations!: Table<Obligation, string>
  debts!: Table<Debt, string>
  debtPayments!: Table<DebtPayment, string>
  funds!: Table<Fund, string>
  principles!: Table<Principle, string>
  motivationLinks!: Table<MotivationLink, string>
  dailyCheckIns!: Table<DailyCheckIn, string>
  moodEnergyLogs!: Table<MoodEnergyLog, string>
  weightLogs!: Table<WeightLog, string>
  hydrationLogs!: Table<HydrationLog, string>
  courses!: Table<Course, string>
  studyTopics!: Table<StudyTopic, string>
  courseActivities!: Table<CourseActivity, string>
  studySessions!: Table<StudySession, string>
  appNotifications!: Table<AppNotification, string>

  constructor() {
    super('control-personal-db')
    this.version(1).stores({
      settings: 'id',
      habits: 'id, status, category, order',
      habitEntries: 'id, habitId, date, [habitId+date]',
      priorities: 'id, date, order, completed',
      projects: 'id, status',
      tasks: 'id, projectId, completed, status',
      workSessions: 'id, startedAt, projectId, type',
      recreationLogs: 'id, dateTime, type',
      sleepLogs: 'id, date',
      mealLogs: 'id, dateTime, mealType',
      trainingLogs: 'id, dateTime, type',
      careLogs: 'id, dateTime, type',
      socialLogs: 'id, dateTime, type',
      accounts: 'id, status, type',
      movements: 'id, dateTime, accountId, type, category, obligationId, debtId, fundId',
      budgets: 'id, category, period, status',
      obligations: 'id, dueDate, priority, status',
      debts: 'id, creditor, priority',
      debtPayments: 'id, debtId, movementId, date',
      funds: 'id, status, accountId',
      principles: 'id, order, status, favorite',
      motivationLinks: 'id, category, favorite',
      dailyCheckIns: 'id, date',
    })
    this.version(2).stores({
      moodEnergyLogs: 'id, dateTime, date',
    })
    this.version(3).stores({
      weightLogs: 'id, dateTime, date',
    })
    this.version(4).stores({
      hydrationLogs: 'id, dateTime, type',
      courses: 'id, status, name',
      studyTopics: 'id, courseId, status',
      courseActivities: 'id, courseId, dueDate, priority, status',
      studySessions: 'id, courseId, startedAt, type, activityId',
      appNotifications: 'id, type, createdAt, readAt, dismissedAt, fingerprint',
    })
  }
}

export const db = new ControlPersonalDatabase()

export const allTables = [
  db.settings,
  db.habits,
  db.habitEntries,
  db.priorities,
  db.projects,
  db.tasks,
  db.workSessions,
  db.recreationLogs,
  db.sleepLogs,
  db.mealLogs,
  db.trainingLogs,
  db.careLogs,
  db.socialLogs,
  db.accounts,
  db.movements,
  db.budgets,
  db.obligations,
  db.debts,
  db.debtPayments,
  db.funds,
  db.principles,
  db.motivationLinks,
  db.dailyCheckIns,
  db.moodEnergyLogs,
  db.weightLogs,
  db.hydrationLogs,
  db.courses,
  db.studyTopics,
  db.courseActivities,
  db.studySessions,
  db.appNotifications,
]
