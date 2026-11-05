import type { AssetClass, InvestmentOperation, InvestmentQuote } from '@/services/investments'

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  stock: 'Ação',
  fii: 'FII',
  etf: 'ETF',
  crypto: 'Cripto',
  other: 'Outros',
}

export const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

// Data de hoje no fuso local, no formato 'YYYY-MM-DD'.
export const todayISO = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

const EPS = 1e-9

// Datas vêm como 'YYYY-MM-DD' (ou com hora, do PocketBase): usamos só o dia.
export const dayOf = (d: string) => d.slice(0, 10)
export const monthOf = (d: string) => d.slice(0, 7)
export const formatDayBR = (d: string) => {
  const [y, m, day] = dayOf(d).split('-')
  return `${day}/${m}/${y}`
}

export interface PositionView {
  ticker: string
  assetClass: AssetClass
  quantity: number
  avgPrice: number
  totalCost: number
  quote: number | null
  marketValue: number | null
  unrealized: number | null
}

export interface RealizedSale {
  id: string
  date: string
  month: string
  ticker: string
  assetClass: AssetClass
  dayTrade: boolean
  quantity: number
  avgPrice: number
  sellPrice: number
  sellValue: number
  gross: number
  fees: number
  net: number
}

export interface LedgerResult {
  positions: PositionView[]
  sales: RealizedSale[]
  errors: string[]
}

interface TickerState {
  qty: number
  cost: number
  assetClass: AssetClass
}

// Método padrão brasileiro: o PM é recalculado a cada compra e permanece inalterado nas vendas.
// Venda: baixa do custo o PM × quantidade vendida; resultado = (preço − PM) × quantidade − taxas.
export function computeLedger(
  ops: InvestmentOperation[],
  quotes: InvestmentQuote[] = [],
): LedgerResult {
  const sorted = [...ops].sort(
    (a, b) =>
      dayOf(a.op_date).localeCompare(dayOf(b.op_date)) ||
      (a.created ?? '').localeCompare(b.created ?? '') ||
      a.id.localeCompare(b.id),
  )

  const states = new Map<string, TickerState>()
  const sales: RealizedSale[] = []
  const errors: string[] = []

  for (const op of sorted) {
    const st = states.get(op.ticker) ?? { qty: 0, cost: 0, assetClass: op.asset_class }
    st.assetClass = op.asset_class
    states.set(op.ticker, st)
    const fees = op.fees || 0

    if (op.op_type === 'buy') {
      st.qty += op.quantity
      st.cost += op.quantity * op.unit_price + fees
      continue
    }

    if (op.quantity > st.qty + EPS) {
      errors.push(
        `Venda de ${op.quantity} ${op.ticker} em ${formatDayBR(op.op_date)} maior que a posição (${st.qty})`,
      )
      continue
    }

    const avg = st.qty > EPS ? st.cost / st.qty : 0
    st.cost -= avg * op.quantity
    st.qty -= op.quantity
    if (st.qty <= EPS) {
      st.qty = 0
      st.cost = 0
    }

    const gross = (op.unit_price - avg) * op.quantity
    sales.push({
      id: op.id,
      date: dayOf(op.op_date),
      month: monthOf(op.op_date),
      ticker: op.ticker,
      assetClass: op.asset_class,
      dayTrade: !!op.day_trade,
      quantity: op.quantity,
      avgPrice: avg,
      sellPrice: op.unit_price,
      sellValue: op.quantity * op.unit_price,
      gross,
      fees,
      net: gross - fees,
    })
  }

  const quoteMap = new Map(quotes.map((q) => [q.ticker, q.price]))
  const positions: PositionView[] = []
  for (const [ticker, st] of states) {
    if (st.qty <= EPS) continue
    const quote = quoteMap.get(ticker) ?? null
    const marketValue = quote !== null ? quote * st.qty : null
    positions.push({
      ticker,
      assetClass: st.assetClass,
      quantity: st.qty,
      avgPrice: st.cost / st.qty,
      totalCost: st.cost,
      quote,
      marketValue,
      unrealized: marketValue !== null ? marketValue - st.cost : null,
    })
  }
  positions.sort((a, b) => a.ticker.localeCompare(b.ticker))

  return { positions, sales, errors }
}

export type TaxGroupKey = 'swing' | 'day' | 'fii' | 'crypto' | 'other'

export const TAX_GROUPS: Record<
  TaxGroupKey,
  { label: string; rate: number; exemptionLimit: number | null }
> = {
  swing: { label: 'Swing trade (ações e ETFs)', rate: 0.15, exemptionLimit: 20000 },
  day: { label: 'Day trade (ações e ETFs)', rate: 0.2, exemptionLimit: null },
  fii: { label: 'Fundos imobiliários (FII)', rate: 0.2, exemptionLimit: null },
  crypto: { label: 'Criptomoedas', rate: 0.15, exemptionLimit: 35000 },
  other: { label: 'Outros ativos (sem regra específica)', rate: 0.15, exemptionLimit: null },
}

export const taxGroupOf = (s: RealizedSale): TaxGroupKey => {
  if (s.assetClass === 'crypto') return 'crypto'
  if (s.assetClass === 'fii') return 'fii'
  if (s.assetClass === 'other') return 'other'
  return s.dayTrade ? 'day' : 'swing'
}

export interface GroupTax {
  key: TaxGroupKey
  label: string
  rate: number
  sold: number
  net: number
  exempt: boolean
  exemptionLimit: number | null
  taxableBase: number
  carryUsed: number
  carryGenerated: number
  carryAfter: number
  tax: number
}

export interface MonthTax {
  month: string
  groups: GroupTax[]
  sold: number
  net: number
  taxableBase: number
  tax: number
  carryAfter: Record<TaxGroupKey, number>
  saleTax: Record<string, number>
}

const emptyCarry = (): Record<TaxGroupKey, number> => ({
  swing: 0,
  day: 0,
  fii: 0,
  crypto: 0,
  other: 0,
})

// Apuração mensal por grupo de base. Prejuízo de um grupo só compensa ganhos do mesmo grupo.
// Prejuízos são acumulados sempre; a isenção zera o imposto do mês quando o total vendido
// do grupo é ≤ limite. Imposto de cada venda é rateado pelos ganhos líquidos do grupo no mês.
export function computeMonthlyTax(sales: RealizedSale[]): MonthTax[] {
  const months = [...new Set(sales.map((s) => s.month))].sort()
  const carry = emptyCarry()

  return months.map((month) => {
    const inMonth = sales.filter((s) => s.month === month)
    const groups: GroupTax[] = []
    const saleTax: Record<string, number> = {}

    for (const key of Object.keys(TAX_GROUPS) as TaxGroupKey[]) {
      const items = inMonth.filter((s) => taxGroupOf(s) === key)
      if (items.length === 0) continue
      const cfg = TAX_GROUPS[key]
      const sold = items.reduce((acc, s) => acc + s.sellValue, 0)
      const net = items.reduce((acc, s) => acc + s.net, 0)
      const exempt = cfg.exemptionLimit !== null && sold <= cfg.exemptionLimit

      let carryUsed = 0
      let carryGenerated = 0
      let taxableBase = 0
      if (net < 0) {
        carryGenerated = -net
        carry[key] += -net
      } else if (!exempt) {
        carryUsed = Math.min(carry[key], net)
        carry[key] -= carryUsed
        taxableBase = net - carryUsed
      }
      const tax = taxableBase * cfg.rate

      const positives = items.reduce((acc, s) => acc + Math.max(s.net, 0), 0)
      for (const s of items) {
        saleTax[s.id] = tax > 0 && positives > 0 ? (tax * Math.max(s.net, 0)) / positives : 0
      }

      groups.push({
        key,
        label: cfg.label,
        rate: cfg.rate,
        sold,
        net,
        exempt,
        exemptionLimit: cfg.exemptionLimit,
        taxableBase,
        carryUsed,
        carryGenerated,
        carryAfter: carry[key],
        tax,
      })
    }

    return {
      month,
      groups,
      sold: groups.reduce((acc, g) => acc + g.sold, 0),
      net: groups.reduce((acc, g) => acc + g.net, 0),
      taxableBase: groups.reduce((acc, g) => acc + g.taxableBase, 0),
      tax: groups.reduce((acc, g) => acc + g.tax, 0),
      carryAfter: { ...carry },
      saleTax,
    }
  })
}

// DARF: último dia útil do mês seguinte (feriados não são considerados).
export function darfDueDate(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m + 1, 0)
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('pt-BR')
}
