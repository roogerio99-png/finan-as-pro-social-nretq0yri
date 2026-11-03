// Matemática de parcelamento e regime de caixa/competência para lançamentos.
// Uma despesa em cartão de crédito parcelada entra INTEIRA na competência do mês
// da compra e entra por PARCELA no caixa, mês a mês, conforme o fechamento/vencimento.
import { TransactionRecord } from '@/types/finance'
import { accountsService } from '@/services/accounts'

export const isInstallmentTransaction = (
  tx: Pick<TransactionRecord, 'installments_total' | 'type'>,
): boolean => tx.type === 'expense' && (tx.installments_total ?? 0) > 1

// Valor da parcela mensal que sai do caixa (arredondado na última parcela).
export const installmentValue = (amount: number, installments: number): number => {
  if (installments <= 1) return amount
  const perInstallment = Math.floor((amount / installments) * 100) / 100
  return perInstallment
}

// Mês do primeiro desembolso de caixa de uma compra (YYYY-MM), pelo fechamento/vencimento.
export const firstCashMonth = (
  purchaseDate: string,
  closingDay?: number,
  dueDay?: number,
): string => accountsService.calculateCashDueDate(purchaseDate, closingDay, dueDay)

// Soma de caixa de UMA transação em um mês específico (YYYY-MM).
// À vista: valor cheio no cash_month da transação.
// Parcelada: parcela em cada mês de desembolso, calculado pelo fechamento/vencimento.
export const cashValueForMonth = (
  tx: TransactionRecord,
  month: string,
  accounts: { id: string; closing_day?: number; due_day?: number }[],
): number => {
  const isExpense = tx.type === 'expense'
  const installments = isExpense ? (tx.installments_total ?? 0) : 0

  // Sem parcelamento (ou receita): comportamento atual — valor no cash_month.
  if (installments <= 1) {
    return tx.cash_month === month ? tx.amount : 0
  }

  const account = accounts.find((a) => a.id === tx.account_id)
  const startMonth = firstCashMonth(tx.date, account?.closing_day, account?.due_day)

  // Comparação lexical de "YYYY-MM" funciona porque o formato é fixo.
  const monthsAfterStart = monthDistance(startMonth, month)
  if (monthsAfterStart < 0 || monthsAfterStart >= installments) return 0

  // A última parcela fecha o total exato (evita sobra por arredondamento).
  const isLast = monthsAfterStart === installments - 1
  if (isLast) {
    const previous = installmentValue(tx.amount, installments) * (installments - 1)
    return Math.round((tx.amount - previous) * 100) / 100
  }
  return installmentValue(tx.amount, installments)
}

// Soma de caixa de um conjunto de transações em um mês.
export const totalCashForMonth = (
  txs: TransactionRecord[],
  month: string,
  accounts: { id: string; closing_day?: number; due_day?: number }[],
): number => txs.reduce((acc, tx) => acc + cashValueForMonth(tx, month, accounts), 0)

const monthDistance = (from: string, to: string): number => {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

// Desloca um mês "YYYY-MM" em n meses (n pode ser negativo).
export const monthShift = (month: string, n: number): string => {
  const [y, m] = month.split('-').map(Number)
  const total = y * 12 + (m - 1) + n
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return `${ny}-${String(nm).padStart(2, '0')}`
}
