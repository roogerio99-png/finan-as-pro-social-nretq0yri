import pb from '@/lib/pocketbase/client'
import { CategoryRecord } from '@/types/finance'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export const categoriesService = {
  async list(options?: { includeInactive?: boolean }): Promise<CategoryRecord[]> {
    const filter = pb.authStore.record
      ? `user_id = '${pb.authStore.record.id}' || user_id = '' || user_id = 'usr_rogerio'`
      : ''
    const records = await pb.collection('categories').getFullList<CategoryRecord>({
      filter: filter || undefined,
      sort: 'group_level1,group_level2,name',
    })
    if (options?.includeInactive) return records
    // Registros sem status (legado) são considerados ativos.
    return records.filter((c) => (c.status ?? 'active') === 'active')
  },

  async create(data: Partial<CategoryRecord>): Promise<CategoryRecord> {
    const payload = {
      ...data,
      user_id: pb.authStore.record?.id,
    }
    return await pb.collection('categories').create<CategoryRecord>(payload)
  },

  async update(id: string, data: Partial<CategoryRecord>): Promise<CategoryRecord> {
    return await pb.collection('categories').update<CategoryRecord>(id, data)
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('categories').delete(id)
  },

  /** Cria uma nova linha do plano de contas (grupo nível 1 ou subgrupo nível 2). */
  async createNode(data: Partial<CategoryRecord>): Promise<CategoryRecord> {
    const payload = {
      ...data,
      user_id: pb.authStore.record?.id,
      status: data.status || 'active',
    }
    try {
      return await pb.collection('categories').create<CategoryRecord>(payload)
    } catch (err) {
      throw new Error(getErrorMessage(err))
    }
  },

  /** Ativa/inativa uma lista de registros do plano de contas (inativação preserva o histórico). */
  async setActive(ids: string[], status: 'active' | 'inactive'): Promise<void> {
    if (ids.length === 0) return
    try {
      await Promise.all(ids.map((id) => pb.collection('categories').update(id, { status })))
    } catch (err) {
      throw new Error(getErrorMessage(err))
    }
  },

  /** Exclui definitivamente uma lista de IDs do plano de contas */
  async deleteNodes(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    try {
      await Promise.all(ids.map((id) => pb.collection('categories').delete(id)))
    } catch (err) {
      throw new Error(getErrorMessage(err))
    }
  },

  /** Renomeia todos os registros que compartilham o mesmo rótulo de grupo/subgrupo. */
  async renameLabel(
    cats: CategoryRecord[],
    field: 'group_level1' | 'group_level2',
    oldValue: string,
    newValue: string,
  ): Promise<void> {
    const targets = cats.filter((c) => (c[field] || '') === oldValue)
    if (targets.length === 0) return
    try {
      await Promise.all(
        targets.map((c) => pb.collection('categories').update(c.id, { [field]: newValue })),
      )
    } catch (err) {
      throw new Error(getErrorMessage(err))
    }
  },

  /** Converte o plano de contas em árvore: grupos (nível 1) -> subgrupos (nível 2) -> categorias. */
  buildTree(
    all: CategoryRecord[],
    type: 'income' | 'expense',
  ): Array<{
    name: string
    category?: CategoryRecord
    subgroups: Array<{ name: string; category?: CategoryRecord; leaves: CategoryRecord[] }>
  }> {
    const rows = all.filter((c) => c.type === type)
    const groupNames = Array.from(new Set(rows.map((c) => c.group_level1 || 'Sem grupo')))

    return groupNames.map((g) => {
      const groupRows = rows.filter((c) => (c.group_level1 || 'Sem grupo') === g)
      // Uma categoria pode ser o próprio grupo (grupo criado sem subgrupo).
      const groupAsLeaf = groupRows.find((c) => !c.group_level2 && !c.subgroup_level3)
      const subNames = Array.from(
        new Set(groupRows.filter((c) => c.group_level2).map((c) => c.group_level2)),
      )

      const subgroups = subNames.map((s) => {
        const subRows = groupRows.filter((c) => c.group_level2 === s)
        const subAsLeaf = subRows.find((c) => !c.subgroup_level3)
        return {
          name: s,
          category: subAsLeaf,
          leaves: subRows.filter((c) => c.subgroup_level3),
        }
      })

      return { name: g, category: groupAsLeaf, subgroups }
    })
  },
}
