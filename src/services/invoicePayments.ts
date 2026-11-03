// Comportamento do Painel referente a pagamentos de parcelas de fatura:
// monta a lista de "parcelas vencendo no mês" (agrupadas por cartão/fatura),
// calcula o caixa do mês descontando o que já foi pago e o comprometimento
// futuro (12 meses) excluíndo parcelas já quitadas.
import { AccountRecord, PaymentRecord, TransactionRecord } from '@/types/finance'
import {
  cashValueForMonth,
  installmentIndexOfMonth,
  installmentValue,
  monthShift,
} from '@/services/installments'

export interface InvoiceGroup {
  card: AccountRecord
  items: {
    tx: TransactionRecord
    /** Parcela (1-based) que vence neste mês. */
    index: number
    value: number
  }[]
  total: number
  /** Total já marcado como pago nesta fatura. */
  paidTotal: number
}

// Parcelas que vencem no mês selecionado, agrupadas por cartão (fatura).
export const dueInvoiceGroups = (
  transactions: TransactionRecord[],
  accounts: AccountRecord[],
  payments: PaymentRecord[],
  month: string,
): InvoiceGroup[] => {
  const groups = new Map<string, InvoiceGroup>()

  for (const tx of transactions) {
    const index = installmentIndexOfMonth(tx, month, accounts)
    if (index === 0) continue

    const card = accounts.find((a) => a.id === tx.account_id)
    if (!card) continue

    const value = cashValueForMonth(tx, month, accounts)
    if (value <= 0) continue

    const key = card.id
    let group = groups.get(key)
    if (!group) {
      group = { card, items: [], total: 0, paidTotal: 0 }
      groups.set(key, group)
    }
    const alreadyPaid = payments.some(
      (p) => p.source_transaction_id === tx.id && p.installment_index === index,
    )
    if (!alreadyPaid) group.items.push({ tx, index, value })
    group.total += value
    if (alreadyPaid) group.paidTotal += value
  }

  return Array.from(groups.values())
}

// Caixa efetivo do mês: soma das parcelas do mês menos o que já foi pago.
export const netCashForMonth = (
  transactions: TransactionRecord[],
  accounts: AccountRecord[],
  payments: PaymentRecord[],
  month: string,
): number => {
  let total = 0
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue
    const value = cashValueForMonth(tx, month, accounts)
    if (value <= 0) continue
    const index = installmentIndexOfMonth(tx, month, accounts)
    const alreadyPaid = payments.some(
      (p) =>
        p.source_transaction_id === tx.id &&
        p.installment_index === index &&
        p.cash_month === month,
    )
    if (index > 0 && alreadyPaid) continue
    total += value
  }
  return Math.round(total * 100) / 100
}

// Comprometimento futuro (12 meses): parcelas dos próximos meses que ainda não
// foram quitadas — é o que sai do "total comprometido em parcelas futuras".
export const remainingFutureCommitted = (
  transactions: TransactionRecord[],
  accounts: AccountRecord[],
  payments: PaymentRecord[],
  fromMonth: string,
): number => {
  let future = 0
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue
    const installments = tx.installments_total ?? 0
    if (installments <= 1) continue
    for (let i = 1; i <= 12; i++) {
      const m = monthShift(fromMonth, i)
      const value = cashValueForMonth(tx, m, accounts)
      if (value <= 0) continue
      const index = installmentIndexOfMonth(tx, m, accounts)
      const alreadyPaid = payments.some(
        (p) =>
          p.source_transaction_id === tx.id && p.installment_index === index && p.cash_month === m,
      )
      if (alreadyPaid) continue
      future += value
    }
  }
  return Math.round(future * 100) / 100
}

// Total pago dentro de uma fatura específica (cartão + mês), para exibição.
export const paidInInvoice = (
  payments: PaymentRecord[],
  transactionId: string,
  index: number,
): PaymentRecord | undefined =>
  payments.find((p) => p.source_transaction_id === transactionId && p.installment_index === index)

export { installmentValue }
