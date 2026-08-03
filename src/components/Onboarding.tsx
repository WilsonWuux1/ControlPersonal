import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2 } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { Button } from './Button'
import { createStarterAccount } from '../db/initialData'
import type { Debt, FinancialAccount, Obligation } from '../types/domain'
import { newId, nowIso, todayIso } from '../utils/date'

const onboardingSchema = z.object({
  userName: z.string().trim().optional(),
  currency: z.string().trim().min(3).default('GTQ'),
  firstDayOfWeek: z.coerce.number().min(0).max(6).default(1),
  sleepGoalHours: z.coerce.number().min(1).max(12).default(7),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  accountName: z.string().trim().optional(),
  openingBalance: z.coerce.number().default(0),
  debtName: z.string().trim().optional(),
  debtBalance: z.coerce.number().default(0),
  obligationName: z.string().trim().optional(),
  obligationAmount: z.coerce.number().default(0),
})

type OnboardingInput = z.input<typeof onboardingSchema>
type OnboardingForm = z.output<typeof onboardingSchema>

export function Onboarding() {
  const data = useAppStore((state) => state.data)
  const complete = useAppStore((state) => state.completeOnboarding)
  const [enabledHabitIds, setEnabledHabitIds] = useState<string[]>(() => data?.habits.map((habit) => habit.id) ?? [])
  const { register, handleSubmit, formState } = useForm<OnboardingInput, unknown, OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { currency: 'GTQ', firstDayOfWeek: 1, sleepGoalHours: 7, theme: 'system', openingBalance: 0 },
  })

  const habits = useMemo(() => data?.habits ?? [], [data?.habits])

  const submit = async (values: OnboardingForm) => {
    const stamp = nowIso()
    const accounts: FinancialAccount[] = values.accountName
      ? [
          {
            ...createStarterAccount(values.currency),
            id: newId(),
            name: values.accountName,
            openingBalance: values.openingBalance,
            createdAt: stamp,
            updatedAt: stamp,
          },
        ]
      : []
    const debts: Debt[] = values.debtName
      ? [
          {
            id: newId(),
            createdAt: stamp,
            updatedAt: stamp,
            schemaVersion: 1,
            creditor: values.debtName,
            name: values.debtName,
            originalAmount: values.debtBalance,
            currentBalance: values.debtBalance,
            minimumPayment: 0,
            type: 'Otro',
            priority: 'Media',
          },
        ]
      : []
    const obligations: Obligation[] = values.obligationName
      ? [
          {
            id: newId(),
            createdAt: stamp,
            updatedAt: stamp,
            schemaVersion: 1,
            name: values.obligationName,
            estimatedAmount: values.obligationAmount,
            dueDate: todayIso(),
            priority: 'Media',
            category: 'Otro',
            allocatedAmount: 0,
            paidAmount: 0,
            status: 'Pendiente',
            recurrence: 'none',
          },
        ]
      : []
    await complete({ ...values, firstDayOfWeek: values.firstDayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6 }, accounts, debts, obligations, enabledHabitIds)
  }

  return (
    <main className="onboarding">
      <form className="onboarding-panel" onSubmit={handleSubmit(submit)}>
        <div className="headline">
          <CheckCircle2 size={34} />
          <div>
            <h1>Configurar Control Personal</h1>
            <p>Completa lo esencial ahora o deja campos vacios para ajustarlos despues.</p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            Nombre
            <input {...register('userName')} placeholder="Tu nombre" />
          </label>
          <label>
            Moneda principal
            <input {...register('currency')} placeholder="GTQ" />
          </label>
          <label>
            Primer dia de la semana
            <select {...register('firstDayOfWeek')}>
              <option value={1}>Lunes</option>
              <option value={0}>Domingo</option>
            </select>
          </label>
          <label>
            Meta de sueno
            <input {...register('sleepGoalHours')} type="number" min="1" max="12" />
          </label>
          <label>
            Tema
            <select {...register('theme')}>
              <option value="system">Sistema</option>
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
            </select>
          </label>
          <label>
            Cuenta inicial
            <input {...register('accountName')} placeholder="Efectivo, banco, ahorro..." />
          </label>
          <label>
            Saldo inicial
            <input {...register('openingBalance')} type="number" step="0.01" />
          </label>
          <label>
            Deuda existente
            <input {...register('debtName')} placeholder="Opcional" />
          </label>
          <label>
            Saldo de deuda
            <input {...register('debtBalance')} type="number" step="0.01" />
          </label>
          <label>
            Obligacion proxima
            <input {...register('obligationName')} placeholder="Opcional" />
          </label>
          <label>
            Monto estimado
            <input {...register('obligationAmount')} type="number" step="0.01" />
          </label>
        </div>
        <section className="check-list">
          <h2>Habitos activos</h2>
          {habits.map((habit) => (
            <label key={habit.id} className="check-row">
              <input
                type="checkbox"
                checked={enabledHabitIds.includes(habit.id)}
                onChange={(event) =>
                  setEnabledHabitIds((current) => (event.target.checked ? [...current, habit.id] : current.filter((id) => id !== habit.id)))
                }
              />
              <span>{habit.name}</span>
            </label>
          ))}
        </section>
        {formState.errors.root ? <p className="error-text">{formState.errors.root.message}</p> : null}
        <div className="actions">
          <Button type="submit">Finalizar configuracion</Button>
        </div>
      </form>
    </main>
  )
}
