import pb from '@/lib/pocketbase/client'
import { AccountRecord } from '@/types/finance'

export const accountsService = {
  async list(familyId?: string, options?: { includeArchived?: boolean }): Promise<AccountRecord[]> {
    const filter = familyId
      ? `family_id = '${familyId}' || user_id = '${pb.authStore.record?.id}'`
      : `user_id = '${pb.authStore.record?.id}'`
    const records = await pb.collection('accounts').getFullList<AccountRecord>({
      filter: pb.authStore.record ? filter : '',
      sort: '-created',
    })
    if (options?.includeArchived) return records
    // Registros sem status (legado) são considerados ativos.
    return records.filter((a) => (a.status ?? 'active') === 'active')
  },

  async create(data: Partial<AccountRecord>): Promise<AccountRecord> {
    const payload = {
      ...data,
      user_id: pb.authStore.record?.id,
      status: data.status || 'active',
      initial_balance: data.initial_balance || 0,
    }
    return await pb.collection('accounts').create<AccountRecord>(payload)
  },

  async update(id: string, data: Partial<AccountRecord>): Promise<AccountRecord> {
    return await pb.collection('accounts').update<AccountRecord>(id, data)
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('accounts').delete(id)
  },

  calculateCashDueDate(dateStr: string, closingDay?: number, dueDay?: number): string {
    if (!closingDay || !dueDay) return dateStr.slice(0, 7)
    const date = new Date(dateStr)
    const day = date.getDate()
    let month = date.getMonth()
    let year = date.getFullYear()

    // Se comprou após o fechamento da fatura, o desembolso cai na fatura do mês subsequente
    if (day > closingDay) {
      month += 1
    }
    // O pagamento da fatura ocorre no mês do vencimento (geralmente mês seguinte à compra)
    if (dueDay < closingDay) {
      month += 1
    }

    const dueDate = new Date(year, month, dueDay)
    return dueDate.toISOString().slice(0, 7)
  },
}
