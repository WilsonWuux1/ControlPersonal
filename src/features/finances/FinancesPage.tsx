import { useEffect, useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper } from '@tanstack/react-table'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Banknote,
  BarChart3,
  ChevronDown,
  CreditCard,
  Download,
  Landmark,
  Minus,
  PiggyBank,
  Plus,
  Search,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Modal } from '../../components/Modal'
import { useAppStore } from '../../stores/appStore'
import { calculateAccountBalances, calculateFinancialSummary, distributePaycheck } from '../../services/financeCalculations'
import { formatCurrency } from '../../utils/format'
import { dateTimeLocalValue, fromDateTimeLocal, nowIso, todayIso } from '../../utils/date'
import type { AppData, FinancialMovement, Obligation } from '../../types/domain'
import { initialExpenseCategories, initialIncomeCategories } from '../../db/initialData'

type FinanceModal = 'account' | 'movement' | 'obligation' | 'debt' | 'fund' | 'paycheck' | null

const colors = ['#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#dc2626', '#0891b2', '#64748b']
const columnHelper = createColumnHelper<FinancialMovement>()
const movementPreviewLimit = 8

const isOutflow = (type: FinancialMovement['type']): boolean =>
  type === 'Gasto' || type === 'Pago de deuda' || type === 'Pago de obligacion'

export function FinancesPage() {
  const data = useAppStore((state) => state.data)
  const addAccount = useAppStore((state) => state.addAccount)
  const addMovement = useAppStore((state) => state.addMovement)
  const deleteMovement = useAppStore((state) => state.deleteMovement)
  const addObligation = useAppStore((state) => state.addObligation)
  const updateObligation = useAppStore((state) => state.updateObligation)
  const addDebt = useAppStore((state) => state.addDebt)
  const addFund = useAppStore((state) => state.addFund)
  const allocateFund = useAppStore((state) => state.allocateFund)
  const deleteFund = useAppStore((state) => state.deleteFund)
  const payObligation = useAppStore((state) => state.payObligation)
  const payDebt = useAppStore((state) => state.payDebt)

  const [filter, setFilter] = useState('')
  const [showAllMovements, setShowAllMovements] = useState(false)
  const [deletingMovement, setDeletingMovement] = useState<FinancialMovement | null>(null)

  const currency = data?.settings.currency ?? 'GTQ'

  const summary = useMemo(
    () =>
      data
        ? calculateFinancialSummary(data.accounts, data.movements, data.funds, data.debts, data.obligations)
        : null,
    [data],
  )

  const balances = useMemo(
    () => (data ? calculateAccountBalances(data.accounts, data.movements) : []),
    [data],
  )

  const balanceByAccount = useMemo(
    () => new Map(balances.map((balance) => [balance.accountId, balance.calculatedBalance])),
    [balances],
  )

  const filteredMovements = useMemo(() => {
    if (!data) return []

    const normalizedFilter = filter.trim().toLowerCase()

    return data.movements
      .filter((movement) => {
        if (!normalizedFilter) return true

        return [movement.description, movement.category, movement.type, movement.tags.join(' ')]
          .join(' ')
          .toLowerCase()
          .includes(normalizedFilter)
      })
      .toSorted((a, b) => b.dateTime.localeCompare(a.dateTime))
  }, [data, filter])

  const shownMovements = useMemo(
    () => (showAllMovements ? filteredMovements : filteredMovements.slice(0, movementPreviewLimit)),
    [filteredMovements, showAllMovements],
  )

  const columns = useMemo(
    () => [
      columnHelper.accessor('dateTime', {
        header: 'Fecha',
        cell: (info) => info.getValue().slice(0, 10),
      }),
      columnHelper.accessor('type', { header: 'Tipo' }),
      columnHelper.accessor('category', { header: 'Categoría' }),
      columnHelper.accessor('description', { header: 'Descripción' }),
      columnHelper.accessor('amount', {
        header: 'Monto',
        cell: (info) => formatCurrency(info.getValue(), currency),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <button
            type="button"
            className="finance-icon-action finance-icon-action--danger"
            aria-label={`Eliminar ${info.row.original.description}`}
            title="Eliminar movimiento"
            onClick={() => setDeletingMovement(info.row.original)}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        ),
      }),
    ],
    [currency],
  )

  const table = useReactTable({
    data: shownMovements,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const categoryData = useMemo(() => {
    if (!data) return []

    return Object.entries(
      data.movements
        .filter((movement) => movement.type === 'Gasto')
        .reduce<Record<string, number>>((accumulator, movement) => {
          accumulator[movement.category] = (accumulator[movement.category] ?? 0) + movement.amount
          return accumulator
        }, {}),
    ).map(([name, value]) => ({ name, value }))
  }, [data])

  const monthlyData = useMemo(() => {
    if (!data) return []

    return Object.entries(
      data.movements.reduce<Record<string, { ingresos: number; gastos: number }>>((accumulator, movement) => {
        const key = movement.dateTime.slice(0, 7)
        accumulator[key] ??= { ingresos: 0, gastos: 0 }

        if (movement.type === 'Ingreso' || movement.type === 'Reembolso') {
          accumulator[key].ingresos += movement.amount
        }

        if (isOutflow(movement.type)) {
          accumulator[key].gastos += movement.amount
        }

        return accumulator
      }, {}),
    ).map(([month, values]) => ({ month, ...values }))
  }, [data])

  if (!data || !summary) return null

  const activeDebts = data.debts
    .filter((debt) => debt.currentBalance > 0)
    .toSorted((a, b) => b.currentBalance - a.currentBalance)

  const pendingObligationCount = data.obligations.filter((obligation) => {
    const total = obligation.finalAmount ?? obligation.estimatedAmount
    const pending = Math.max(0, total - obligation.paidAmount)

    return obligation.status !== 'Pagada' && obligation.status !== 'Cancelada' && pending > 0
  }).length

  const totalCommitments = summary.debtPending + summary.obligationPending

  const exportCsv = () => {
    const lines = ['fecha,tipo,categoria,descripcion,monto,cuenta,etiquetas']

    for (const movement of filteredMovements) {
      const account = data.accounts.find((item) => item.id === movement.accountId)?.name ?? ''

      lines.push(
        [movement.dateTime, movement.type, movement.category, movement.description, movement.amount, account, movement.tags.join('|')]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(','),
      )
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
    <section className="page finance-mobile-page">
      <div className="finance-summary-grid" aria-label="Resumen financiero">
        <article className="finance-summary-card finance-summary-card--blue">
          <span className="finance-summary-card__icon">
            <Wallet size={18} aria-hidden="true" />
          </span>
          <span>Saldo líquido</span>
          <strong>{formatCurrency(summary.totalLiquid, currency)}</strong>
        </article>

        <article className="finance-summary-card finance-summary-card--green">
          <span className="finance-summary-card__icon">
            <Banknote size={18} aria-hidden="true" />
          </span>
          <span>Dinero libre</span>
          <strong>{formatCurrency(summary.freeMoney, currency)}</strong>
        </article>

        <article className="finance-summary-card finance-summary-card--gold">
          <span className="finance-summary-card__icon">
            <PiggyBank size={18} aria-hidden="true" />
          </span>
          <span>Apartado</span>
          <strong>{formatCurrency(summary.allocated, currency)}</strong>
        </article>

        <article className="finance-summary-card finance-summary-card--red finance-summary-card--commitments">
          <span className="finance-summary-card__icon">
            <CreditCard size={18} aria-hidden="true" />
          </span>
          <span>Compromisos</span>
          <strong>{formatCurrency(totalCommitments, currency)}</strong>
          <small>
            Deudas {formatCurrency(summary.debtPending, currency)} · Obligaciones{' '}
            {formatCurrency(summary.obligationPending, currency)}
          </small>
        </article>
      </div>


      <details className="finance-collapse" open>
        <summary>
          <div className="finance-collapse__summary">
            <span className="finance-collapse__icon finance-collapse__icon--violet">
              <BarChart3 size={17} aria-hidden="true" />
            </span>

            <div>
              <strong>Análisis financiero</strong>
              <span>Gastos por categoría y balance mensual</span>
            </div>
          </div>

          <ChevronDown size={17} aria-hidden="true" />
        </summary>

        <div className="finance-collapse__body finance-chart-grid">
          <section className="finance-chart-card">
            <div className="finance-chart-card__header">
              <strong>Gastos por categoría</strong>
            </div>

            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={76} isAnimationActive={false}>
                    {categoryData.map((entry, index) => (
                      <Cell key={entry.name} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="muted finance-chart-empty">Todavía no hay gastos para graficar.</p>
            )}
          </section>

          <section className="finance-chart-card">
            <div className="finance-chart-card__header">
              <strong>Balance por mes</strong>
            </div>

            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} margin={{ left: -18, right: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                  <Bar dataKey="ingresos" fill="#16a34a" radius={[5, 5, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="gastos" fill="#dc2626" radius={[5, 5, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="muted finance-chart-empty">Todavía no hay movimientos para comparar.</p>
            )}
          </section>
        </div>
      </details>

      <FinanceActionPanel
        currency={currency}
        accounts={data.accounts}
        funds={data.funds}
        obligations={data.obligations}
        debts={data.debts}
        addAccount={addAccount}
        addMovement={addMovement}
        addObligation={addObligation}
        addDebt={addDebt}
        addFund={addFund}
        allocateFund={allocateFund}
        exportCsv={exportCsv}
      />

      <div className="finance-two-column">
        <details className="finance-collapse">
          <summary>
            <div className="finance-collapse__summary">
              <span className="finance-collapse__icon finance-collapse__icon--blue">
                <Wallet size={17} aria-hidden="true" />
              </span>

              <div>
                <strong>Cuentas</strong>
                <span>{data.accounts.length} registradas</span>
              </div>
            </div>

            <div className="finance-collapse__value">
              <strong>{formatCurrency(summary.totalLiquid, currency)}</strong>
              <ChevronDown size={17} aria-hidden="true" />
            </div>
          </summary>

          <div className="finance-collapse__body">
            <div className="finance-account-list">
              {data.accounts.map((account) => (
                <article className="finance-account-row" key={account.id}>
                  <div>
                    <span className="dot" style={{ background: account.color }} />
                    <span>{account.name}</span>
                  </div>

                  <strong>{formatCurrency(balanceByAccount.get(account.id) ?? 0, account.currency)}</strong>
                </article>
              ))}

              {data.accounts.length === 0 ? <p className="muted">No hay cuentas registradas.</p> : null}
            </div>
          </div>
        </details>

        <details className="finance-collapse">
          <summary>
            <div className="finance-collapse__summary">
              <span className="finance-collapse__icon finance-collapse__icon--gold">
                <PiggyBank size={17} aria-hidden="true" />
              </span>

              <div>
                <strong>Dinero reservado</strong>
                <span>{data.funds.length} fondos</span>
              </div>
            </div>

            <div className="finance-collapse__value">
              <strong>{formatCurrency(summary.allocated, currency)}</strong>
              <ChevronDown size={17} aria-hidden="true" />
            </div>
          </summary>

          <div className="finance-collapse__body">
            <div className="finance-fund-list">
              {data.funds.map((fund) => (
                <article className="finance-fund-card" key={fund.id}>
                  <div className="finance-fund-card__summary">
                    <div>
                      <span className="dot" style={{ background: fund.color }} />
                      <span>{fund.name}</span>
                    </div>

                    <strong>{formatCurrency(fund.currentAmount, currency)}</strong>
                  </div>

                  <FundControls fundId={fund.id} onAllocate={allocateFund} onDelete={deleteFund} />
                </article>
              ))}

              {data.funds.length === 0 ? <p className="muted">No hay fondos reservados.</p> : null}
            </div>
          </div>
        </details>
      </div>

      <details className="finance-collapse">
        <summary>
          <div className="finance-collapse__summary">
            <span className="finance-collapse__icon finance-collapse__icon--slate">
              <Landmark size={17} aria-hidden="true" />
            </span>

            <div>
              <strong>Obligaciones pendientes</strong>
              <span>{pendingObligationCount} por atender</span>
            </div>
          </div>

          <div className="finance-collapse__value">
            <strong>{formatCurrency(summary.obligationPending, currency)}</strong>
            <ChevronDown size={17} aria-hidden="true" />
          </div>
        </summary>

        <div className="finance-collapse__body">
          <ObligationsPanel
            currency={currency}
            accounts={data.accounts}
            funds={data.funds}
            obligations={data.obligations}
            payObligation={payObligation}
            updateObligation={updateObligation}
          />
        </div>
      </details>

      <details className="finance-collapse">
        <summary>
          <div className="finance-collapse__summary">
            <span className="finance-collapse__icon finance-collapse__icon--red">
              <CreditCard size={17} aria-hidden="true" />
            </span>

            <div>
              <strong>Deudas</strong>
              <span>{activeDebts.length} activas</span>
            </div>
          </div>

          <div className="finance-collapse__value">
            <strong>{formatCurrency(summary.debtPending, currency)}</strong>
            <ChevronDown size={17} aria-hidden="true" />
          </div>
        </summary>

        <div className="finance-collapse__body">
          <DebtsPanel
            currency={currency}
            accounts={data.accounts}
            debts={activeDebts}
            payDebt={payDebt}
          />
        </div>
      </details>



      <details className="finance-collapse finance-movements" open>
        <summary>
          <div className="finance-collapse__summary">
            <span className="finance-collapse__icon finance-collapse__icon--green">
              <Banknote size={17} aria-hidden="true" />
            </span>

            <div>
              <strong>Movimientos</strong>
              <span>{filteredMovements.length} encontrados</span>
            </div>
          </div>

          <ChevronDown size={17} aria-hidden="true" />
        </summary>

        <div className="finance-collapse__body">
          <label className="finance-search">
            <Search size={16} aria-hidden="true" />
            <input
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value)
                setShowAllMovements(false)
              }}
              placeholder="Buscar movimiento"
              aria-label="Buscar movimientos"
            />
          </label>

          <div className="desktop-table finance-desktop-table">
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

          <div className="finance-movement-list">
            {shownMovements.map((movement) => (
              <article className="finance-movement-row" key={movement.id}>
                <div className="finance-movement-row__main">
                  <strong>{movement.description}</strong>
                  <span>
                    {movement.type} · {movement.category} · {movement.dateTime.slice(0, 10)}
                  </span>
                </div>

                <div className="finance-movement-row__amount">
                  <strong className={isOutflow(movement.type) ? 'is-negative' : 'is-positive'}>
                    {isOutflow(movement.type) ? '-' : '+'}
                    {formatCurrency(movement.amount, currency)}
                  </strong>

                  <button
                    type="button"
                    className="finance-icon-action finance-icon-action--danger"
                    aria-label={`Eliminar ${movement.description}`}
                    title="Eliminar movimiento"
                    onClick={() => setDeletingMovement(movement)}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}

            {shownMovements.length === 0 ? <p className="muted finance-empty">No hay movimientos para mostrar.</p> : null}
          </div>

          {filteredMovements.length > movementPreviewLimit ? (
            <Button
              variant="secondary"
              onClick={() => setShowAllMovements((current) => !current)}
            >
              {showAllMovements ? 'Mostrar menos' : `Ver todos (${filteredMovements.length})`}
            </Button>
          ) : null}
        </div>
      </details>

      <ConfirmDialog
        open={Boolean(deletingMovement)}
        title="Eliminar movimiento"
        message={
          deletingMovement
            ? `Se eliminará "${deletingMovement.description}" por ${formatCurrency(
                deletingMovement.amount,
                currency,
              )}. El saldo calculado cambiará inmediatamente.`
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
      <section className="finance-actions-panel">
        <div className="finance-primary-actions">
          <Button onClick={() => openModal('movement')} icon={<Plus size={17} aria-hidden="true" />}>
            Movimiento
          </Button>

          <Button onClick={() => openModal('paycheck')} icon={<Banknote size={17} aria-hidden="true" />}>
            Registrar Ingreso
          </Button>
        </div>

        <details className="finance-more-actions">
          <summary>
            <span>Más acciones</span>
            <ChevronDown size={17} aria-hidden="true" />
          </summary>

          <div className="finance-secondary-actions">
            <Button variant="secondary" onClick={() => openModal('account')}>
              Cuenta
            </Button>

            <Button variant="secondary" onClick={() => openModal('obligation')}>
              Obligación
            </Button>

            <Button variant="secondary" onClick={() => openModal('debt')}>
              Deuda
            </Button>

            <Button variant="secondary" onClick={() => openModal('fund')}>
              Fondo
            </Button>

            <Button variant="secondary" onClick={props.exportCsv} icon={<Download size={16} aria-hidden="true" />}>
              Exportar CSV
            </Button>
          </div>
        </details>
      </section>

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
  addAccount: ReturnType<typeof useAppStore.getState>['addAccount']
  addMovement: ReturnType<typeof useAppStore.getState>['addMovement']
  addObligation: ReturnType<typeof useAppStore.getState>['addObligation']
  addDebt: ReturnType<typeof useAppStore.getState>['addDebt']
  addFund: ReturnType<typeof useAppStore.getState>['addFund']
  allocateFund: ReturnType<typeof useAppStore.getState>['allocateFund']
}

function FundControls({
  fundId,
  onAllocate,
  onDelete,
}: {
  fundId: string
  onAllocate: (fundId: string, amount: number) => Promise<void>
  onDelete: (fundId: string) => Promise<void>
}) {
  const [amount, setAmount] = useState(100)
  const validAmount = Number.isFinite(amount) && amount > 0

  return (
    <div className="finance-fund-controls">
      <input
        aria-label="Monto para fondo"
        type="number"
        min="0"
        value={amount}
        onChange={(event) => setAmount(Number(event.target.value))}
      />

      <button
        type="button"
        className="finance-icon-action"
        aria-label="Apartar dinero"
        title="Apartar dinero"
        disabled={!validAmount}
        onClick={() => void onAllocate(fundId, amount)}
      >
        <Plus size={18} aria-hidden="true" />
      </button>

      <button
        type="button"
        className="finance-icon-action"
        aria-label="Liberar dinero"
        title="Liberar dinero"
        disabled={!validAmount}
        onClick={() => void onAllocate(fundId, -amount)}
      >
        <Minus size={18} aria-hidden="true" />
      </button>

      <button
        type="button"
        className="finance-icon-action finance-icon-action--danger"
        aria-label="Eliminar fondo"
        title="Eliminar fondo"
        onClick={() => void onDelete(fundId)}
      >
        <Trash2 size={17} aria-hidden="true" />
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
      const pending = Math.max(0, total - obligation.paidAmount)

      return obligation.status !== 'Pagada' && obligation.status !== 'Cancelada' && pending > 0
    })
    .toSorted((a, b) => a.dueDate.localeCompare(b.dueDate))

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
    <>
      <div className="finance-obligation-list">
        {pendingObligations.map((obligation) => {
          const total = obligation.finalAmount ?? obligation.estimatedAmount
          const pending = Math.max(0, total - obligation.paidAmount)
          const form = payments[obligation.id] ?? {
            amount: String(pending || ''),
            accountId: firstAccount,
            fundId: '',
          }
          const isPaying = payingId === obligation.id
          const isOverdue = obligation.dueDate < todayIso()

          return (
            <article className="finance-obligation-card" key={obligation.id}>
              <header className="finance-obligation-card__header">
                <div>
                  <strong>{obligation.name}</strong>
                  <span className={isOverdue ? 'is-overdue' : undefined}>
                    {isOverdue ? 'Vencida' : obligation.status} · {obligation.dueDate} · {obligation.category}
                  </span>
                </div>

                {!isPaying ? (
                  <div className="finance-obligation-card__actions">
                    <button
                      type="button"
                      className="finance-icon-action"
                      aria-label={`Registrar pago de ${obligation.name}`}
                      title="Registrar pago"
                      onClick={() => setPayingId(obligation.id)}
                    >
                      <Plus size={16} aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      className="finance-icon-action finance-icon-action--danger"
                      aria-label={`Cancelar ${obligation.name}`}
                      title="Cancelar obligación"
                      onClick={() => setCancelingObligation(obligation)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </header>

              <div className="finance-obligation-card__amount">
                <span>Pendiente</span>
                <strong>{formatCurrency(pending, currency)}</strong>
              </div>

              {isPaying ? (
                <div className="finance-obligation-payment">
                  <div className="finance-obligation-payment__grid">
                    <label>
                      Monto
                      <input
                        type="number"
                        min="0"
                        max={pending}
                        value={form.amount}
                        onChange={(event) => updatePayment(obligation.id, 'amount', event.target.value)}
                      />
                    </label>

                    <label>
                      Cuenta
                      <select
                        value={form.accountId}
                        onChange={(event) => updatePayment(obligation.id, 'accountId', event.target.value)}
                      >
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="finance-obligation-payment__fund">
                      Fondo opcional
                      <select
                        value={form.fundId}
                        onChange={(event) => updatePayment(obligation.id, 'fundId', event.target.value)}
                      >
                        <option value="">Sin fondo</option>
                        {funds.map((fund) => (
                          <option key={fund.id} value={fund.id}>
                            {fund.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="finance-obligation-payment__actions">
                    <Button
                      onClick={async () => {
                        await payObligation({
                          obligationId: obligation.id,
                          accountId: form.accountId,
                          fundId: form.fundId || undefined,
                          amount: Number(form.amount || 0),
                        })

                        setPayingId(null)
                      }}
                      disabled={!form.accountId || Number(form.amount || 0) <= 0}
                    >
                      Registrar pago
                    </Button>

                    <button
                      type="button"
                      className="finance-icon-action"
                      aria-label="Cerrar formulario de pago"
                      title="Cerrar"
                      onClick={() => setPayingId(null)}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          )
        })}

        {pendingObligations.length === 0 ? <p className="muted">No hay obligaciones pendientes.</p> : null}
      </div>

      <ConfirmDialog
        open={Boolean(cancelingObligation)}
        title="Cancelar obligación"
        message={`La obligación ${cancelingObligation?.name ?? ''} dejará de contar como pendiente.`}
        confirmLabel="Cancelar obligación"
        onCancel={() => setCancelingObligation(null)}
        onConfirm={() => {
          if (!cancelingObligation) return
          void updateObligation({ ...cancelingObligation, status: 'Cancelada' })
          setCancelingObligation(null)
        }}
      />
    </>
  )
}


interface DebtsPanelProps {
  currency: string
  accounts: AppData['accounts']
  debts: AppData['debts']
  payDebt: ReturnType<typeof useAppStore.getState>['payDebt']
}

function DebtsPanel({ currency, accounts, debts, payDebt }: DebtsPanelProps) {
  const [payments, setPayments] = useState<Record<string, { amount: string; accountId: string; date: string }>>({})
  const [payingId, setPayingId] = useState<string | null>(null)
  const firstAccount = accounts[0]?.id ?? ''

  const updatePayment = (debtId: string, key: 'amount' | 'accountId' | 'date', value: string) => {
    setPayments((current) => ({
      ...current,
      [debtId]: {
        amount: current[debtId]?.amount ?? '',
        accountId: current[debtId]?.accountId ?? firstAccount,
        date: current[debtId]?.date ?? todayIso(),
        [key]: value,
      },
    }))
  }

  return (
    <div className="finance-debt-list">
      {debts.map((debt) => {
        const suggestedAmount =
          debt.minimumPayment > 0 ? Math.min(debt.minimumPayment, debt.currentBalance) : debt.currentBalance
        const form = payments[debt.id] ?? {
          amount: String(suggestedAmount || ''),
          accountId: firstAccount,
          date: todayIso(),
        }
        const paymentAmount = Number(form.amount || 0)
        const isPaying = payingId === debt.id
        const validPayment =
          Boolean(form.accountId) &&
          Number.isFinite(paymentAmount) &&
          paymentAmount > 0 &&
          paymentAmount <= debt.currentBalance
        const remainingBalance = Math.max(0, debt.currentBalance - (Number.isFinite(paymentAmount) ? paymentAmount : 0))

        return (
          <article className="finance-obligation-card" key={debt.id}>
            <header className="finance-obligation-card__header">
              <div>
                <strong>{debt.name}</strong>
                <span>
                  {debt.creditor}
                  {debt.minimumPayment > 0 ? ` · mínimo ${formatCurrency(debt.minimumPayment, currency)}` : ''}
                </span>
              </div>

              {!isPaying ? (
                <button
                  type="button"
                  className="finance-icon-action"
                  aria-label={`Registrar pago de ${debt.name}`}
                  title="Registrar pago"
                  onClick={() => setPayingId(debt.id)}
                >
                  <Plus size={16} aria-hidden="true" />
                </button>
              ) : null}
            </header>

            <div className="finance-obligation-card__amount">
              <span>Pendiente</span>
              <strong>{formatCurrency(debt.currentBalance, currency)}</strong>
            </div>

            {isPaying ? (
              <div className="finance-obligation-payment">
                <div className="finance-obligation-payment__grid">
                  <label>
                    Monto
                    <input
                      type="number"
                      min="0.01"
                      max={debt.currentBalance}
                      step="0.01"
                      value={form.amount}
                      onChange={(event) => updatePayment(debt.id, 'amount', event.target.value)}
                    />
                  </label>

                  <label>
                    Cuenta
                    <select
                      value={form.accountId}
                      onChange={(event) => updatePayment(debt.id, 'accountId', event.target.value)}
                    >
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Fecha
                    <input
                      type="date"
                      value={form.date}
                      max={todayIso()}
                      onChange={(event) => updatePayment(debt.id, 'date', event.target.value)}
                    />
                  </label>
                </div>

                <div className="notice info">
                  <p>
                    Saldo después del pago: <strong>{formatCurrency(remainingBalance, currency)}</strong>
                  </p>
                </div>

                <div className="finance-obligation-payment__actions">
                  <Button
                    onClick={async () => {
                      if (!validPayment) return

                      await payDebt({
                        debtId: debt.id,
                        accountId: form.accountId,
                        amount: paymentAmount,
                        date: form.date,
                      })

                      setPayments((current) => {
                        const next = { ...current }
                        delete next[debt.id]
                        return next
                      })
                      setPayingId(null)
                    }}
                    disabled={!validPayment}
                  >
                    Registrar pago
                  </Button>

                  <button
                    type="button"
                    className="finance-icon-action"
                    aria-label="Cerrar formulario de pago"
                    title="Cerrar"
                    onClick={() => setPayingId(null)}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>

                {paymentAmount > debt.currentBalance ? (
                  <p className="error-text" role="alert">
                    El pago no puede superar el saldo pendiente.
                  </p>
                ) : null}
              </div>
            ) : null}
          </article>
        )
      })}

      {debts.length === 0 ? <p className="muted">No hay deudas activas.</p> : null}
    </div>
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
  const movementType = ((form.type as FinancialMovement['type']) || 'Gasto') as FinancialMovement['type']
  const movementCategories = movementType === 'Ingreso' ? initialIncomeCategories : initialExpenseCategories
  const defaultMovementCategory = movementCategories[0] ?? 'Otro'

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

      if (props.modal !== 'account' && props.modal !== 'fund' && !firstAccount) {
        throw new Error('Crea una cuenta financiera antes de registrar movimientos.')
      }

      if (!Number.isFinite(amount) || amount < 0) {
        throw new Error('Ingresa un monto válido.')
      }

      if (props.modal === 'account') {
        await props.addAccount({
          name: form.name?.trim() || 'Cuenta',
          type: 'Cuenta bancaria',
          currency: props.currency,
          openingBalance: amount,
          status: 'active',
          color: '#2563eb',
          icon: 'Landmark',
        })
      }

      if (props.modal === 'movement') {
        await props.addMovement({
          dateTime: fromDateTimeLocal(form.dateTime || dateTimeLocalValue()),
          accountId: form.accountId || firstAccount,
          type: movementType,
          amount,
          category: form.category || defaultMovementCategory,
          description: form.description?.trim() || 'Movimiento',
          tags: [],
        })
      }

      if (props.modal === 'obligation') {
        await props.addObligation({
          name: form.name?.trim() || 'Obligación',
          estimatedAmount: amount,
          dueDate: form.dueDate || todayIso(),
          priority: 'Media',
          category: form.category?.trim() || 'Otro',
          allocatedAmount: 0,
          paidAmount: 0,
          status: 'Pendiente',
          recurrence: 'none',
        })
      }

      if (props.modal === 'debt') {
        await props.addDebt({
          creditor: form.creditor?.trim() || 'Acreedor',
          name: form.name?.trim() || 'Deuda',
          originalAmount: amount,
          currentBalance: amount,
          minimumPayment: Number(form.minimumPayment || 0),
          type: 'Otro',
          priority: 'Media',
        })
      }

      if (props.modal === 'fund') {
        await props.addFund({
          name: form.name?.trim() || 'Fondo',
          currentAmount: amount,
          status: 'active',
          color: '#16a34a',
        })
      }

      if (props.modal === 'paycheck') {
        const allocations = props.funds
          .map((fund) => ({ fundId: fund.id, amount: Number(form[`fund-${fund.id}`] || 0) }))
          .filter((item) => item.amount > 0)

        distributePaycheck(amount, allocations)

        await props.addMovement({
          dateTime: nowIso(),
          accountId: form.accountId || firstAccount,
          type: 'Ingreso',
          amount,
          category: 'Salario',
          description: form.description?.trim() || 'Ingreso recibido',
          tags: ['me-pagaron'],
        })

        for (const allocation of allocations) {
          await props.allocateFund(allocation.fundId, allocation.amount)
        }
      }

      props.close()
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'No se pudo guardar. Revisa los datos e intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const titles: Record<Exclude<FinanceModal, null>, string> = {
    account: 'Nueva cuenta',
    movement: 'Nuevo movimiento',
    obligation: 'Nueva obligación',
    debt: 'Nueva deuda',
    fund: 'Nuevo fondo',
    paycheck: 'Registrar ingreso',
  }

  if (props.modal === null) return null

  return (
    <Modal title={titles[props.modal]} open onClose={props.close}>
      <div className="finance-modal-form">
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
              <select
                value={movementType}
                onChange={(event) => {
                  const nextType = event.target.value as FinancialMovement['type']
                  const nextCategories = nextType === 'Ingreso' ? initialIncomeCategories : initialExpenseCategories

                  setForm((current) => ({
                    ...current,
                    type: nextType,
                    category: nextCategories[0] ?? 'Otro',
                  }))
                }}
              >
                {['Ingreso', 'Gasto', 'Transferencia', 'Ajuste', 'Reembolso'].map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>

            {input('amount', 'Monto', 'number')}

            <label>
              Categoría
              <select
                value={form.category ?? defaultMovementCategory}
                onChange={(event) => set('category', event.target.value)}
              >
                {movementCategories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>

            {input('description', 'Descripción')}
            {input('dateTime', 'Fecha y hora', 'datetime-local')}
          </>
        ) : null}

        {props.modal === 'obligation' ? (
          <>
            {input('name', 'Nombre')}
            {input('amount', 'Monto estimado', 'number')}
            {input('category', 'Categoría')}
            {input('dueDate', 'Fecha límite', 'date')}
          </>
        ) : null}

        {props.modal === 'debt' ? (
          <>
            {input('creditor', 'Acreedor')}
            {input('name', 'Nombre')}
            {input('amount', 'Saldo actual', 'number')}
            {input('minimumPayment', 'Pago mínimo', 'number')}
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
              <p>Orden sugerido: obligaciones críticas, gastos básicos, deudas, ahorro y dinero libre.</p>
            </div>

            <div className="finance-income-funds">
              {props.funds.map((fund) => (
                <label key={fund.id}>
                  <span>{fund.name}</span>
                  <input
                    type="number"
                    min="0"
                    value={form[`fund-${fund.id}`] ?? ''}
                    onChange={(event) => set(`fund-${fund.id}`, event.target.value)}
                  />
                </label>
              ))}
            </div>

            <strong className="finance-free-estimate">
              Libre estimado:{' '}
              {formatCurrency(
                Math.max(
                  0,
                  amount - props.funds.reduce((sum, fund) => sum + Number(form[`fund-${fund.id}`] ?? 0), 0),
                ),
                props.currency,
              )}
            </strong>
          </>
        ) : null}

        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}

        <div className="finance-modal-actions">
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>

          <Button variant="ghost" onClick={props.close}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  )
}