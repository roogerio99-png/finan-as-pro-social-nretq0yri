import pb from '@/lib/pocketbase/client'
import { DebtRecord } from '@/types/finance'

export interface DebtSimulationResult {
  month: number
  totalRemaining: number
  debtsState: { id: string; creditor: string; balance: number; paidOff: boolean }[]
  interestPaidThisMonth: number
}

export const debtsService = {
  async getAll(): Promise<DebtRecord[]> {
    return await this.list()
  },

  async list(): Promise<DebtRecord[]> {
    return await pb.collection('debts').getFullList<DebtRecord>({
      filter: pb.authStore.record ? `user_id = '${pb.authStore.record.id}'` : '',
      sort: '-interest_rate_monthly',
    })
  },

  async create(data: Partial<DebtRecord>): Promise<DebtRecord> {
    const payload = {
      ...data,
      user_id: pb.authStore.record?.id,
      status: data.status || 'active',
    }
    return await pb.collection('debts').create<DebtRecord>(payload)
  },

  async update(id: string, data: Partial<DebtRecord>): Promise<DebtRecord> {
    return await pb.collection('debts').update<DebtRecord>(id, data)
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('debts').delete(id)
  },

  simulatePayoff(
    debts: DebtRecord[],
    method: 'snowball' | 'avalanche',
    monthlyExtraBudget: number = 0,
  ) {
    if (debts.length === 0) return { months: 0, totalInterest: 0, steps: [] }

    // Clone debts
    let current = debts.map((d) => ({
      id: d.id,
      creditor: d.creditor,
      balance: d.current_balance,
      rate: d.interest_rate_monthly / 100,
      minPayment: d.minimum_payment,
    }))

    // Ordenação:
    // Bola de Neve: menor saldo primeiro (impacto psicológico)
    // Avalanche: maior taxa de juros primeiro (menor custo financeiro)
    if (method === 'snowball') {
      current.sort((a, b) => a.balance - b.balance)
    } else {
      current.sort((a, b) => b.rate - a.rate)
    }

    const steps: DebtSimulationResult[] = []
    let month = 0
    let totalInterestPaid = 0
    const maxMonths = 120 // limite de segurança de 10 anos

    while (current.some((d) => d.balance > 0) && month < maxMonths) {
      month++
      let interestMonth = 0
      let availableExtra = monthlyExtraBudget

      // 1. Aplica juros do mês
      for (const d of current) {
        if (d.balance > 0) {
          const interest = d.balance * d.rate
          d.balance += interest
          interestMonth += interest
        }
      }
      totalInterestPaid += interestMonth

      // 2. Paga pagamentos mínimos
      for (const d of current) {
        if (d.balance > 0) {
          const payment = Math.min(d.minPayment, d.balance)
          d.balance -= payment
        }
      }

      // 3. Aplica o valor extra + 'efeito bola de neve' na dívida prioritária
      for (const d of current) {
        if (d.balance > 0 && availableExtra > 0) {
          const payment = Math.min(availableExtra, d.balance)
          d.balance -= payment
          availableExtra -= payment
        }
      }

      const totalRemaining = current.reduce((acc, d) => acc + d.balance, 0)

      steps.push({
        month,
        totalRemaining: Math.round(totalRemaining * 100) / 100,
        debtsState: current.map((d) => ({
          id: d.id,
          creditor: d.creditor,
          balance: Math.max(0, Math.round(d.balance * 100) / 100),
          paidOff: d.balance <= 0,
        })),
        interestPaidThisMonth: Math.round(interestMonth * 100) / 100,
      })

      if (totalRemaining <= 0) break
    }

    return {
      months: month,
      totalInterest: Math.round(totalInterestPaid * 100) / 100,
      steps,
    }
  },
}
