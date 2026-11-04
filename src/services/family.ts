import pb from '@/lib/pocketbase/client'
import { FamilyRecord, UserRecord } from '@/types/finance'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export const familyService = {
  async getMyFamily(): Promise<FamilyRecord | null> {
    if (!pb.authStore.record) return null
    const userId = pb.authStore.record.id
    try {
      const records = await pb.collection('families').getFullList<FamilyRecord>({
        filter: `created_by = '${userId}' || members ~ '${userId}'`,
        limit: 1,
      })
      return records[0] || null
    } catch {
      return null
    }
  },

  /** Devolve a família do usuário logado, criando o núcleo padrão se ainda não existir. */
  async getOrCreateCurrentFamily(): Promise<FamilyRecord> {
    const existing = await this.getMyFamily()
    if (existing) return existing
    const name = pb.authStore.record?.name ? `Família de ${pb.authStore.record.name}` : 'Meu Núcleo'
    return this.create(name)
  },

  /** Membros da família (expande os usuários da relação `members`). */
  async listMembers(familyId: string): Promise<UserRecord[]> {
    const family = await pb.collection('families').getOne<FamilyRecord>(familyId, {
      expand: 'members',
    })
    const expanded = (
      family as unknown as {
        expand?: { members?: UserRecord[] }
      }
    ).expand?.members
    if (expanded && expanded.length > 0) return expanded

    // Fallback: busca direta pelos ids da relação.
    const ids = family.members || []
    if (ids.length === 0) return []
    const filter = ids.map((id) => `id = '${id}'`).join(' || ')
    return await pb.collection('users').getFullList<UserRecord>({
      filter,
      sort: '-created',
    })
  },

  async create(name: string): Promise<FamilyRecord> {
    const userId = pb.authStore.record?.id
    return await pb.collection('families').create<FamilyRecord>({
      name,
      created_by: userId,
      members: userId ? [userId] : [],
    })
  },

  async addMember(familyId: string, userEmail: string): Promise<FamilyRecord> {
    try {
      const targetUser = await pb
        .collection('users')
        .getFirstListItem<UserRecord>(`email = '${userEmail}'`)
      const family = await pb.collection('families').getOne<FamilyRecord>(familyId)
      const members = Array.from(new Set([...(family.members || []), targetUser.id]))
      return await pb.collection('families').update<FamilyRecord>(familyId, {
        members,
      })
    } catch (err: unknown) {
      void err
      throw new Error('Usuário não encontrado com esse e-mail ou sem permissão.')
    }
  },

  async removeMember(familyId: string, memberId: string): Promise<FamilyRecord> {
    try {
      const family = await pb.collection('families').getOne<FamilyRecord>(familyId)
      const members = (family.members || []).filter((id) => id !== memberId)
      return await pb.collection('families').update<FamilyRecord>(familyId, { members })
    } catch (err: unknown) {
      void err
      throw new Error('Erro ao remover membro da família.')
    }
  },

  /**
   * Cadastra um membro do lar com e-mail e senha previamente definidos pelo gerente.
   * Se o e-mail já existir como usuário, vincula ao núcleo familiar.
   */
  async createMember(input: {
    name: string
    email: string
    password: string
    passwordConfirm?: string
    family_role?: string
  }): Promise<UserRecord> {
    let created: UserRecord | null = null
    try {
      created = await pb.collection('users').create<UserRecord>({
        name: input.name,
        email: input.email,
        password: input.password,
        passwordConfirm: input.passwordConfirm || input.password,
        family_role: input.family_role || 'member',
        emailVisibility: true,
      })
    } catch (err) {
      const message = getErrorMessage(err)
      // Já existe usuário com esse e-mail: segue para vinculá-lo ao núcleo.
      if (!message.toLowerCase().includes('email')) throw err
    }

    const family = await this.getOrCreateCurrentFamily()
    if (family) {
      const target =
        created ||
        (await pb.collection('users').getFirstListItem<UserRecord>(`email = '${input.email}'`))
      const members = Array.from(new Set([...(family.members || []), target.id]))
      await pb.collection('families').update(family.id, { members })
      return target
    }
    return created as UserRecord
  },

  /**
   * Atualiza dados de um membro do lar (nome, e-mail, papel e/ou redefinição de senha).
   */
  async updateMember(
    id: string,
    data: {
      name?: string
      email?: string
      family_role?: string
      password?: string
      passwordConfirm?: string
    },
  ): Promise<UserRecord> {
    try {
      const payload: Record<string, unknown> = {}
      if (data.name !== undefined) payload.name = data.name
      if (data.email !== undefined) payload.email = data.email
      if (data.family_role !== undefined) payload.family_role = data.family_role
      if (data.password) {
        payload.password = data.password
        payload.passwordConfirm = data.passwordConfirm || data.password
      }
      return await pb.collection('users').update<UserRecord>(id, payload)
    } catch (err) {
      throw new Error(getErrorMessage(err))
    }
  },
}
