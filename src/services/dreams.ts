import pb from '@/lib/pocketbase/client'
import { DreamRecord } from '@/types/finance'

export const dreamsService = {
  async list(): Promise<DreamRecord[]> {
    return await pb.collection('dreams').getFullList<DreamRecord>({
      filter: pb.authStore.record ? `user_id = '${pb.authStore.record.id}'` : '',
      sort: 'target_date',
    })
  },

  async create(data: Partial<DreamRecord>): Promise<DreamRecord> {
    const payload = {
      ...data,
      user_id: pb.authStore.record?.id,
      current_amount: data.current_amount || 0,
      status: data.status || 'in_progress',
    }
    return await pb.collection('dreams').create<DreamRecord>(payload)
  },

  async update(id: string, data: Partial<DreamRecord>): Promise<DreamRecord> {
    return await pb.collection('dreams').update<DreamRecord>(id, data)
  },

  async addContribution(id: string, amount: number): Promise<DreamRecord> {
    const dream = await pb.collection('dreams').getOne<DreamRecord>(id)
    const newAmount = (dream.current_amount || 0) + amount
    const status = newAmount >= dream.target_amount ? 'achieved' : dream.status
    return await pb.collection('dreams').update<DreamRecord>(id, {
      current_amount: newAmount,
      status,
    })
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('dreams').delete(id)
  },

  calculateBehavioralImpact(dream: DreamRecord, monthlyExpenseCut: number) {
    const remaining = Math.max(0, dream.target_amount - dream.current_amount)
    const currentContribution = dream.monthly_contribution || 100

    const monthsOriginal = Math.ceil(remaining / Math.max(1, currentContribution))
    const newMonthly = currentContribution + monthlyExpenseCut
    const monthsWithCut = Math.ceil(remaining / Math.max(1, newMonthly))

    const monthsSaved = Math.max(0, monthsOriginal - monthsWithCut)

    return {
      remaining,
      monthsOriginal,
      monthsWithCut,
      monthsSaved,
      fasterPercent: monthsOriginal > 0 ? Math.round((monthsSaved / monthsOriginal) * 100) : 0,
    }
  },
}
