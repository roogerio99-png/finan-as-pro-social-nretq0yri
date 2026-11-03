import pb from '@/lib/pocketbase/client'
import { CategoryRecord } from '@/types/finance'

export const categoriesService = {
  async list(): Promise<CategoryRecord[]> {
    const records = await pb.collection('categories').getFullList<CategoryRecord>({
      sort: 'group_level1,group_level2,name',
    })
    return records
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
}
