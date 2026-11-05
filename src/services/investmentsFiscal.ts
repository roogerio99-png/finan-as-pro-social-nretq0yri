import type { AssetClass, InvestmentOperation, InvestmentQuote } from '@/services/investments'
import {
  ASSET_CLASS_LABELS,
  brl,
  computeLedger,
  computeMonthlyTax,
  dayOf,
  type PositionView,
  type TaxGroupKey,
} from '@/services/investmentsCalc'

// Espelho DIRPF do ano: posição em 31/12 por ticker (ficha "Bens e Direitos"),
// lucros apurados por cesta fiscal (ficha "Renda Variável") e proventos por CNPJ.

export interface DirpfPositionRow {
  ticker: string
  quantity: number
  avgCost: number
  totalCost: number
  assetClass: AssetClass
  assetClassLabel: string
}

export interface DirpfGroupRow {
  key: TaxGroupKey
  label: string
  sold: number
  net: number
  tax: number
  carryAfter: number
}

export interface DirpfProventRow {
  cnpj: string
  total: number // bruto (bonificação entra pelo valor econômico)
  irr: number // IRRF retido (JCP)
  net: number
  types: { dividendo: number; jcp: number; bonificacao: number }
  overLimit: boolean
}

export interface DirpfReport {
  year: string
  empty: boolean
  positions: DirpfPositionRow[]
  groups: DirpfGroupRow[]
  provents: DirpfProventRow[]
  totals: { sold: number; net: number; tax: number; provents: number; irr: number }
}

export const PROVENT_LIMIT_PER_CNPJ = 50000

const isProvent = (op: InvestmentOperation) => op.op_type === 'provento'

export function buildDirpfReport(
  ops: InvestmentOperation[],
  quotes: InvestmentQuote[],
  year: string,
): DirpfReport {
  const yearOps = ops.filter((op) => dayOf(op.op_date).startsWith(`${year}-`))
  if (yearOps.length === 0) {
    return {
      year,
      empty: true,
      positions: [],
      groups: [],
      provents: [],
      totals: { sold: 0, net: 0, tax: 0, provents: 0, irr: 0 },
    }
  }

  // Posição em 31/12: replay completo (inclui anos anteriores — a posição carrega)
  // e leitura do estado no fim do ano escolhido.
  const ledger = computeLedger(ops, quotes)
  const positions: DirpfPositionRow[] = ledger.positions.map((p: PositionView) => ({
    ticker: p.ticker,
    quantity: p.quantity,
    avgCost: p.avgPrice,
    totalCost: p.totalCost,
    assetClass: p.assetClass,
    assetClassLabel: ASSET_CLASS_LABELS[p.assetClass],
  }))

  // Lucros por cesta: mesma apuração mensal do painel, recortada no ano. O carry
  // vem do último mês do ANO (não do último mês com venda) — por isso a apuração
  // roda até dezembro, mesmo sem venda em meses finais.
  const monthly = computeMonthlyTax(ledger.sales)
  const yearMonths = new Set(
    [...monthly.map((m) => m.month)].filter((m) => m.startsWith(`${year}-`)),
  )
  const yearMonthly = monthly.filter((m) => yearMonths.has(m.month))
  const lastMonthOfYear = `${year}-12`
  const groupMap = new Map<TaxGroupKey, DirpfGroupRow>()
  for (const m of yearMonthly) {
    for (const g of m.groups) {
      const acc =
        groupMap.get(g.key) ??
        ({
          key: g.key,
          label: g.label,
          sold: 0,
          net: 0,
          tax: 0,
          carryAfter: 0,
        } as DirpfGroupRow)
      acc.sold += g.sold
      acc.net += g.net
      acc.tax += g.tax
      if (
        m.month === lastMonthOfYear ||
        !yearMonthly.some((x) => x.month > m.month && x.month.startsWith(`${year}-`))
      ) {
        acc.carryAfter = g.carryAfter
      }
      groupMap.set(g.key, acc)
    }
  }

  // Proventos por CNPJ do ativo. Sem CNPJ, a linha usa o ticker — mas não
  // conta para a apuração do teto (é como se o CNPJ não fosse informado).
  const byCnpj = new Map<
    string,
    { total: number; irr: number; dividendo: number; jcp: number; bonificacao: number }
  >()
  for (const op of yearOps.filter(isProvent)) {
    const key = (op.cnpj ?? '').trim() || op.ticker
    const gross = op.quantity * op.unit_price
    const irr = op.irr || 0
    const entry = byCnpj.get(key) ?? {
      total: 0,
      irr: 0,
      dividendo: 0,
      jcp: 0,
      bonificacao: 0,
    }
    entry.total += gross
    entry.irr += irr
    const kind = op.provent_type ?? 'dividendo'
    if (kind === 'jcp') entry.jcp += gross
    else if (kind === 'bonificacao') entry.bonificacao += gross
    else entry.dividendo += gross
    byCnpj.set(key, entry)
  }
  const provents: DirpfProventRow[] = [...byCnpj.entries()]
    .map(([cnpj, e]) => ({
      cnpj,
      total: e.total,
      irr: e.irr,
      net: e.total - e.irr,
      types: { dividendo: e.dividendo, jcp: e.jcp, bonificacao: e.bonificacao },
      overLimit: e.total > PROVENT_LIMIT_PER_CNPJ,
    }))
    .sort((a, b) => a.cnpj.localeCompare(b.cnpj))

  const totals = {
    sold: yearMonthly.reduce((acc, m) => acc + m.sold, 0),
    net: yearMonthly.reduce((acc, m) => acc + m.net, 0),
    tax: yearMonthly.reduce((acc, m) => acc + m.tax, 0),
    provents: provents.reduce((acc, p) => acc + p.total, 0),
    irr: provents.reduce((acc, p) => acc + p.irr, 0),
  }

  return {
    year,
    empty: false,
    positions,
    groups: [...groupMap.values()].sort((a, b) => a.label.localeCompare(b.label)),
    provents,
    totals,
  }
}

// Rótulo curto para a lista de proventos (usado pelas listas e pelo diálogo).
export const proventTypeLabel = (t?: string) =>
  t === 'jcp' ? 'JCP' : t === 'bonificacao' ? 'Bonificação' : 'Dividendo'

export { brl }
