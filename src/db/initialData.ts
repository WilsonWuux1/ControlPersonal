import type {
  AppSettings,
  Budget,
  FinancialAccount,
  Fund,
  Habit,
  MotivationLink,
  Obligation,
  Principle,
} from '../types/domain'
import { newId, nowIso, todayIso } from '../utils/date'

const baseEntity = () => ({
  id: newId(),
  createdAt: nowIso(),
  updatedAt: nowIso(),
  schemaVersion: 1,
})

export const createDefaultSettings = (): AppSettings => ({
  ...baseEntity(),
  userName: '',
  currency: 'GTQ',
  firstDayOfWeek: 1,
  sleepGoalHours: 7,
  theme: 'system',
  onboardingCompleted: false,
  persistentStorage: false,
  deviceName: 'Dispositivo principal',
  dayRescueActions: [
    'Moverme o entrenar durante al menos 5 minutos',
    'Completar una prioridad importante',
    'Revisar o registrar mi situacion financiera',
  ],
  lockEnabled: false,
  inactivityMinutes: 10,
  habitScoreWeights: {
    unregistered: 0,
    minimum: 0.5,
    target: 1,
    excellent: 1.2,
    paused: null,
    not_applicable: null,
  },
  demoMode: false,
  hydrationGlassMl: 250,
  hydrationBottleMl: 600,
  movementReminderMinutes: 55,
  notificationQuietStart: '22:30',
  notificationQuietEnd: '07:00',
  notificationPreferences: {
    general: true,
    habits: true,
    movement: true,
    hydration: true,
    meals: true,
    work: true,
    study: true,
    finance: true,
    sleep: true,
  },
})

export const createInitialHabits = (sleepGoalHours = 7): Habit[] => {
  const everyDay: Habit['specificDays'] = [0, 1, 2, 3, 4, 5, 6]
  const items: Array<Pick<Habit, 'name' | 'description' | 'category' | 'icon' | 'unit' | 'minimumValue' | 'targetValue' | 'excellentValue' | 'frequency' | 'specificDays' | 'weight' | 'color'>> = [
    { name: 'Entrenamiento', description: 'Movimiento fisico y entrenamiento.', category: 'Esenciales', icon: 'Dumbbell', unit: 'minutos', minimumValue: 5, targetValue: 30, excellentValue: 45, frequency: 'daily', specificDays: everyDay, weight: 1, color: '#16a34a' },
    { name: 'Lectura', description: 'Lectura intencional.', category: 'Desarrollo', icon: 'BookOpen', unit: 'paginas', minimumValue: 1, targetValue: 5, excellentValue: 15, frequency: 'daily', specificDays: everyDay, weight: 1, color: '#2563eb' },
    { name: 'Curso de ingles', description: 'Practica de ingles.', category: 'Desarrollo', icon: 'Languages', unit: 'minutos', minimumValue: 5, targetValue: 20, excellentValue: 45, frequency: 'daily', specificDays: everyDay, weight: 1, color: '#7c3aed' },
    { name: 'Mantenimiento de la pecera', description: 'Revision rapida o mantenimiento completo.', category: 'Mantenimiento', icon: 'Droplets', unit: 'revision', minimumValue: 1, targetValue: 1, excellentValue: 2, frequency: 'weekly', specificDays: [6], weight: 1, color: '#0891b2' },
    { name: 'Trabajo productivo', description: 'Tiempo efectivo con resultado claro.', category: 'Trabajo', icon: 'Briefcase', unit: 'horas', minimumValue: 1, targetValue: 8, excellentValue: 8, frequency: 'daily', specificDays: [1, 2, 3, 4, 5], weight: 1, color: '#0f766e' },
    { name: 'Sueno', description: 'Descanso suficiente sin premiar exceso.', category: 'Esenciales', icon: 'Moon', unit: 'horas', minimumValue: 5, targetValue: sleepGoalHours, excellentValue: sleepGoalHours + 1, frequency: 'daily', specificDays: everyDay, weight: 1, color: '#4f46e5' },
    { name: 'Cuidado personal y skincare', description: 'Rutina personal basica.', category: 'Esenciales', icon: 'Sparkles', unit: 'rutina', minimumValue: 1, targetValue: 1, excellentValue: 2, frequency: 'daily', specificDays: everyDay, weight: 1, color: '#db2777' },
    { name: 'Alimentacion consciente', description: 'Comer con atencion.', category: 'Esenciales', icon: 'Apple', unit: 'registro', minimumValue: 1, targetValue: 2, excellentValue: 3, frequency: 'daily', specificDays: everyDay, weight: 1, color: '#ea580c' },
    { name: 'Evitar comida chatarra', description: 'Cumplir alimentacion planificada.', category: 'Esenciales', icon: 'ShieldCheck', unit: 'dia', minimumValue: 1, targetValue: 1, excellentValue: 1, frequency: 'daily', specificDays: everyDay, weight: 1, color: '#65a30d' },
    { name: 'Meditacion', description: 'Pausa consciente.', category: 'Desarrollo', icon: 'Brain', unit: 'minutos', minimumValue: 2, targetValue: 10, excellentValue: 20, frequency: 'daily', specificDays: everyDay, weight: 1, color: '#9333ea' },
    { name: 'Tiempo de recreacion intencional', description: 'Descanso elegido con criterio.', category: 'Recreacion', icon: 'Gamepad2', unit: 'minutos', minimumValue: 10, targetValue: 45, excellentValue: 90, frequency: 'daily', specificDays: everyDay, weight: 0.8, color: '#f59e0b' },
    { name: 'Tiempo de pareja', description: 'Espacio de calidad.', category: 'Vida personal', icon: 'Heart', unit: 'minutos', minimumValue: 10, targetValue: 45, excellentValue: 90, frequency: 'weekly', specificDays: [0, 5, 6], weight: 1, color: '#e11d48' },
    { name: 'Tiempo con familia o amigos', description: 'Vida social y familiar.', category: 'Vida personal', icon: 'Users', unit: 'minutos', minimumValue: 10, targetValue: 45, excellentValue: 120, frequency: 'weekly', specificDays: [0, 5, 6], weight: 1, color: '#0284c7' },
  ]

  return items.map((item, index) => ({
    ...baseEntity(),
    ...item,
    startDate: todayIso(),
    status: 'active',
    order: index + 1,
    notes: '',
  }))
}

export const initialIncomeCategories = ['Salario', 'Proyecto', 'Pago extraordinario', 'Reembolso', 'Venta', 'Otro ingreso']

export const initialExpenseCategories = [
  'Casa',
  'Comida',
  'Luz',
  'Servicios',
  'Deudas personales',
  'Banco',
  'Licencias',
  'Vehiculo',
  'Servicio del carro',
  'Tarjetas de circulacion',
  'Telefono',
  'Vitaminas',
  'Salud',
  'Pareja',
  'Familia',
  'Entretenimiento',
  'Educacion',
  'Peceras',
  'Ahorro',
  'Otro',
]

export const createInitialFunds = (): Fund[] =>
  ['Casa', 'Comida', 'Licencias', 'Servicio del carro', 'Deudas', 'Ahorro', 'Emergencias', 'Dinero libre'].map((name, index) => ({
    ...baseEntity(),
    name,
    currentAmount: 0,
    status: 'active',
    color: ['#2563eb', '#16a34a', '#f59e0b', '#0f766e', '#dc2626', '#7c3aed', '#0891b2', '#64748b'][index],
  }))

export const createInitialObligations = (): Obligation[] =>
  ['Licencia de carro', 'Licencia de moto', 'Tarjeta de circulacion del carro', 'Tarjeta de circulacion de la moto', 'Servicio del carro', 'Pago de tarjeta de credito'].map((name, index) => ({
    ...baseEntity(),
    name,
    estimatedAmount: 0,
    dueDate: todayIso(),
    priority: index === 5 ? 'Alta' : 'Media',
    category: index === 5 ? 'Banco' : 'Vehiculo',
    allocatedAmount: 0,
    paidAmount: 0,
    status: 'Pendiente',
    recurrence: index === 4 ? 'none' : 'yearly',
  }))

export const createInitialBudgets = (): Budget[] =>
  ['Casa', 'Comida', 'Luz', 'Telefono', 'Vitaminas', 'Ahorro'].map((category) => ({
    ...baseEntity(),
    name: `Presupuesto ${category}`,
    category,
    period: 'monthly',
    amount: 0,
    rollover: false,
    alertPercent: 85,
    status: 'active',
  }))

export const initialPrinciples: Principle[] = [
  'No sobrestimes cuanto puedes hacer en poco tiempo.',
  'Se constante y enfocate en avances graduales.',
  'Si algo te incomoda, di NO.',
  'Estar ocupado no significa ser productivo.',
  'Aplicar consejos antes de cuestionar.',
  'Eres valioso, reconocelo.',
  'Lo que pienso y siento importa.',
  'Yo estoy aqui para cultivar la verdad de mi alma en cada acto, palabra y silencio.',
  'Mi presencia en este mundo es valiosa porque mi proceso tiene valor, incluso cuando nadie lo ve.',
  'Cuando me conecto conmigo mismo, siento que soy casa y hogar, refugio y templo.',
  'Mas movimiento significa mas energia y mas productividad.',
  'Evita la comida chatarra que reduce el enfoque mental.',
].map((text, order) => ({
  ...baseEntity(),
  text,
  favorite: false,
  order,
  status: 'active',
}))

export const initialMotivationLinks: MotivationLink[] = [
  'https://www.tiktok.com/@rise_and_thrive8/video/7443629022304603448?lang=es-419',
  'https://www.tiktok.com/@has_que_suceda/video/7481907907198602518',
  'https://www.tiktok.com/@hazlo.posible8/video/7498812377656315144',
  'https://www.tiktok.com/@pizzolog7/video/7492606149791927558',  
].map((url, index) => ({
  ...baseEntity(),
  title: `Video motivacional ${index + 1}`,
  url,
  platform: 'TikTok',
  category: 'Motivacion',
  favorite: false,
  localNote: false,
  personalNote: 'Requiere conexion a internet.',
}))

export const createStarterAccount = (currency = 'GTQ'): FinancialAccount => ({
  ...baseEntity(),
  name: 'Efectivo',
  type: 'Efectivo',
  currency,
  openingBalance: 0,
  status: 'active',
  color: '#2563eb',
  icon: 'Wallet',
})
