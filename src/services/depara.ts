import pb from '@/lib/pocketbase/client'
import { DeparaRuleRecord, CategoryRecord } from '@/types/finance'

export const deparaService = {
  async list(): Promise<DeparaRuleRecord[]> {
    return await pb.collection('depara_rules').getFullList<DeparaRuleRecord>({
      filter: pb.authStore.record ? `user_id = '${pb.authStore.record.id}'` : '',
      expand: 'category_id',
      sort: '-created',
    })
  },

  async create(pattern: string, categoryId: string): Promise<DeparaRuleRecord> {
    const cleanPattern = pattern.trim().toUpperCase()
    return await pb.collection('depara_rules').create<DeparaRuleRecord>({
      user_id: pb.authStore.record?.id,
      pattern: cleanPattern,
      category_id: categoryId,
      confidence: 100,
    })
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('depara_rules').delete(id)
  },

  matchCategory(
    description: string,
    rules: DeparaRuleRecord[],
    categories: CategoryRecord[],
  ): string | undefined {
    const upperDesc = description.toUpperCase()

    // 1. Busca em regras De-Para cadastradas
    for (const rule of rules) {
      if (upperDesc.includes(rule.pattern.toUpperCase())) {
        return rule.category_id
      }
    }

    // 2. Busca heurística pelo nome da categoria ou subgrupo
    for (const cat of categories) {
      if (upperDesc.includes(cat.name.toUpperCase())) {
        return cat.id
      }
      if (cat.subgroup_level3 && upperDesc.includes(cat.subgroup_level3.toUpperCase())) {
        return cat.id
      }
      if (upperDesc.includes(cat.group_level2.toUpperCase())) {
        return cat.id
      }
    }

    return undefined
  },
}
