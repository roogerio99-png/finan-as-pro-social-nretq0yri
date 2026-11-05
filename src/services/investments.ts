import pb from '@/lib/pocketbase/client'

export type OpType = 'buy' | 'sell' | 'provento'
export type AssetClass = 'stock' | 'fii' | 'etf' | 'crypto' | 'other'
export type ProventType = 'dividendo' | 'jcp' | 'bonificacao'

export interface InvestmentOperation {
  id: string
  ticker: string
  op_type: OpType
  quantity: number
  unit_price: number
  op_date: string
  fees: number
  asset_class: AssetClass
  day_trade: boolean
  notes?: string
  // Tipo do provento (quando op_type = 'provento').
  provent_type?: ProventType
  // CNPJ do ativo — opcional, usado pela apuração de proventos (teto de R$ 50 mil).
  cnpj?: string
  // IRRF retido na fonte (apenas JCP — 15%): valor informado em bruto menos líquido.
  irr?: number
  created?: string
}

export interface InvestmentQuote {
  id: string
  ticker: string
  price: number
}

export type OperationInput = Omit<InvestmentOperation, 'id' | 'created'>

// Todo registro novo leva user_id e family_id do authStore (padrão do app).
const ownership = () => ({
  user_id: pb.authStore.record?.id ?? '',
  family_id: pb.authStore.record?.family_id ?? '',
})

export const investmentsService = {
  async listOperations(): Promise<InvestmentOperation[]> {
    return await pb.collection('investment_operations').getFullList<InvestmentOperation>({
      sort: 'op_date,created',
    })
  },

  async createOperation(data: OperationInput): Promise<InvestmentOperation> {
    return await pb.collection('investment_operations').create<InvestmentOperation>({
      ...data,
      ticker: data.ticker.trim().toUpperCase(),
      ...ownership(),
    })
  },

  async updateOperation(id: string, data: OperationInput): Promise<InvestmentOperation> {
    return await pb.collection('investment_operations').update<InvestmentOperation>(id, {
      ...data,
      ticker: data.ticker.trim().toUpperCase(),
    })
  },

  async deleteOperation(id: string): Promise<boolean> {
    return await pb.collection('investment_operations').delete(id)
  },

  async listQuotes(): Promise<InvestmentQuote[]> {
    return await pb.collection('investment_quotes').getFullList<InvestmentQuote>()
  },

  // Cotação atual de um ticker: cria, atualiza ou remove (price null).
  async setQuote(ticker: string, price: number | null): Promise<void> {
    const symbol = ticker.trim().toUpperCase()
    let existing: InvestmentQuote | null = null
    try {
      existing = await pb
        .collection('investment_quotes')
        .getFirstListItem<InvestmentQuote>(`ticker = "${symbol}"`)
    } catch {
      existing = null
    }

    if (price === null) {
      if (existing) await pb.collection('investment_quotes').delete(existing.id)
      return
    }
    if (existing) {
      await pb.collection('investment_quotes').update(existing.id, { price })
      return
    }
    await pb.collection('investment_quotes').create({ ticker: symbol, price, ...ownership() })
  },
}
