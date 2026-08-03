import type {
  Budget,
  Debt,
  FinancialAccount,
  FinancialMovement,
  Fund,
  Obligation,
  ObligationStatus,
} from '../types/domain'
import { monthKey } from '../utils/date'

export interface AccountBalance {
  accountId: string
  openingBalance: number
  calculatedBalance: number
}

export interface FinancialSummary {
  totalLiquid: number
  allocated: number
  freeMoney: number
  debtPending: number
  obligationPending: number
  income: number
  expense: number
  netFlow: number
}

export const movementImpactForAccount = (movement: FinancialMovement, accountId: string): number => {
  if (movement.accountId === accountId) {
    if (movement.type === 'Ingreso' || movement.type === 'Reembolso' || movement.type === 'Ajuste') return movement.amount
    if (movement.type === 'Transferencia' || movement.type === 'Gasto' || movement.type === 'Pago de deuda' || movement.type === 'Pago de obligacion') {
      return -movement.amount
    }
  }
  if (movement.type === 'Transferencia' && movement.destinationAccountId === accountId) return movement.amount
  return 0
}

export const calculateAccountBalances = (accounts: FinancialAccount[], movements: FinancialMovement[]): AccountBalance[] =>
  {
    const movementTotals = new Map<string, number>()
    for (const movement of movements) {
      movementTotals.set(movement.accountId, (movementTotals.get(movement.accountId) ?? 0) + movementImpactForAccount(movement, movement.accountId))
      if (movement.type === 'Transferencia' && movement.destinationAccountId) {
        movementTotals.set(movement.destinationAccountId, (movementTotals.get(movement.destinationAccountId) ?? 0) + movement.amount)
      }
    }
    return accounts.map((account) => ({
      accountId: account.id,
      openingBalance: account.openingBalance,
      calculatedBalance: account.openingBalance + (movementTotals.get(account.id) ?? 0),
    }))
  }

export const calculateFinancialSummary = (
  accounts: FinancialAccount[],
  movements: FinancialMovement[],
  funds: Fund[],
  debts: Debt[],
  obligations: Obligation[],
): FinancialSummary => {
  const balances = calculateAccountBalances(accounts, movements)
  const totalLiquid = balances.reduce((total, balance) => total + balance.calculatedBalance, 0)
  const allocated = funds.filter((fund) => fund.status === 'active').reduce((total, fund) => total + fund.currentAmount, 0)
  const debtPending = debts.reduce((total, debt) => total + debt.currentBalance, 0)
  const obligationPending = obligations
    .filter((obligation) => obligation.status !== 'Pagada' && obligation.status !== 'Cancelada')
    .reduce((total, obligation) => total + Math.max(0, (obligation.finalAmount ?? obligation.estimatedAmount) - obligation.paidAmount), 0)
  const income = movements.filter((movement) => movement.type === 'Ingreso' || movement.type === 'Reembolso').reduce((total, movement) => total + movement.amount, 0)
  const expense = movements
    .filter((movement) => movement.type === 'Gasto' || movement.type === 'Pago de deuda' || movement.type === 'Pago de obligacion')
    .reduce((total, movement) => total + movement.amount, 0)
  return {
    totalLiquid,
    allocated,
    freeMoney: totalLiquid - allocated,
    debtPending,
    obligationPending,
    income,
    expense,
    netFlow: income - expense,
  }
}

export const obligationStatus = (obligation: Obligation, today = new Date()): ObligationStatus => {
  if (obligation.status === 'Cancelada') return 'Cancelada'
  const total = obligation.finalAmount ?? obligation.estimatedAmount
  if (obligation.paidAmount >= total && total > 0) return 'Pagada'
  if (new Date(obligation.dueDate).getTime() < new Date(today.toDateString()).getTime()) return 'Vencida'
  if (obligation.paidAmount > 0) return 'Parcialmente pagada'
  if (obligation.allocatedAmount >= total && total > 0) return 'Totalmente apartada'
  if (obligation.allocatedAmount > 0) return 'Parcialmente financiada'
  return 'Pendiente'
}

export const applyDebtPayment = (debt: Debt, amount: number, allowNegative = false): Debt => {
  const nextBalance = debt.currentBalance - amount
  if (nextBalance < 0 && !allowNegative) {
    throw new Error('El pago dejaria la deuda con saldo negativo.')
  }
  return { ...debt, currentBalance: nextBalance }
}

export const applyObligationPayment = (obligation: Obligation, amount: number, fromFundAmount = 0): Obligation => {
  const paidAmount = obligation.paidAmount + amount
  const allocatedAmount = Math.max(0, obligation.allocatedAmount - fromFundAmount)
  const next = { ...obligation, paidAmount, allocatedAmount }
  return { ...next, status: obligationStatus(next) }
}

export const budgetSpent = (budget: Budget, movements: FinancialMovement[], periodKey: string): number =>
  movements
    .filter((movement) => movement.type === 'Gasto' && movement.category === budget.category && monthKey(movement.dateTime) === periodKey)
    .reduce((total, movement) => total + movement.amount, 0)

export const distributePaycheck = (
  amount: number,
  allocations: Array<{ fundId: string; amount: number }>,
): { totalAllocated: number; freeAmount: number } => {
  const totalAllocated = allocations.reduce((total, allocation) => total + allocation.amount, 0)
  if (totalAllocated > amount) throw new Error('La distribucion supera el ingreso recibido.')
  return { totalAllocated, freeAmount: amount - totalAllocated }
}

export const transferIsNeutral = (movement: FinancialMovement): boolean => movement.type === 'Transferencia'
