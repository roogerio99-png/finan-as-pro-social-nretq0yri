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

// Uma venda pode ser dividida em fatias por regime: a parte casada com compras do
// mesmo dia (day trade, 20%, com ou sem flag manual) e o excedente (regime normal
// da classe do ativo — swing/FII/cripto).
export interface SaleSlice {
  quantity: number
  // fatia do regime normal (swing/FII/cripto) quando true; day trade quando false
  normal: boolean
  gross: number
  net: number
}

export interface RealizedSale {
  id: string
  date: string
  month: string
  ticker: string
  assetClass: AssetClass
  // true quando a venda (inteira ou em parte) está no regime day trade —
  // por flag manual OU por detecção automática (compra e venda no mesmo dia).
  dayTrade: boolean
  // true só quando o casamento veio da detecção automática (sem flag manual).
  dayTradeDetected: boolean
  // Quantidade da venda classificada como day trade (≤ quantity).
  dayTradeQuantity: number
  // true quando a operação foi marcada manualmente (preserva o comportamento antigo).
  manualDayTrade: boolean
  quantity: number
  avgPrice: number
  sellPrice: number
  sellValue: number
  gross: number
  fees: number
  net: number
  // Fatias por regime: uma quando a venda inteira tem um só regime, duas quando é mista.
  slices: SaleSlice[]
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

  // Detecção de day trade por pareamento de datas: para cada ticker, quando o mesmo dia
  // tem compra E venda, o volume casado (mínimo entre comprado e vendido do dia) é day
  // trade — mesmo sem a flag manual. Compra e venda do mesmo dia fecham posição no dia.
  const matchedByOp = detectDayTradeOps(sorted)

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
    const manualDayTrade = !!op.day_trade
    const matched = matchedByOp.get(op.id) ?? 0
    // Flag manual: a venda inteira é day trade, como antes. Sem a flag, a parte
    // casada com compras do mesmo dia é day trade e o excedente segue no regime normal.
    const dayTradeQty = manualDayTrade ? op.quantity : Math.min(matched, op.quantity)
    const dayTradeDetected = !manualDayTrade && dayTradeQty > EPS
    const normalQty = Math.max(0, op.quantity - dayTradeQty)

    // Taxas e resultado são prorrateados entre as fatias pela quantidade.
    const share = (qty: number) => (op.quantity > EPS ? qty / op.quantity : 0)
    const slices: SaleSlice[] = []
    if (dayTradeQty > EPS) {
      slices.push({
        quantity: dayTradeQty,
        normal: false,
        gross: gross * share(dayTradeQty),
        net: gross * share(dayTradeQty) - fees * share(dayTradeQty),
      })
    }
    if (normalQty > EPS) {
      slices.push({
        quantity: normalQty,
        normal: true,
        gross: gross * share(normalQty),
        net: gross * share(normalQty) - fees * share(normalQty),
      })
    }

    sales.push({
      id: op.id,
      date: dayOf(op.op_date),
      month: monthOf(op.op_date),
      ticker: op.ticker,
      assetClass: op.asset_class,
      dayTrade: manualDayTrade || dayTradeDetected,
      dayTradeDetected,
      dayTradeQuantity: dayTradeQty,
      manualDayTrade,
      quantity: op.quantity,
      avgPrice: avg,
      sellPrice: op.unit_price,
      sellValue: op.quantity * op.unit_price,
      gross,
      fees,
      net: gross - fees,
      slices,
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

// Quantidade de cada operação casada como day trade pela detecção automática
// (compra e venda do mesmo ticker no mesmo dia, sem considerar a flag manual).
// Usado para rotular as operações envolvidas nas listas e no detalhe da posição.
export function detectDayTradeOps(ops: InvestmentOperation[]): Map<string, number> {
  const sorted = [...ops].sort(
    (a, b) =>
      dayOf(a.op_date).localeCompare(dayOf(b.op_date)) ||
      (a.created ?? '').localeCompare(b.created ?? '') ||
      a.id.localeCompare(b.id),
  )
  const byTickerDay = new Map<
    string,
    { buy: number; sell: number; buyOps: InvestmentOperation[]; sellOps: InvestmentOperation[] }
  >()
  for (const op of sorted) {
    const key = `${op.ticker}|${dayOf(op.op_date)}`
    const entry = byTickerDay.get(key) ?? { buy: 0, sell: 0, buyOps: [], sellOps: [] }
    if (op.op_type === 'buy') entry.buy += op.quantity
    else entry.sell += op.quantity
    ;(op.op_type === 'buy' ? entry.buyOps : entry.sellOps).push(op)
    byTickerDay.set(key, entry)
  }
  const matched = new Map<string, number>()
  for (const entry of byTickerDay.values()) {
    if (entry.buy <= EPS || entry.sell <= EPS) continue
    const volume = Math.min(entry.buy, entry.sell)
    for (const op of entry.buyOps) {
      matched.set(op.id, (matched.get(op.id) ?? 0) + (volume * op.quantity) / entry.buy)
    }
    for (const op of entry.sellOps) {
      matched.set(op.id, (matched.get(op.id) ?? 0) + (volume * op.quantity) / entry.sell)
    }
  }
  return matched
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

// Grupo de uma fatia: a fatia day trade vai para o grupo 'day' apenas em ações e ETFs
// (como a flag manual sempre fez); em FII, cripto e outros, a classe manda — igual ao
// comportamento anterior da flag manual.
export const sliceGroup = (s: RealizedSale, p: SaleSlice): TaxGroupKey => {
  if (s.assetClass === 'crypto') return 'crypto'
  if (s.assetClass === 'fii') return 'fii'
  if (s.assetClass === 'other') return 'other'
  return p.normal ? 'swing' : 'day'
}

// Grupo "principal" da venda (para rótulos): day trade quando há fatia day em ação/ETF,
// senão o grupo da classe do ativo.
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
  // Quantidade casada como day trade DETECTADO (sem flag manual) neste grupo no mês.
  detectedQty: number
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
  // Tickers com day trade detectado automaticamente neste mês.
  detectedTickers: string[]
}

const emptyCarry = (): Record<TaxGroupKey, number> => ({
  swing: 0,
  day: 0,
  fii: 0,
  crypto: 0,
  other: 0,
})

// Apuração mensal por grupo de base. Uma venda mista contribui com fatias para dois
// grupos: a parte day trade (20%, sem isenção) e o excedente (regime da classe).
// Prejuízo de um grupo só compensa ganhos do mesmo grupo. Prejuízos são acumulados
// sempre; a isenção zera o imposto do mês quando o total vendido do grupo é ≤ limite.
// Imposto de cada grupo é rateado entre as vendas pelos ganhos líquidos de cada uma
// no grupo (fatia day e fatia normal da mesma venda recebem rateios distintos).
export function computeMonthlyTax(sales: RealizedSale[]): MonthTax[] {
  const months = [...new Set(sales.map((s) => s.month))].sort()
  const carry = emptyCarry()

  return months.map((month) => {
    const inMonth = sales.filter((s) => s.month === month)
    const groups: GroupTax[] = []
    const saleTax: Record<string, number> = {}
    const detectedTickers = new Set<string>()

    for (const key of Object.keys(TAX_GROUPS) as TaxGroupKey[]) {
      const slices = inMonth.flatMap((s) =>
        s.slices.filter((p) => sliceGroup(s, p) === key).map((p) => ({ sale: s, slice: p })),
      )
      if (slices.length === 0) continue
      const cfg = TAX_GROUPS[key]

      const sold = slices.reduce(
        (acc, { sale, slice }) =>
          acc + (sale.quantity > EPS ? (slice.quantity / sale.quantity) * sale.sellValue : 0),
        0,
      )
      const net = slices.reduce((acc, { slice }) => acc + slice.net, 0)
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

      // Rateio do imposto do grupo: cada fatia recebe na proporção do seu ganho líquido
      // positivo; vendas sem ganho positivo no grupo não recebem imposto.
      const positives = slices.reduce((acc, { slice }) => acc + Math.max(slice.net, 0), 0)
      const sliceTax = new Map<RealizedSale, number>()
      for (const { sale, slice } of slices) {
        const t = tax > 0 && positives > EPS ? (tax * Math.max(slice.net, 0)) / positives : 0
        sliceTax.set(sale, (sliceTax.get(sale) ?? 0) + t)
      }
      for (const [sale, t] of sliceTax) saleTax[sale.id] = (saleTax[sale.id] ?? 0) + t

      // Day trade detectado (sem flag manual) dentro deste grupo: só existe no grupo 'day'.
      const detectedQty = slices
        .filter(({ sale }) => !sale.manualDayTrade)
        .reduce((acc, { slice }) => acc + slice.quantity, 0)
      if (detectedQty > EPS && key === 'day') {
        for (const { sale } of slices) detectedTickers.add(sale.ticker)
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
        detectedQty: key === 'day' ? detectedQty : 0,
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
      detectedTickers: [...detectedTickers],
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
