import pb from '@/lib/pocketbase/client'
import { TransactionRecord } from '@/types/finance'

export const transactionsService = {
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
        filterParts.push(`cash_month = '${filters.month}'`)
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
