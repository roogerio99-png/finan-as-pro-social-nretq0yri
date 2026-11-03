import pb from '@/lib/pocketbase/client'
import { BudgetRecord } from '@/types/finance'

export const budgetsService = {
  async list(month: string): Promise<BudgetRecord[]> {
    const filter = pb.authStore.record
      ? `user_id = '${pb.authStore.record.id}' && month = '${month}'`
      : `month = '${month}'`

    return await pb.collection('budgets').getFullList<BudgetRecord>({
      filter,
      sort: 'category_group',
    })
  },

  async upsert(
    month: string,
    categoryGroup: string,
    limitAmount: number,
    warning = 75,
    danger = 90,
  ): Promise<BudgetRecord> {
    const existing = await pb.collection('budgets').getList<BudgetRecord>(1, 1, {
      filter: `user_id = '${pb.authStore.record?.id}' && month = '${month}' && category_group = '${categoryGroup}'`,
    })

    if (existing.items.length > 0) {
      return await pb.collection('budgets').update<BudgetRecord>(existing.items[0].id, {
        limit_amount: limitAmount,
        warning_threshold: warning,
        danger_threshold: danger,
      })
    }

    return await pb.collection('budgets').create<BudgetRecord>({
      user_id: pb.authStore.record?.id,
      month,
      category_group: categoryGroup,
      limit_amount: limitAmount,
      warning_threshold: warning,
      danger_threshold: danger,
    })
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('budgets').delete(id)
  },
}
