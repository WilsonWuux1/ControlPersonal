import { useMemo, useState } from 'react'
import { Archive, CalendarCheck, Edit3, Flame, Plus, RotateCcw, Star, Target, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Modal } from '../../components/Modal'
import { StatCard } from '../../components/StatCard'
import { useAppStore } from '../../stores/appStore'
import { calculateHabitDayScore, statusFromValue } from '../../services/habitScoring'
import { percent } from '../../utils/format'
import { todayIso } from '../../utils/date'
import type { Habit, HabitCategory, FrequencyType } from '../../types/domain'

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

export function HabitsPage() {
  const data = useAppStore((state) => state.data)
  const addHabit = useAppStore((state) => state.addHabit)
  const updateHabit = useAppStore((state) => state.updateHabit)
  const archiveHabit = useAppStore((state) => state.archiveHabit)
  const restoreHabit = useAppStore((state) => state.restoreHabit)
  const deleteHabit = useAppStore((state) => state.deleteHabit)
  const upsertEntry = useAppStore((state) => state.upsertHabitEntry)
  const [editing, setEditing] = useState<Habit | null>(null)
  const [deleting, setDeleting] = useState<Habit | null>(null)
  const [showForm, setShowForm] = useState(false)
  const today = todayIso()
  const { register, handleSubmit, reset } = useForm<HabitInput, unknown, HabitForm>({
    resolver: zodResolver(habitSchema),
    defaultValues: {
      name: '',
      category: 'Esenciales',
      icon: 'Target',
      unit: 'veces',
      minimumValue: 1,
      targetValue: 1,
      excellentValue: 2,
      frequency: 'daily',
      weight: 1,
      color: '#2563eb',
    },
  })

  const metrics = useMemo(() => {
    if (!data) return null
    return calculateHabitDayScore(data.habits, data.habitEntries, today, data.settings.habitScoreWeights)
  }, [data, today])

  if (!data || !metrics) return null
  const activeHabits = data.habits.filter((habit) => habit.status === 'active').sort((a, b) => a.order - b.order)
  const archivedHabits = data.habits.filter((habit) => habit.status === 'archived').sort((a, b) => a.order - b.order)
  const chartData = ['Esenciales', 'Desarrollo', 'Trabajo', 'Mantenimiento', 'Vida personal', 'Recreacion'].map((category) => ({
    category,
    registros: data.habitEntries.filter((entry) => activeHabits.find((habit) => habit.id === entry.habitId && habit.category === category)).length,
  }))

  const submit = async (values: HabitForm) => {
    if (editing) {
      await updateHabit({
        ...editing,
        ...values,
        category: values.category as HabitCategory,
        frequency: values.frequency as FrequencyType,
      })
      setEditing(null)
      setShowForm(false)
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
    reset()
  }

  const openEdit = (habit: Habit) => {
    setEditing(habit)
    setShowForm(true)
    reset(habit)
  }

  return (
    <section className="page stack">
      <div className="stat-grid">
        <StatCard label="Habitos activos" value={String(activeHabits.length)} icon={<CalendarCheck />} />
        <StatCard label="Minimos cumplidos" value={percent(metrics.minimumPercent)} icon={<Flame />} tone="green" />
        <StatCard label="Objetivos cumplidos" value={percent(metrics.targetPercent)} icon={<Flame />} tone="gold" />
      </div>
      <div className="two-column">
        {showForm ? (
        <section className="panel">
          <div className="panel-header">
            <h2>{editing ? 'Editar habito' : 'Crear habito'}</h2>
            <Button variant="ghost" onClick={() => { setEditing(null); setShowForm(false); reset() }}>
                Cancelar
            </Button>
          </div>
          <form className="form-stack" onSubmit={handleSubmit(submit)}>
            <div className="form-grid two">
              <label>
                Nombre
                <input {...register('name')} />
              </label>
              <label>
                Categoria
                <select {...register('category')}>
                  {['Esenciales', 'Desarrollo', 'Trabajo', 'Mantenimiento', 'Vida personal', 'Recreacion'].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                Unidad
                <input {...register('unit')} />
              </label>
              <label>
                Icono
                <input {...register('icon')} />
              </label>
              <label>
                Minimo
                <input type="number" step="0.1" {...register('minimumValue')} />
              </label>
              <label>
                Objetivo
                <input type="number" step="0.1" {...register('targetValue')} />
              </label>
              <label>
                Excelente
                <input type="number" step="0.1" {...register('excellentValue')} />
              </label>
              <label>
                Frecuencia
                <select {...register('frequency')}>
                  <option value="daily">Diaria</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                  <option value="custom">Personalizada</option>
                </select>
              </label>
              <label>
                Peso
                <input type="number" step="0.1" {...register('weight')} />
              </label>
              <label>
                Color
                <input type="color" {...register('color')} />
              </label>
            </div>
            <label>
              Descripcion
              <textarea {...register('description')} />
            </label>
            <Button type="submit" icon={<Plus size={18} />}>
              {editing ? 'Guardar cambios' : 'Crear habito'}
            </Button>
          </form>
        </section>
        ) : (
          <section className="panel">
            <div className="panel-header">
              <h2>Habitos</h2>
              <Button onClick={() => setShowForm(true)} icon={<Plus size={18} />}>
                Crear habito
              </Button>
            </div>
            <p className="muted">Crea o edita habitos solo cuando necesites cambiar tu sistema. El uso diario esta abajo.</p>
          </section>
        )}

        <section className="panel">
          <div className="panel-header">
            <h2>Consistencia por categoria</h2>
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="registros" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <h2>Vista diaria</h2>
          <span>Las casillas sin registro son neutrales.</span>
        </div>
        <div className="habit-grid">
          {activeHabits.map((habit) => {
            const entry = data.habitEntries.find((item) => item.habitId === habit.id && item.date === today)
            return (
              <article className="habit-card" key={habit.id} style={{ borderColor: habit.color }}>
                <div>
                  <h3>{habit.name}</h3>
                  <p>
                    {habit.minimumValue}/{habit.targetValue}/{habit.excellentValue} {habit.unit}
                  </p>
                </div>
                <div className="segmented">
                  {[
                    { label: 'Base', value: habit.minimumValue, icon: <CalendarCheck size={18} /> },
                    { label: 'Meta', value: habit.targetValue, icon: <Target size={18} /> },
                    { label: 'Extra', value: habit.excellentValue, icon: <Star size={18} /> },
                  ].map((option) => (
                    <button
                      key={`${habit.id}-${option.label}-${option.value}`}
                      type="button"
                      title={`${option.label}: ${option.value} ${habit.unit}`}
                      className={entry?.value === option.value ? 'active' : undefined}
                      onClick={() => upsertEntry({ habitId: habit.id, date: today, value: option.value, status: statusFromValue(habit, option.value) })}
                    >
                      {option.icon}
                      <span>{option.label}</span>
                      <strong>{option.value}</strong>
                    </button>
                  ))}
                </div>
                <span className={`status-pill status-${entry?.status ?? 'unregistered'}`}>{entry?.status ?? 'sin registrar'}</span>
                <div className="icon-actions">
                  <button type="button" aria-label={`Editar ${habit.name}`} title="Editar" onClick={() => openEdit(habit)}>
                    <Edit3 size={18} />
                  </button>
                  <button type="button" aria-label={`Archivar ${habit.name}`} title="Archivar" onClick={() => archiveHabit(habit.id)}>
                    <Archive size={18} />
                  </button>
                  <button type="button" aria-label={`Eliminar ${habit.name}`} title="Eliminar" onClick={() => setDeleting(habit)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {archivedHabits.length > 0 ? (
        <section className="panel">
          <div className="panel-header">
            <h2>Habitos archivados</h2>
            <span>Se pueden restaurar cuando vuelvan a aplicar.</span>
          </div>
          <div className="mobile-card-list">
            {archivedHabits.map((habit) => (
              <article className="mobile-card" key={habit.id}>
                <strong>{habit.name}</strong>
                <span>{habit.category}</span>
                <Button variant="secondary" onClick={() => restoreHabit(habit.id)} icon={<RotateCcw size={16} />}>
                  Desarchivar
                </Button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <Modal title="Historial detallado" open={false} onClose={() => undefined}>
        <div />
      </Modal>
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar habito"
        message="Se eliminaran tambien sus registros diarios. Esta accion no se puede deshacer."
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteHabit(deleting.id)
          setDeleting(null)
        }}
      />
    </section>
  )
}
