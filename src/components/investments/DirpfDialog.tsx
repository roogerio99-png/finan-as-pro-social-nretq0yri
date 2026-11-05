import React, { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { brl } from '@/services/investmentsCalc'
import type { InvestmentOperation, InvestmentQuote } from '@/services/investments'
import {
  buildDirpfReport,
  type DirpfReport,
  type DirpfPositionRow,
  type DirpfProventRow,
} from '@/services/investmentsFiscal'

interface DirpfDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  operations: InvestmentOperation[]
  quotes: InvestmentQuote[]
}

export type DirpfReportOp = InvestmentOperation

const fmtQty = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 8 })

const GROUP_ORDER: DirpfReport['groups'][number]['key'][] = [
  'swing',
  'day',
  'fii',
  'crypto',
  'other',
]

const YearSelect: React.FC<{ value: string; onChange: (y: string) => void }> = ({
  value,
  onChange,
}) => {
  const currentYear = new Date().getFullYear()
  const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3]
  return (
    <select
      className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Ano do espelho"
    >
      {years.map((y) => (
        <option key={y} value={String(y)}>
          {y}
        </option>
      ))}
    </select>
  )
}

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="min-w-0 rounded-lg border border-slate-200 p-3">
    <p className="text-xs text-slate-500">{label}</p>
    <p className="break-words text-sm font-bold text-slate-800">{value}</p>
  </div>
)

const PositionRow: React.FC<{ row: DirpfPositionRow }> = ({ row }) => (
  <TableRow>
    <TableCell className="font-semibold whitespace-nowrap">{row.ticker}</TableCell>
    <TableCell className="text-right whitespace-nowrap">{fmtQty(row.quantity)}</TableCell>
    <TableCell className="text-right whitespace-nowrap">{brl.format(row.avgCost)}</TableCell>
    <TableCell className="text-right whitespace-nowrap">{brl.format(row.totalCost)}</TableCell>
    <TableCell className="whitespace-nowrap text-xs">{row.assetClassLabel}</TableCell>
  </TableRow>
)

const ProventRow: React.FC<{ row: DirpfProventRow; year: string }> = ({ row, year }) => {
  const [open, setOpen] = useState(false)
  const total = row.types.dividendo + row.types.jcp + row.types.bonificacao
  return (
    <>
      <TableRow
        className={row.overLimit ? 'bg-amber-50' : undefined}
        onClick={() => setOpen((o) => !o)}
        role="button"
        aria-expanded={open}
      >
        <TableCell>
          <span className="flex items-center gap-1">
            {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {row.cnpj}
          </span>
        </TableCell>
        <TableCell className="text-right">{brl.format(row.total)}</TableCell>
        <TableCell className="text-right">{brl.format(row.irr)}</TableCell>
        <TableCell className="text-right">{brl.format(row.net)}</TableCell>
        <TableCell>
          {row.overLimit ? (
            <Badge variant="outline" className="border-amber-500 text-amber-700">
              Acima de R$ 50 mil
            </Badge>
          ) : null}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow className="bg-slate-50">
          <TableCell colSpan={5} className="p-3 text-xs text-slate-600">
            <div className="grid gap-1.5 sm:grid-cols-3">
              <span>
                Dividendos: <span className="font-semibold">{brl.format(row.types.dividendo)}</span>
              </span>
              <span>
                JCP (bruto): <span className="font-semibold">{brl.format(row.types.jcp)}</span>
              </span>
              <span>
                Bonificações (valor econômico):{' '}
                <span className="font-semibold">{brl.format(row.types.bonificacao)}</span>
              </span>
            </div>
            <p className="mt-1.5 text-slate-500">
              Em {year}, {row.cnpj} pagou <span className="font-semibold">{brl.format(total)}</span>{' '}
              em proventos{row.overLimit ? ' — acima do teto de isenção de R$ 50 mil por CNPJ' : ''}
              .
            </p>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

export const DirpfDialog: React.FC<DirpfDialogProps> = ({
  open,
  onOpenChange,
  operations,
  quotes,
}) => {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const report = useMemo(
    () => buildDirpfReport(operations, quotes, year),
    [operations, quotes, year],
  )
  const [openGroups, setOpenGroups] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Espelho DIRPF {year}</DialogTitle>
          <DialogDescription>
            Posição em 31/12, lucros por cesta e proventos por CNPJ para conferir com a declaração
            (fichas "Bens e Direitos" e "Renda Variável").
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Label className="text-xs font-semibold">Ano</Label>
            <YearSelect value={year} onChange={setYear} />
          </div>

          {report.empty && (
            <p className="text-sm text-slate-500 py-4 text-center">Nenhuma operação em {year}.</p>
          )}

          {!report.empty && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Vendido no ano" value={brl.format(report.totals.sold)} />
                <Stat label="Resultado líquido do ano" value={brl.format(report.totals.net)} />
                <Stat label="Imposto devido no ano" value={brl.format(report.totals.tax)} />
                <Stat label="Proventos recebidos" value={brl.format(report.totals.provents)} />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Posição em 31/12 (ficha "Bens e Direitos")
                </p>
                {report.positions.length === 0 ? (
                  <p className="text-xs text-slate-500">Sem posição aberta em 31/12.</p>
                ) : (
                  <div className="overflow-x-auto -mx-1 px-1">
                    <Table className="min-w-[520px] text-xs sm:text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ticker</TableHead>
                          <TableHead className="text-right">Quantidade</TableHead>
                          <TableHead className="text-right">Custo médio</TableHead>
                          <TableHead className="text-right">Custo total</TableHead>
                          <TableHead>Classe</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.positions.map((r) => (
                          <PositionRow key={r.ticker} row={r} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Lucros por cesta (ficha "Renda Variável")
                </p>
                <div className="space-y-2">
                  {GROUP_ORDER.map((key) => {
                    const g = report.groups.find((x) => x.key === key)
                    if (!g) return null
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm"
                      >
                        <span className="min-w-0">
                          <span className="font-semibold">{g.label}</span>
                          <span className="text-xs text-slate-500 block">
                            Vendido {brl.format(g.sold)} · Imposto {brl.format(g.tax)} · Prejuízo a
                            compensar {brl.format(g.carryAfter)}
                          </span>
                        </span>
                        <span className="font-bold text-slate-900 text-right shrink-0">
                          {brl.format(g.net)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Proventos por CNPJ (teto de R$ 50 mil no ano)
                </p>
                {report.provents.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Nenhum provento registrado com CNPJ em {year}. Informe o CNPJ do ativo ao
                    registrar o provento para habilitar esta apuração.
                  </p>
                ) : (
                  <div className="overflow-x-auto -mx-1 px-1">
                    <Table className="min-w-[560px] text-xs sm:text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead>CNPJ</TableHead>
                          <TableHead className="text-right">Bruto</TableHead>
                          <TableHead className="text-right">IRRF</TableHead>
                          <TableHead className="text-right">Líquido</TableHead>
                          <TableHead>Situação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.provents.map((r) => (
                          <ProventRow key={r.cnpj} row={r} year={year} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div className="rounded-md border bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-700">Notas</p>
                <p>
                  A posição em 31/12 usa o custo de aquisição (preço médio) e a quantidade ao fim do
                  ano — o mesmo critério da ficha "Bens e Direitos".
                </p>
                <p>
                  Bonificação não é renda tributável no recebimento: entra na posição como custo
                  zero e dilui o preço médio. JCP aparece líquido de IRRF de 15% na ficha "Renda
                  Variável" — o imposto retido entra como antecipação.
                </p>
                <p>
                  DARFs pagos no ano: use o valor de imposto devido por cesta acima para conferir
                  com os DARFs (código 6015 para ações/ETFs, 6016 para day trade, 8039 para FII,
                  8184 para cripto).
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DirpfDialog
