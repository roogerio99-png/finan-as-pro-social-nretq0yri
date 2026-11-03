import pb from '@/lib/pocketbase/client'
import { AccountRecord, PaymentRecord, TransactionRecord } from '@/types/finance'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export interface MarkPaidInput {
  transaction: TransactionRecord
  /** Parcela (1-based) quitada. */
  installmentIndex: number
  /** Valor da parcela efetivamente pago (a última fecha o total). */
  amount: number
  /** Fatura (mês de desembolso, YYYY-MM) que a parcela quita. */
  cashMonth: string
  /** Data informada pelo usuário (YYYY-MM-DD). */
  paidDate: string
  /** Conta/banco pagador — nunca cartão de crédito. */
  paymentAccountId: string
  /** Cartão cuja fatura estava sendo paga. */
  cardAccountId?: string
  notes?: string
}

export const paymentsService = {
  /** Pagamentos já registrados (parcelas quitadas) do usuário logado. */
  async list(familyId?: string): Promise<PaymentRecord[]> {
    const filterParts: string[] = []
    if (familyId) {
      filterParts.push(`(family_id = '${familyId}' || user_id = '${pb.authStore.record?.id}')`)
    } else if (pb.authStore.record?.id) {
      filterParts.push(`user_id = '${pb.authStore.record.id}'`)
    }
    return await pb.collection('payments').getFullList<PaymentRecord>({
      filter: filterParts.join(' && '),
      sort: '-paid_date,-created',
    })
  },

  /**
   * Marca uma parcela como paga: grava data + conta pagadora, debita o valor do
   * saldo atual da conta escolhida e incrementa `installments_paid` da compra.
   */
  async markPaid(input: MarkPaidInput): Promise<PaymentRecord> {
    try {
      const created = await pb.send<PaymentRecord>('/backend/v1/invoice-payments', {
        method: 'POST',
        body: {
          source_transaction_id: input.transaction.id,
          installment_index: input.installmentIndex,
          amount: input.amount,
          cash_month: input.cashMonth,
          paid_date: input.paidDate,
          payment_account_id: input.paymentAccountId,
          card_account_id: input.cardAccountId,
          notes: input.notes,
        },
      })
      return created
    } catch (err) {
      throw new Error(getErrorMessage(err))
    }
  },

  /** Desfaz o pagamento da parcela: estorna saldo, decrementa pago e apaga. */
  async unmarkPaid(paymentId: string): Promise<boolean> {
    try {
      await pb.send<{ ok: boolean }>(`/backend/v1/invoice-payments/${paymentId}`, {
        method: 'DELETE',
      })
      return true
    } catch (err) {
      throw new Error(getErrorMessage(err))
    }
  },
}
