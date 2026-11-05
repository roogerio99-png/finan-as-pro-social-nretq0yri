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

  /** Payload base para criar categoria: sempre user_id do usuário logado e
   * family_id do seu núcleo (a regra de create exige vínculo com a família —
   * sem family_id a criação é recusada quando o auth não tem family_id). */
  async create(data: Partial<CategoryRecord>): Promise<CategoryRecord> {
    const payload = {
      ...data,
      user_id: pb.authStore.record?.id,
      family_id: data.family_id ?? pb.authStore.record?.family_id ?? '',
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
    const userId = pb.authStore.record?.id
    if (!userId) {
      // Nada será enviado sem sessão: falhar com mensagem clara, nunca em silêncio.
      throw new Error('Sua sessão expirou. Faça login novamente para criar grupos ou subgrupos.')
    }
    const payload = {
      ...data,
      user_id: userId,
      family_id: data.family_id ?? pb.authStore.record?.family_id ?? '',
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

  /**
   * Renomeia todos os registros que compartilham o mesmo rótulo de grupo/subgrupo.
   * Busca a lista fresca do banco (o estado da tela pode estar defasado) e retorna
   * quantos registros foram alterados — 0 significa que nenhum rótulo foi encontrado,
   * o que o chamador deve tratar como erro (não como sucesso silencioso).
   */
  async renameLabel(
    field: 'group_level1' | 'group_level2',
    oldValue: string,
    newValue: string,
    parentGroup?: string,
  ): Promise<number> {
    if (!oldValue || !newValue || oldValue === newValue) return 0
    const fresh = await this.list({ includeInactive: true })
    const inScope = parentGroup
      ? fresh.filter((c) => (c.group_level1 || '') === parentGroup)
      : fresh
    // "Sem grupo" é o rótulo exibido para registros com group_level1 vazio.
    const targets = inScope.filter((c) =>
      oldValue === 'Sem grupo' ? !(c[field] || '') : (c[field] || '') === oldValue,
    )
    if (targets.length === 0) return 0
    try {
      await Promise.all(
        targets.map((c) => {
          const patch: Partial<CategoryRecord> = { [field]: newValue }
          // Mantém o nome canônico do nó em sincronia com o rótulo renomeado.
          if ((c.name || '') === oldValue && !c.subgroup_level3) patch.name = newValue
          return pb.collection('categories').update(c.id, patch)
        }),
      )
      return targets.length
    } catch (err) {
      throw new Error(getErrorMessage(err))
    }
  },

  /**
   * Grava código e descrição do plano de contas no nó informado (edição completa
   * do grupo/subgrupo). Esses metadados vivem no registro canônico do nó —
   * grupo: linha sem group_level2; subgrupo: linha sem subgroup_level3.
   * Registros antigos sem canônico (ex.: "Renda Ativa") ganham um na primeira
   * edição, sempre com user_id + family_id do authStore (padrão da criação).
   */
  async updateNodeMeta(opts: {
    level: 1 | 2
    label: string
    parent?: string
    type: 'income' | 'expense'
    code?: string
    description?: string
  }): Promise<void> {
    const fresh = await this.list({ includeInactive: true })
    const rows = fresh.filter((c) => c.type === opts.type)
    const inScope =
      opts.level === 1
        ? rows.filter((c) =>
            opts.label === 'Sem grupo'
              ? !(c.group_level1 || '')
              : (c.group_level1 || '') === opts.label,
          )
        : rows.filter(
            (c) =>
              (c.group_level1 || '') === (opts.parent || '') &&
              (c.group_level2 || '') === opts.label,
          )
    const canonical =
      opts.level === 1
        ? inScope.find((c) => !c.group_level2 && !c.subgroup_level3)
        : inScope.find((c) => !c.subgroup_level3)

    const patch: Partial<CategoryRecord> = {
      description: opts.description || '',
    }
    if (opts.level === 1) patch.group_code = opts.code || ''
    else patch.code = opts.code || ''

    try {
      if (canonical) {
        await pb.collection('categories').update(canonical.id, patch)
        // O código do grupo identifica o grupo inteiro: propaga para as linhas filhas
        // (novos subgrupos herdam o group_code do pai ao serem criados).
        if (opts.level === 1) {
          const others = inScope.filter((c) => c.id !== canonical.id)
          await Promise.all(
            others.map((c) =>
              pb.collection('categories').update(c.id, { group_code: patch.group_code }),
            ),
          )
        }
        return
      }
      if (opts.level === 1 && opts.label === 'Sem grupo') {
        // O pseudo-grupo "Sem grupo" não tem registro próprio: grava nas linhas.
        await Promise.all(inScope.map((c) => pb.collection('categories').update(c.id, patch)))
        return
      }
      if (opts.level === 1) {
        await this.createNode({
          name: opts.label,
          type: opts.type,
          group_level1: opts.label,
          group_level2: '',
          group_code: opts.code || '',
          code: '',
          description: opts.description || '',
          status: 'active',
          color: opts.type === 'income' ? '#059669' : '#0284C7',
        })
      } else {
        const parentRec = fresh.find(
          (c) =>
            c.type === opts.type &&
            (c.group_level1 || '') === (opts.parent || '') &&
            !c.group_level2 &&
            !c.subgroup_level3,
        )
        await this.createNode({
          name: opts.label,
          type: opts.type,
          group_level1: opts.parent || '',
          group_level2: opts.label,
          group_code: parentRec?.group_code || '',
          code: opts.code || '',
          description: opts.description || '',
          status: 'active',
          color: parentRec?.color || (opts.type === 'income' ? '#10B981' : '#06B6D4'),
        })
      }
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
