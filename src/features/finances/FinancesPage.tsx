import { useEffect, useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper } from '@tanstack/react-table'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Banknote, CreditCard, Download, Landmark, Minus, PiggyBank, Plus, Wallet, X } from 'lucide-react'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { StatCard } from '../../components/StatCard'
import { useAppStore } from '../../stores/appStore'
import { calculateAccountBalances, calculateFinancialSummary, distributePaycheck } from '../../services/financeCalculations'
import { formatCurrency } from '../../utils/format'
import { dateTimeLocalValue, fromDateTimeLocal, monthKey, nowIso, todayIso } from '../../utils/date'
import type { AppData, FinancialMovement, Obligation } from '../../types/domain'
import { initialExpenseCategories } from '../../db/initialData'

type FinanceModal = 'account' | 'movement' | 'budget' | 'obligation' | 'debt' | 'fund' | 'paycheck' | null
const colors = ['#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#dc2626', '#0891b2', '#64748b']
const columnHelper = createColumnHelper<FinancialMovement>()
const visibleMovementLimit = 200

export function FinancesPage() {
  const data = useAppStore((state) => state.data)
  const addAccount = useAppStore((state) => state.addAccount)
  const addMovement = useAppStore((state) => state.addMovement)
  const deleteMovement = useAppStore((state) => state.deleteMovement)
  const addBudget = useAppStore((state) => state.addBudget)
  const addObligation = useAppStore((state) => state.addObligation)
  const updateObligation = useAppStore((state) => state.updateObligation)
  const addDebt = useAppStore((state) => state.addDebt)
  const addFund = useAppStore((state) => state.addFund)
  const allocateFund = useAppStore((state) => state.allocateFund)
  const payObligation = useAppStore((state) => state.payObligation)
  const payDebt = useAppStore((state) => state.payDebt)
  const [filter, setFilter] = useState('')
  const [deletingMovement, setDeletingMovement] = useState<FinancialMovement | null>(null)
  if (!data) return null

  const summary = useMemo(
    () => calculateFinancialSummary(data.accounts, data.movements, data.funds, data.debts, data.obligations),
    [data.accounts, data.debts, data.funds, data.movements, data.obligations],
  )
  const balances = useMemo(() => calculateAccountBalances(data.accounts, data.movements), [data.accounts, data.movements])
  const balanceByAccount = useMemo(() => new Map(balances.map((balance) => [balance.accountId, balance.calculatedBalance])), [balances])
  const filteredMovements = useMemo(
    () =>
      data.movements
        .filter((movement) => [movement.description, movement.category, movement.type, movement.tags.join(' ')].join(' ').toLowerCase().includes(filter.toLowerCase()))
        .toSorted((a, b) => b.dateTime.localeCompare(a.dateTime)),
    [data.movements, filter],
  )
  const visibleMovements = useMemo(() => filteredMovements.slice(0, visibleMovementLimit), [filteredMovements])
  const columns = useMemo(
    () => [
      columnHelper.accessor('dateTime', { header: 'Fecha', cell: (info) => info.getValue().slice(0, 10) }),
      columnHelper.accessor('type', { header: 'Tipo' }),
      columnHelper.accessor('category', { header: 'Categoria' }),
      columnHelper.accessor('description', { header: 'Descripcion' }),
      columnHelper.accessor('amount', { header: 'Monto', cell: (info) => formatCurrency(info.getValue(), data.settings.currency) }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <Button variant="ghost" onClick={() => setDeletingMovement(info.row.original)}>
            Eliminar
          </Button>
        ),
      }),
    ],
    [data.settings.currency],
  )
  const table = useReactTable({ data: visibleMovements, columns, getCoreRowModel: getCoreRowModel() })
  const categoryData = useMemo(
    () =>
      Object.entries(
        data.movements
          .filter((movement) => movement.type === 'Gasto')
          .reduce<Record<string, number>>((acc, movement) => {
            acc[movement.category] = (acc[movement.category] ?? 0) + movement.amount
            return acc
          }, {}),
      ).map(([name, value]) => ({ name, value })),
    [data.movements],
  )
  const monthlyData = useMemo(
    () =>
      Object.entries(
        data.movements.reduce<Record<string, { ingresos: number; gastos: number }>>((acc, movement) => {
          const key = monthKey(movement.dateTime)
          acc[key] ??= { ingresos: 0, gastos: 0 }
          if (movement.type === 'Ingreso' || movement.type === 'Reembolso') acc[key].ingresos += movement.amount
          if (movement.type === 'Gasto' || movement.type === 'Pago de deuda' || movement.type === 'Pago de obligacion') acc[key].gastos += movement.amount
          return acc
        }, {}),
      ).map(([month, values]) => ({ month, ...values })),
    [data.movements],
  )

  const exportCsv = () => {
    const lines = ['fecha,tipo,categoria,descripcion,monto,cuenta,etiquetas']
    for (const movement of filteredMovements) {
      const account = data.accounts.find((item) => item.id === movement.accountId)?.name ?? ''
      lines.push([movement.dateTime, movement.type, movement.category, movement.description, movement.amount, account, movement.tags.join('|')].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `movimientos-${todayIso()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="page stack">
      <div className="stat-grid">
        <StatCard label="Saldo liquido" value={formatCurrency(summary.totalLiquid, data.settings.currency)} icon={<Wallet />} />
        <StatCard label="Dinero apartado" value={formatCurrency(summary.allocated, data.settings.currency)} icon={<PiggyBank />} tone="gold" />
        <StatCard label="Dinero libre" value={formatCurrency(summary.freeMoney, data.settings.currency)} icon={<Banknote />} tone="green" />
        <StatCard label="Deuda pendiente" value={formatCurrency(summary.debtPending, data.settings.currency)} icon={<CreditCard />} tone="red" />
        <StatCard label="Obligaciones" value={formatCurrency(summary.obligationPending, data.settings.currency)} icon={<Landmark />} tone="slate" />
      </div>
      <FinanceActionPanel
        currency={data.settings.currency}
        accounts={data.accounts}
        funds={data.funds}
        obligations={data.obligations}
        debts={data.debts}
        budgets={data.budgets}
        addAccount={addAccount}
        addMovement={addMovement}
        addBudget={addBudget}
        addObligation={addObligation}
        addDebt={addDebt}
        addFund={addFund}
        allocateFund={allocateFund}
        payObligation={payObligation}
        payDebt={payDebt}
        updateObligation={updateObligation}
        exportCsv={exportCsv}
      />

      <div className="two-column">
        <section className="panel">
          <div className="panel-header">
            <h2>Cuentas</h2>
          </div>
          <div className="list">
            {data.accounts.map((account) => (
              <div className="list-row" key={account.id}>
                <span className="dot" style={{ background: account.color }} />
                <span>{account.name}</span>
                <strong>{formatCurrency(balanceByAccount.get(account.id) ?? 0, account.currency)}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-header">
            <h2>Fondos apartados</h2>
          </div>
          <div className="list">
            {data.funds.map((fund) => (
              <div className="list-row" key={fund.id}>
                <span className="dot" style={{ background: fund.color }} />
                <span>{fund.name}</span>
                <strong>{formatCurrency(fund.currentAmount, data.settings.currency)}</strong>
                <FundControls fundId={fund.id} onAllocate={allocateFund} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <ObligationsPanel
        currency={data.settings.currency}
        accounts={data.accounts}
        funds={data.funds}
        obligations={data.obligations}
        payObligation={payObligation}
        updateObligation={updateObligation}
      />

      <section className="panel">
        <div className="panel-header">
          <h2>Deudas</h2>
          <span>Pagos reducen el saldo pendiente.</span>
        </div>
        <div className="mobile-card-list">
          {data.debts.map((debt) => (
            <article className="mobile-card" key={debt.id}>
              <strong>{debt.name}</strong>
              <span>
                {debt.creditor} - minimo {formatCurrency(debt.minimumPayment, data.settings.currency)}
              </span>
              <b>{formatCurrency(debt.currentBalance, data.settings.currency)}</b>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Fondos y obligaciones</h2>
          <span>El dinero apartado no cuenta como dinero libre.</span>
        </div>
        <div className="insight-grid">
          <p>Total de obligaciones pendientes: {formatCurrency(summary.obligationPending, data.settings.currency)}.</p>
          <p>Total apartado en fondos: {formatCurrency(summary.allocated, data.settings.currency)}.</p>
          <p>Dinero libre real: {formatCurrency(summary.freeMoney, data.settings.currency)}.</p>
        </div>
      </section>

      <div className="two-column">
        <section className="panel">
          <div className="panel-header">
            <h2>Gastos por categoria</h2>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={90} isAnimationActive={false}>
                {categoryData.map((entry, index) => (
                  <Cell key={entry.name} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value), data.settings.currency)} />
            </PieChart>
          </ResponsiveContainer>
        </section>
        <section className="panel">
          <div className="panel-header">
            <h2>Balance por mes</h2>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value), data.settings.currency)} />
              <Bar dataKey="ingresos" fill="#16a34a" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="gastos" fill="#dc2626" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      <section className="panel table-panel">
        <div className="panel-header">
          <h2>Movimientos</h2>
          <div className="table-tools">
            {filteredMovements.length > visibleMovements.length ? <span>Mostrando {visibleMovements.length} de {filteredMovements.length}</span> : null}
            <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filtrar por texto, tipo, categoria o etiqueta" />
          </div>
        </div>
        <div className="desktop-table">
          <table>
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mobile-card-list">
          {visibleMovements.map((movement) => (
            <article className="mobile-card" key={movement.id}>
              <strong>{movement.description}</strong>
              <span>{movement.type} - {movement.category}</span>
              <b>{formatCurrency(movement.amount, data.settings.currency)}</b>
            </article>
          ))}
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(deletingMovement)}
        title="Eliminar movimiento"
        message={
          deletingMovement
            ? `Se eliminara "${deletingMovement.description}" por ${formatCurrency(deletingMovement.amount, data.settings.currency)}. El saldo calculado cambiara inmediatamente.`
            : ''
        }
        onCancel={() => setDeletingMovement(null)}
        onConfirm={async () => {
          if (deletingMovement) await deleteMovement(deletingMovement.id)
          setDeletingMovement(null)
        }}
      />
    </section>
  )
}

interface FinanceActionPanelProps extends Omit<SimpleFinanceModalProps, 'modal' | 'close'> {
  exportCsv: () => void
}

function FinanceActionPanel(props: FinanceActionPanelProps) {
  const [modal, setModal] = useState<FinanceModal>(null)
  const openModal = (nextModal: Exclude<FinanceModal, null>) => setModal(nextModal)

  return (
    <>
      <div className="quick-strip">
        <Button onClick={() => openModal('movement')} icon={<Plus size={18} />}>
          Movimiento
        </Button>
        <Button onClick={() => openModal('paycheck')} icon={<Banknote size={18} />}>
          Me pagaron
        </Button>
        <Button variant="secondary" onClick={() => openModal('account')}>
          Cuenta
        </Button>
        <Button variant="secondary" onClick={() => openModal('obligation')}>
          Obligacion
        </Button>
        <Button variant="secondary" onClick={() => openModal('debt')}>
          Deuda
        </Button>
        <Button variant="secondary" onClick={() => openModal('fund')}>
          Fondo
        </Button>
        <Button variant="secondary" onClick={() => openModal('budget')}>
          Presupuesto
        </Button>
        <Button variant="secondary" onClick={props.exportCsv} icon={<Download size={18} />}>
          CSV
        </Button>
      </div>
      <SimpleFinanceModal {...props} modal={modal} close={() => setModal(null)} />
    </>
  )
}

interface SimpleFinanceModalProps {
  modal: FinanceModal
  close: () => void
  currency: string
  accounts: AppData['accounts']
  funds: AppData['funds']
  obligations: AppData['obligations']
  debts: AppData['debts']
  budgets: AppData['budgets']
  addAccount: ReturnType<typeof useAppStore.getState>['addAccount']
  addMovement: ReturnType<typeof useAppStore.getState>['addMovement']
  addBudget: ReturnType<typeof useAppStore.getState>['addBudget']
  addObligation: ReturnType<typeof useAppStore.getState>['addObligation']
  addDebt: ReturnType<typeof useAppStore.getState>['addDebt']
  addFund: ReturnType<typeof useAppStore.getState>['addFund']
  allocateFund: ReturnType<typeof useAppStore.getState>['allocateFund']
  payObligation: ReturnType<typeof useAppStore.getState>['payObligation']
  payDebt: ReturnType<typeof useAppStore.getState>['payDebt']
  updateObligation: ReturnType<typeof useAppStore.getState>['updateObligation']
}

function FundControls({ fundId, onAllocate }: { fundId: string; onAllocate: (fundId: string, amount: number) => Promise<void> }) {
  const [amount, setAmount] = useState(100)
  return (
    <div className="fund-controls">
      <input aria-label="Monto para fondo" type="number" min="0" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
      <button className="icon-button" type="button" aria-label="Apartar dinero" title="Apartar" onClick={() => onAllocate(fundId, amount)}>
        <Plus size={18} />
      </button>
      <button className="icon-button" type="button" aria-label="Liberar dinero" title="Liberar" onClick={() => onAllocate(fundId, -amount)}>
        <Minus size={18} />
      </button>
    </div>
  )
}

interface ObligationsPanelProps {
  currency: string
  accounts: AppData['accounts']
  funds: AppData['funds']
  obligations: AppData['obligations']
  payObligation: ReturnType<typeof useAppStore.getState>['payObligation']
  updateObligation: ReturnType<typeof useAppStore.getState>['updateObligation']
}

function ObligationsPanel({ currency, accounts, funds, obligations, payObligation, updateObligation }: ObligationsPanelProps) {
  const [payments, setPayments] = useState<Record<string, { amount: string; accountId: string; fundId: string }>>({})
  const [payingId, setPayingId] = useState<string | null>(null)
  const [cancelingObligation, setCancelingObligation] = useState<Obligation | null>(null)
  const firstAccount = accounts[0]?.id ?? ''
  const pendingObligations = obligations
    .filter((obligation) => {
      const total = obligation.finalAmount ?? obligation.estimatedAmount
      return obligation.status !== 'Pagada' && obligation.status !== 'Cancelada' && Math.max(0, total - obligation.paidAmount) > 0
    })
    .toSorted((a, b) => b.estimatedAmount - a.estimatedAmount)

  const updatePayment = (obligationId: string, key: 'amount' | 'accountId' | 'fundId', value: string) => {
    setPayments((current) => ({
      ...current,
      [obligationId]: {
        amount: current[obligationId]?.amount ?? '',
        accountId: current[obligationId]?.accountId ?? firstAccount,
        fundId: current[obligationId]?.fundId ?? '',
        [key]: value,
      },
    }))
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Obligaciones pendientes</h2>
        <span>Vienen del onboarding, de plantillas iniciales o de obligaciones creadas aqui.</span>
      </div>
      <div className="mobile-card-list">
        {pendingObligations.map((obligation) => {
          const total = obligation.finalAmount ?? obligation.estimatedAmount
          const pending = Math.max(0, total - obligation.paidAmount)
          const form = payments[obligation.id] ?? { amount: String(pending || ''), accountId: firstAccount, fundId: '' }
          return (
            <article className="mobile-card finance-obligation-card" key={obligation.id}>
              <strong>{obligation.name}</strong>
              <span>
                {obligation.status} - vence {obligation.dueDate} - {obligation.category}
              </span>
              <b>{formatCurrency(pending, currency)}</b>
              {payingId === obligation.id ? (
                <>
                  <div className="form-grid three">
                    <label>
                      Monto
                      <input type="number" min="0" value={form.amount} onChange={(event) => updatePayment(obligation.id, 'amount', event.target.value)} />
                    </label>
                    <label>
                      Cuenta
                      <select value={form.accountId} onChange={(event) => updatePayment(obligation.id, 'accountId', event.target.value)}>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Fondo opcional
                      <select value={form.fundId} onChange={(event) => updatePayment(obligation.id, 'fundId', event.target.value)}>
                        <option value="">Sin fondo</option>
                        {funds.map((fund) => (
                          <option key={fund.id} value={fund.id}>
                            {fund.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="actions">
                    <Button
                      onClick={async () => {
                        await payObligation({ obligationId: obligation.id, accountId: form.accountId, fundId: form.fundId || undefined, amount: Number(form.amount || 0) })
                        setPayingId(null)
                      }}
                      disabled={!form.accountId || Number(form.amount || 0) <= 0}
                    >
                      Registrar pago
                    </Button>
                    <Button variant="ghost" onClick={() => setPayingId(null)} icon={<X size={16} />}>
                      Cerrar
                    </Button>
                  </div>
                </>
              ) : (
                <div className="actions">
                  <Button variant="secondary" onClick={() => setPayingId(obligation.id)}>
                    Pagar
                  </Button>
                  <Button variant="ghost" onClick={() => setCancelingObligation(obligation)}>
                    Cancelar obligacion
                  </Button>
                </div>
              )}
            </article>
          )
        })}
        {pendingObligations.length === 0 ? <p className="muted">No hay obligaciones pendientes.</p> : null}
      </div>
      <ConfirmDialog
        open={Boolean(cancelingObligation)}
        title="Cancelar obligacion"
        message={`La obligacion ${cancelingObligation?.name ?? ''} dejara de contar como pendiente.`}
        confirmLabel="Cancelar obligacion"
        onCancel={() => setCancelingObligation(null)}
        onConfirm={() => {
          if (!cancelingObligation) return
          void updateObligation({ ...cancelingObligation, status: 'Cancelada' })
          setCancelingObligation(null)
        }}
      />
    </section>
  )
}

function SimpleFinanceModal(props: SimpleFinanceModalProps) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (props.modal === null) {
      setForm({})
      setError('')
      setSaving(false)
    }
  }, [props.modal])
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const amount = Number(form.amount ?? 0)
  const firstAccount = props.accounts[0]?.id ?? ''
  const close = () => {
    props.close()
  }
  const input = (key: string, label: string, type = 'text') => (
    <label>
      {label}
      <input value={form[key] ?? ''} type={type} onChange={(event) => set(key, event.target.value)} />
    </label>
  )
  const accountSelect = (
    <label>
      Cuenta
      <select value={form.accountId ?? firstAccount} onChange={(event) => set('accountId', event.target.value)}>
        {props.accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </select>
    </label>
  )

  const submit = async () => {
    try {
      setSaving(true)
      setError('')
      if (!props.modal) return
      if (props.modal !== 'account' && props.modal !== 'budget' && props.modal !== 'fund' && !firstAccount) {
        throw new Error('Crea una cuenta financiera antes de registrar movimientos.')
      }
      if (!Number.isFinite(amount) || amount < 0) throw new Error('Ingresa un monto valido.')
      if (props.modal === 'account') {
        await props.addAccount({ name: form.name?.trim() || 'Cuenta', type: 'Cuenta bancaria', currency: props.currency, openingBalance: amount, status: 'active', color: '#2563eb', icon: 'Landmark' })
      }
      if (props.modal === 'movement') {
        await props.addMovement({
          dateTime: fromDateTimeLocal(form.dateTime || dateTimeLocalValue()),
          accountId: form.accountId || firstAccount,
          type: (form.type as FinancialMovement['type']) || 'Gasto',
          amount,
          category: form.category || 'Otro',
          description: form.description?.trim() || 'Movimiento',
          tags: [],
        })
      }
      if (props.modal === 'budget') {
        await props.addBudget({ name: form.name?.trim() || 'Presupuesto', category: form.category?.trim() || 'Otro', period: 'monthly', amount, rollover: false, alertPercent: 85, status: 'active' })
      }
      if (props.modal === 'obligation') {
        await props.addObligation({ name: form.name?.trim() || 'Obligacion', estimatedAmount: amount, dueDate: form.dueDate || todayIso(), priority: 'Media', category: form.category?.trim() || 'Otro', allocatedAmount: 0, paidAmount: 0, status: 'Pendiente', recurrence: 'none' })
      }
      if (props.modal === 'debt') {
        await props.addDebt({ creditor: form.creditor?.trim() || 'Acreedor', name: form.name?.trim() || 'Deuda', originalAmount: amount, currentBalance: amount, minimumPayment: Number(form.minimumPayment || 0), type: 'Otro', priority: 'Media' })
      }
      if (props.modal === 'fund') {
        await props.addFund({ name: form.name?.trim() || 'Fondo', currentAmount: amount, status: 'active', color: '#16a34a' })
      }
      if (props.modal === 'paycheck') {
        const allocations = props.funds.map((fund) => ({ fundId: fund.id, amount: Number(form[`fund-${fund.id}`] || 0) })).filter((item) => item.amount > 0)
        distributePaycheck(amount, allocations)
        await props.addMovement({ dateTime: nowIso(), accountId: form.accountId || firstAccount, type: 'Ingreso', amount, category: 'Salario', description: form.description?.trim() || 'Ingreso recibido', tags: ['me-pagaron'] })
        for (const allocation of allocations) {
          await props.allocateFund(allocation.fundId, allocation.amount)
        }
      }
      close()
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'No se pudo guardar. Revisa los datos e intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const title = props.modal ? props.modal.charAt(0).toUpperCase() + props.modal.slice(1) : ''
  if (props.modal === null) return null
  return (
    <section className="panel finance-form-panel" role="dialog" aria-label={title} aria-live="polite">
      <div className="panel-header">
        <h2>{title}</h2>
        <Button variant="ghost" onClick={close}>
          Cerrar
        </Button>
      </div>
      <div className="form-stack">
        {props.modal === 'account' ? (
          <>
            {input('name', 'Nombre')}
            {input('amount', 'Saldo inicial', 'number')}
          </>
        ) : null}
        {props.modal === 'movement' ? (
          <>
            {accountSelect}
            <label>
              Tipo
              <select value={form.type ?? 'Gasto'} onChange={(event) => set('type', event.target.value)}>
                {['Ingreso', 'Gasto', 'Transferencia', 'Pago de deuda', 'Pago de obligacion', 'Ajuste', 'Reembolso'].map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            {input('amount', 'Monto', 'number')}
            <label>
              Categoria
              <select value={form.category ?? 'Comida'} onChange={(event) => set('category', event.target.value)}>
                {initialExpenseCategories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            {input('description', 'Descripcion')}
            {input('dateTime', 'Fecha y hora', 'datetime-local')}
          </>
        ) : null}
        {props.modal === 'budget' ? (
          <>
            {input('name', 'Nombre')}
            {input('category', 'Categoria')}
            {input('amount', 'Monto', 'number')}
          </>
        ) : null}
        {props.modal === 'obligation' ? (
          <>
            {input('name', 'Nombre')}
            {input('amount', 'Monto estimado', 'number')}
            {input('category', 'Categoria')}
            {input('dueDate', 'Fecha limite', 'date')}
          </>
        ) : null}
        {props.modal === 'debt' ? (
          <>
            {input('creditor', 'Acreedor')}
            {input('name', 'Nombre')}
            {input('amount', 'Saldo actual', 'number')}
            {input('minimumPayment', 'Pago minimo', 'number')}
          </>
        ) : null}
        {props.modal === 'fund' ? (
          <>
            {input('name', 'Nombre')}
            {input('amount', 'Monto inicial', 'number')}
          </>
        ) : null}
        {props.modal === 'paycheck' ? (
          <>
            {accountSelect}
            {input('amount', 'Ingreso recibido', 'number')}
            {input('description', 'Origen')}
            <div className="notice info">
              <p>Orden sugerido: obligaciones vencidas o criticas, gastos basicos, deudas, vehiculos, ahorro y dinero libre.</p>
            </div>
            {props.funds.map((fund) => (
              <label key={fund.id}>
                {fund.name}
                <input type="number" value={form[`fund-${fund.id}`] ?? ''} onChange={(event) => set(`fund-${fund.id}`, event.target.value)} />
              </label>
            ))}
            <strong>
              Libre estimado:{' '}
              {formatCurrency(
                Math.max(0, amount - props.funds.reduce((sum, fund) => sum + Number(form[`fund-${fund.id}`] ?? 0), 0)),
                props.currency,
              )}
            </strong>
          </>
        ) : null}
        {error ? <p className="error-text" role="alert">{error}</p> : null}
        <div className="actions">
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
          <Button variant="ghost" onClick={close}>
            Cancelar
          </Button>
        </div>
      </div>
    </section>
  )
}
