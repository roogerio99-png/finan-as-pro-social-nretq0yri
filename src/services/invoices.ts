// Serviço de faturas de cartão: a fatura como REGISTRO formal.
// A criação/agrupamento é feito no backend (POST /backend/v1/invoices, hook
// invoices_movements.pb.js) — o backend coleta as compras/parcelas do cartão
// cujo desembolso cai no mês de fechamento e grava total + itens.
import pb from '@/lib/pocketbase/client'
import { InvoiceRecord } from '@/types/finance'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export const invoicesService = {
  /** Faturas do usuário logado (opcionalmente por cartão e/ou status). */
  async list(filters?: {
    cardAccountId?: string
    month?: string
    status?: 'open' | 'paid'
  }): Promise<InvoiceRecord[]> {
    const parts: string[] = []
    if (pb.authStore.record?.id) {
      parts.push(`user_id = '${pb.authStore.record.id}'`)
    }
    if (filters?.cardAccountId) parts.push(`card_account_id = '${filters.cardAccountId}'`)
    if (filters?.month) parts.push(`reference_month = '${filters.month}'`)
    if (filters?.status) parts.push(`status = '${filters.status}'`)
    return await pb.collection('invoices').getFullList<InvoiceRecord>({
      filter: parts.join(' && '),
      sort: '-reference_month,-created',
      expand: 'card_account_id,payment_account_id',
    })
  },

  /** Cria/atualiza a fatura do mês: agrupa todas as compras daquele fechamento. */
  async createForMonth(cardAccountId: string, referenceMonth: string): Promise<InvoiceRecord> {
    try {
      return await pb.send<InvoiceRecord>('/backend/v1/invoices', {
        method: 'POST',
        body: { card_account_id: cardAccountId, reference_month: referenceMonth },
      })
    } catch (err) {
      throw new Error(getErrorMessage(err))
    }
  },

  /** Registra o pagamento da fatura como MOVIMENTO bancário (sem despesa). */
  async payViaMovement(input: {
    invoiceId: string
    paymentAccountId: string
    paidDate: string
    amount?: number
    notes?: string
  }): Promise<{ movement_id: string; invoice_id: string; amount: number }> {
    try {
      return await pb.send<{ movement_id: string; invoice_id: string; amount: number }>(
        '/backend/v1/invoice-movements',
        {
          method: 'POST',
          body: {
            invoice_id: input.invoiceId,
            payment_account_id: input.paymentAccountId,
            paid_date: input.paidDate,
            amount: input.amount,
            notes: input.notes,
          },
        },
      )
    } catch (err) {
      throw new Error(getErrorMessage(err))
    }
  },

  /** Desfaz o pagamento: estorna saldo, reabre a fatura e apaga o movimento. */
  async undoPayment(movementId: string): Promise<boolean> {
    try {
      await pb.send<{ ok: boolean }>(`/backend/v1/invoice-movements/${movementId}`, {
        method: 'DELETE',
      })
      return true
    } catch (err) {
      throw new Error(getErrorMessage(err))
    }
  },
}
