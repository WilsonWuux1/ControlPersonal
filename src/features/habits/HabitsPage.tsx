import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  Archive,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  Edit3,
  Flame,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Star,
  Target,
  Trash2,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Modal } from '../../components/Modal'
import { useAppStore } from '../../stores/appStore'
import {
  calculateHabitDayScore,
  statusFromValue,
} from '../../services/habitScoring'
import { percent } from '../../utils/format'
import { todayIso } from '../../utils/date'
import type {
  FrequencyType,
  Habit,
  HabitCategory,
} from '../../types/domain'

const habitSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  icon: z.string().min(1),
  unit: z.string().min(1),
  minimumValue: z.coerce.number().min(0),
  targetValue: z.coerce.number().min(0),
  excellentValue: z.coerce.number().min(0),
  frequency: z.string().min(1),
  weight: z.coerce.number().min(0.1),
  color: z.string().min(1),
  notes: z.string().optional(),
})

type HabitInput = z.input<typeof habitSchema>
type HabitForm = z.output<typeof habitSchema>

const habitCategories: HabitCategory[] = [
  'Esenciales',
  'Desarrollo',
  'Trabajo',
  'Mantenimiento',
  'Vida personal',
  'Recreacion',
]

const defaultHabitValues: HabitInput = {
  name: '',
  description: '',
  category: 'Esenciales',
  icon: 'Target',
  unit: 'veces',
  minimumValue: 1,
  targetValue: 1,
  excellentValue: 2,
  frequency: 'daily',
  weight: 1,
  color: '#2563eb',
  notes: '',
}

const entryLabel = (status?: string): string => {
  if (status === 'minimum') return 'Base'
  if (status === 'target') return 'Meta'
  if (status === 'excellent') return 'Extra'
  return status || 'Sin registrar'
}

export function HabitsPage() {
  const data = useAppStore((state) => state.data)
  const addHabit = useAppStore((state) => state.addHabit)
  const updateHabit = useAppStore((state) => state.updateHabit)
  const archiveHabit = useAppStore((state) => state.archiveHabit)
  const restoreHabit = useAppStore((state) => state.restoreHabit)
  const deleteHabit = useAppStore((state) => state.deleteHabit)
  const upsertEntry = useAppStore(
    (state) => state.upsertHabitEntry,
  )

  const [editing, setEditing] = useState<Habit | null>(null)
  const [deleting, setDeleting] = useState<Habit | null>(null)
  const [showForm, setShowForm] = useState(false)

  const today = todayIso()

  const {
    register,
    handleSubmit,
    reset,
  } = useForm<HabitInput, unknown, HabitForm>({
    resolver: zodResolver(habitSchema),
    defaultValues: defaultHabitValues,
  })

  const metrics = useMemo(() => {
    if (!data) return null

    return calculateHabitDayScore(
      data.habits,
      data.habitEntries,
      today,
      data.settings.habitScoreWeights,
    )
  }, [data, today])

  if (!data || !metrics) return null

  const activeHabits = data.habits
    .filter((habit) => habit.status === 'active')
    .toSorted((a, b) => a.order - b.order)

  const archivedHabits = data.habits
    .filter((habit) => habit.status === 'archived')
    .toSorted((a, b) => a.order - b.order)

  const todayEntries = new Map(
    data.habitEntries
      .filter((entry) => entry.date === today)
      .map((entry) => [entry.habitId, entry]),
  )

  const pendingHabits = activeHabits.filter(
    (habit) => !todayEntries.has(habit.id),
  )

  const registeredHabits = activeHabits.filter(
    (habit) => todayEntries.has(habit.id),
  )

  const chartData = habitCategories.map((category) => ({
    category,
    registros: data.habitEntries.filter((entry) =>
      activeHabits.some(
        (habit) =>
          habit.id === entry.habitId &&
          habit.category === category,
      ),
    ).length,
  }))

  const closeForm = () => {
    setEditing(null)
    setShowForm(false)
    reset(defaultHabitValues)
  }

  // const openCreate = () => {
  //   setEditing(null)
  //   reset(defaultHabitValues)
  //   setShowForm(true)
  // }

  const openEdit = (habit: Habit) => {
    setEditing(habit)
    reset(habit)
    setShowForm(true)
  }

  const submit = async (values: HabitForm) => {
    if (editing) {
      await updateHabit({
        ...editing,
        ...values,
        category: values.category as HabitCategory,
        frequency: values.frequency as FrequencyType,
      })
    } else {
      await addHabit({
        ...values,
        description: values.description ?? '',
        notes: values.notes ?? '',
        category: values.category as HabitCategory,
        frequency: values.frequency as FrequencyType,
        specificDays: [0, 1, 2, 3, 4, 5, 6],
        startDate: today,
        status: 'active',
        order: data.habits.length + 1,
      })
    }

    closeForm()
  }

  const renderHabitCard = (habit: Habit) => {
    const entry = todayEntries.get(habit.id)

    const options = [
      {
        label: 'Base',
        value: habit.minimumValue,
        icon: (
          <CalendarCheck
            size={14}
            aria-hidden="true"
          />
        ),
      },
      {
        label: 'Meta',
        value: habit.targetValue,
        icon: <Target size={14} aria-hidden="true" />,
      },
      {
        label: 'Extra',
        value: habit.excellentValue,
        icon: <Star size={14} aria-hidden="true" />,
      },
    ]

    return (
      <article
        className="habits-daily-card"
        key={habit.id}
        style={
          {
            '--habit-color': habit.color,
          } as CSSProperties
        }
      >
        <header className="habits-daily-card__header">
          <div className="habits-daily-card__identity">
            <h3>{habit.name}</h3>

            <span>
              {habit.category} · {habit.unit}
            </span>
          </div>

          <div className="habits-daily-card__tools">
            <span
              className={`status-pill status-${
                entry?.status ?? 'unregistered'
              }`}
            >
              {entryLabel(entry?.status)}
            </span>

            <details className="habits-action-menu">
              <summary
                aria-label={`Acciones de ${habit.name}`}
                title="Más acciones"
              >
                <MoreHorizontal
                  size={18}
                  aria-hidden="true"
                />
              </summary>

              <div className="habits-action-menu__popover">
                <button
                  type="button"
                  onClick={() => openEdit(habit)}
                >
                  <Edit3 size={15} aria-hidden="true" />
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void archiveHabit(habit.id)
                  }}
                >
                  <Archive size={15} aria-hidden="true" />
                  Archivar
                </button>

                <button
                  type="button"
                  className="is-danger"
                  onClick={() => setDeleting(habit)}
                >
                  <Trash2 size={15} aria-hidden="true" />
                  Eliminar
                </button>
              </div>
            </details>
          </div>
        </header>

        <div
          className="habits-choice-grid"
          role="group"
          aria-label={`Registrar progreso de ${habit.name}`}
        >
          {options.map((option) => {
            const active = entry?.value === option.value

            return (
              <button
                key={`${habit.id}-${option.label}-${option.value}`}
                type="button"
                className={`habits-choice${
                  active ? ' is-active' : ''
                }`}
                aria-pressed={active}
                title={`${option.label}: ${option.value} ${habit.unit}`}
                onClick={() =>
                  upsertEntry({
                    habitId: habit.id,
                    date: today,
                    value: option.value,
                    status: statusFromValue(
                      habit,
                      option.value,
                    ),
                  })
                }
              >
                <span>
                  {option.icon}
                  {option.label}
                </span>

                <strong>{option.value}</strong>
              </button>
            )
          })}
        </div>

        {entry ? (
          <footer className="habits-daily-card__footer">
            Registrado: {entry.value} {habit.unit}
          </footer>
        ) : null}
      </article>
    )
  }

  return (
    <section className="page habits-mobile-page">
      {/* <header className="habits-page-header">
        <div>
          <p>Seguimiento diario</p>
          <h2>Hábitos</h2>
        </div>

        <Button
          onClick={openCreate}
          icon={<Plus size={17} aria-hidden="true" />}
        >
          Crear
        </Button>
      </header> */}

      <div
        className="habits-summary-grid"
        aria-label="Resumen de hábitos"
      >
        <article className="habits-summary-card tone-blue">
          <CalendarCheck size={17} aria-hidden="true" />
          <span>Activos</span>
          <strong>{activeHabits.length}</strong>
        </article>

        <article className="habits-summary-card tone-green">
          <Flame size={17} aria-hidden="true" />
          <span>Mínimos</span>
          <strong>
            {percent(metrics.minimumPercent)}
          </strong>
        </article>

        <article className="habits-summary-card tone-gold">
          <Target size={17} aria-hidden="true" />
          <span>Metas</span>
          <strong>
            {percent(metrics.targetPercent)}
          </strong>
        </article>
      </div>


      <details className="habits-collapse" open>
        <summary>
          <div>
            <strong>Consistencia por categoría</strong>
            <span>Historial acumulado de registros</span>
          </div>

          <BarChart3 size={18} aria-hidden="true" />
        </summary>

        <div className="habits-collapse__body">
          <div className="habits-chart-box">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={58}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip />
                <Bar
                  dataKey="registros"
                  fill="#2563eb"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </details>

      <section className="panel habits-daily-panel">
        <div className="habits-panel-heading">
          <div>
            <h2>Pendientes de hoy</h2>

            <span>
              {pendingHabits.length} por registrar ·{' '}
              {registeredHabits.length} completados
            </span>
          </div>

          <strong>
            {registeredHabits.length}/{activeHabits.length}
          </strong>
        </div>

        <div className="habits-daily-list">
          {pendingHabits.map(renderHabitCard)}

          {pendingHabits.length === 0 &&
          activeHabits.length > 0 ? (
            <div className="habits-all-done">
              <CheckCircle2
                size={22}
                aria-hidden="true"
              />

              <div>
                <strong>Todo registrado por hoy</strong>
                <span>
                  Puedes revisar o cambiar los valores abajo.
                </span>
              </div>
            </div>
          ) : null}

          {activeHabits.length === 0 ? (
            <div className="habits-empty">
              <Target size={22} aria-hidden="true" />

              <div>
                <strong>No hay hábitos activos</strong>
                <span>
                  Crea el primero para comenzar el seguimiento.
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {registeredHabits.length > 0 ? (
        <details className="habits-collapse">
          <summary>
            <div>
              <strong>Registrados hoy</strong>
              <span>
                Revisa o cambia el nivel alcanzado
              </span>
            </div>

            <b>{registeredHabits.length}</b>
          </summary>

          <div className="habits-collapse__body">
            {registeredHabits.map(renderHabitCard)}
          </div>
        </details>
      ) : null}


      {archivedHabits.length > 0 ? (
        <details className="habits-collapse">
          <summary>
            <div>
              <strong>Hábitos archivados</strong>
              <span>
                Puedes restaurarlos cuando vuelvan a aplicar
              </span>
            </div>

            <b>{archivedHabits.length}</b>
          </summary>

          <div className="habits-collapse__body">
            <div className="habits-archived-list">
              {archivedHabits.map((habit) => (
                <article
                  className="habits-archived-row"
                  key={habit.id}
                >
                  <div>
                    <strong>{habit.name}</strong>
                    <span>{habit.category}</span>
                  </div>

                  <Button
                    variant="secondary"
                    aria-label={`Restaurar ${habit.name}`}
                    onClick={() => {
                      void restoreHabit(habit.id)
                    }}
                    icon={
                      <RotateCcw
                        size={15}
                        aria-hidden="true"
                      />
                    }
                  >
                    Restaurar
                  </Button>
                </article>
              ))}
            </div>
          </div>
        </details>
      ) : null}

      <Modal
        title={editing ? 'Editar hábito' : 'Crear hábito'}
        open={showForm}
        onClose={closeForm}
      >
        <form
          className="habits-form"
          onSubmit={handleSubmit(submit)}
        >
          <section className="habits-form-section">
            <h3>Información principal</h3>

            <label>
              Nombre
              <input
                {...register('name')}
                placeholder="Ej. Entrenamiento"
              />
            </label>

            <div className="habits-form-grid two">
              <label>
                Categoría

                <select {...register('category')}>
                  {habitCategories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label>
                Unidad
                <input
                  {...register('unit')}
                  placeholder="minutos, páginas..."
                />
              </label>
            </div>
          </section>

          <section className="habits-form-section">
            <h3>Niveles diarios</h3>

            <div className="habits-form-grid three">
              <label>
                Base
                <input
                  type="number"
                  step="0.1"
                  {...register('minimumValue')}
                />
              </label>

              <label>
                Meta
                <input
                  type="number"
                  step="0.1"
                  {...register('targetValue')}
                />
              </label>

              <label>
                Extra
                <input
                  type="number"
                  step="0.1"
                  {...register('excellentValue')}
                />
              </label>
            </div>
          </section>

          <details className="habits-form-advanced">
            <summary>Configuración adicional</summary>

            <div className="habits-form-advanced__body">
              <div className="habits-form-grid two">
                <label>
                  Frecuencia

                  <select {...register('frequency')}>
                    <option value="daily">Diaria</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                    <option value="custom">
                      Personalizada
                    </option>
                  </select>
                </label>

                <label>
                  Peso
                  <input
                    type="number"
                    step="0.1"
                    {...register('weight')}
                  />
                </label>

                <label>
                  Icono
                  <input {...register('icon')} />
                </label>

                <label>
                  Color
                  <input
                    type="color"
                    {...register('color')}
                  />
                </label>
              </div>

              <label>
                Descripción
                <textarea
                  rows={3}
                  {...register('description')}
                />
              </label>

              <label>
                Notas
                <textarea
                  rows={3}
                  {...register('notes')}
                />
              </label>
            </div>
          </details>

          <div className="habits-form-actions">
            <Button
              type="submit"
              icon={<Plus size={17} aria-hidden="true" />}
            >
              {editing
                ? 'Guardar cambios'
                : 'Crear hábito'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={closeForm}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar hábito"
        message="Se eliminarán también sus registros diarios. Esta acción no se puede deshacer."
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            void deleteHabit(deleting.id)
          }

          setDeleting(null)
        }}
      />
    </section>
  )
}