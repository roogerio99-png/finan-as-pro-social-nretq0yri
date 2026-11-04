import pb from '@/lib/pocketbase/client'
import { BudgetRecord, CategoryRecord } from '@/types/finance'

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
    targetType: 'group' | 'subgroup' = 'subgroup',
  ): Promise<BudgetRecord> {
    // Busca se já existe meta para esta chave (mês + nome + tipo ou legado)
    // Se o target_type coincidir ou se category_group for idêntico
    const existing = await pb.collection('budgets').getList<BudgetRecord>(1, 1, {
      filter: `user_id = '${pb.authStore.record?.id}' && month = '${month}' && category_group = '${categoryGroup}'`,
    })

    if (existing.items.length > 0) {
      return await pb.collection('budgets').update<BudgetRecord>(existing.items[0].id, {
        limit_amount: limitAmount,
        warning_threshold: warning,
        danger_threshold: danger,
        target_type: targetType,
      })
    }

    return await pb.collection('budgets').create<BudgetRecord>({
      user_id: pb.authStore.record?.id,
      month,
      category_group: categoryGroup,
      target_type: targetType,
      limit_amount: limitAmount,
      warning_threshold: warning,
      danger_threshold: danger,
    })
  },

  async update(id: string, data: Partial<BudgetRecord>): Promise<BudgetRecord> {
    return await pb.collection('budgets').update<BudgetRecord>(id, data)
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('budgets').delete(id)
  },

  /**
   * Helper para deduzir o tipo de uma meta (group vs subgroup).
   * Se já tem target_type preenchido, usa ele.
   * Se não, checa se bate com group_level1 ou group_level2 nas categorias.
   */
  resolveTargetType(budget: BudgetRecord, categories: CategoryRecord[]): 'group' | 'subgroup' {
    if (budget.target_type === 'group' || budget.target_type === 'subgroup') {
      return budget.target_type
    }
    const isGroup = categories.some((c) => c.group_level1 === budget.category_group)
    return isGroup ? 'group' : 'subgroup'
  },
}
