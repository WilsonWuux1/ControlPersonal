import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from './Button'
import { Modal } from './Modal'
import { useAppStore } from '../stores/appStore'
import { dateTimeLocalValue, fromDateTimeLocal, todayIso } from '../utils/date'
import { statusFromValue } from '../services/habitScoring'
import { calculateSleepDurationHours } from '../services/timeCalculations'
import type { Habit, HabitEntryStatus, MealReason, SocialLog, WorkSessionType } from '../types/domain'
import { initialExpenseCategories, initialIncomeCategories } from '../db/initialData'
import { workFocusOptions } from '../services/workFocus'

type QuickTab = 'habit' | 'income' | 'expense' | 'work' | 'meal' | 'sleep' | 'social'

interface QuickActionModalProps {
  open: boolean
  onClose: () => void
  initialTab?: QuickTab
}

const amountSchema = z.coerce.number().positive()
const qualityOptions = [
  { value: 1, label: 'Muy baja' },
  { value: 2, label: 'Baja' },
  { value: 3, label: 'Normal' },
  { value: 4, label: 'Buena' },
  { value: 5, label: 'Excelente' },
] as const
const hungerOptions = [
  { value: 1, label: 'Sin hambre' },
  { value: 2, label: 'Poca hambre' },
  { value: 3, label: 'Hambre normal' },
  { value: 4, label: 'Mucha hambre' },
  { value: 5, label: 'Hambre fuerte' },
] as const
const satietyOptions = [
  { value: 1, label: 'Aun con hambre' },
  { value: 2, label: 'Poco satisfecho' },
  { value: 3, label: 'Satisfecho' },
  { value: 4, label: 'Lleno' },
  { value: 5, label: 'Muy lleno' },
] as const
const socialQualityOptions = [
  { value: 1, label: 'Drenante' },
  { value: 2, label: 'Regular' },
  { value: 3, label: 'Agradable' },
  { value: 4, label: 'Buena' },
  { value: 5, label: 'Excelente' },
] as const

const habitValueOptions = (habit?: Habit): Array<{ value: number; label: string }> => {
  if (!habit) return [{ value: 0, label: 'Sin avance (0)' }]
  const grouped = new Map<number, string[]>()
  const add = (value: number, label: string) => grouped.set(value, [...(grouped.get(value) ?? []), label])
  add(0, 'Sin avance')
  add(habit.minimumValue, 'Minimo')
  add(habit.targetValue, 'Objetivo')
  add(habit.excellentValue, 'Excelente')
  return [...grouped.entries()]
    .sort(([a], [b]) => a - b)
    .map(([value, labels]) => ({ value, label: `${labels.join(' / ')} (${value} ${habit.unit})` }))
}

export function QuickActionModal({ open, onClose, initialTab = 'habit' }: QuickActionModalProps) {
  const [tab, setTab] = useState<QuickTab>(initialTab)
  const tabs: Array<{ id: QuickTab; label: string }> = [
    { id: 'habit', label: 'Habito' },
    { id: 'income', label: 'Ingreso' },
    { id: 'expense', label: 'Gasto' },
    { id: 'work', label: 'Trabajo' },
    { id: 'meal', label: 'Comida' },
    { id: 'sleep', label: 'Sueno' },
    { id: 'social', label: 'Vida' },
  ]

  return (
    <Modal title="Registro rapido" open={open} onClose={onClose}>
      <div className="tabs" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? 'active' : undefined}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === 'habit' ? <HabitQuickForm onDone={onClose} /> : null}
      {tab === 'income' ? <MovementQuickForm type="Ingreso" onDone={onClose} /> : null}
      {tab === 'expense' ? <MovementQuickForm type="Gasto" onDone={onClose} /> : null}
      {tab === 'work' ? <WorkQuickForm onDone={onClose} /> : null}
      {tab === 'meal' ? <MealQuickForm onDone={onClose} /> : null}
      {tab === 'sleep' ? <SleepQuickForm onDone={onClose} /> : null}
      {tab === 'social' ? <SocialQuickForm onDone={onClose} /> : null}
    </Modal>
  )
}

const habitSchema = z.object({
  habitId: z.string().min(1),
  value: z.coerce.number().min(0),
  status: z.enum(['auto', 'minimum', 'target', 'excellent', 'paused', 'not_applicable']),
  notes: z.string().optional(),
})

function HabitQuickForm({ onDone }: { onDone: () => void }) {
  const data = useAppStore((state) => state.data)
  const upsert = useAppStore((state) => state.upsertHabitEntry)
  const addToast = useAppStore((state) => state.addToast)
  const habits = data?.habits.filter((habit) => habit.status === 'active') ?? []
  type HabitInput = z.input<typeof habitSchema>
  type HabitOutput = z.output<typeof habitSchema>
  const { register, handleSubmit, watch } = useForm<HabitInput, unknown, HabitOutput>({
    resolver: zodResolver(habitSchema),
    defaultValues: { habitId: habits[0]?.id, value: 0, status: 'auto' },
  })
  const selectedHabit = habits.find((item) => item.id === watch('habitId'))

  const submit = async (values: HabitOutput) => {
    const habit = habits.find((item) => item.id === values.habitId)
    if (!habit) return
    const status: HabitEntryStatus = values.status === 'auto' ? statusFromValue(habit, values.value) : values.status
    await upsert({ habitId: habit.id, date: todayIso(), value: values.value, status, notes: values.notes })
    addToast({ title: 'Habito registrado', detail: habit.name, tone: 'success' })
    onDone()
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit(submit)}>
      <label>
        Habito
        <select {...register('habitId')}>
          {habits.map((habit) => (
            <option key={habit.id} value={habit.id}>
              {habit.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Valor
        <select {...register('value')}>
          {habitValueOptions(selectedHabit).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Estado
        <select {...register('status')}>
          <option value="auto">Automatico segun valor</option>
          <option value="minimum">Minimo cumplido</option>
          <option value="target">Objetivo cumplido</option>
          <option value="excellent">Excelente</option>
          <option value="paused">Pausado justificadamente</option>
          <option value="not_applicable">No aplicaba</option>
        </select>
      </label>
      <label>
        Notas
        <textarea {...register('notes')} />
      </label>
      <Button type="submit" disabled={!watch('habitId')}>
        Guardar habito
      </Button>
    </form>
  )
}

const movementSchema = z.object({
  accountId: z.string().min(1),
  amount: amountSchema,
  category: z.string().min(1),
  description: z.string().min(1),
  dateTime: z.string().min(1),
  tags: z.string().optional(),
})

function MovementQuickForm({ type, onDone }: { type: 'Ingreso' | 'Gasto'; onDone: () => void }) {
  const data = useAppStore((state) => state.data)
  const addMovement = useAppStore((state) => state.addMovement)
  const addToast = useAppStore((state) => state.addToast)
  const accounts = data?.accounts.filter((account) => account.status === 'active') ?? []
  const categories = type === 'Ingreso' ? initialIncomeCategories : initialExpenseCategories
  type MovementInput = z.input<typeof movementSchema>
  type MovementOutput = z.output<typeof movementSchema>
  const { register, handleSubmit } = useForm<MovementInput, unknown, MovementOutput>({
    resolver: zodResolver(movementSchema),
    defaultValues: { accountId: accounts[0]?.id, category: categories[0], dateTime: dateTimeLocalValue(), tags: '' },
  })

  const submit = async (values: MovementOutput) => {
    await addMovement({
      ...values,
      dateTime: fromDateTimeLocal(values.dateTime),
      type,
      tags: values.tags ? values.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
    })
    addToast({ title: `${type} registrado`, detail: values.description, tone: 'success' })
    onDone()
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit(submit)}>
      <label>
        Cuenta
        <select {...register('accountId')}>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Monto
        <input type="number" step="0.01" {...register('amount')} />
      </label>
      <label>
        Categoria
        <select {...register('category')}>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
      </label>
      <label>
        Descripcion
        <input {...register('description')} />
      </label>
      <label>
        Fecha y hora
        <input type="datetime-local" {...register('dateTime')} />
      </label>
      <label>
        Etiquetas
        <input {...register('tags')} placeholder="Separadas por coma" />
      </label>
      <Button type="submit">Guardar {type.toLowerCase()}</Button>
    </form>
  )
}

const workSchema = z.object({
  type: z.string().min(1),
  startedAt: z.string().min(1),
  endedAt: z.string().min(1),
  breakMinutes: z.coerce.number().min(0),
  result: z.string().min(1),
  focusLevel: z.coerce.number().min(1).max(5),
  notes: z.string().optional(),
})

function WorkQuickForm({ onDone }: { onDone: () => void }) {
  const addWorkSession = useAppStore((state) => state.addWorkSession)
  const addToast = useAppStore((state) => state.addToast)
  type WorkInput = z.input<typeof workSchema>
  type WorkOutput = z.output<typeof workSchema>
  const { register, handleSubmit } = useForm<WorkInput, unknown, WorkOutput>({
    resolver: zodResolver(workSchema),
    defaultValues: { type: 'Trabajo profundo', startedAt: dateTimeLocalValue(), endedAt: dateTimeLocalValue(), breakMinutes: 0, focusLevel: 4 },
  })
  const submit = async (values: WorkOutput) => {
    const startedAt = fromDateTimeLocal(values.startedAt)
    const endedAt = fromDateTimeLocal(values.endedAt)
    const durationMinutes = Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60_000))
    await addWorkSession({
      startedAt,
      endedAt,
      durationMinutes,
      breakMinutes: values.breakMinutes,
      effectiveMinutes: Math.max(0, durationMinutes - values.breakMinutes),
      type: values.type as WorkSessionType,
      result: values.result,
      focusLevel: values.focusLevel,
      notes: values.notes,
      tags: [],
    })
    addToast({ title: 'Sesion guardada', detail: values.result, tone: 'success' })
    onDone()
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit(submit)}>
      <label>
        Tipo
        <select {...register('type')}>
          {['Trabajo profundo', 'Desarrollo', 'Soporte', 'Reunion', 'Administracion', 'Estudio', 'Creacion de contenido', 'Baja concentracion'].map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
      </label>
      <label>
        Inicio
        <input type="datetime-local" {...register('startedAt')} />
      </label>
      <label>
        Fin
        <input type="datetime-local" {...register('endedAt')} />
      </label>
      <label>
        Pausas en minutos
        <input type="number" {...register('breakMinutes')} />
      </label>
      <label>
        Resultado
        <input {...register('result')} />
      </label>
      <label>
        Enfoque
        <select {...register('focusLevel')}>
          {workFocusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit">Guardar sesion</Button>
    </form>
  )
}

const mealSchema = z.object({
  mealType: z.string().min(1),
  description: z.string().min(1),
  hungerBefore: z.coerce.number().min(1).max(5),
  satietyAfter: z.coerce.number().min(1).max(5),
  reason: z.string().min(1),
  planned: z.boolean(),
  rushed: z.boolean(),
  dateTime: z.string().min(1),
})

function MealQuickForm({ onDone }: { onDone: () => void }) {
  const addMealLog = useAppStore((state) => state.addMealLog)
  type MealInput = z.input<typeof mealSchema>
  type MealOutput = z.output<typeof mealSchema>
  const { register, handleSubmit } = useForm<MealInput, unknown, MealOutput>({
    resolver: zodResolver(mealSchema),
    defaultValues: { mealType: 'Comida', hungerBefore: 3, satietyAfter: 3, reason: 'Hambre fisica', planned: true, rushed: false, dateTime: dateTimeLocalValue() },
  })
  const submit = async (values: MealOutput) => {
    await addMealLog({ ...values, dateTime: fromDateTimeLocal(values.dateTime), reason: values.reason as MealReason })
    onDone()
  }
  return (
    <form className="form-stack" onSubmit={handleSubmit(submit)}>
      <label>
        Tipo
        <input {...register('mealType')} />
      </label>
      <label>
        Descripcion
        <textarea {...register('description')} />
      </label>
      <label>
        Hambre antes
        <select {...register('hungerBefore')}>
          {hungerOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Saciedad despues
        <select {...register('satietyAfter')}>
          {satietyOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Motivo
        <select {...register('reason')}>
          {['Hambre fisica', 'Antojo', 'Ansiedad', 'Aburrimiento', 'Situacion social', 'Conveniencia', 'Otro'].map((reason) => (
            <option key={reason}>{reason}</option>
          ))}
        </select>
      </label>
      <label className="check-row">
        <input type="checkbox" {...register('planned')} />
        Planificada
      </label>
      <label className="check-row">
        <input type="checkbox" {...register('rushed')} />
        Con prisa
      </label>
      <Button type="submit">Guardar comida</Button>
    </form>
  )
}

const sleepSchema = z.object({
  interruptions: z.coerce.number().min(0),
  quality: z.coerce.number().min(1).max(5),
  wakeEnergy: z.coerce.number().min(1).max(5),
  lateWork: z.boolean(),
  notes: z.string().optional(),
})

function SleepQuickForm({ onDone }: { onDone: () => void }) {
  const data = useAppStore((state) => state.data)
  const addSleepLog = useAppStore((state) => state.addSleepLog)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const addToast = useAppStore((state) => state.addToast)

  const [wakeAt, setWakeAt] = useState<string | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [manualSleepAt, setManualSleepAt] = useState('')
  const [manualWakeAt, setManualWakeAt] = useState(dateTimeLocalValue())

  type SleepInput = z.input<typeof sleepSchema>
  type SleepOutput = z.output<typeof sleepSchema>

  const { register, handleSubmit } = useForm<
    SleepInput,
    unknown,
    SleepOutput
  >({
    resolver: zodResolver(sleepSchema),
    defaultValues: {
      interruptions: 0,
      quality: 3,
      wakeEnergy: 3,
      lateWork: false,
    },
  })

  const sleepAt = data?.settings.activeSleepStartedAt

  const currentWakeAt = wakeAt ?? nowIso()

  const previewHours = sleepAt
    ? calculateSleepDurationHours(
        sleepAt,
        currentWakeAt,
        0,
      )
    : 0

  const manualSleepIso = manualSleepAt
    ? fromDateTimeLocal(manualSleepAt)
    : ''

  const manualWakeIso = manualWakeAt
    ? fromDateTimeLocal(manualWakeAt)
    : ''

  const manualPreviewHours =
    manualSleepIso && manualWakeIso
      ? calculateSleepDurationHours(
          manualSleepIso,
          manualWakeIso,
          0,
        )
      : 0

  const submit = async (values: SleepOutput) => {
    if (!sleepAt || !wakeAt) return

    await addSleepLog({
      ...values,
      date: wakeAt.slice(0, 10),
      sleepAt,
      wakeAt,
      napMinutes: 0,
      durationHours: 0,
    })

    await updateSettings({
      activeSleepStartedAt: undefined,
    })

    addToast({
      title: 'Sueño registrado',
      detail: `${previewHours} h dormidas`,
      tone: 'success',
    })

    onDone()
  }

  const submitManual = async (values: SleepOutput) => {
    if (!manualSleepAt || !manualWakeAt) {
      addToast({
        title: 'Completa las horas',
        detail:
          'Indica aproximadamente cuándo te dormiste y cuándo despertaste.',
        tone: 'warning',
      })

      return
    }

    const sleepTime = new Date(manualSleepIso).getTime()
    const wakeTime = new Date(manualWakeIso).getTime()

    if (
      !Number.isFinite(sleepTime) ||
      !Number.isFinite(wakeTime) ||
      wakeTime <= sleepTime
    ) {
      addToast({
        title: 'Horario de sueño no válido',
        detail:
          'La hora de despertar debe ser posterior a la hora de dormir.',
        tone: 'warning',
      })

      return
    }

    await addSleepLog({
      ...values,
      // Se usa la fecha local elegida en el campo,
      // para que un despertar cercano a medianoche no cambie de día por UTC.
      date: manualWakeAt.slice(0, 10),
      sleepAt: manualSleepIso,
      wakeAt: manualWakeIso,
      napMinutes: 0,
      durationHours: 0,
    })

    addToast({
      title: 'Sueño registrado manualmente',
      detail: `${manualPreviewHours} h dormidas`,
      tone: 'success',
    })

    onDone()
  }

  /*
   * Si NO hay un sueño activo, mantenemos intacta la acción rápida
   * "Me voy a dormir", pero también ofrecemos el registro manual.
   */
  if (!sleepAt) {
    if (manualMode) {
      return (
        <form
          className="form-stack"
          onSubmit={handleSubmit(submitManual)}
        >
          <div className="sleep-capture">
            <strong>Registro manual</strong>

            <p>
              Úsalo cuando olvidaste presionar “Me voy a dormir”.
              Puedes colocar una hora aproximada de inicio y la hora
              en que despertaste.
            </p>
          </div>

          <label>
            Me dormí aproximadamente

            <input
              type="datetime-local"
              value={manualSleepAt}
              max={manualWakeAt || undefined}
              onChange={(event) =>
                setManualSleepAt(event.target.value)
              }
            />
          </label>

          <label>
            Desperté

            <input
              type="datetime-local"
              value={manualWakeAt}
              min={manualSleepAt || undefined}
              onChange={(event) =>
                setManualWakeAt(event.target.value)
              }
            />
          </label>

          {manualSleepAt && manualWakeAt ? (
            <div className="sleep-capture compact">
              <div>
                <strong>
                  {manualPreviewHours} h estimadas
                </strong>

                <p>
                  Revisa las horas antes de guardar el registro.
                </p>
              </div>
            </div>
          ) : null}

          <label>
            Interrupciones

            <select {...register('interruptions')}>
              <option value="0">Ninguna</option>
              <option value="1">Una vez</option>
              <option value="2">Dos veces</option>
              <option value="3">Tres o más</option>
            </select>
          </label>

          <label>
            Calidad del sueño

            <select {...register('quality')}>
              {qualityOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Energía al despertar

            <select {...register('wakeEnergy')}>
              {qualityOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="check-row">
            <input
              type="checkbox"
              {...register('lateWork')}
            />
            Trabajé de madrugada
          </label>

          <label>
            Notas

            <textarea {...register('notes')} />
          </label>

          <div className="actions">
            <Button type="submit">
              Guardar sueño
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setManualMode(false)}
            >
              Volver
            </Button>
          </div>
        </form>
      )
    }

    return (
      <div className="form-stack">
        <div className="sleep-capture">
          <strong>Registrar al momento</strong>

          <p>
            Presiona el botón cuando ya te vas a dormir.
            La hora queda guardada hasta que marques que
            despertaste.
          </p>

          <div className="actions">
            <Button
              onClick={async () => {
                await updateSettings({
                  activeSleepStartedAt: nowIso(),
                })

                addToast({
                  title: 'Hora de dormir guardada',
                  detail:
                    'Cuando despiertes, vuelve aquí y marca Desperté.',
                  tone: 'success',
                })

                onDone()
              }}
            >
              Me voy a dormir
            </Button>

            <Button
              variant="secondary"
              onClick={() => setManualMode(true)}
            >
              Registrar manualmente
            </Button>
          </div>
        </div>

        <p className="muted">
          El registro manual sirve cuando olvidaste iniciar
          el sueño en el momento.
        </p>
      </div>
    )
  }

  /*
   * Si ya existe una hora de inicio guardada,
   * el flujo rápido original sigue exactamente igual.
   */
  if (!wakeAt) {
    return (
      <div className="form-stack">
        <div className="sleep-capture">
          <strong>Sueño en curso</strong>

          <p>
            Inicio guardado:{' '}
            {new Date(sleepAt).toLocaleString()}.
          </p>

          <div className="actions">
            <Button onClick={() => setWakeAt(nowIso())}>
              Desperté
            </Button>

            <Button
              variant="ghost"
              onClick={async () => {
                await updateSettings({
                  activeSleepStartedAt: undefined,
                })

                addToast({
                  title: 'Registro de sueño cancelado',
                  tone: 'info',
                })

                onDone()
              }}
            >
              Cancelar inicio
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form
      className="form-stack"
      onSubmit={handleSubmit(submit)}
    >
      <div className="sleep-capture">
        <strong>{previewHours} h registradas</strong>

        <p>
          Dormí: {new Date(sleepAt).toLocaleString()} -
          Desperté: {new Date(wakeAt).toLocaleString()}.
        </p>
      </div>

      <label>
        Interrupciones

        <select {...register('interruptions')}>
          <option value="0">Ninguna</option>
          <option value="1">Una vez</option>
          <option value="2">Dos veces</option>
          <option value="3">Tres o más</option>
        </select>
      </label>

      <label>
        Calidad del sueño

        <select {...register('quality')}>
          {qualityOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Energía al despertar

        <select {...register('wakeEnergy')}>
          {qualityOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="check-row">
        <input
          type="checkbox"
          {...register('lateWork')}
        />
        Trabajé de madrugada
      </label>

      <label>
        Notas

        <textarea {...register('notes')} />
      </label>

      <Button type="submit">
        Guardar sueño
      </Button>
    </form>
  )
}

const socialSchema = z.object({
  type: z.string().min(1),
  personOrGroup: z.string().optional(),
  durationMinutes: z.coerce.number().positive(),
  quality: z.coerce.number().min(1).max(5),
  planned: z.boolean(),
  notes: z.string().optional(),
})

function SocialQuickForm({ onDone }: { onDone: () => void }) {
  const addSocialLog = useAppStore((state) => state.addSocialLog)
  type SocialInput = z.input<typeof socialSchema>
  type SocialOutput = z.output<typeof socialSchema>
  const { register, handleSubmit } = useForm<SocialInput, unknown, SocialOutput>({
    resolver: zodResolver(socialSchema),
    defaultValues: { type: 'Pareja', durationMinutes: 30, quality: 4, planned: true },
  })
  const submit = async (values: SocialOutput) => {
    await addSocialLog({ ...values, dateTime: nowIso(), type: values.type as SocialLog['type'] })
    onDone()
  }
  return (
    <form className="form-stack" onSubmit={handleSubmit(submit)}>
      <label>
        Tipo
        <select {...register('type')}>
          {['Pareja', 'Familia', 'Amigos', 'Tiempo personal', 'Videojuegos', 'Pelicula o serie', 'Salida', 'Creacion de contenido', 'Otro'].map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
      </label>
      <label>
        Persona o grupo
        <input {...register('personOrGroup')} />
      </label>
      <label>
        Duracion
        <input type="number" {...register('durationMinutes')} />
      </label>
      <label>
        Calidad
        <select {...register('quality')}>
          {socialQualityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="check-row">
        <input type="checkbox" {...register('planned')} />
        Planificada
      </label>
      <Button type="submit">Guardar actividad</Button>
    </form>
  )
}

const nowIso = (): string => new Date().toISOString()