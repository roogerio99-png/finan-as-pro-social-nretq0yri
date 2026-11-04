import pb from '@/lib/pocketbase/client'
import { TransactionRecord } from '@/types/finance'
import { totalCashForMonth } from '@/services/installments'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export const transactionsService = {
  // month+regime selecionam a JANELA de busca, não a lista final:
  // - competência: transações daquele mês de competência (valor cheio).
  // - caixa: transações cujo cash_month seja o mês OU anteriores (parcelas
  //   continuam saindo do caixa nos meses seguintes). A página filtra/mostra
  //   o valor do mês com cashValueForMonth (src/services/installments.ts).
  async list(filters?: {
    month?: string // YYYY-MM
    regime?: 'competence' | 'cash'
    familyId?: string
  }): Promise<TransactionRecord[]> {
    const filterParts: string[] = []

    if (filters?.familyId) {
      filterParts.push(
        `(family_id = '${filters.familyId}' || user_id = '${pb.authStore.record?.id}')`,
      )
    } else if (pb.authStore.record?.id) {
      filterParts.push(`user_id = '${pb.authStore.record.id}'`)
    }

    if (filters?.month) {
      if (filters.regime === 'cash') {
        filterParts.push(`cash_month <= '${filters.month}'`)
      } else {
        filterParts.push(`competence_month = '${filters.month}'`)
      }
    }

    const filterString = filterParts.join(' && ')

    return await pb.collection('transactions').getFullList<TransactionRecord>({
      filter: filterString,
      sort: '-date,-created',
      expand: 'account_id,category_id,user_id',
    })
  },

  // Soma de desembolso de caixa de um mês (respeita parcelas).
  async cashTotal(
    transactions: TransactionRecord[],
    month: string,
    accounts: { id: string; closing_day?: number; due_day?: number }[],
  ): Promise<number> {
    return totalCashForMonth(transactions, month, accounts)
  },

  async create(data: Partial<TransactionRecord>): Promise<TransactionRecord> {
    const payload = {
      ...data,
      user_id: pb.authStore.record?.id,
      is_reconciled: data.is_reconciled ?? false,
    }
    return await pb.collection('transactions').create<TransactionRecord>(payload, {
      expand: 'account_id,category_id',
    })
  },

  async update(id: string, data: Partial<TransactionRecord>): Promise<TransactionRecord> {
    return await pb.collection('transactions').update<TransactionRecord>(id, data, {
      expand: 'account_id,category_id',
    })
  },

  // Transferência entre contas: sai de uma conta e entra na outra — sem
  // receita nem despesa. Feita no backend (POST /backend/v1/transfers) para
  // debitar/creditar os saldos das duas contas numa única transação.
  async transfer(input: {
    sourceAccountId: string
    targetAccountId: string
    amount: number
    date: string
    description?: string
    notes?: string
  }): Promise<{ id: string; amount: number }> {
    try {
      return await pb.send<{ id: string; amount: number }>('/backend/v1/transfers', {
        method: 'POST',
        body: {
          source_account_id: input.sourceAccountId,
          target_account_id: input.targetAccountId,
          amount: input.amount,
          date: input.date,
          description: input.description,
          notes: input.notes,
        },
      })
    } catch (err) {
      throw new Error(getErrorMessage(err))
    }
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('transactions').delete(id)
  },

  async createBatch(items: Partial<TransactionRecord>[]): Promise<TransactionRecord[]> {
    const results: TransactionRecord[] = []
    for (const item of items) {
      const created = await this.create(item)
      results.push(created)
    }
    return results
  },
}
