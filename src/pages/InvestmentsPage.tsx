import React, { useMemo, useState } from 'react'
import { Plus, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OperationDialog } from '@/components/investments/OperationDialog'
import { PositionsList } from '@/components/investments/PositionsList'
import { OperationsList } from '@/components/investments/OperationsList'
import { RealizedList } from '@/components/investments/RealizedList'
import { MonthlyTaxPanel } from '@/components/investments/MonthlyTaxPanel'
import { useInvestmentData } from '@/components/investments/useInvestmentData'
import { useToast } from '@/hooks/use-toast'
import { investmentsService, type InvestmentOperation } from '@/services/investments'
import { brl, computeLedger, computeMonthlyTax } from '@/services/investmentsCalc'

const SummaryCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Card className="min-w-0">
    <CardContent className="p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-900 break-words">{value}</p>
    </CardContent>
  </Card>
)

export const InvestmentsPage: React.FC = () => {
  const { operations, quotes, loading, error, reload } = useInvestmentData()
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<InvestmentOperation | null>(null)

  const ledger = useMemo(() => computeLedger(operations, quotes), [operations, quotes])
  const monthly = useMemo(() => computeMonthlyTax(ledger.sales), [ledger.sales])
  const year = String(new Date().getFullYear())

  const totalInvested = ledger.positions.reduce((acc, p) => acc + p.totalCost, 0)
  const yearNet = ledger.sales
    .filter((s) => s.month.startsWith(year))
    .reduce((acc, s) => acc + s.net, 0)
  const yearTax = monthly.filter((m) => m.month.startsWith(year)).reduce((acc, m) => acc + m.tax, 0)

  const saleTax = useMemo(() => {
    const map: Record<string, number> = {}
    for (const m of monthly) Object.assign(map, m.saleTax)
    return map
  }, [monthly])

  const openNew = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (op: InvestmentOperation) => {
    setEditing(op)
    setDialogOpen(true)
  }

  const handleDelete = async (op: InvestmentOperation) => {
    if (!window.confirm(`Excluir a operação de ${op.ticker}?`)) return
    try {
      await investmentsService.deleteOperation(op.id)
      toast({ title: 'Operação excluída' })
      await reload()
    } catch (err) {
      toast({
        title: 'Não foi possível excluir',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-700" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Investimentos</h1>
            <p className="text-xs text-slate-500">
              Renda variável: operações, preço médio e imposto
            </p>
          </div>
        </div>
        <Button onClick={openNew} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-1.5" />
          Nova operação
        </Button>
      </div>

      {ledger.errors.length > 0 && (
        <Card className="border-rose-300 bg-rose-50">
          <CardContent className="p-4 space-y-1">
            <p className="text-sm font-semibold text-rose-700">Operações que precisam de revisão</p>
            {ledger.errors.map((e) => (
              <p key={e} className="text-xs text-rose-700 break-words">
                {e}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard label="Posição total investida (custo)" value={brl.format(totalInvested)} />
        <SummaryCard label={`Resultado realizado em ${year}`} value={brl.format(yearNet)} />
        <SummaryCard label={`Imposto acumulado em ${year}`} value={brl.format(yearTax)} />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando investimentos...</p>
      ) : (
        <Tabs defaultValue="positions" className="w-full min-w-0">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
            <TabsTrigger value="positions">Posições</TabsTrigger>
            <TabsTrigger value="operations">Operações</TabsTrigger>
            <TabsTrigger value="realized">Realizado</TabsTrigger>
            <TabsTrigger value="tax">Apuração mensal</TabsTrigger>
          </TabsList>

          <TabsContent value="positions" className="mt-4">
            <PositionsList positions={ledger.positions} onQuoteSaved={reload} />
          </TabsContent>

          <TabsContent value="operations" className="mt-4">
            <OperationsList operations={operations} onEdit={openEdit} onDelete={handleDelete} />
          </TabsContent>

          <TabsContent value="realized" className="mt-4">
            <RealizedList sales={ledger.sales} saleTax={saleTax} />
          </TabsContent>

          <TabsContent value="tax" className="mt-4">
            <MonthlyTaxPanel monthly={monthly} year={year} />
          </TabsContent>
        </Tabs>
      )}

      <OperationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={reload}
      />
    </div>
  )
}
