import React, { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { InvestmentOperation } from '@/services/investments'
import { ASSET_CLASS_LABELS, brl, detectDayTradeOps, formatDayBR } from '@/services/investmentsCalc'

const EPS = 1e-9

// Uma linha da tabela de movimentações: replay das operações do ticker na ordem cronológica.
export interface PositionDetailRow {
  id: string
  date: string
  type: 'buy' | 'sell'
  dayTrade: boolean
  // true quando o casamento day trade veio da detecção automática (compra e venda no mesmo dia).
  dayTradeDetected: boolean
  // Quantidade casada como day trade pela detecção automática (0 quando não há casamento).
  dayTradeQuantity: number
  quantity: number
  unitPrice: number
  total: number
  fees: number
  // Somente compras: custo da operação incluindo taxas (o que entra no PM).
  costWithFees: number | null
  // Preço médio vigente após a operação (null quando a posição zera ou a venda é inválida).
  avgAfter: number | null
  invalid: boolean
}

// Mesma regra de investmentsCalc.computeLedger: compra soma custo com taxas e recalcula o PM;
// venda não altera o PM — apenas baixa PM × quantidade do custo total.
export function buildPositionDetailRows(ops: InvestmentOperation[]): PositionDetailRow[] {
  const sorted = [...ops].sort(
    (a, b) =>
      a.op_date.slice(0, 10).localeCompare(b.op_date.slice(0, 10)) ||
      (a.created ?? '').localeCompare(b.created ?? '') ||
      a.id.localeCompare(b.id),
  )

  // Mesma detecção de investmentsCalc.computeLedger: o volume casado entre compra e venda
  // do MESMO dia (mínimo entre comprado e vendido do dia) é day trade, sem flag manual.
  const detected = detectDayTradeOps(sorted)

  let qty = 0
  let cost = 0
  const rows: PositionDetailRow[] = []

  for (const op of sorted) {
    const fees = op.fees || 0
    const total = op.quantity * op.unit_price
    let costWithFees: number | null = null
    let avgAfter: number | null = null
    let invalid = false

    if (op.op_type === 'buy') {
      qty += op.quantity
      cost += total + fees
      costWithFees = total + fees
      avgAfter = qty > EPS ? cost / qty : null
    } else if (op.quantity > qty + EPS) {
      // Venda maior que a posição: o ledger ignora esta operação.
      invalid = true
    } else {
      const avg = qty > EPS ? cost / qty : 0
      cost -= avg * op.quantity
      qty -= op.quantity
      if (qty <= EPS) {
        qty = 0
        cost = 0
      }
      avgAfter = qty > EPS ? cost / qty : null
    }

    const manual = !!op.day_trade
    const detectedQty = detected.get(op.id) ?? 0
    const dayTradeQty = manual ? op.quantity : Math.min(detectedQty, op.quantity)

    rows.push({
      id: op.id,
      date: op.op_date,
      type: op.op_type,
      dayTrade: manual || dayTradeQty > EPS,
      dayTradeDetected: !manual && dayTradeQty > EPS,
      dayTradeQuantity: dayTradeQty,
      quantity: op.quantity,
      unitPrice: op.unit_price,
      total,
      fees,
      costWithFees,
      avgAfter,
      invalid,
    })
  }

  return rows
}

const fmtQty = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 8 })

interface PositionDetailDialogProps {
  ticker: string
  assetClass: InvestmentOperation['asset_class']
  operations: InvestmentOperation[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const PositionDetailDialog: React.FC<PositionDetailDialogProps> = ({
  ticker,
  assetClass,
  operations,
  open,
  onOpenChange,
}) => {
  const tickerOps = useMemo(
    () => operations.filter((op) => op.ticker === ticker),
    [operations, ticker],
  )
  const rows = useMemo(() => buildPositionDetailRows(tickerOps), [tickerOps])

  const totalValue = rows.reduce((acc, r) => acc + r.total, 0)
  const totalFees = rows.reduce((acc, r) => acc + r.fees, 0)
  const totalBuyCost = rows.reduce((acc, r) => acc + (r.costWithFees ?? 0), 0)
  const detectedPairs = rows.filter((r) => r.dayTradeDetected)

  const DayTradeBadge: React.FC<{ row: PositionDetailRow }> = ({ row }) => {
    if (row.dayTradeDetected) {
      return (
        <Badge variant="outline" className="border-amber-400 text-amber-700">
          Day trade (detectado)
          {row.dayTradeQuantity < row.quantity - EPS
            ? ` · ${fmtQty(row.dayTradeQuantity)} un.`
            : ''}
        </Badge>
      )
    }
    if (row.dayTrade) return <Badge variant="outline">Day trade</Badge>
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {ticker}
            <Badge variant="outline">{ASSET_CLASS_LABELS[assetClass]}</Badge>
          </DialogTitle>
          <DialogDescription>
            Movimentações (compras e vendas) que geraram a posição atual deste ticker.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            Nenhuma movimentação registrada para este ticker.
          </p>
        ) : (
          <div className="space-y-3">
            {detectedPairs.length > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2.5">
                Day trade detectado por compra e venda na mesma data: a parte casada entra no regime
                de 20% na apuração mensal, mesmo sem a marcação manual.
              </p>
            )}
            {/* Rolagem horizontal no celular para manter a tabela legível. */}
            <div className="overflow-x-auto -mx-1 px-1">
              <Table className="min-w-[640px] text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Data</TableHead>
                    <TableHead className="whitespace-nowrap">Operação</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Qtd.</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Preço unit.</TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      Valor total (qtd × preço)
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap">Taxas</TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      Custo total c/ taxas
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap">PM após</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id} className={r.invalid ? 'bg-rose-50' : undefined}>
                      <TableCell className="whitespace-nowrap">{formatDayBR(r.date)}</TableCell>
                      <TableCell>
                        <span className="flex flex-wrap items-center gap-1.5">
                          <Badge className={r.type === 'buy' ? 'bg-emerald-600' : 'bg-rose-600'}>
                            {r.type === 'buy' ? 'Compra' : 'Venda'}
                          </Badge>
                          <DayTradeBadge row={r} />
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{fmtQty(r.quantity)}</TableCell>
                      <TableCell className="text-right">{brl.format(r.unitPrice)}</TableCell>
                      <TableCell className="text-right">{brl.format(r.total)}</TableCell>
                      <TableCell className="text-right">
                        {r.fees > 0 ? brl.format(r.fees) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.costWithFees !== null ? brl.format(r.costWithFees) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {r.invalid ? (
                          <span className="text-rose-600">venda maior que a posição</span>
                        ) : r.avgAfter !== null ? (
                          brl.format(r.avgAfter)
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-md border bg-slate-50 p-3 text-xs sm:text-sm space-y-1">
              <p className="font-semibold text-slate-700">Totais das movimentações</p>
              <p className="text-slate-600">
                Valor total movimentado:{' '}
                <span className="font-semibold">{brl.format(totalValue)}</span>
                {' · '}Taxas: <span className="font-semibold">{brl.format(totalFees)}</span>
                {' · '}Custo das compras c/ taxas:{' '}
                <span className="font-semibold">{brl.format(totalBuyCost)}</span>
              </p>
              {(() => {
                const buys = rows.reduce((acc, r) => acc + (r.type === 'buy' ? r.quantity : 0), 0)
                const sells = rows.reduce((acc, r) => acc + (r.type === 'sell' ? r.quantity : 0), 0)
                const currentQty = buys - sells
                return (
                  <p className="text-slate-600">
                    Comprado: <span className="font-semibold">{fmtQty(buys)}</span>
                    {' · '}Vendido: <span className="font-semibold">{fmtQty(sells)}</span>
                    {' · '}Quantidade líquida:{' '}
                    <span className="font-semibold">{fmtQty(currentQty)}</span>
                  </p>
                )
              })()}
              <p className="text-slate-500">
                Preço médio vigente é o da última linha com posição aberta (a venda não altera o
                PM).
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
