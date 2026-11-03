import pb from '@/lib/pocketbase/client'
import { UserRecord } from '@/types/finance'

export const usersService = {
  /**
   * Lista usuários visíveis ao usuário logado (a API já filtra pelo auth_id).
   * Merged with the auth record so the logged-in user always appears even if
   * the collection's listRule is still the template's `id = @request.auth.id`.
   */
  async list(): Promise<UserRecord[]> {
    let records: UserRecord[] = []
    try {
      records = await pb.collection('users').getFullList<UserRecord>({ sort: 'name' })
    } catch {
      records = []
    }
    const me = pb.authStore.record as unknown as UserRecord | null
    if (me && !records.some((r) => r.id === me.id)) records = [me, ...records]
    return records
  },

  /** Cria o cadastro de um novo usuário/membro do lar com senha fornecida. */
  async create(
    email: string,
    name: string,
    familyRole: string,
    password: string,
    passwordConfirm?: string,
  ): Promise<UserRecord> {
    return await pb.collection('users').create<UserRecord>({
      email,
      name,
      family_role: familyRole,
      password,
      passwordConfirm: passwordConfirm || password,
      emailVisibility: true,
    })
  },

  /** Atualiza nome, e-mail, papel na família e/ou senha. */
  async update(
    id: string,
    data: {
      name?: string
      email?: string
      family_role?: string
      password?: string
      passwordConfirm?: string
    },
  ): Promise<UserRecord> {
    const payload: Record<string, unknown> = {}
    if (data.name !== undefined) payload.name = data.name
    if (data.email !== undefined) payload.email = data.email
    if (data.family_role !== undefined) payload.family_role = data.family_role
    if (data.password) {
      payload.password = data.password
      payload.passwordConfirm = data.passwordConfirm || data.password
    }
    return await pb.collection('users').update<UserRecord>(id, payload)
  },

  /** Insere o usuário no núcleo familiar (lista `members` da família). */
  async addToFamily(familyId: string, userId: string): Promise<void> {
    const family = await pb.collection('families').getOne(familyId)
    const members = Array.from(new Set([...(family.members || []), userId]))
    await pb.collection('families').update(familyId, { members })
  },
}
