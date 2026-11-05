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
// mesmo dia (day trade, 20%, detectado automaticamente) e o excedente (regime normal
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
  // true quando a venda (inteira ou em parte) está no regime day trade — detectado
  // automaticamente pela compra e venda do mesmo ticker no mesmo dia (única fonte).
  dayTrade: boolean
  // Quantidade da venda classificada como day trade (≤ quantity).
  dayTradeQuantity: number
  quantity: number
  // PM vigente do estoque antigo na data da venda: base do resultado da fatia swing.
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

// Quantidade de centavos de sobra na última fatia: nenhuma. O rateio de taxas usa
// o acerto na última fatia para nunca duplicar nem perder centavos.
const distributeCents = (total: number, weights: number[]): number[] => {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (sum <= EPS || weights.length === 0) return weights.map(() => 0)
  const raw = weights.map((w) => (total * w) / sum)
  const cents = raw.map((v) => Math.round(v * 100) / 100)
  const diff = Math.round((total - cents.reduce((a, b) => a + b, 0)) * 100) / 100
  // Ajusta o maior valor bruto pela diferença (pode ser ±0,01).
  if (diff !== 0) {
    let idx = 0
    for (let i = 1; i < raw.length; i++) if (raw[i] > raw[idx]) idx = i
    cents[idx] = Math.round((cents[idx] + diff) * 100) / 100
  }
  return cents
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

  // Enquadramento em day trade (única fonte): para cada ticker, quando o mesmo dia tem
  // compra E venda, o volume casado (mínimo entre comprado e vendido do dia) é day trade.
  // O casamento do mesmo dia tem PREFERÊNCIA sobre o estoque antigo: a compra e a venda
  // casadas fecham posição entre si e não alteram o preço médio do estoque.
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
      // A parte da compra casada com venda no mesmo dia não entra na posição: fecha
      // dentro do próprio dia (day trade) e não altera o PM do estoque antigo. As taxas
      // da compra são rateadas: a parte casada vai ao resultado do day trade.
      const matchedQty = Math.min(matchedByOp.get(op.id)?.qty ?? 0, op.quantity)
      const posQty = op.quantity - matchedQty
      st.qty += posQty
      st.cost += posQty * op.unit_price + (posQty > EPS ? (fees * posQty) / op.quantity : 0)
      continue
    }

    // Provento não é venda: dividendo e JCP não alteram a posição; bonificação
    // entra na posição a custo zero (dilui o preço médio, como na ficha Bens e Direitos).
    if (op.op_type === 'provento') {
      if (op.provent_type === 'bonificacao') st.qty += op.quantity
      continue
    }

    // O casamento do mesmo dia tem preferência sobre o estoque antigo: a fatia casada é
    // day trade e a venda só consome o estoque antigo no excedente (swing, PM vigente).
    const match = matchedByOp.get(op.id)
    const dayTradeQty = Math.min(match?.qty ?? 0, op.quantity)
    const normalQty = op.quantity - dayTradeQty

    if (normalQty > st.qty + EPS) {
      errors.push(
        `Venda de ${op.quantity} ${op.ticker} em ${formatDayBR(op.op_date)} maior que a posição disponível (${st.qty})`,
      )
      continue
    }

    const avg = st.qty > EPS ? st.cost / st.qty : 0
    // A fatia swing baixa o estoque antigo pelo PM vigente; a fatia day trade não passa
    // pela posição — seu custo é o preço das compras casadas do mesmo dia.
    st.cost -= avg * normalQty
    st.qty -= normalQty
    if (st.qty <= EPS) {
      st.qty = 0
      st.cost = 0
    }

    const swingGross = (op.unit_price - avg) * normalQty
    const dayGross = (op.unit_price - (match?.avgBuyPrice ?? 0)) * dayTradeQty
    const gross = swingGross + dayGross
    // Taxas do dia: as da venda somadas à parcela das taxas das compras casadas.
    const totalFees = fees + (match?.buyFees ?? 0)

    // Taxas e resultado são prorrateados entre as fatias pela quantidade, com acerto
    // de centavos na última fatia para somar exatamente o total (sem duplicar nem
    // perder centavos).
    const grossParts = distributeCents(gross, [dayTradeQty, normalQty])
    const feeParts = distributeCents(totalFees, [dayTradeQty, normalQty])
    const slices: SaleSlice[] = []
    if (dayTradeQty > EPS) {
      slices.push({
        quantity: dayTradeQty,
        normal: false,
        gross: grossParts[0],
        net: grossParts[0] - feeParts[0],
      })
    }
    if (normalQty > EPS) {
      slices.push({
        quantity: normalQty,
        normal: true,
        gross: grossParts[1],
        net: grossParts[1] - feeParts[1],
      })
    }

    sales.push({
      id: op.id,
      date: dayOf(op.op_date),
      month: monthOf(op.op_date),
      ticker: op.ticker,
      assetClass: op.asset_class,
      dayTrade: dayTradeQty > EPS,
      dayTradeQuantity: dayTradeQty,
      quantity: op.quantity,
      avgPrice: avg,
      sellPrice: op.unit_price,
      sellValue: op.quantity * op.unit_price,
      gross,
      fees: totalFees,
      net: gross - totalFees,
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

export interface DayTradeMatch {
  // Quantidade da operação casada como day trade (compra e venda do mesmo dia).
  qty: number
  // Preço médio das compras casadas do dia: base do lucro do day trade na venda.
  avgBuyPrice: number
  // Parcela das taxas das compras casadas do dia que cabe a esta operação.
  buyFees: number
}

// Quantidade e base de custo de cada operação casada como day trade pela detecção
// automática (compra e venda do mesmo ticker no mesmo dia). O casamento do mesmo dia
// tem preferência sobre o estoque antigo: é ele que define a fatia day trade da venda.
// Usado para rotular as operações envolvidas nas listas e no detalhe da posição.
export function detectDayTradeOps(ops: InvestmentOperation[]): Map<string, DayTradeMatch> {
  const sorted = [...ops].sort(
    (a, b) =>
      dayOf(a.op_date).localeCompare(dayOf(b.op_date)) ||
      (a.created ?? '').localeCompare(b.created ?? '') ||
      a.id.localeCompare(b.id),
  )
  const byTickerDay = new Map<
    string,
    {
      buy: number
      sell: number
      buyFees: number
      buyOps: InvestmentOperation[]
      sellOps: InvestmentOperation[]
    }
  >()
  for (const op of sorted) {
    if (op.op_type === 'provento') continue
    const key = `${op.ticker}|${dayOf(op.op_date)}`
    const entry = byTickerDay.get(key) ?? { buy: 0, sell: 0, buyFees: 0, buyOps: [], sellOps: [] }
    if (op.op_type === 'buy') {
      entry.buy += op.quantity
      entry.buyFees += op.fees || 0
    } else {
      entry.sell += op.quantity
    }
    ;(op.op_type === 'buy' ? entry.buyOps : entry.sellOps).push(op)
    byTickerDay.set(key, entry)
  }
  const matched = new Map<string, DayTradeMatch>()
  for (const entry of byTickerDay.values()) {
    if (entry.buy <= EPS || entry.sell <= EPS) continue
    const volume = Math.min(entry.buy, entry.sell)
    // Compras casadas: quantidade casada de cada compra, preço médio ponderado do dia
    // e parcela das taxas de compra que compõe o custo do day trade.
    let matchedBuyFees = 0
    let weightedPrice = 0
    for (const op of entry.buyOps) {
      const qty = (volume * op.quantity) / entry.buy
      const feeShare = qty > EPS ? ((op.fees || 0) * qty) / op.quantity : 0
      matched.set(op.id, { qty, avgBuyPrice: op.unit_price, buyFees: feeShare })
      matchedBuyFees += feeShare
      weightedPrice += op.unit_price * qty
    }
    const avgBuyPrice = volume > EPS ? weightedPrice / volume : 0
    for (const op of entry.sellOps) {
      const qty = (volume * op.quantity) / entry.sell
      matched.set(op.id, {
        qty,
        avgBuyPrice,
        buyFees: volume > EPS ? (matchedBuyFees * qty) / volume : 0,
      })
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

// Grupo de uma fatia: a fatia day trade vai para o grupo 'day' apenas em ações e ETFs;
// em FII, cripto e outros, a classe do ativo manda.
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
  // Quantidade casada como day trade (detectado automaticamente) neste grupo no mês.
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

      // Day trade detectado dentro deste grupo: só existe no grupo 'day'.
      const detectedQty = slices.reduce((acc, { slice }) => acc + slice.quantity, 0)
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
