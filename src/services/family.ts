import pb from '@/lib/pocketbase/client'
import { FamilyRecord, UserRecord } from '@/types/finance'

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

  async create(name: string): Promise<FamilyRecord> {
    const userId = pb.authStore.record?.id
    return await pb.collection('families').create<FamilyRecord>({
      name,
      created_by: userId,
      members: userId ? [userId] : [],
    })
  },

  async addMember(familyId: string, userEmail: string): Promise<FamilyRecord> {
    // Procura usuário por e-mail
    try {
      const targetUser = await pb
        .collection('users')
        .getFirstListItem<UserRecord>(`email = '${userEmail}'`)
      const family = await pb.collection('families').getOne<FamilyRecord>(familyId)
      const members = Array.from(new Set([...(family.members || []), targetUser.id]))
      return await pb.collection('families').update<FamilyRecord>(familyId, {
        members,
      })
    } catch (err: any) {
      throw new Error('Usuário não encontrado com esse e-mail ou sem permissão.')
    }
  },
}
