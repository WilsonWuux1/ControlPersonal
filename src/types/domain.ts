export type ThemePreference = 'light' | 'dark' | 'system'
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type EntityStatus = 'active' | 'archived'

export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
  archivedAt?: string
  schemaVersion: number
}

export interface AppSettings extends BaseEntity {
  userName: string
  currency: string
  birthDate?: string
  heightCm?: number
  weightLb?: number
  weightKg?: number
  biologicalSex?: 'female' | 'male' | 'unspecified'
  firstDayOfWeek: Weekday
  sleepGoalHours: number
  activeSleepStartedAt?: string
  activeTrainingStartedAt?: string
  activeTrainingEnergyBefore?: number
  theme: ThemePreference
  onboardingCompleted: boolean
  persistentStorage: boolean
  deviceName: string
  lastBackupAt?: string
  dayRescueActions: string[]
  lockEnabled: boolean
  lockSalt?: string
  lockVerifier?: string
  inactivityMinutes: number
  habitScoreWeights: Record<HabitEntryStatus, number | null>
  demoMode: boolean
}

export interface Habit extends BaseEntity {
  name: string
  description: string
  category: HabitCategory
  icon: string
  unit: string
  minimumValue: number
  targetValue: number
  excellentValue: number
  frequency: FrequencyType
  specificDays: Weekday[]
  startDate: string
  status: EntityStatus
  weight: number
  color: string
  order: number
  reminder?: string
  notes?: string
}

export type HabitCategory =
  | 'Esenciales'
  | 'Desarrollo'
  | 'Trabajo'
  | 'Mantenimiento'
  | 'Vida personal'
  | 'Recreacion'

export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'custom'
export type HabitEntryStatus =
  | 'unregistered'
  | 'minimum'
  | 'target'
  | 'excellent'
  | 'paused'
  | 'not_applicable'

export interface HabitEntry extends BaseEntity {
  habitId: string
  date: string
  value: number
  status: HabitEntryStatus
  quality?: number
  notes?: string
}

export interface Priority extends BaseEntity {
  date: string
  title: string
  notes?: string
  order: number
  completed: boolean
  movedFrom?: string
  generalBacklog: boolean
}

export interface Project extends BaseEntity {
  name: string
  description?: string
  status: EntityStatus
  color: string
}

export interface Task extends BaseEntity {
  projectId?: string
  title: string
  notes?: string
  completed: boolean
  status: EntityStatus
}

export type WorkSessionType =
  | 'Trabajo profundo'
  | 'Desarrollo'
  | 'Soporte'
  | 'Reunion'
  | 'Administracion'
  | 'Estudio'
  | 'Creacion de contenido'
  | 'Baja concentracion'

export interface WorkSession extends BaseEntity {
  projectId?: string
  taskId?: string
  startedAt: string
  endedAt?: string
  durationMinutes: number
  breakMinutes: number
  effectiveMinutes: number
  type: WorkSessionType
  result: string
  focusLevel: number
  notes?: string
  tags: string[]
}

export interface RecreationLog extends BaseEntity {
  dateTime: string
  platform: string
  type: 'Creacion de contenido' | 'Consumo intencional' | 'Desplazamiento automatico'
  durationMinutes: number
  feelingAfter: string
  planned: boolean
  notes?: string
}

export interface SleepLog extends BaseEntity {
  date: string
  sleepAt: string
  wakeAt: string
  interruptions: number
  napMinutes: number
  durationHours: number
  quality: number
  wakeEnergy: number
  lateWork: boolean
  notes?: string
}

export interface MealLog extends BaseEntity {
  dateTime: string
  mealType: string
  description: string
  hungerBefore: number
  satietyAfter: number
  reason: MealReason
  planned: boolean
  rushed: boolean
  notes?: string
}

export type MealReason =
  | 'Hambre fisica'
  | 'Antojo'
  | 'Ansiedad'
  | 'Aburrimiento'
  | 'Situacion social'
  | 'Conveniencia'
  | 'Otro'

export interface TrainingLog extends BaseEntity {
  dateTime: string
  type: string
  durationMinutes: number
  intensity: number
  exercises: string
  notes?: string
  energyBefore: number
  energyAfter: number
}

export interface CareLog extends BaseEntity {
  dateTime: string
  type: 'Skincare' | 'Higiene' | 'Corte o arreglo personal' | 'Otro cuidado'
  notes?: string
}

export interface SocialLog extends BaseEntity {
  dateTime: string
  type: 'Pareja' | 'Familia' | 'Amigos' | 'Tiempo personal' | 'Videojuegos' | 'Pelicula o serie' | 'Salida' | 'Creacion de contenido' | 'Otro'
  personOrGroup?: string
  durationMinutes: number
  quality: number
  planned: boolean
  notes?: string
}

export type AccountType = 'Efectivo' | 'Cuenta bancaria' | 'Ahorro' | 'Tarjeta de credito' | 'Otro'

export interface FinancialAccount extends BaseEntity {
  name: string
  type: AccountType
  currency: string
  openingBalance: number
  creditLimit?: number
  cutDate?: number
  paymentDate?: number
  status: EntityStatus
  color: string
  icon: string
}

export type MovementType =
  | 'Ingreso'
  | 'Gasto'
  | 'Transferencia'
  | 'Pago de deuda'
  | 'Pago de obligacion'
  | 'Ajuste'
  | 'Reembolso'

export interface FinancialMovement extends BaseEntity {
  dateTime: string
  accountId: string
  destinationAccountId?: string
  type: MovementType
  amount: number
  category: string
  description: string
  personOrMerchant?: string
  projectOrSource?: string
  paymentMethod?: string
  obligationId?: string
  debtId?: string
  fundId?: string
  notes?: string
  tags: string[]
}

export interface Budget extends BaseEntity {
  name: string
  category: string
  period: 'monthly' | 'quarterly' | 'yearly'
  amount: number
  rollover: boolean
  alertPercent: number
  status: EntityStatus
}

export type ObligationStatus =
  | 'Pendiente'
  | 'Parcialmente financiada'
  | 'Totalmente apartada'
  | 'Parcialmente pagada'
  | 'Pagada'
  | 'Vencida'
  | 'Cancelada'

export interface Obligation extends BaseEntity {
  name: string
  description?: string
  estimatedAmount: number
  finalAmount?: number
  dueDate: string
  priority: 'Critica' | 'Alta' | 'Media' | 'Baja'
  category: string
  allocatedAmount: number
  paidAmount: number
  status: ObligationStatus
  expectedAccountId?: string
  recurrence: 'none' | 'monthly' | 'yearly'
  notes?: string
}

export interface Debt extends BaseEntity {
  creditor: string
  name: string
  originalAmount: number
  currentBalance: number
  minimumPayment: number
  paymentDate?: number
  rate?: number
  type: 'Tarjeta' | 'Banco' | 'Prestamo personal' | 'Familiar' | 'Otro'
  priority: 'Critica' | 'Alta' | 'Media' | 'Baja'
  notes?: string
}

export interface DebtPayment extends BaseEntity {
  debtId: string
  movementId: string
  amount: number
  date: string
}

export interface Fund extends BaseEntity {
  name: string
  description?: string
  targetAmount?: number
  currentAmount: number
  accountId?: string
  status: EntityStatus
  color: string
}

export interface Principle extends BaseEntity {
  text: string
  favorite: boolean
  order: number
  status: EntityStatus
}

export interface MotivationLink extends BaseEntity {
  title: string
  url?: string
  platform?: string
  category: string
  personalNote?: string
  favorite: boolean
  localNote: boolean
}

export interface DailyCheckIn extends BaseEntity {
  date: string
  energy: number
  mood: number
  wakeTime?: string
  dayRescueActive: boolean
  rescueCompleted: boolean
}

export interface MoodEnergyLog extends BaseEntity {
  date: string
  dateTime: string
  energy: number
  mood: number
  source: 'dashboard' | 'quick' | 'system'
}

export interface WeightLog extends BaseEntity {
  date: string
  dateTime: string
  weightLb: number
  notes?: string
}

export interface DemoRecord extends BaseEntity {
  enabled: boolean
}

export type BackupEntityName =
  | 'settings'
  | 'habits'
  | 'habitEntries'
  | 'priorities'
  | 'projects'
  | 'tasks'
  | 'workSessions'
  | 'recreationLogs'
  | 'sleepLogs'
  | 'mealLogs'
  | 'trainingLogs'
  | 'careLogs'
  | 'socialLogs'
  | 'accounts'
  | 'movements'
  | 'budgets'
  | 'obligations'
  | 'debts'
  | 'debtPayments'
  | 'funds'
  | 'principles'
  | 'motivationLinks'
  | 'dailyCheckIns'
  | 'moodEnergyLogs'
  | 'weightLogs'

export interface AppData {
  settings: AppSettings
  habits: Habit[]
  habitEntries: HabitEntry[]
  priorities: Priority[]
  projects: Project[]
  tasks: Task[]
  workSessions: WorkSession[]
  recreationLogs: RecreationLog[]
  sleepLogs: SleepLog[]
  mealLogs: MealLog[]
  trainingLogs: TrainingLog[]
  careLogs: CareLog[]
  socialLogs: SocialLog[]
  accounts: FinancialAccount[]
  movements: FinancialMovement[]
  budgets: Budget[]
  obligations: Obligation[]
  debts: Debt[]
  debtPayments: DebtPayment[]
  funds: Fund[]
  principles: Principle[]
  motivationLinks: MotivationLink[]
  dailyCheckIns: DailyCheckIn[]
  moodEnergyLogs: MoodEnergyLog[]
  weightLogs: WeightLog[]
}

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }
